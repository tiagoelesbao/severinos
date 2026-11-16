/**
 * Paleta de marca da Garantido Prêmios — tokens extraídos de
 * `apps/garantido-premios-lp/v2/index.html` (`:root`), mesma fonte visual
 * aprovada pelo founder para o mockup de celular 3D. Verde/preto/branco só —
 * nenhum tom quente (âmbar/dourado) entra aqui, porque isso pertence à
 * identidade do Império (cliente-irmão, mesmo nicho).
 */

export const GREEN = "#097f23";
export const GREEN_DEEP = "#045a16";
export const GREEN_MID = "#0b9a2a";
export const NEON = "#01bf01";
export const NEON_HI = "#37e332";
export const MINT = "#cef4d2";

export const DK = "#06100a";
export const DK2 = "#0b1a11";
export const INK = "#0d2216";
export const INK_2 = "#3f5848";
export const INK_3 = "#6b8071";

/**
 * Cores do BANNER DE PRÊMIO dentro da tela simulada do app — conferidas no
 * print real (`apps/garantido-premios-lp/v2/tela-app-garantido.png`, pedido
 * pelo founder em 2026-10-09): fundo roxo-escuro/preto (ambiente noturno),
 * numerais em dourado com glow, pílulas 1º/2º lugar em amarelo.
 *
 * Escopo ESTRITO: só o banner e as células "reservado" da grade reusam este
 * dourado/roxo — são cores do PRODUTO real (a extração em si), não da marca.
 * Todo o resto da peça (header, CTA, headline, badges) continua na paleta
 * verde/preto/branco da Garantido — o roxo/dourado não "vaza" pra fora do
 * aparelho, senão a peça brigaria com a identidade (mesmo cuidado que o
 * `v2/index.html` já registra sobre a tela reconstruída em CSS).
 */
export const BANNER_BG_DEEP = "#0d0620";
export const BANNER_BG_MID = "#1c0f33";
export const BANNER_PURPLE_GLOW = "rgba(168, 85, 247, 0.35)";
export const GOLD = "#e3a73e";
export const GOLD_LIGHT = "#f6d998";
export const GOLD_DEEP = "#9a6a16";
export const YELLOW_PILL = "#f3d93c";

/** Grade de números — 3 estados reais (print 2026-10-09): verde = livre,
 * amarelo = reservado, azul-marinho = pago. */
export const CELL_LIVRE_A = "#49c252";
export const CELL_LIVRE_B = "#1f9a2c";
export const CELL_RESERVADO = "#f3d93c";
export const CELL_PAGO = "#1b2a46";

/**
 * Cor do "» VALENDO «" no topo do banner — rosa/magenta neon, conferida no
 * mesmo print (achado 2026-10-09: diferente do dourado do numeral, é a cor
 * do pequeno rótulo acima dele). Escopo tão estrito quanto o dourado/roxo
 * acima — só esse rótulo dentro do banner usa esse tom.
 */
export const NEON_PINK = "#ff3fc4";

/** Barra cinza-clara "🏆 Prêmios" da tela do app (print 2026-10-09). */
export const GRAY_BAR = "#eef1ee";
