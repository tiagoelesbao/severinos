/**
 * Duração dos templates "Ranking de Prêmios" e "Tela Dividida" — módulo
 * FOLHA de propósito (zero imports): importado tanto por
 * `GarantidoNewFormats.tsx` (via `calculateMetadata`, bundlado pelo
 * Remotion/webpack pro BROWSER) quanto por `lib/generate.ts` e
 * `lib/generateEditorBridge.ts` (lado Next/Node). Um import cruzado direto
 * entre esses dois mundos quebra um dos dois bundlers — achado renderizando
 * de verdade: `generate.ts` importa `node:fs`/`node:path`, e importá-lo
 * (mesmo só por uma função) dentro da árvore do Remotion falha com
 * "UnhandledSchemeError: Reading from node:fs" (webpack do @remotion/bundler
 * não poliflla `node:` por padrão). Isolar as fórmulas aqui, sem nenhuma
 * dependência, é o que deixa as duas pontas concordarem no mesmo número sem
 * puxar o runtime errado pro módulo errado.
 */

const MIN_FRAMES = 60; // 2s — piso de segurança
const MAX_FRAMES = 1350; // 45s @30fps — teto de segurança contra upload absurdo

function clampDurationFrames(frames: number): number {
  return Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, Math.round(frames)));
}

/**
 * Duração mínima do Ranking em função da QUANTIDADE de ganhadores (variável
 * — "não mais travado em 3", founder 2026-10-18): tempo pra revelar todas as
 * posições + segurar a leitura.
 */
export function rankingTotalFrames(itemCount: number): number {
  const n = Math.max(1, itemCount || 3);
  const lastRowEnterAt = 24 + (n - 1) * 16;
  const lastRowSettledAt = lastRowEnterAt + 16;
  const HOLD_AFTER = 98; // tempo de leitura após a última posição assentar
  return lastRowSettledAt + HOLD_AFTER;
}

/**
 * Duração REAL da Tela Dividida (2026-10-19, founder: "upei vídeo de 7
 * segundos e o output foi 6... esse template consiste apenas em tela
 * dividida, não é pra herdar vício do template anterior que encerrava antes
 * pra transitar") — o take é a peça INTEIRA, a duração É a do vídeo-fonte
 * que o usuário escolheu, não uma constante fixa pensada pra uma transição
 * que esse template não tem mais.
 */
export function splitScreenDurationFrames(sourceDurationFrames: number | undefined, fallback: number): number {
  const base = sourceDurationFrames && sourceDurationFrames > 0 ? sourceDurationFrames : fallback;
  return clampDurationFrames(base);
}

/**
 * Duração REAL do Ranking — mesmo princípio do split-screen acima (respeita
 * o vídeo-fonte completo), com um PISO pra sempre dar tempo de revelar todas
 * as posições escolhidas, mesmo se o vídeo-fonte for mais curto que isso.
 */
export function rankingDurationFrames(itemCount: number, sourceDurationFrames: number | undefined): number {
  const floor = rankingTotalFrames(itemCount);
  const base = sourceDurationFrames && sourceDurationFrames > 0 ? Math.max(sourceDurationFrames, floor) : floor;
  return clampDurationFrames(base);
}
