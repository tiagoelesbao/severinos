// Render do timeline auto-montado (MVC-08). Por padrão renderiza um SMOKE
// (primeiros ~90 frames) para provar a montagem com os clips reais sem o custo
// do vídeo inteiro. `--full` renderiza tudo.
//
// Uso: node scripts/render-timeline.ts [client] [creative] [--full]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCreative, materialsDirFor } from "../src/lib/ingest.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const full = process.argv.includes("--full");
const client = args[0] || "tiago-elesbao";
const creative = args[1] || "13-realchasechappell-84d69e";

const timeline = ingestCreative(REPO, client, creative);
const publicDir = materialsDirFor(REPO, client, creative);

console.log(`[timeline] ${client}/${creative} — ${timeline.videoTrack.length} clips, ` +
  `${timeline.durationInFrames} frames, ritmo ${timeline.meta.rhythmGapSeconds}s`);

console.log("[timeline] empacotando (publicDir = Materiais Brutos)…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
  publicDir,
});

const composition = await selectComposition({
  serveUrl,
  id: "Timeline",
  inputProps: { timeline },
});

const outDir = path.join(REPO, "outputs", client, "video-plans", creative);
fs.mkdirSync(outDir, { recursive: true });
const outputLocation = path.join(outDir, full ? "timeline-render.mp4" : "timeline-smoke.mp4");

const lastFrame = full
  ? composition.durationInFrames - 1
  : Math.min(89, composition.durationInFrames - 1);

console.log(`[timeline] renderizando frames 0..${lastFrame}${full ? " (full)" : " (smoke)"}…`);
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps: { timeline },
  frameRange: [0, lastFrame],
});

console.log(`[timeline] OK → ${path.relative(REPO, outputLocation)}`);
