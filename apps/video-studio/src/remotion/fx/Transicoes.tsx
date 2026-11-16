import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  normalizaTransicao,
  framesDaTransicao,
  type TransicaoId,
  type Peso,
} from "../../lib/fxCatalog";
import type { TransitionType } from "../../lib/timeline";

/**
 * Renderers do grupo TRANSIÇÕES — as que pegam DOIS takes.
 *
 * COMO A COMPOSIÇÃO EMENDA DOIS CLIPES
 *   Cada clipe começa `frames` antes do seu ponto na timeline e é desenhado por
 *   cima do anterior, que ainda está tocando. Então o que este componente anima
 *   é sempre o clipe QUE ENTRA — o que sai continua visível por baixo, sem
 *   precisar saber de nada.
 *
 *   Duas consequências práticas:
 *   1. transição que precisa mexer nos DOIS lados (push, wipe pelo lado que
 *      sai) só consegue mexer no que entra. Push é resolvido deslocando o que
 *      entra e deixando o de baixo parado — a leitura é a mesma no tempo curto
 *      em que dura;
 *   2. fade pelo preto NÃO é dissolve com preto no meio: o que entra tem que
 *      esperar o anterior sumir. Por isso ele tem uma cortina própria.
 */

export interface TransicaoProps {
  type: TransitionType;
  frames: number;
  peso?: Peso;
  children: React.ReactNode;
}

/** Cortina de cor, usada pelos fades por preto/branco. */
const Cortina: React.FC<{ cor: string; alpha: number }> = ({ cor, alpha }) =>
  alpha <= 0.001 ? null : (
    <AbsoluteFill style={{ backgroundColor: cor, opacity: alpha, pointerEvents: "none" }} />
  );

export const Transicao: React.FC<TransicaoProps> = ({ type, frames, peso, children }) => {
  const f = useCurrentFrame();
  const id: TransicaoId = normalizaTransicao(type);

  if (id === "corte" || frames <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;

  const p = interpolate(f, [0, frames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const estilo: React.CSSProperties = {};
  let cortina: React.ReactNode = null;

  switch (id) {
    case "dissolve":
      estilo.opacity = p;
      break;

    case "blur-dissolve": {
      // O desfoque é máximo NO MEIO e some nas duas pontas: no começo o clipe
      // ainda não apareceu e no fim já assentou. Uma parábola invertida faz
      // isso com uma conta só.
      estilo.opacity = p;
      const meio = 1 - Math.abs(p * 2 - 1);
      estilo.filter = `blur(${(14 * meio).toFixed(2)}px)`;
      break;
    }

    case "fade-preto":
    case "fade-branco": {
      // Duas metades: o anterior morre na cortina, e só então o novo nasce.
      // Se as duas fases se sobrepusessem, seria dissolve com véu — o que é
      // outra coisa e muito mais fraca.
      const cor = id === "fade-preto" ? "#000" : "#fff";
      const subindo = Math.min(1, p * 2);
      const descendo = Math.max(0, 1 - (p - 0.5) * 2);
      estilo.opacity = p < 0.5 ? 0 : interpolate(p, [0.5, 1], [0, 1]);
      cortina = <Cortina cor={cor} alpha={p < 0.5 ? subindo : descendo} />;
      break;
    }

    case "push-esq":
    case "push-dir":
    case "push-cima":
    case "push-baixo":
    case "whip-esq":
    case "whip-dir": {
      const whip = id.startsWith("whip");
      const eixoY = id === "push-cima" || id === "push-baixo";
      const sinal = id === "push-esq" || id === "whip-esq" || id === "push-cima" ? 1 : -1;
      const desloc = (1 - p) * 100 * sinal;
      estilo.transform = eixoY ? `translateY(${desloc}%)` : `translateX(${desloc}%)`;
      // Whip é push + borrão. Sem o borrão vira só um push rápido, que lê como
      // engasgo de reprodução em vez de gesto de câmera.
      if (whip) {
        const meio = 1 - Math.abs(p * 2 - 1);
        estilo.filter = `blur(${(18 * meio).toFixed(2)}px)`;
      }
      estilo.opacity = 1;
      break;
    }

    case "wipe-esq":
    case "wipe-dir": {
      // Cortina de verdade: o que entra é REVELADO por um recorte que atravessa
      // o quadro. Nada se move — é isso que separa wipe de push.
      const pct = (p * 100).toFixed(2);
      estilo.clipPath =
        id === "wipe-esq"
          ? `inset(0 0 0 ${100 - Number(pct)}%)`
          : `inset(0 ${100 - Number(pct)}% 0 0)`;
      estilo.opacity = 1;
      break;
    }

    case "zoom-punch":
      estilo.opacity = p;
      estilo.transform = `scale(${interpolate(p, [0, 1], [1.35, 1])})`;
      break;

    case "zoom-afasta":
      estilo.opacity = p;
      estilo.transform = `scale(${interpolate(p, [0, 1], [0.82, 1])})`;
      break;

    case "glitch": {
      // Deslocamento lateral em degraus (não contínuo — falha de sinal não
      // interpola) e separação de canal via drop-shadow ciano/magenta.
      const passo = Math.floor(p * 5);
      const salto = passo % 2 === 0 ? 1 : -1;
      const força = (1 - p) * 14;
      estilo.opacity = p > 0.15 ? 1 : p / 0.15;
      estilo.transform = `translateX(${(salto * força).toFixed(1)}px)`;
      estilo.filter =
        `drop-shadow(${(salto * força * 0.5).toFixed(1)}px 0 0 rgba(0,255,255,.55)) ` +
        `drop-shadow(${(-salto * força * 0.5).toFixed(1)}px 0 0 rgba(255,0,120,.55))`;
      break;
    }
  }

  return (
    <>
      <AbsoluteFill style={estilo}>{children}</AbsoluteFill>
      {cortina}
    </>
  );
};

/**
 * Duração efetiva da transição de um clipe. `durationInFrames` explícito vence
 * o peso — quem ajustou à mão tinha um motivo.
 */
export function duracaoTransicao(
  t: { type: TransitionType; durationInFrames?: number; peso?: Peso } | undefined,
  padrao: number,
): number {
  if (!t) return padrao;
  const id = normalizaTransicao(t.type);
  if (id === "corte") return 0;
  if (t.durationInFrames && t.durationInFrames > 0) return t.durationInFrames;
  return framesDaTransicao(id, t.peso ?? "medio");
}
