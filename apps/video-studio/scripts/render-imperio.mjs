// Render headless da peça "Ignição do Punho" (Império Prêmios).
// Uso: node scripts/render-imperio.mjs
//
// publicDir aponta direto pra pasta do criativo-fonte (sem copiar os arquivos
// de vídeo pro repo) — staticFile() resolve relativo a ela.
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
  "squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/creatives/motion-transicao-2026-10-09",
);

const inputProps = {
  takeFile: "take1_conformado.mov",
  stillFile: "take1_still_punho.png",
};

const outDir = path.join(REPO, "outputs", "imperio-premios", "video-renders");
fs.mkdirSync(outDir, { recursive: true });
const outputLocation = path.join(outDir, "ignicao-do-punho.mp4");

console.log("[render-imperio] empacotando o bundle Remotion…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
  publicDir,
});

console.log("[render-imperio] selecionando composição ImperioIgnicaoPunho…");
const composition = await selectComposition({ serveUrl, id: "ImperioIgnicaoPunho", inputProps });

console.log("[render-imperio] renderizando (take real + motion graphics, ~292 frames)…");
// concurrency BAIXA de propósito: `take1_conformado.mov` é ProRes, e o extrator
// Rust do Remotion flakou ("No frame found at position...") em ~3 de 5 renders
// quando 8 tabs lêem esse arquivo em paralelo (default = nº de cores). Baixar
// pra 2 elimina a contenção — custa tempo de render, não corretude.
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps,
  audioCodec: "aac",
  concurrency: 2,
});

console.log(`[render-imperio] OK → ${path.relative(REPO, outputLocation)}`);
