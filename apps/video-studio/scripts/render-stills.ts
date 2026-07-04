// Renderiza STILLS da composição com FX (legendas reais + auto-cut) para
// inspeção estética. Uso: node scripts/render-stills.ts [frames...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import fsNode from "node:fs";
import { parse } from "yaml";
import { ingestCreative, materialsDirFor, creativeDirFor } from "../src/lib/ingest.ts";
import { loadBrandTokens } from "../src/lib/brand.ts";
import { buildFxPlan } from "../src/lib/fxPlan.ts";
import {
  loadTranscript,
  buildRealCaptions,
  tokenizeScript,
  correctTranscript,
  loadRoteiroScript,
} from "../src/lib/transcript.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");
const client = "tiago-elesbao";
const creative = "13-realchasechappell-84d69e";

const frames = (process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n)));
const FRAMES = frames.length ? frames : [12, 160, 470, 980, 1500];

const timeline = ingestCreative(REPO, client, creative, { tightenNarration: true });
const bt = loadBrandTokens(REPO, client);
const brand = { accent: bt.accent, primary: bt.primary, displayName: bt.displayName, fontFamily: bt.fontFamily };
// Roteiro do brief (corrige as palavras do Whisper — B4).
const briefPath = path.join(
  REPO,
  "squads/virals-marketing-squad/data",
  `video-brief-${creative}.yaml`,
);
let script = "";
if (fsNode.existsSync(briefPath)) {
  const brief = (parse(fsNode.readFileSync(briefPath, "utf-8")) as Record<string, any>) || {};
  script = brief.content_plan?.script || "";
}
const fxPlan = buildFxPlan({ brand, templateRefs: null, script: "", audioMs: 0 });
const transcript = loadTranscript(creativeDirFor(REPO, client, creative));
if (transcript) {
  const correctionScript = loadRoteiroScript(creativeDirFor(REPO, client, creative)) || script;
  const corrected = correctTranscript(transcript, tokenizeScript(correctionScript));
  fxPlan.captions = buildRealCaptions(timeline, corrected);
}

const publicDir = materialsDirFor(REPO, client, creative);
console.log(`[stills] bundling… (${timeline.durationInFrames} frames total)`);
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir });
const composition = await selectComposition({ serveUrl, id: "TimelineFx", inputProps: { timeline, fxPlan } });

const outDir = path.join(ROOT, "stills");
fs.mkdirSync(outDir, { recursive: true });
for (const frame of FRAMES) {
  const f = Math.min(frame, composition.durationInFrames - 1);
  const output = path.join(outDir, `still-${String(f).padStart(5, "0")}.png`);
  await renderStill({ composition, serveUrl, output, frame: f, inputProps: { timeline, fxPlan } });
  console.log(`[stills] frame ${f} (${(f / composition.fps).toFixed(1)}s) → ${path.relative(ROOT, output)}`);
}
console.log("[stills] OK");
