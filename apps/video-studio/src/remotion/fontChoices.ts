/**
 * Metadados PUROS das fontes disponíveis (sem base64, sem remotion) — seguro
 * importar na UI (client component) sem puxar o bundle de fontes nem efeitos de
 * registro. O binário (base64) e o registro FontFace ficam em fonts.ts.
 */
export interface FontChoiceMeta {
  /** Valor persistido em captionTheme.fontFamily. */
  id: string;
  /** Nome exibido na UI. */
  label: string;
  /** font-family CSS que o navegador resolve. */
  family: string;
  /** Categoria (ajuda a escolher). */
  kind: "sans" | "serif" | "display" | "condensed";
}

export const FONT_CHOICES: FontChoiceMeta[] = [
  { id: "montserrat", label: "Montserrat · geométrica", family: "Montserrat", kind: "sans" },
  { id: "playfair", label: "Playfair Display · serifada", family: "Playfair Display", kind: "serif" },
  { id: "anton", label: "Anton · display pesada", family: "Anton", kind: "display" },
  { id: "bebasneue", label: "Bebas Neue · condensada", family: "Bebas Neue", kind: "condensed" },
  { id: "inter", label: "Inter · neutra limpa", family: "Inter", kind: "sans" },
  { id: "poppins", label: "Poppins · arredondada", family: "Poppins", kind: "sans" },
];

/** Resolve id → family CSS (fallback: Montserrat). */
export function fontFamilyById(id?: string): string {
  return FONT_CHOICES.find((f) => f.id === id)?.family ?? "Montserrat";
}
