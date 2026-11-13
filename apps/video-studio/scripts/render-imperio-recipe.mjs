// Render headless a partir de uma RECEITA (ad-recipes/*.yaml) — réplica da
// prova de conceito feita pro Garantido (render-garantido-recipe.mjs),
// aplicada ao Império (2026-10-18). Diferença pro render-imperio.mjs (1
// script = 1 peça fixa): aqui o headline/hook vêm TODOS de fora — gerar uma
// variação nova é editar YAML, nunca tocar neste script nem no .tsx da
// composição.
//
// Uso: node scripts/render-imperio-recipe.mjs <receita1.yaml> [receita2.yaml ...]
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { parse } from "yaml";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");

const CLIENT_DIR = path.join(REPO, "squads/virals-marketing-squad/data/clients/imperio-premios");
const RECIPES_DIR = path.join(CLIENT_DIR, "ad-recipes");
const TEMPLATES_YAML = path.join(CLIENT_DIR, "video-templates.yaml");

// Único take real do Império hoje — mesma pasta usada por render-imperio.mjs.
const publicDir = path.join(CLIENT_DIR, "meta-ads/creatives/motion-transicao-2026-10-09");
const STILL_FILE = "take1_still_punho.png"; // fixo — não varia por receita (só existe 1 still)

const outDir = path.join(REPO, "outputs", "imperio-premios", "video-renders", "recipe-batch-2026-10-18");
fs.mkdirSync(outDir, { recursive: true });

const recipeArgs = process.argv.slice(2);
if (recipeArgs.length === 0) {
  console.error("Uso: node scripts/render-imperio-recipe.mjs <receita1.yaml> [receita2.yaml ...]");
  process.exit(1);
}

// video-templates.yaml do cliente — resolve hook_pack.id -> camera real
// (CameraId de src/lib/fxCatalog.ts). Mesma ressalva do Garantido: isso NÃO
// passa pelo resolveHook() genérico (heurística orgânica) — lê o campo
// `camera` direto.
const templates = parse(fs.readFileSync(TEMPLATES_YAML, "utf-8"));
const hookById = Object.fromEntries((templates.hook_packs ?? []).map((h) => [h.id, h]));

function resolveRecipe(recipePath) {
  const raw = parse(fs.readFileSync(recipePath, "utf-8"));
  const hookPack = hookById[raw.hook];
  if (!hookPack) {
    throw new Error(`hook "${raw.hook}" não encontrado em video-templates.yaml (${recipePath})`);
  }
  return {
    compositionId: raw.template,
    inputProps: {
      takeFile: raw.take_file,
      stillFile: STILL_FILE,
      headlineCopy: {
        text: raw.headline.text,
        highlightWord: raw.headline.highlight_word,
      },
      hookCamera: hookPack.camera, // "zoom-in" | "zoom-out" | "parada"
    },
    outName: path.basename(recipePath, ".yaml") + ".mp4",
  };
}

console.log("[render-imperio-recipe] empacotando o bundle Remotion…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
  publicDir,
});

for (const arg of recipeArgs) {
  const recipePath = path.isAbsolute(arg) ? arg : path.join(RECIPES_DIR, arg);
  const job = resolveRecipe(recipePath);
  const outputLocation = path.join(outDir, job.outName);

  console.log(`[render-imperio-recipe] ${path.basename(recipePath)} -> ${job.compositionId} (hook=${job.inputProps.hookCamera})`);
  const composition = await selectComposition({ serveUrl, id: job.compositionId, inputProps: job.inputProps });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: job.inputProps,
    audioCodec: "aac",
    // concurrency BAIXA de propósito — mesma razão de render-imperio.mjs:
    // take1_conformado.mov é ProRes, o extrator Rust flaka com concorrência alta.
    concurrency: 2,
  });

  console.log(`[render-imperio-recipe] OK -> ${path.relative(REPO, outputLocation)}`);
}

console.log(`[render-imperio-recipe] ${recipeArgs.length} variação(ões) renderizada(s).`);
