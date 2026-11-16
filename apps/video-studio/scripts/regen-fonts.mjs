/**
 * Regenera src/remotion/fontData.ts a partir dos woff2 em public/fonts/.
 * Fontes AUTO-HOSPEDADAS (subset latin) embutidas em base64 — sem depender do
 * CDN do Google no navegador/render offline.
 *
 * Para adicionar/atualizar uma fonte:
 *   1) baixe o woff2 (subset latin) para public/fonts/<slug>.woff2
 *      (Google Fonts css2, bloco "/* latin *​/");
 *   2) inclua o <slug> em FONTS abaixo;
 *   3) rode: node scripts/regen-fonts.mjs
 *
 * Uso: node scripts/regen-fonts.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// slug do arquivo → nome da constante exportada
const FONTS = [
  ["montserrat", "MONTSERRAT_WOFF2"],
  ["playfair", "PLAYFAIR_WOFF2"],
  ["anton", "ANTON_WOFF2"],
  ["bebasneue", "BEBASNEUE_WOFF2"],
  ["inter", "INTER_WOFF2"],
  ["poppins", "POPPINS_WOFF2"],
];

const b64 = (slug) => readFileSync(join(root, "public/fonts", `${slug}.woff2`)).toString("base64");

const lines = [
  "// GERADO por scripts/regen-fonts.mjs — NÃO editar à mão.",
  "// woff2 subset latin em base64 (auto-hospedado, sem CDN).",
  "/* eslint-disable */",
  ...FONTS.map(([slug, name]) => `export const ${name} = "${b64(slug)}";`),
  "",
];

writeFileSync(join(root, "src/remotion/fontData.ts"), lines.join("\n"));
console.log(`fontData.ts regenerado com ${FONTS.length} fontes.`);
