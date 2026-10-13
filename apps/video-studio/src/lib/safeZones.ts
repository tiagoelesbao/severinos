/**
 * VEX-10: safe-zones das plataformas (Instagram Reels / TikTok / genérico).
 * Zonas em FRAÇÃO da viewport 9:16 (0..1) — puro e testável. São áreas que a
 * UI da plataforma COBRE: legenda/CTA não deve cair dentro delas. Só desenhadas
 * na UI do editor (nunca no export).
 */

export interface Zone {
  id: string;
  label: string;
  /** Canto sup-esq + tamanho, em fração da viewport (0..1). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform {
  id: string;
  label: string;
  zones: Zone[];
}

/**
 * Fração da altura reservada no rodapé para a UI da plataforma. A 1920px de
 * altura → 430px (o antigo número mágico do Captions.tsx passa a derivar daqui).
 */
export const SAFE_CAPTION_BOTTOM = 430 / 1920;

export const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    label: "Instagram Reels",
    zones: [
      { id: "ig-actions", label: "Curtir / comentar / enviar", x: 0.86, y: 0.42, w: 0.14, h: 0.45 },
      { id: "ig-caption", label: "Legenda / @usuário", x: 0.0, y: 0.80, w: 0.72, h: 0.13 },
      { id: "ig-nav", label: "Barra de navegação", x: 0.0, y: 0.93, w: 1.0, h: 0.07 },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    zones: [
      { id: "tt-actions", label: "Perfil / curtir / comentar", x: 0.84, y: 0.40, w: 0.16, h: 0.48 },
      { id: "tt-caption", label: "Legenda / @usuário", x: 0.0, y: 0.78, w: 0.70, h: 0.14 },
      { id: "tt-nav", label: "Barra de navegação", x: 0.0, y: 0.92, w: 1.0, h: 0.08 },
    ],
  },
  {
    id: "generic",
    label: "Título-seguro 9:16",
    zones: [
      { id: "g-top", label: "Margem superior", x: 0.0, y: 0.0, w: 1.0, h: 0.06 },
      { id: "g-bottom", label: "Margem inferior", x: 0.0, y: 0.88, w: 1.0, h: 0.12 },
    ],
  },
];

/** Plataforma por id (fallback: Instagram). */
export function platformById(id: string | undefined): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}

/**
 * Retorna a 1ª zona coberta que contém o ponto (x,y em FRAÇÃO 0..1), ou null.
 * Usado para avisar quando legenda/texto cai sob a UI da plataforma.
 */
export function coveredZoneAt(x: number, y: number, zones: Zone[]): Zone | null {
  for (const z of zones) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
  }
  return null;
}
