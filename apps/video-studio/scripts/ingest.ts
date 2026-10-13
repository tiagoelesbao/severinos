// CLI de ingestão (MVC-08): monta o timeline de um criativo e grava timeline.json.
// Uso: node scripts/ingest.ts [client] [creative]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCreative } from "../src/lib/ingest.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../..");
const client = process.argv[2] || "tiago-elesbao";
const creative = process.argv[3] || "13-realchasechappell-84d69e";

const timeline = ingestCreative(REPO, client, creative);

const outDir = path.join(REPO, "outputs", client, "video-plans", creative);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "timeline.json"),
  JSON.stringify(timeline, null, 2),
);

console.log("=== Timeline montada ===");
console.log("clips (ordem de montagem):");
for (const c of timeline.videoTrack) {
  console.log(
    `  ${c.role.padEnd(11)} ${c.file.padEnd(22)} ${c.durationSeconds}s ` +
      `@frame ${c.startFrame} ${c.gap ? "[GAP]" : ""}`,
  );
}
console.log(`audio: ${timeline.audioTrack?.file ?? "(nenhum)"} (${timeline.audioTrack?.durationSeconds ?? 0}s)`);
console.log(`total: ${timeline.durationInFrames} frames @ ${timeline.fps}fps`);
console.log(`ritmo (narração-visual): ${timeline.meta.rhythmGapSeconds}s`);
console.log(`gaps: ${timeline.meta.gaps.length ? timeline.meta.gaps.join(", ") : "(nenhum)"}`);
