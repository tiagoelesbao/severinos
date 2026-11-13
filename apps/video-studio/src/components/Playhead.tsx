"use client";

import React, { useSyncExternalStore } from "react";
import {
  subscribePlayhead,
  getPlayheadFrame,
  getPlayheadServerFrame,
} from "../lib/playhead";

/**
 * Hook de leitura do playhead. Só quem chama isto re-renderiza a cada quadro —
 * e a regra é: chame o mais FUNDO possível na árvore, num nó folha.
 *
 * Chamar isto no componente de página desfaz todo o ganho: a página volta a
 * re-renderizar 30×/s, que era exatamente o defeito. Se um valor derivado do
 * frame é necessário lá em cima, o certo é descer o componente, não subir o hook.
 */
export function usePlayheadFrame(): number {
  return useSyncExternalStore(subscribePlayhead, getPlayheadFrame, getPlayheadServerFrame);
}

/** Contador de tempo do transporte — nó folha, re-renderiza sozinho. */
export const ContadorTempo: React.FC<{ fps: number; totalSec: string; className?: string }> = ({
  fps,
  totalSec,
  className,
}) => {
  const f = usePlayheadFrame();
  return (
    <span className={className}>
      {(f / fps).toFixed(2)}s / {totalSec}s
    </span>
  );
};

/**
 * Linha do playhead na timeline — a única coisa que precisa mudar a cada quadro.
 *
 * `fToX` chega como função para que o componente não precise conhecer zoom nem
 * escala: quando o zoom muda, o pai passa outra função e este nó se ajusta.
 */
export const LinhaPlayhead: React.FC<{
  fToX: (f: number) => number;
  gutter: number;
  altura: number;
  onScrub: () => void;
}> = ({ fToX, gutter, altura, onScrub }) => {
  const f = usePlayheadFrame();
  return (
    <div style={{ position: "absolute", left: gutter + fToX(f), top: 0, height: altura, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 2, height: "100%", background: "var(--color-fg)", boxShadow: "0 0 6px rgba(255,255,255,.6)" }} />
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onScrub();
        }}
        title="Arraste para mover o playhead"
        style={{ position: "absolute", left: -7, top: 0, width: 16, height: 16, background: "var(--color-fg)", clipPath: "polygon(0 0, 100% 0, 50% 100%)", cursor: "ew-resize", pointerEvents: "auto" }}
      />
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onScrub();
        }}
        style={{ position: "absolute", left: -6, top: 0, width: 14, height: "100%", cursor: "ew-resize", pointerEvents: "auto" }}
      />
    </div>
  );
};

/**
 * Envelope de assinatura para um TRECHO de JSX que precisa do frame corrente.
 *
 * Existe porque nem todo consumidor cabe num componente próprio sem uma
 * refatoração grande — o inspector de keyframes, por exemplo, é um bloco no
 * meio da página. Envolvido aqui, esse bloco vira um nó folha assinante: ele
 * re-renderiza a cada quadro, e o resto da página não.
 *
 * A regra continua a mesma: envolva o MENOR trecho que precisa do frame. Se o
 * envelope subir demais na árvore, o ganho desaparece.
 */
export const ComFrame: React.FC<{ children: (frame: number) => React.ReactNode }> = ({ children }) => {
  const f = usePlayheadFrame();
  return <>{children(f)}</>;
};
