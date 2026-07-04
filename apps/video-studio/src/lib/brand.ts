import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

/**
 * Brand tokens lidos do brand-config.yaml do cliente (fonte única já usada pelo
 * pipeline da Fase A). Dirige cores/tipografia das composições Remotion.
 */
export interface BrandTokens {
  slug: string;
  displayName: string;
  primary: string;
  secondary: string;
  accent: string;
  textPrimary: string;
  fontFamily: string;
}

const DISPLAY: Record<string, string> = {
  virals: "Virals",
  "tiago-elesbao": "Tiago Elesbão",
};

const FALLBACK: Omit<BrandTokens, "slug"> = {
  displayName: "Virals",
  primary: "#0C0A1F",
  secondary: "#181436",
  accent: "#FF3D68",
  textPrimary: "#FFFFFF",
  fontFamily: "Outfit, system-ui, sans-serif",
};

/**
 * Lê os tokens de marca do cliente; degrada para o fallback se ausente.
 * `repoRoot` é explícito (path absoluto) — MVC-07/QA: substitui o `process.cwd()`
 * frágil, robusto a partir de qualquer cwd.
 */
export function loadBrandTokens(repoRoot: string, slug = "virals"): BrandTokens {
  try {
    const p = path.join(
      repoRoot,
      "squads/virals-marketing-squad/data/clients",
      slug,
      "brand-config.yaml",
    );
    const data = (parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>) || {};
    const palette = (data.palette as Record<string, string>) || {};
    return {
      slug,
      displayName: DISPLAY[slug] || slug,
      primary: palette.primary || FALLBACK.primary,
      secondary: palette.secondary || FALLBACK.secondary,
      accent: palette.accent || FALLBACK.accent,
      textPrimary: palette.text_primary || FALLBACK.textPrimary,
      fontFamily: FALLBACK.fontFamily,
    };
  } catch {
    return { slug, ...FALLBACK, displayName: DISPLAY[slug] || slug };
  }
}
