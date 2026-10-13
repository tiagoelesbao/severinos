// Render do timeline COM FX (MVC-09). Smoke por padrão (90 frames); --full p/ tudo.
// Uso: node scripts/render-fx.ts [client] [creative] [--full]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { parse } from "yaml";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCreative, materialsDirFor } from "../src/lib/ingest.ts";
import { loadBrandTokens } from "../src/lib/brand.ts";
import { buildFxPlan } from "../src/lib/fxPlan.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

const full = process.argv.includes("--full");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const client = args[0] || "tiago-elesbao";
const creative = args[1] || "13-realchasechappell-84d69e";

const timeline = ingestCreative(REPO, client, creative);
const publicDir = materialsDirFor(REPO, client, creative);

// video-brief: roteiro (legendas) + template_refs (presets de FX).
const briefPath = path.join(
  REPO,
  "squads/virals-marketing-squad/data",
  `video-brief-${creative}.yaml`,
);
const brief = (parse(fs.readFileSync(briefPath, "utf-8")) as Record<string, any>) || {};
const cp = brief.content_plan || {};
const script: string = cp.script || "";
const templateRefs = (cp.edit_spec || {}).template_refs || null;

const bt = loadBrandTokens(REPO, client);
const brand = {
  accent: bt.accent,
  primary: bt.primary,
  displayName: bt.displayName,
  fontFamily: bt.fontFamily,
};

const audioMs = (timeline.audioTrack?.durationSeconds ?? timeline.meta.videoSeconds) * 1000;
const fxPlan = buildFxPlan({ brand, templateRefs, script, audioMs });

console.log(
  `[fx] hook=${fxPlan.hookRenderer} caption=${fxPlan.captionRenderer} ` +
    `motion=[${fxPlan.motionRenderers.join(",")}] captions=${fxPlan.captions.length} accent=${brand.accent}`,
);

console.log("[fx] empacotando (publicDir = Materiais Brutos)…");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir });

const composition = await selectComposition({
  serveUrl,
  id: "TimelineFx",
  inputProps: { timeline, fxPlan },
});

const outDir = path.join(REPO, "outputs", client, "video-plans", creative);
fs.mkdirSync(outDir, { recursive: true });
const outputLocation = path.join(outDir, full ? "fx-render.mp4" : "fx-smoke.mp4");
const lastFrame = full
  ? composition.durationInFrames - 1
  : Math.min(89, composition.durationInFrames - 1);

console.log(`[fx] renderizando frames 0..${lastFrame}${full ? " (full)" : " (smoke)"}…`);
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps: { timeline, fxPlan },
  frameRange: [0, lastFrame],
});

console.log(`[fx] OK → ${path.relative(REPO, outputLocation)}`);
