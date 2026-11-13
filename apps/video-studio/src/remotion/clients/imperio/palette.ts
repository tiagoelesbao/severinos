/**
 * Paleta de marca do Império Prêmios — mesmos tokens já usados em
 * `ImperioIgnicaoPunho.tsx` (extraídos de `apps/imperio-premios-lp/index.html
 * :root`), centralizados aqui pra reuso pelos templates novos
 * (`ImperioNewFormats.tsx` — 2026-10-19, founder: "mesmas variações de
 * template, porém modifique o estilo visual e paleta... não pode ficar uma
 * edição igual em dois clientes do mesmo nicho").
 *
 * Identidade: coroação/dourado (não verde-institucional como a Garantido).
 * O ouro é a cor PRIMÁRIA aqui — não um acento estrito como no banner da
 * Garantido — por isso os templates novos usam ouro no botão/realces
 * (inversão deliberada do padrão "botão verde" da Garantido) e reservam o
 * verde SÓ pro CTA herdado da peça original (não usado nos templates novos).
 */

export const BG = "#0a0a0f";
export const BG_2 = "#15131f";
export const INK = "#1c1826";

export const GOLD = "#e3a73e";
export const GOLD_LIGHT = "#f4c869";
export const GOLD_DEEP = "#9a6a16";

export const GREEN = "#3ddc6f";
export const GREEN_DARK = "#2bb85a";

export const TEXT = "#f5f5f7";
export const TEXT_MUTED = "#a8a3b4";

/** Medalhas do Ranking (2026-10-19) — badge numerado por posição, não pílula
 * plana como a Garantido. Só os 3 primeiros ganham cor de medalha; do 4º em
 * diante cai no `DEFAULT_MEDAL`. */
export const MEDAL_GOLD = { bg: "linear-gradient(135deg, #f4c869 0%, #e3a73e 100%)", text: "#3a2600" };
export const MEDAL_SILVER = { bg: "linear-gradient(135deg, #e3e3ea 0%, #9a9aa8 100%)", text: "#1a1a22" };
export const MEDAL_BRONZE = { bg: "linear-gradient(135deg, #d6975a 0%, #9a5a26 100%)", text: "#2a1200" };
export const DEFAULT_MEDAL = { bg: "linear-gradient(135deg, #3a3542 0%, #221f2b 100%)", text: GOLD_LIGHT };
