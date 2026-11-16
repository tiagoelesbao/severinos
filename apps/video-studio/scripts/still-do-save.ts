// Renderiza stills a partir do ESTADO SALVO (`studio-edit.json`), e não do
// ingest fresco.
//
// POR QUE ESTE SCRIPT EXISTE, JA HAVENDO `render-stills.ts`
//   O `render-stills.ts` monta o timeline chamando `ingestCreative` — ou seja,
//   ele renderiza o que o studio produziria SOZINHO a partir dos materiais.
//   Isso nao serve para conferir um projeto importado de fora (o pipeline do
//   canal-futebol escreve `studio-edit.json` direto), porque o ingest ignora
//   camadas, posicoes e in-points do arquivo salvo.
//
//   Este aqui carrega o save e renderiza exatamente o que o editor mostra —
//   que e o unico jeito de verificar, sem browser, se um overlay esta no lugar.
//
// Uso: node scripts/still-do-save.ts <client> <creative> [frames...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { creativeDirFor, materialsDirFor } from "../src/lib/ingest.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

const args = process.argv.slice(2);
const client = args[0];
const creative = args[1];
if (!client || !creative) {
  console.error("Uso: node scripts/still-do-save.ts <client> <creative> [frames...]");
  process.exit(2);
}
const frames = args.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const FRAMES = frames.length ? frames : [30, 300, 900];

const savePath = path.join(creativeDirFor(REPO, client, creative), "studio-edit.json");
if (!fs.existsSync(savePath)) {
  console.error(`sem studio-edit.json em ${savePath}`);
  process.exit(1);
}
const saved = JSON.parse(fs.readFileSync(savePath, "utf-8"));
const timeline = saved.timeline;
const fxPlan = saved.fxPlan;

const publicDir = materialsDirFor(REPO, client, creative);
console.log(`[still] ${client}/${creative} — ${timeline.durationInFrames} frames, ` +
  `${timeline.videoTrack.length} clips, ${(timeline.extraLayers ?? []).length} camadas`);
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir });
const composition = await selectComposition({ serveUrl, id: "TimelineFx", inputProps: { timeline, fxPlan } });

const outDir = path.join(ROOT, "stills", `${client}-${creative}`);
fs.mkdirSync(outDir, { recursive: true });
for (const frame of FRAMES) {
  const f = Math.min(frame, composition.durationInFrames - 1);
  const output = path.join(outDir, `still-${String(f).padStart(5, "0")}.png`);
  await renderStill({ composition, serveUrl, output, frame: f, inputProps: { timeline, fxPlan } });
  console.log(`[still] frame ${f} (${(f / composition.fps).toFixed(1)}s) → ${path.relative(ROOT, output)}`);
}
console.log("[still] OK");
