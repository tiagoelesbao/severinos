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
}

interface RenderStatus {
  jobId: string;
  state: "queued" | "staging" | "bundling" | "rendering" | "done" | "error";
  progress: number;
  output?: string;
  error?: string;
  missingAssets?: string[];
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
  const key = `${path.basename(srcAbs)}.${st.size}-${Math.round(st.mtimeMs)}.mp4`;
  const out = path.join(cacheDir, key);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log(`[export] conformando fonte → H.264 CFR: ${path.basename(srcAbs)}`);
    try {
      execFileSync(
        "ffmpeg",
        ["-y", "-i", srcAbs, "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
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

async function run(
  job: ExportJob,
  creativeDir: string,
  exportsDir: string,
  setStatus: (p: Partial<RenderStatus>) => void,
) {
  const staging = path.join(exportsDir, `.staging-${job.jobId}`);
  try {
    // ── 1. Rewrite + staging (com normalização de fontes VFR) ───────────────
    setStatus({ state: "staging", progress: 0 });
    const rewritten = rewriteForRender(job.timeline, job.client, job.creative);
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
      if (!fs.existsSync(src)) {
        missing.push(`${ref.kind}:${ref.name}`);
        continue;
      }
      const safe = ensureWebSafe(src, transcodeCache);
      let stagedRel = stagedPathFor(ref);
      if (safe !== src) {
        const normalized = `${stagedRel}.mp4`; // Skill_activate.mov → Skill_activate.mov.mp4
        remap[stagedRel] = normalized;
        stagedRel = normalized;
      }
      linkOrCopy(safe, path.join(staging, stagedRel));
    }
    timeline = remapFiles(timeline, remap);
    if (missing.length) {
      console.warn("[export] assets ausentes (viram gap/silêncio):", missing);
      setStatus({ missingAssets: missing });
    }

    // ── 2. Bundle (publicDir = staging) ─────────────────────────────────────
    setStatus({ state: "bundling" });
    console.log(`[export] ${job.client}/${job.creative} — ${timeline.videoTrack.length} clips, ` +
      `${timeline.durationInFrames} frames, ${assets.length} assets (${missing.length} ausentes)`);
    const serveUrl = await bundle({
      entryPoint: path.join(ROOT, "src/remotion/index.ts"),
      publicDir: staging,
    });

    // ── 3. Render ───────────────────────────────────────────────────────────
    const fxPlan: FxPlan = { ...job.fxPlan, ...(job.captionStyle ? { captionStyle: job.captionStyle } : {}) };
    const inputProps = { timeline, fxPlan, forceTagVideo: job.videoTag === "tag" };
    // Cache do OffthreadVideo: o contain-blur decodifica a MESMA fonte 2×/frame
    // e transições sobrepõem clipes → o default despeja frames cedo demais
    // ("No frame found", causa nº 1 da doc). 1–2 GB explícitos resolvem.
    const offthreadCache = Math.min(2 * 1024 ** 3, Math.max(512 * 1024 ** 2, Math.floor(os.freemem() * 0.3)));
    const composition = await selectComposition({ serveUrl, id: "TimelineFx", inputProps });

    const output = path.join(exportsDir, `export-${job.jobId}.mp4`);
    setStatus({ state: "rendering", progress: 0 });
    let lastWritten = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: output,
      inputProps,
      // Materiais pesados (.mov screen captures) + camadas extras: a extração
      // OffthreadVideo pode passar dos 30s default sob contenção de disco/CPU.
      timeoutInMilliseconds: 180000,
      offthreadVideoCacheSizeInBytes: offthreadCache,
      ...(job.frameRange ? { frameRange: job.frameRange } : {}),
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== lastWritten) {
          lastWritten = pct;
          setStatus({ state: "rendering", progress });
        }
      },
    });

    setStatus({ state: "done", progress: 1, output: path.relative(REPO, output).replace(/\\/g, "/") });
    console.log(`[export] OK → ${path.relative(REPO, output)}`);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

main();
