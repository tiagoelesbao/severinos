// Extrai frames-chave em PNG de uma composição, para QA visual antes do
// render final (olhar o resultado real, não só o código).
//
// Uso: node scripts/stills.mjs <compositionId> <publicDir> <outDir> <frame1,frame2,...> [--props=path.json]
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const [, , compId, publicDirArg, outDirArg, framesArg, propsArg] = process.argv;

if (!compId || !publicDirArg || !outDirArg || !framesArg) {
  console.error(
    "Uso: node scripts/stills.mjs <compositionId> <publicDir> <outDir> <frame1,frame2,...> [propsJsonPath]",
  );
  process.exit(1);
}

const publicDir = path.resolve(publicDirArg);
const outDir = path.resolve(outDirArg);
const frames = framesArg.split(",").map((f) => parseInt(f.trim(), 10));
fs.mkdirSync(outDir, { recursive: true });

let inputProps = {};
if (propsArg) {
  inputProps = JSON.parse(fs.readFileSync(path.resolve(propsArg), "utf-8"));
}

console.log(`[stills] bundle… (publicDir=${publicDir})`);
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
  publicDir,
});

console.log(`[stills] composição=${compId}`);
const composition = await selectComposition({ serveUrl, id: compId, inputProps });

for (const frame of frames) {
  const outputLocation = path.join(outDir, `${compId}_f${String(frame).padStart(4, "0")}.png`);
  console.log(`[stills] renderizando frame ${frame} → ${outputLocation}`);
  await renderStill({
    composition,
    serveUrl,
    frame,
    output: outputLocation,
    inputProps,
  });
}

console.log(`[stills] OK — ${frames.length} frame(s) em ${outDir}`);
