// Render headless da peça "3 takes" (Garantido Prêmios).
// Uso: node scripts/render-garantido.mjs
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

const inputProps = {
  take1File: "take1_video1-fonte_sem-texto_20261008.mp4",
  take2File: "take2_video1-fonte_sem-texto_20261008.mp4",
  take3File: "take3_video1-fonte_sem-texto_20261008.mp4",
  phone: "(11) 98156-1271",
  brandName: "Garantido Prêmios",
};

const outDir = path.join(REPO, "outputs", "garantido-premios", "video-renders");
fs.mkdirSync(outDir, { recursive: true });
const outputLocation = path.join(outDir, "3-takes-whitelist.mp4");

console.log("[render-garantido] empacotando o bundle Remotion…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
  publicDir,
});

console.log("[render-garantido] selecionando composição GarantidoTakes…");
const composition = await selectComposition({ serveUrl, id: "GarantidoTakes", inputProps });

console.log("[render-garantido] renderizando (3 takes + dip + lower-third, ~546 frames)…");
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps,
  audioCodec: "aac",
});

console.log(`[render-garantido] OK → ${path.relative(REPO, outputLocation)}`);
