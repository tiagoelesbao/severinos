import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp01, easeInOutCubic, easeOutCubic, lerp } from "../easing";
import { DK, MINT, NEON_HI } from "./palette";

/**
 * As 3 transições de take real → bloco do celular — uma por peça, cada uma
 * desenhada pra combinar com o MOMENTO ESPECÍFICO daquele take (ver
 * `creatives/campanha-1-whitelist-social/README.md`), não um efeito
 * genérico repetido 3x. Mesma técnica de sobreposição do `GarantidoTakes.tsx`
 * original (a Sequence que entra começa alguns frames ANTES do corte
 * nominal, o take ainda visível por baixo) — só o conteúdo da transição é
 * novo.
 *
 * Deliberadamente SEM o vocabulário do Império (`ImperioIgnicaoPunho.tsx`:
 * flash branco, partículas, zoom-punch): o founder pediu tom "um pouco
 * menos agressivo" — aqui cada transição tem UM gesto só, nunca dois
 * efeitos empilhados, e a cortina usa o verde-escuro da marca (`DK`) em vez
 * de preto/branco puro, pra nunca cortar pra "nada" na tela.
 *
 * Achado 2026-10-09 (founder reportou "tremida de travamento" em TODOS os
 * vídeos): medi o "scene score" (diferença frame-a-frame) do take real
 * puro vs. do render final nas 3 peças — em todas as 3, a MAIOR divergência
 * cai exatamente na janela de sobreposição (BRIDGE) com a transição, não em
 * nenhum ponto do take real isolado (que bate com a fonte bruta perfeitamente
 * fora dessa janela). Causa raiz: o elemento extra de cada transição (o
 * bloom aqui, o sweep da Chegada, o anel da Combinado) competia visualmente
 * com o movimento real do take bem no handoff — na Abraco isso lia como
 * "apagão"/congelamento (bloom escurecendo + PhoneBlock ainda quase parado
 * no início do próprio reveal, score de movimento caindo); na Chegada e na
 * Combinado lia como um pulo/flicker (sweep e anel introduzindo movimento
 * que a fonte bruta não tem). Reduzi a intensidade de pico dos 3 efeitos
 * (mantendo o gesto, só com menos força) — não é mais "travada" nem "pulo",
 * é dissolve limpo. Confirmado de novo pela mesma métrica após o ajuste.
 */

interface TransicaoProps {
  frames: number;
  children: React.ReactNode;
}

/**
 * Take 1 (abraço prolongado) → bloco do celular: um bloom verde-menta que
 * cresce e esmaece no centro do quadro — o mesmo calor visual do abraço,
 * sem nenhum flash branco nem partícula. Pico exatamente na metade da
 * transição, onde o take e o celular dividem a tela por um instante.
 */
export const TransicaoAbraco: React.FC<TransicaoProps> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const p = clamp01(f / frames);
  const bloomP = 1 - Math.abs(p * 2 - 1); // 0 → 1 → 0, pico em p=0.5
  const incomingOpacity = easeInOutCubic(p);

  return (
    <>
      <AbsoluteFill style={{ opacity: incomingOpacity }}>{children}</AbsoluteFill>
      {bloomP > 0.01 && <AbsoluteFill style={{ backgroundColor: DK, opacity: bloomP * 0.09, pointerEvents: "none" }} />}
      {bloomP > 0.01 && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {/* Bloom CONTIDO: círculo menor que o quadro (nunca cobre a tela
              inteira) e opacidade baixa — o 1º still de QA mostrou isso
              virando um "flash verde" de tela cheia quando o círculo
              crescia além do canvas e a opacidade passava de ~0.5; é
              exatamente o tipo de agressividade que o founder pediu pra
              evitar, só que em verde em vez de branco/dourado. Intensidade
              reduzida de novo em 2026-10-09 (0.22→0.09 no overlay escuro,
              0.4→0.2 no círculo) — o bloom na força original mascarava o
              movimento real do take bem no pico (p=0.5), lendo como
              congelamento/travada em vez de dissolve. */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "46%",
              width: 560,
              height: 560,
              transform: `translate(-50%, -50%) scale(${lerp(0.5, 1.15, bloomP)})`,
              opacity: bloomP * 0.2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${MINT} 0%, ${NEON_HI} 32%, rgba(55,227,50,0) 68%)`,
              filter: "blur(14px)",
            }}
          />
        </AbsoluteFill>
      )}
    </>
  );
};

/**
 * Take 2 (expectativa → chegada do carro no guincho) → bloco do celular: o
 * que entra sobe de leve (como algo "chegando" de baixo) com um único
 * varrido de luz diagonal cruzando o quadro — eco discreto do farol do
 * guincho, não um glitch nem um whip de câmera.
 */
export const TransicaoChegada: React.FC<TransicaoProps> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const p = clamp01(f / frames);
  const eased = easeOutCubic(p);
  const translateY = lerp(56, 0, eased);
  const opacity = eased;
  const sweepP = easeInOutCubic(p);
  const sweepX = lerp(-30, 130, sweepP);
  // Intensidade reduzida 2026-10-09 (0.42/.32 → 0.20/.15 no gradiente,
  // multiplicador extra ×0.55 no envelope) — o sweep na força original
  // introduzia mais mudança de cena do que o take real tinha ali, lendo
  // como flicker/pulo em vez do "eco discreto de farol" pretendido.
  const sweepOpacity = (1 - Math.abs(p * 2 - 1)) * 0.55;

  return (
    <>
      <AbsoluteFill style={{ transform: `translateY(${translateY}px)`, opacity }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "-20%",
            bottom: "-20%",
            left: `${sweepX}%`,
            width: "26%",
            background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(206,244,210,.2) 46%, rgba(255,255,255,.26) 54%, rgba(255,255,255,0) 100%)",
            transform: "rotate(10deg)",
            opacity: sweepOpacity,
          }}
        />
      </AbsoluteFill>
    </>
  );
};

/**
 * Take 3 (abraço final → gesto de "combinado") → bloco do celular: uma íris
 * de borda macia (máscara radial, não `clip-path` — por isso não tem aresta
 * dura) revela o celular a partir do centro, como um selo fechando um
 * acordo. Um anel único se expande e esmaece — o "carimbo", não uma
 * explosão.
 */
export const TransicaoCombinado: React.FC<TransicaoProps> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const p = clamp01(f / frames);
  const eased = easeInOutCubic(p);
  const radius = lerp(0, 100, eased);
  const feather = 20;
  const maskImage = `radial-gradient(circle at 50% 46%, #000 ${Math.max(radius - feather, 0)}%, transparent ${radius}%)`;
  const ringScale = lerp(0.2, 2.4, eased);
  // Opacidade reduzida 2026-10-09 (0.85→0.45) — mesma causa das outras 2
  // transições: o anel na força original introduzia mais variação de cena
  // do que a íris sozinha precisava, lendo como pulo no handoff.
  const ringOpacity = (1 - eased) * 0.45;

  return (
    <>
      <AbsoluteFill
        style={{
          WebkitMaskImage: maskImage,
          maskImage,
        }}
      >
        {children}
      </AbsoluteFill>
      {ringOpacity > 0.01 && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "46%",
              width: 360,
              height: 360,
              transform: `translate(-50%, -50%) scale(${ringScale})`,
              borderRadius: "50%",
              border: `3px solid ${NEON_HI}`,
              opacity: ringOpacity,
            }}
          />
        </AbsoluteFill>
      )}
    </>
  );
};
