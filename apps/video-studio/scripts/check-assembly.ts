import path from "node:path";
import { parse as parseYaml } from "yaml";
import fsNode from "node:fs";
import { ingestCreative, creativeDirFor } from "../src/lib/ingest.ts";
import {
  loadTranscript,
  buildRealCaptions,
  loadRoteiroScript,
  tokenizeScript,
  correctTranscript,
} from "../src/lib/transcript.ts";
import { buildAudit } from "../src/lib/audit.ts";

const REPO = path.resolve(import.meta.dirname, "../../..");
const client = "tiago-elesbao";
const creative = "13-realchasechappell-84d69e";

const tighten = process.argv.includes("--autocut");
const gapArg = process.argv.find((a) => a.startsWith("--maxgap="));
const maxGapSec = gapArg ? Number(gapArg.split("=")[1]) : 0.4;
const tl = ingestCreative(REPO, client, creative, { tightenNarration: tighten, maxGapSec });
const fps = tl.fps;
console.log(`\n== TIMELINE (${(tl.durationInFrames / fps).toFixed(2)}s)${tighten ? " [AUTO-CUT]" : ""} ==`);
for (const c of tl.videoTrack) {
  console.log(
    `${c.role.padEnd(11)} ${(c.startFrame / fps).toFixed(2).padStart(6)}s ` +
      `win ${(c.durationInFrames / fps).toFixed(2)}s ` +
      `nativo ${(c.nativeDurationInFrames / fps).toFixed(2)}s ` +
      `speed ${c.playbackRate}× ${c.audioEnabled ? "🔊" : "🔇"}`,
  );
}
if (tl.audioTrack) {
  console.log(
    `narração   start ${(tl.audioTrack.startFrame / fps).toFixed(2)}s ` +
      `window ${(tl.audioTrack.windowFrames / fps).toFixed(2)}s ` +
      `(arquivo ${tl.audioTrack.durationSeconds}s)` +
      (tl.audioTrack.segments ? ` · ${tl.audioTrack.segments.length} segmentos de fala` : ""),
  );
}

const dir = creativeDirFor(REPO, client, creative);
const transcript = loadTranscript(dir);
let roteiro = loadRoteiroScript(dir);
if (!roteiro) {
  const briefPath = path.join(REPO, "squads/virals-marketing-squad/data", `video-brief-${creative}.yaml`);
  if (fsNode.existsSync(briefPath)) {
    const brief = (parseYaml(fsNode.readFileSync(briefPath, "utf-8")) as Record<string, any>) || {};
    roteiro = brief.content_plan?.script || "";
  }
}
let caps: ReturnType<typeof buildRealCaptions> = [];
if (transcript) {
  const corrected = correctTranscript(transcript, tokenizeScript(roteiro));
  caps = buildRealCaptions(tl, corrected);
}

const audit = buildAudit(tl, caps, transcript, roteiro);
console.log(`\n== AUDITORIA (E1) — score ${audit.score}/100 ==`);
console.log(`erros ${audit.stats.erro} · avisos ${audit.stats.aviso} · infos ${audit.stats.info}`);
for (const f of audit.findings) {
  const at = f.atMs != null ? ` @${(f.atMs / 1000).toFixed(1)}s` : "";
  console.log(`[${f.severity.toUpperCase()}] (${f.category})${at} ${f.message}`);
}
