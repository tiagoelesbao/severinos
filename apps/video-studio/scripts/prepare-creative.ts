// Preparação automática de criativo (VEX-02): a ponte Fase A→B sem artesanato.
//
// Uso: node scripts/prepare-creative.ts <client> <creative> [--force-assembly] [--skip-transcribe]
//
// 1. Transcreve os Materiais Brutos (faster-whisper, word-level) → transcript.json
//    com cache por tamanho+mtime (`_meta.files`) — só re-transcreve o que mudou.
// 2. Gera assembly.json (narração/hook/cta + âncoras narração→insert) casando a
//    shotlist do plano + tokens de filename contra o transcript da narração
//    (generateMioloAnchors — determinístico, monotônico, com confiança).
// Status em prepare-status.json (consumido por /api/prepare).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { creativeDirFor, orderClips, resolveMaterials } from "../src/lib/ingest.ts";
import {
  filenameTokens,
  generateMioloAnchors,
  staleFiles,
  type AnchorCandidate,
  type FileStamp,
} from "../src/lib/prepare.ts";
import type { TranscriptWord } from "../src/lib/ingest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

interface TEntry {
  text?: string;
  words?: TranscriptWord[];
  duration?: number;
  error?: string;
}
type TranscriptFile = Record<string, TEntry | { files?: Record<string, FileStamp> }>;

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const forceAssembly = process.argv.includes("--force-assembly");
  const skipTranscribe = process.argv.includes("--skip-transcribe");
  const [client, creative] = args;
  if (!client || !creative) {
    console.error("Uso: node scripts/prepare-creative.ts <client> <creative> [--force-assembly] [--skip-transcribe]");
    process.exit(2);
  }

  const dir = creativeDirFor(REPO, client, creative);
  const statusPath = path.join(dir, "prepare-status.json");
  const setStatus = (state: string, extra: Record<string, unknown> = {}) =>
    fs.writeFileSync(
      statusPath,
      JSON.stringify({ state, ...extra, updatedAt: new Date().toISOString() }),
      "utf-8",
    );

  try {
    run(dir, client, creative, { forceAssembly, skipTranscribe, setStatus });
  } catch (err) {
    console.error("[prepare] ERRO:", err);
    setStatus("error", { error: String(err instanceof Error ? err.message : err) });
    process.exit(1);
  }
}

function run(
  dir: string,
  client: string,
  creative: string,
  opts: {
    forceAssembly: boolean;
    skipTranscribe: boolean;
    setStatus: (s: string, e?: Record<string, unknown>) => void;
  },
) {
  const materialsDir = path.join(dir, "Materiais Brutos");
  if (!fs.existsSync(materialsDir)) {
    throw new Error(`sem Materiais Brutos em ${dir}`);
  }
  const materials = resolveMaterials(materialsDir);
  if (!materials.length) throw new Error("nenhum arquivo de mídia em Materiais Brutos");

  // ── 1. Transcrição com cache ─────────────────────────────────────────────
  const transcriptPath = path.join(dir, "transcript.json");
  let transcript: TranscriptFile = {};
  try {
    transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
  } catch {
    /* primeiro run */
  }
  const meta = (transcript._meta ?? {}) as { files?: Record<string, FileStamp> };
  const stamps: Record<string, FileStamp> = {};
  for (const m of materials) {
    const st = fs.statSync(m.absPath);
    stamps[m.file] = { size: st.size, mtimeMs: Math.round(st.mtimeMs) };
  }
  const transcribed = new Set(
    Object.keys(transcript).filter((k) => k !== "_meta" && !(transcript[k] as TEntry).error),
  );
  const stale = staleFiles(stamps, meta, transcribed);

  if (stale.length && !opts.skipTranscribe) {
    opts.setStatus("transcribing", { files: stale });
    console.log(`[prepare] transcrevendo ${stale.length} arquivo(s): ${stale.join(", ")}`);
    const outTmp = path.join(dir, ".transcribe-out.json");
    execFileSync(
      "python",
      [path.join(ROOT, "scripts", "transcribe.py"), "--out", outTmp,
       ...stale.map((f) => path.join(materialsDir, f))],
      { stdio: ["ignore", "inherit", "inherit"], windowsHide: true },
    );
    const fresh = JSON.parse(fs.readFileSync(outTmp, "utf-8")) as TranscriptFile;
    fs.rmSync(outTmp, { force: true });
    transcript = { ...transcript, ...fresh };
  } else if (stale.length) {
    console.log(`[prepare] --skip-transcribe: ${stale.length} arquivo(s) pendentes ignorados`);
  } else {
    console.log("[prepare] transcript em dia (cache hit)");
  }
  transcript._meta = { files: stamps };
  fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2), "utf-8");

  // ── 2. Assembly (âncoras narração→insert) ────────────────────────────────
  const assemblyPath = path.join(dir, "assembly.json");
  if (fs.existsSync(assemblyPath) && !opts.forceAssembly) {
    console.log("[prepare] assembly.json já existe (use --force-assembly para regerar)");
    opts.setStatus("done", { assembly: "existing" });
    return;
  }
  opts.setStatus("assembling");

  const audio = materials.find((m) => m.kind === "audio");
  const videos = orderClips(materials.filter((m) => m.kind === "video"));
  const hook = videos.find((v) => v.role === "hook");
  const cta = videos.find((v) => v.role === "cta");
  const inserts = videos.filter((v) => v.role !== "hook" && v.role !== "cta");
  // Narração: áudio dedicado; sem ele não há montagem narração-driven.
  const narrationFile = audio?.file;
  if (!narrationFile) {
    console.log("[prepare] sem arquivo de narração (áudio) — assembly não gerado (modo talking-head puro).");
    opts.setStatus("done", { assembly: "skipped-no-narration" });
    return;
  }
  const narr = transcript[narrationFile] as TEntry | undefined;
  if (!narr?.words?.length) {
    throw new Error(`narração ${narrationFile} sem transcript — rode sem --skip-transcribe`);
  }

  // Pistas do plano: shotlist do brief (co-localizado > data/). Pareamento:
  // shotlist == inserts+2 → descarta 1ª/última (hook/cta); == inserts → direto.
  const briefPath = [
    path.join(dir, "video-brief.yaml"),
    path.join(REPO, "squads/virals-marketing-squad/data", `video-brief-${creative}.yaml`),
  ].find((p) => fs.existsSync(p));
  let planHints: string[][] = [];
  if (briefPath) {
    try {
      const brief = parse(fs.readFileSync(briefPath, "utf-8")) as Record<string, any>;
      const shots: Array<Record<string, string>> = brief?.content_plan?.shotlist ?? [];
      const texts = shots.map((s) => `${s.falas_chave ?? ""} ${s.plano ?? ""}`.trim());
      if (texts.length === inserts.length + 2) planHints = texts.slice(1, -1).map((t) => [t]);
      else if (texts.length === inserts.length) planHints = texts.map((t) => [t]);
    } catch {
      /* brief ilegível → segue com filenames */
    }
  }

  const candidates: AnchorCandidate[] = inserts.map((ins, i) => ({
    file: ins.file,
    hints: [...(planHints[i] ?? []), filenameTokens(ins.file).join(" ")],
  }));
  const { anchors, method } = generateMioloAnchors(narr.words, candidates);

  // VEX-06: papéis/ordem explícitos — a Fase B monta por isto (filename é
  // só fallback). Inserts sem papel conhecido recebem o genérico "insert".
  const clips = [
    ...(hook ? [{ file: hook.file, role: "hook", order: 0 }] : []),
    ...inserts.map((ins, i) => ({
      file: ins.file,
      role: ins.role !== "unknown" ? ins.role : "insert",
      order: i + 1,
    })),
    ...(cta ? [{ file: cta.file, role: "cta", order: inserts.length + 1 }] : []),
  ];

  const assembly = {
    _doc:
      "Montagem narração-driven (GERADO pelo prepare-creative — VEX-02). Cada insert " +
      "é ancorado ao trecho da narração que o descreve; âncoras casadas no transcript.",
    narrationFile,
    ...(hook ? { hookFile: hook.file } : {}),
    ...(cta ? { ctaFile: cta.file } : {}),
    clips,
    mioloAnchors: anchors.map((a) => ({ clip: a.clip, anchor: a.anchor })),
    _generated: {
      at: new Date().toISOString(),
      method,
      briefUsed: briefPath ? path.relative(REPO, briefPath).replace(/\\/g, "/") : null,
      anchors: anchors.map((a) => ({ clip: a.clip, anchor: a.anchor, confidence: a.confidence })),
    },
  };
  fs.writeFileSync(assemblyPath, JSON.stringify(assembly, null, 2), "utf-8");

  console.log(`[prepare] assembly gerado (${method}):`);
  for (const a of anchors) {
    console.log(`  ${a.clip} ← "${a.anchor}" (confiança ${a.confidence})`);
  }
  const low = anchors.filter((a) => a.confidence < 0.4);
  if (low.length) {
    console.log(`[prepare] ⚠ ${low.length} âncora(s) de baixa confiança — revisar no Studio.`);
  }
  opts.setStatus("done", {
    assembly: method,
    anchors: assembly._generated.anchors,
    lowConfidence: low.length,
  });
}

main();
