import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, Video } from "remotion";
import { Transicao } from "../../fx/Transicoes";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { clamp01, lerp, windowProgress } from "../easing";

/**
 * Garantido Prêmios — os 3 takes reais numa peça sequencial única (decisão já
 * registrada no `ae-spec.md`: mesmo evento contínuo, motion mínimo). Cliente
 * sem `brand-config.yaml` ainda — tipografia neutra (Montserrat, já
 * auto-hospedada no `fonts.ts`) com execução cuidada, não um placeholder torto.
 *
 * Dip de 6 frames entre takes (Regra dos Seis: a emoção é contínua, um corte
 * seco ou uma transição chamativa competiria com a cena real) — reaproveita o
 * `Transicao` (`fx/Transicoes.tsx`, tipo `fade-preto`) já existente no motor,
 * em vez de reescrever a mesma lógica.
 */

export const W = 1080;
export const H = 1920;
export const FPS = 30;

const TAKE1_FRAMES = 228; // 7.6s
const TAKE2_FRAMES = 213; // 7.1s
const TAKE3_FRAMES = 105; // 3.5s
export const TOTAL_FRAMES = TAKE1_FRAMES + TAKE2_FRAMES + TAKE3_FRAMES; // 546 (~18,2s)

const DIP_FRAMES = 6;
const LOWER_THIRD_FRAMES = 60; // 2s

// Posições nominais (sem o pre-roll da transição — âncoras de tempo reais)
const TAKE2_START = TAKE1_FRAMES; // 228
const TAKE3_START = TAKE1_FRAMES + TAKE2_FRAMES; // 441
const LOWER_THIRD_START = TOTAL_FRAMES - LOWER_THIRD_FRAMES; // 486

export interface GarantidoTakesProps {
  take1File: string;
  take2File: string;
  take3File: string;
  phone: string;
  brandName: string;
}

/**
 * `<Video>` (tag nativa do navegador), não `<OffthreadVideo>` — os 3 takes
 * foram reencodados com `libx264 -crf 17` em pontos de corte que não batem
 * com os keyframes a cada 1s do arquivo-fonte (ver `README.md` da pasta de
 * origem), e isso quebrou o extrator Rust do Remotion no 1º render
 * ("No frame found at position..."). O próprio motor (`TimelineFxComposition.tsx`,
 * prop `forceTagVideo`) já documentava esse workaround — reaproveitado aqui
 * em vez de reinventado. `<Video>` carrega vídeo+áudio num elemento só.
 */
const TakeClip: React.FC<{ file: string }> = ({ file }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Video src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);

/**
 * Lower-third de contato — placeholder neutro (sem brand-config ainda):
 * branco com leve contorno, sans bold, barra semi-transparente preta
 * (`rgba(0,0,0,0.55)`, mesma lógica de opacidade já usada nos criativos do
 * Império-irmão).
 */
const LowerThirdContato: React.FC<{ phone: string; brandName: string }> = ({ phone, brandName }) => {
  const frame = useCurrentFrame();

  const slideP = windowProgress(frame, 0, 10);
  const barY = lerp(60, 0, easeOutCubicLocal(slideP));
  const barOpacity = clamp01(slideP * 1.4);

  const nameP = windowProgress(frame, 4, 10);
  const phoneP = windowProgress(frame, 6, 8);

  const fadeOutP = 1 - windowProgress(frame, LOWER_THIRD_FRAMES - 10, 10);
  const globalOpacity = Math.min(barOpacity, fadeOutP);

  if (globalOpacity <= 0.01) return null;

  const textStyle: React.CSSProperties = {
    fontFamily: FONT_SANS,
    color: "#FFFFFF",
    WebkitTextStroke: "1px rgba(0,0,0,0.55)",
    textShadow: "0 2px 10px rgba(0,0,0,0.6)",
  };

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center" }}>
      <div
        style={{
          // marginBottom calibrado pra o cartão inteiro ficar ACIMA de y=1500
          // (zona segura do próprio `ae-spec.md`: "lower-third fica perto da
          // base, mas acima de y=1500" — y1920-460=1460 de borda inferior).
          marginBottom: 460,
          transform: `translateY(${barY}px)`,
          opacity: globalOpacity,
          background: "rgba(0,0,0,0.55)",
          borderRadius: 20,
          padding: "28px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            ...textStyle,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            opacity: nameP,
          }}
        >
          {brandName}
        </div>
        <div
          style={{
            ...textStyle,
            fontWeight: 800,
            fontSize: 54,
            opacity: phoneP,
          }}
        >
          {phone}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function easeOutCubicLocal(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const GarantidoTakes: React.FC<GarantidoTakesProps> = ({
  take1File,
  take2File,
  take3File,
  phone,
  brandName,
}) => {
  ensureFonts([FONT_SANS]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={TAKE1_FRAMES}>
        <TakeClip file={take1File} />
      </Sequence>

      <Sequence from={TAKE2_START - DIP_FRAMES} durationInFrames={TAKE2_FRAMES + DIP_FRAMES}>
        <Transicao type="fade-preto" frames={DIP_FRAMES}>
          <TakeClip file={take2File} />
        </Transicao>
      </Sequence>

      <Sequence from={TAKE3_START - DIP_FRAMES} durationInFrames={TAKE3_FRAMES + DIP_FRAMES}>
        <Transicao type="fade-preto" frames={DIP_FRAMES}>
          <TakeClip file={take3File} />
        </Transicao>
      </Sequence>

      <Sequence from={LOWER_THIRD_START} durationInFrames={LOWER_THIRD_FRAMES}>
        <LowerThirdContato phone={phone} brandName={brandName} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const garantidoDefaultProps: GarantidoTakesProps = {
  take1File: "take1_video1-fonte_sem-texto_20261008.mp4",
  take2File: "take2_video1-fonte_sem-texto_20261008.mp4",
  take3File: "take3_video1-fonte_sem-texto_20261008.mp4",
  phone: "(11) 98156-1271",
  brandName: "Garantido Prêmios",
};
