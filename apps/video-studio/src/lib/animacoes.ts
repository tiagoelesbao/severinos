/**
 * Grupo ANIMAÇÕES — o deslocamento que uma entrada ou saída aplica a um
 * elemento, dado o progresso da animação.
 *
 * Fica em `lib/` e não no componente por dois motivos: dá para testar sem
 * montar React, e entrada e saída passam a usar a MESMA tabela. Antes cada
 * uma tinha seu `if`, e por isso "slide" entrava 14% pela esquerda e saía 14%
 * para a direita — assimetria que ninguém decidiu, só aconteceu.
 */

import { normalizaAnimacao, type AnimacaoId } from "./fxCatalog.ts";

export interface DeltaAnim {
  /** Multiplicador de opacidade, 0..1. */
  opacidade: number;
  /** Deslocamento em % do quadro, somado à posição base. */
  dx: number;
  dy: number;
  /** Multiplicador de escala. */
  escala: number;
  /** Desfoque em px (0 = nenhum). */
  desfoque: number;
}

const NEUTRO: DeltaAnim = { opacidade: 1, dx: 0, dy: 0, escala: 1, desfoque: 0 };

/**
 * `-1 * 0` em JavaScript é `-0`, que NÃO é igual a `0` sob `Object.is`. No
 * render dá na mesma; em teste e em comparação de estado, `-0` aparece como
 * diferença onde não há nenhuma. Normalizar aqui evita perseguir esse fantasma
 * depois.
 */
const semZeroNegativo = (n: number) => (n === 0 ? 0 : n);

const DESLOC = 14; // % do quadro — mesma amplitude para todas as direções
const ESCALA = 0.18; // fração de escala das animações que crescem/encolhem
const BLUR = 12; // px no início de `desfoca`

/**
 * `p` = 0 no extremo da animação (elemento ainda fora) e 1 quando assentado.
 * Vale para entrada e para saída: quem chama inverte o sentido do progresso,
 * e por isso as duas ficam simétricas por construção.
 *
 * `sentido` +1 = entrada (vem de fora), -1 = saída (vai para fora). Só muda o
 * lado para onde o elemento se desloca — a forma da curva é a mesma.
 */
export function deltaAnimacao(
  tipo: string | undefined,
  p: number,
  sentido: 1 | -1 = 1,
): DeltaAnim {
  const id: AnimacaoId = normalizaAnimacao(tipo);
  if (id === "nenhuma") return NEUTRO;

  const t = Math.max(0, Math.min(1, p));
  const resto = 1 - t;
  const d = { ...NEUTRO };

  // Toda animação carrega fade junto. Um elemento que só desliza e nunca
  // desaparece cruza a borda do quadro visível — o fade é o que esconde isso.
  d.opacidade = t;

  switch (id) {
    case "fade":
      break;
    case "sobe":
      d.dy = resto * DESLOC * sentido;
      break;
    case "desce":
      d.dy = -resto * DESLOC * sentido;
      break;
    case "entra-esq":
      d.dx = -resto * DESLOC * sentido;
      break;
    case "entra-dir":
      d.dx = resto * DESLOC * sentido;
      break;
    case "cresce":
      d.escala = 1 - ESCALA * resto;
      break;
    case "encolhe":
      d.escala = 1 + ESCALA * resto;
      break;
    case "pop": {
      // Passa do alvo e volta. O overshoot vive na primeira metade do
      // progresso; da metade em diante o elemento assenta. Sem esse retorno
      // seria só um "cresce" com escala maior.
      const over = Math.sin(t * Math.PI) * 0.12;
      d.escala = 1 - ESCALA * resto + over;
      break;
    }
    case "desfoca":
      d.desfoque = BLUR * resto;
      break;
  }
  d.dx = semZeroNegativo(d.dx);
  d.dy = semZeroNegativo(d.dy);
  return d;
}

/** Duração efetiva: o valor explícito vence; na ausência, o padrão do catálogo. */
export function duracaoAnimacao(
  anim: { type?: string; durationInFrames?: number } | undefined,
  padraoDoCatalogo: number,
): number {
  if (!anim) return 0;
  if (normalizaAnimacao(anim.type) === "nenhuma") return 0;
  return anim.durationInFrames && anim.durationInFrames > 0
    ? anim.durationInFrames
    : padraoDoCatalogo;
}
