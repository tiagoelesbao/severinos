/**
 * Store externo do playhead — o frame corrente FORA do estado do React.
 *
 * O PROBLEMA, MEDIDO NO CONSOLE
 *   Durante a reprodução, o `frameupdate` do Player virava `setCurrentFrame` na
 *   página do studio. Isso re-renderizava, 30 vezes por segundo:
 *     - as ~2.000 linhas de JSX de `/studio`;
 *     - a `Timeline` inteira, com `Filmstrip` e `Waveform` de cada faixa e uma
 *       célula por cue de legenda (386 numa peça de 20 min);
 *     - `estimateLevel`, que varre toda a timeline para desenhar o VU.
 *
 *   O navegador reportava isso como `[Violation] 'message' handler demorou Nms`
 *   (o laço de reprodução da Remotion chega por postMessage) e como `mousedown`
 *   de 294 ms — porque o clique concorria com a mesma árvore sendo remontada.
 *
 *   Nada disso precisava re-renderizar. O único elemento que muda a cada quadro
 *   é a POSIÇÃO da linha do playhead.
 *
 * A SOLUÇÃO
 *   O frame vira um store minúsculo com `subscribe`/`getSnapshot`. Quem precisa
 *   dele se inscreve por `useSyncExternalStore` — e só esse componente
 *   re-renderiza. Um contador de tempo é um `<span>`; o playhead é uma `<div>`
 *   com `left`. Re-renderizar dois nós folha 30×/s é barato; re-renderizar a
 *   página inteira não é.
 *
 * POR QUE UM STORE E NÃO CONTEXT
 *   Context propaga para todos os consumidores DENTRO do provider, o que traria
 *   de volta o mesmo problema assim que alguém consumisse no meio da árvore.
 *   O store notifica exatamente quem se inscreveu, e nada mais.
 */

type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();
let frameAtual = 0;

/** Escreve o frame corrente e notifica os inscritos (no-op se não mudou). */
export function setPlayheadFrame(f: number): void {
  if (f === frameAtual) return;
  frameAtual = f;
  for (const o of ouvintes) o();
}

/** Leitura direta, sem inscrição — para handlers e efeitos. */
export function getPlayheadFrame(): number {
  return frameAtual;
}

export function subscribePlayhead(o: Ouvinte): () => void {
  ouvintes.add(o);
  return () => {
    ouvintes.delete(o);
  };
}

/**
 * `getSnapshot` do servidor. O SSR do Next renderiza esta página uma vez, e sem
 * este par o React reclama de snapshot indefinido na hidratação.
 */
export function getPlayheadServerFrame(): number {
  return 0;
}
