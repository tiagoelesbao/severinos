// Render headless da composição base, on-brand por cliente.
// Uso: node scripts/render.mjs [slug]   (slug: virals | tiago-elesbao)
//
// Lê os brand tokens do brand-config.yaml do cliente (mesma fonte da Fase A),
// monta inputProps e renderiza um mp4 em outputs/<slug>/video-renders/.
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { parse } from "yaml";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");
const slug = process.argv[2] || "virals";

const DISPLAY = { virals: "Virals", "tiago-elesbao": "Tiago Elesbão" };
const FALLBACK = {
  primary: "#0C0A1F", secondary: "#181436", accent: "#FF3D68", textPrimary: "#FFFFFF",
};

function loadBrand(s) {
  try {
    const p = path.join(REPO, "squads/virals-marketing-squad/data/clients", s, "brand-config.yaml");
    const d = parse(fs.readFileSync(p, "utf-8")) || {};
    const pal = d.palette || {};
    return {
      primary: pal.primary || FALLBACK.primary,
      secondary: pal.secondary || FALLBACK.secondary,
      accent: pal.accent || FALLBACK.accent,
      textPrimary: pal.text_primary || FALLBACK.textPrimary,
    };
  } catch {
    return FALLBACK;
  }
}

const brand = loadBrand(slug);
const inputProps = {
  title: "VIDEO STUDIO",
  displayName: DISPLAY[slug] || slug,
  fontFamily: "Outfit, system-ui, sans-serif",
  ...brand,
};

const outDir = path.join(REPO, "outputs", slug, "video-renders");
fs.mkdirSync(outDir, { recursive: true });
const outputLocation = path.join(outDir, "base-composition.mp4");

console.log(`[render] cliente=${slug} accent=${brand.accent}`);
console.log("[render] empacotando o bundle Remotion…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/remotion/index.ts"),
});

console.log("[render] selecionando composição…");
const composition = await selectComposition({
  serveUrl,
  id: "BaseComposition",
  inputProps,
});

console.log("[render] renderizando (baixa Chromium na 1ª vez)…");
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps,
});

console.log(`[render] OK → ${path.relative(REPO, outputLocation)}`);
