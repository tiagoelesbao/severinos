// Render headless das 3 peças separadas "take real → celular" (Garantido
// Prêmios) — uma por take, substituindo a peça única sequencial
// (render-garantido.mjs / GarantidoTakes) por pedido do founder (2026-10-09).
// Uso: node scripts/render-garantido-ads.mjs
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

const publicDir = path.join(
  REPO,
  "squads/virals-marketing-squad/data/clients/garantido-premios/meta-ads/creatives/campanha-1-whitelist-social/takes-base",
);

const outDir = path.join(REPO, "outputs", "garantido-premios", "video-renders");
fs.mkdirSync(outDir, { recursive: true });

const JOBS = [
  { id: "GarantidoTake1Ad", takeFile: "take1_video1-fonte_sem-texto_20261008_clean.mp4", out: "take1-ad.mp4" },
  { id: "GarantidoTake2Ad", takeFile: "take2_video1-fonte_sem-texto_20261008_clean.mp4", out: "take2-ad.mp4" },
  { id: "GarantidoTake3Ad", takeFile: "take3_video1-fonte_sem-texto_20261008_clean.mp4", out: "take3-ad.mp4" },
];

console.log("[render-garantido-ads] empacotando o bundle Remotion…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
  publicDir,
});

for (const job of JOBS) {
  const inputProps = { takeFile: job.takeFile };
  const outputLocation = path.join(outDir, job.out);

  console.log(`[render-garantido-ads] selecionando composição ${job.id}…`);
  const composition = await selectComposition({ serveUrl, id: job.id, inputProps });

  console.log(`[render-garantido-ads] renderizando ${job.id} (${composition.durationInFrames} frames)…`);
  // concurrency BAIXA de propósito: os 3 takes são H264 reencodado com
  // keyframes irregulares — o extrator Rust do Remotion flaka ("No frame
  // found at position...") sob concorrência alta (mesmo problema documentado
  // em render-imperio.mjs e no forceTagVideo do TimelineFxComposition.tsx).
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    audioCodec: "aac",
    concurrency: 2,
  });

  console.log(`[render-garantido-ads] OK → ${path.relative(REPO, outputLocation)}`);
}

console.log("[render-garantido-ads] 3 peças renderizadas.");
