// Worker de EXPORT FINAL (VEX-01): renderiza o estado EDITADO do Studio
// (timeline + fxPlan do studio-edit.json ou do body da UI) num mp4 fiel.
//
// Uso: node scripts/render-export.ts <job.json>
//
// O job JSON: { jobId, client, creative, timeline, fxPlan, captionStyle?,
//               frameRange?: [ini, fim] }
//
// Fluxo: staging (hardlink/copy dos assets referenciados) → rewrite das URLs
// do app para paths staticFile → bundle(publicDir=staging) → renderMedia com
// onProgress → exports/export-<jobId>.mp4. Status em exports/render-status.json.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { remapFiles, rewriteForRender, stagedPathFor } from "../src/lib/exportRender.ts";
import { creativeDirFor, materialsDirFor, studioAssetsDirFor } from "../src/lib/ingest.ts";
import type { ExportAssetRef } from "../src/lib/exportRender.ts";
import type { Timeline } from "../src/lib/timeline";
import type { FxPlan } from "../src/lib/fxPlan";
import type { CueOptions } from "../src/lib/cues";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

/** VEX-11: uma variante de hook a exportar no batch (1 body × N hooks). */
interface ExportVariant {
  label: string;
  timeline: Timeline;
  fxPlan: FxPlan;
}

interface ExportJob {
  jobId: string;
  client: string;
  creative: string;
  timeline: Timeline;
  fxPlan: FxPlan;
  captionStyle?: CueOptions;
  frameRange?: [number, number];
  /**
   * Caminho de decodificação do vídeo. Default "offthread" (extração exata por
   * frame — SEM piscadas/frames pretos). As 2 causas do "No frame found" estão
   * tratadas: cache explícito generoso (causa nº 1, doc oficial) + conformação
   * H.264 CFR de toda fonte (causa nº 2, gaps de screen recording). "tag"
   * (<Video> do browser) fica como fallback opt-in — flicker sob carga.
   */
  videoTag?: "tag" | "offthread";
  /** VEX-11: exporta N variantes de hook (mesmo corpo). Ausente = export único. */
  variants?: ExportVariant[];
  /**
   * Fator de resolução do render. 1 (default) = resolução nativa da composição.
   * Valores < 1 rasterizam menos pixels — é o ÚNICO parâmetro que de fato
   * acelera aqui. Medido em 2026-10-10 num 1080x1920 de 383 frames:
   * 1.0 → 20,1s · 0.75 → 13,6s · 0.5 → 10,5s. Para comparação, `crf: 28`
   * ficou em 19,6s (nada): o custo está na RASTERIZAÇÃO do quadro, não na
   * compressão, então mexer em qualidade de codec não compra velocidade.
   * Usar 0.5 para conferir ritmo/timing; exportar em 1 para subir o anúncio.
   */
  scale?: number;
}

interface RenderStatus {
  jobId: string;
  state: "queued" | "staging" | "bundling" | "rendering" | "done" | "error";
  progress: number;
  output?: string;
  error?: string;
  missingAssets?: string[];
  // VEX-11: progresso agregado do batch.
  outputs?: string[];
  batchTotal?: number;
  batchDone?: number;
  batchLabel?: string;
  startedAt: string;
  updatedAt: string;
}

function main() {
  const jobFile = process.argv[2];
  if (!jobFile || !fs.existsSync(jobFile)) {
    console.error("Uso: node scripts/render-export.ts <job.json>");
    process.exit(1);
  }
  const job = JSON.parse(fs.readFileSync(jobFile, "utf-8")) as ExportJob;
  const creativeDir = creativeDirFor(REPO, job.client, job.creative);
  const exportsDir = path.join(creativeDir, "exports");
  fs.mkdirSync(exportsDir, { recursive: true });
  const statusPath = path.join(exportsDir, "render-status.json");
  const startedAt = new Date().toISOString();

  const fresh = (): RenderStatus =>
    ({ jobId: job.jobId, state: "queued", progress: 0, startedAt, updatedAt: startedAt });
  const setStatus = (patch: Partial<RenderStatus>) => {
    let cur = fresh();
    try {
      const onDisk = JSON.parse(fs.readFileSync(statusPath, "utf-8")) as RenderStatus;
      // Não herda estado (error/output) de um job ANTERIOR.
      if (onDisk.jobId === job.jobId) cur = onDisk;
    } catch {
      /* sem status anterior */
    }
    const next = { ...cur, ...patch, jobId: job.jobId, updatedAt: new Date().toISOString() };
    fs.writeFileSync(statusPath, JSON.stringify(next), "utf-8");
  };

  run(job, creativeDir, exportsDir, setStatus).catch((err) => {
    console.error("[export] ERRO:", err);
    setStatus({ state: "error", error: String(err instanceof Error ? err.message : err) });
    process.exit(1);
  });
}

/** Origem física de um asset referenciado. */
function sourcePathFor(ref: ExportAssetRef, client: string, creative: string): string {
  if (ref.kind === "upload") return path.join(studioAssetsDirFor(REPO, client, creative), ref.name);
  if (ref.kind === "library") return path.join(ROOT, "public", "library", ref.name);
  return path.join(materialsDirFor(REPO, client, creative), ref.name);
}

/** Hardlink (rápido, mesmo volume) com fallback para cópia. */
function linkOrCopy(src: string, dest: string) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.linkSync(src, dest);
  } catch {
    fs.copyFileSync(src, dest);
  }
}

// Conformação de fontes: o compositor do Remotion falha ("No frame found at
// position") com fontes fora do caminho feliz — screen captures .mov VFR e até
// .mp4 de celular com edit list/PTS deslocado. Como detecção confiável não
// existe, TODO vídeo é conformado para H.264 CFR 30 no staging (passo padrão
// de export em NLEs), com cache por nome+tamanho+mtime (re-exports são hit).
const VIDEO_CONFORM_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm"]);

/** Conforma uma fonte de vídeo (H.264 CFR yuv420p). Retorna o path a usar. */
function ensureWebSafe(srcAbs: string, cacheDir: string): string {
  if (!VIDEO_CONFORM_EXTS.has(path.extname(srcAbs).toLowerCase())) return srcAbs;
  const st = fs.statSync(srcAbs);
  // `g30` na chave INVALIDA o cache antigo: as entradas anteriores foram geradas sem
  // intervalo de keyframe e precisam ser refeitas (ver o porquê logo abaixo).
  const key = `${path.basename(srcAbs)}.${st.size}-${Math.round(st.mtimeMs)}.g30.mp4`;
  const out = path.join(cacheDir, key);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log(`[export] conformando fonte → H.264 CFR: ${path.basename(srcAbs)}`);
    try {
      execFileSync(
        "ffmpeg",
        // `-g 30 -keyint_min 30 -sc_threshold 0` → um keyframe por segundo.
        //
        // Sem isso o x264 usa GOP default de 250 frames; como os clipes têm 121–154
        // frames, cada arquivo conformado saía com UM ÚNICO keyframe, no tempo zero.
        // O compositor do Remotion, ao pedir frames em posições espalhadas, precisava
        // redecodificar desde o início a cada seek — e com várias abas de render
        // disputando a mesma fonte isso vira thrash e a extração falha
        // ("No frame found at position"). O render então trava até o timeout de 180s
        // e culpa o `delayRender` mais antigo pendente, que costuma ser o de fonte.
        // Diagnóstico confirmado por ffprobe: todo conformado tinha keyframe só em 0.
        ["-y", "-i", srcAbs, "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
         "-crf", "18", "-c:a", "aac", "-movflags", "+faststart", out],
        // windowsHide: sem janelas de console piscando durante o export.
        { stdio: ["ignore", "ignore", "pipe"], windowsHide: true },
      );
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString().slice(-800);
      throw new Error(`ffmpeg falhou conformando ${path.basename(srcAbs)}: ${stderr ?? e}`);
    }
  }
  return out;
}

/** Slug curto e seguro para nome de arquivo (rótulo da variante). */
function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "v";
}

/** Renderiza UMA timeline num mp4 (staging → bundle → render). Retorna o path relativo. */
async function renderOne(
  job: ExportJob,
  timeline0: Timeline,
  fxPlan0: FxPlan,
  outputPath: string,
  exportsDir: string,
  stageSuffix: string,
  onProgress: (p: number) => void,
  onMissing: (m: string[]) => void,
): Promise<string> {
  const staging = path.join(exportsDir, `.staging-${job.jobId}${stageSuffix}`);
  try {
    const rewritten = rewriteForRender(timeline0, job.client, job.creative);
    let timeline = rewritten.timeline;
    const { assets, unresolved } = rewritten;
    if (unresolved.length) console.warn("[export] refs não interpretadas (mantidas):", unresolved);

    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    const transcodeCache = path.join(exportsDir, ".transcode-cache");
    const missing: string[] = [];
    const remap: Record<string, string> = {};
    for (const ref of assets) {
      const src = sourcePathFor(ref, job.client, job.creative);
      if (!fs.existsSync(src)) { missing.push(`${ref.kind}:${ref.name}`); continue; }
      const safe = ensureWebSafe(src, transcodeCache);
      let stagedRel = stagedPathFor(ref);
      if (safe !== src) {
        const normalized = `${stagedRel}.mp4`;
        remap[stagedRel] = normalized;
        stagedRel = normalized;
      }
      linkOrCopy(safe, path.join(staging, stagedRel));
    }
    timeline = remapFiles(timeline, remap);
    if (missing.length) { console.warn("[export] assets ausentes:", missing); onMissing(missing); }

    const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: staging });
    const fxPlan: FxPlan = { ...fxPlan0, ...(job.captionStyle ? { captionStyle: job.captionStyle } : {}) };
    const inputProps = { timeline, fxPlan, forceTagVideo: job.videoTag === "tag" };
    const offthreadCache = Math.min(2 * 1024 ** 3, Math.max(512 * 1024 ** 2, Math.floor(os.freemem() * 0.3)));
    const composition = await selectComposition({ serveUrl, id: "TimelineFx", inputProps });

    let lastWritten = -1;
    await renderMedia({
      composition, serveUrl, codec: "h264", outputLocation: outputPath, inputProps,
      timeoutInMilliseconds: 180000,
      // FAIXA DE COR. Sem isto o export sai `yuvj420p` / `color_range=pc` (faixa
      // cheia), enquanto todo o resto do pipeline — os takes, o `criativo.mp4` da F6,
      // o que as redes esperam — é `yuv420p` limitado. Medido: o mesmo quadro com
      // luma média 141 no export da F6 e 147 no do editor. Em player que ignora a
      // flag (é a maioria dos apps), isso vira contraste lavado no upload.
      colorSpace: "bt709",
      // ...com um conserto no filtro que a Remotion monta para isso. Ela emite
      // `zscale=matrix=709:matrixin=709:range=limited`, que descreve mal a ENTRADA:
      // os quadros chegam como JPEG (`element-%03d.jpeg`), e JPEG é BT.601 de faixa
      // CHEIA. Declarar a entrada como 709 limitado faz o zscale esticar a faixa de
      // novo e converter a matriz errada — o desvio some no cinza e aparece na cor
      // saturada (medido: 131 no export da F6 contra 136 no do editor, num quadro de
      // rosas). Com a entrada descrita como é, a conversão fecha.
      ffmpegOverride: ({ type, args }) => {
        let ajustado = 0;
        const out = args.map((a) => {
          if (typeof a === "string" && a.startsWith("zscale=matrix=709")) {
            ajustado++;
            return "zscale=matrixin=470bg:rangein=full:matrix=709:range=limited";
          }
          return a;
        });
        if (ajustado) console.log(`[export] faixa/matriz de cor corrigidas no ${type}`);
        return out;
      },
      // `remotion.config.ts` declara `setConcurrency(2)`, mas esse arquivo só é lido
      // pelo CLI — `renderMedia()` programático o ignora por completo. Na prática o
      // render abria ~5 abas, cinco decoders disputando os mesmos arquivos. Aqui a
      // intenção que já existia no config passa a valer de fato.
      //
      // Composição longa cai para UMA aba: um criativo de 61s (1840 frames) morria
      // duas vezes seguidas por volta de 68% do render. O sintoma era sempre o mesmo
      // — "delayRender load-font-Montserrat não foi liberado" —, mas a fonte é a
      // vítima, não a causa: a aba estourava a memória, a Remotion abria outra e o
      // handle de fonte da aba nova nunca fechava.
      // Medido em 2026-10-10 (1080x1920, 383 frames, 16 CPUs): conc=4 → 20,1s,
      // conc=8 → 19,5s. Subir não compra nada — o limite aqui é memória, não
      // paralelismo (havia 2,2 GB livres). Mantido em 4 pelo motivo original.
      concurrency: 4,
      offthreadVideoCacheSizeInBytes: offthreadCache,
      ...(job.scale && job.scale > 0 && job.scale !== 1 ? { scale: job.scale } : {}),
      ...(job.frameRange ? { frameRange: job.frameRange } : {}),
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== lastWritten) { 
          lastWritten = pct; 
          onProgress(progress);
          if (pct % 5 === 0) console.log(`[export] Renderizando... ${pct}%`);
        }
      },
      // Console das abas no log do job. Sem isto, uma falha que só existe dentro do
      // navegador (fonte que não carrega, mídia que erra) chega ao operador como um
      // "delayRender não liberado" sem nenhuma pista de onde veio.
      onBrowserLog: ({ type, text }) => {
        if (type === "error" || type === "warning" || text.startsWith("[fonte]")) {
          console.log(`[browser:${type}] ${text}`);
        }
      },
    });
    const rel = path.relative(REPO, outputPath).replace(/\\/g, "/");
    console.log(`[export] OK → ${rel}`);
    return rel;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

async function run(
  job: ExportJob,
  creativeDir: string,
  exportsDir: string,
  setStatus: (p: Partial<RenderStatus>) => void,
) {
  // ── VEX-11: batch de variantes de hook (1 body × N hooks) ─────────────────
  if (job.variants?.length) {
    const total = job.variants.length;
    const outputs: string[] = [];
    setStatus({ state: "staging", progress: 0, batchTotal: total, batchDone: 0 });
    for (let i = 0; i < total; i++) {
      const v = job.variants[i];
      const out = path.join(exportsDir, `export-${job.jobId}-${slugify(v.label)}.mp4`);
      setStatus({ state: "rendering", batchDone: i, batchLabel: v.label, progress: i / total });
      const rel = await renderOne(
        job, v.timeline, v.fxPlan, out, exportsDir, `-${i}`,
        (p) => setStatus({ state: "rendering", progress: (i + p) / total, batchDone: i, batchLabel: v.label }),
        (m) => setStatus({ missingAssets: m }),
      );
      outputs.push(rel);
      setStatus({ batchDone: i + 1, outputs, progress: (i + 1) / total });
    }
    setStatus({ state: "done", progress: 1, batchDone: total, outputs, output: outputs[0] });
    console.log(`[export] BATCH OK → ${outputs.join(", ")}`);
    return;
  }

  // ── Export único (comportamento original) ─────────────────────────────────
  setStatus({ state: "staging", progress: 0 });
  const output = path.join(exportsDir, `export-${job.jobId}.mp4`);
  setStatus({ state: "rendering", progress: 0 });
  const rel = await renderOne(
    job, job.timeline, job.fxPlan, output, exportsDir, "",
    (p) => setStatus({ state: "rendering", progress: p }),
    (m) => setStatus({ missingAssets: m }),
  );
  setStatus({ state: "done", progress: 1, output: rel });
}

main();
