import React from "react";
import { FONT_SANS } from "../../fonts";
import { easeOutBack, lerp, windowProgress } from "../easing";
import { GREEN, INK_3 } from "./palette";

/**
 * Mockup 3D do celular — mesma GEOMETRIA do `apps/garantido-premios-lp/v2/
 * index.html` (`.stage > .ph-scroll > .ph-idle > .phone`, aprovado pelo
 * founder): perspective + preserve-3d, 4 placas em Z negativo pra espessura
 * física, bezel metálico com sombra em escada, tela com dynamic island e
 * brilho de vidro. Recriado como componente React/Remotion (mesmo princípio
 * do `Crown.tsx` do Império — vetorizar/recriar o que já existe, não
 * aproximar).
 *
 * A diferença de fundo pro CSS original: lá a animação roda em
 * `@keyframes`/`animation-timeline: view()` (compositor do navegador, livre);
 * aqui cada frame é avaliado isoladamente pelo Remotion, então toda
 * respiração/flutuação/glint é `mgFrame` passado por `interpolate`/funções de
 * `easing.ts` — sem CSS animation nenhuma.
 *
 * Duas pílulas flutuantes (`.ph-tag t1`/`t2`) saem do aparelho com o MESMO
 * texto literal da LP real — recurso já aprovado pelo founder, reaproveitado
 * aqui em vez de reinventado.
 */

const PHONE_R = 30;
const DEPTH = 14;

const SLAB_LAYERS = [1, 0.72, 0.44, 0.18];

export interface PhoneTag {
  title: string;
  sub: string;
}

/** Copy padrão das 2 pílulas flutuantes — mesmo texto literal da LP real,
 * mantido como fallback quando o usuário não configura algo diferente na
 * tela "Configurar copy" do /studio/generate. */
export const DEFAULT_PHONE_TAGS: [PhoneTag, PhoneTag] = [
  { title: "100 números", sub: "rápido de acompanhar" },
  { title: "Pagamento imediato", sub: "após a confirmação" },
];

export interface PhoneMockupProps {
  /** Frame local ao bloco do celular (0 = fim da transição de entrada). */
  mgFrame: number;
  width?: number;
  /** Copy das 2 pílulas flutuantes (pedido do founder 2026-10-18: "copys dos
   * gadgets que aparecem ao redor do celular") — ausente/curto demais usa
   * DEFAULT_PHONE_TAGS pro(s) slot(s) faltante(s). */
  tags?: PhoneTag[];
  children: React.ReactNode;
}

/** Exportado (2026-10-18) — a Tela Dividida reusa esta pílula flutuante SEM
 * o celular por baixo (painel vira copy+botão+balões, "talvez só os balões
 * de notificações... celular aqui não", pedido do founder). */
export const FloatingTag: React.FC<{
  title: string;
  sub: string;
  mgFrame: number;
  enterAt: number;
  side: "right" | "left";
  top: string;
  driftPhase: number;
  /** Respiro da borda do frame (px) — default 0 preserva o uso colado ao
   * celular (`PhoneMockup`). A Tela Dividida (2026-10-19, founder: "colados
   * demais na borda, sem respiro") passa um valor explícito. */
  marginPx?: number;
  /** Escala do balão — default 1. A Tela Dividida varia entre os 2 balões
   * pra harmonia visual (founder: "um gadget que surge de tamanho menor que
   * o outro"), em vez dos 2 do mesmo tamanho. */
  scale?: number;
  /** Amplitude da flutuação contínua (px) — default 4 (mesma do celular).
   * Balão solto (sem celular por baixo) aguenta uma flutuação mais visível. */
  driftAmplitude?: number;
  /** Período de 1 ciclo da flutuação, em frames — default 95*2π≈597 (mesmo
   * do celular, deliberadamente lento/quase imperceptível por baixo do
   * aparelho). 2026-10-19 (founder: "ficarem com uma animação de flutuar"):
   * balão solto usa período mais curto pra ficar visível DENTRO da duração
   * típica da peça, não só começar a derivar. */
  driftPeriodFrames?: number;
}> = ({ title, sub, mgFrame, enterAt, side, top, driftPhase, marginPx = 0, scale = 1, driftAmplitude = 4, driftPeriodFrames = 95 * 2 * Math.PI }) => {
  const p = windowProgress(mgFrame, enterAt, 20);
  const eased = easeOutBack(p, 1.1);
  const drift = Math.sin((mgFrame / driftPeriodFrames) * 2 * Math.PI + driftPhase) * driftAmplitude;

  if (p <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 5,
        top,
        right: side === "right" ? marginPx : undefined,
        left: side === "left" ? marginPx : undefined,
        maxWidth: 158,
        background: "rgba(255,255,255,.94)",
        border: "1px solid rgba(13,42,22,.10)",
        borderRadius: 11,
        boxShadow: "0 2px 4px rgba(13,42,22,.06), 0 18px 34px -18px rgba(13,42,22,.45)",
        padding: "9px 12px",
        opacity: eased,
        transform: `translate(${lerp(side === "right" ? 24 : -24, 0, eased)}px, ${lerp(14, 0, eased) + drift}px) scale(${lerp(0.82, scale, eased)})`,
      }}
    >
      <div style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 13, color: GREEN, letterSpacing: -0.1, textTransform: "uppercase", lineHeight: 1.1 }}>
        {title}
      </div>
      <div style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 9.5, color: INK_3, marginTop: 2, lineHeight: 1.25 }}>{sub}</div>
    </div>
  );
};

// Faixa lateral reservada pras pílulas flutuantes — sem ela, o container
// relativo tem exatamente a largura do aparelho e as tags (até 158px) não
// têm pra onde ir além de cobrir a própria tela (bug visto no 1º still de
// QA: "100 números" tapando o banner). Mesma lógica do `.stage` real (mais
// largo que `.phone`), só que aqui o valor é explícito em vez de vir do
// layout flex da página.
const TAG_LANE = 180;

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ mgFrame, width = 360, tags, children }) => {
  const tag1 = tags?.[0] ?? DEFAULT_PHONE_TAGS[0];
  const tag2 = tags?.[1] ?? DEFAULT_PHONE_TAGS[1];
  const height = (width * 420) / 206;
  const outerWidth = width + TAG_LANE * 2;

  // Entrada: 0.84 → 1.0 com overshoot contido (1.1, não o 1.7 do Império —
  // "menos agressivo" vale pra motion graphics inteiro, não só a transição).
  const enterP = windowProgress(mgFrame, 0, 30);
  const enterScale = lerp(0.84, 1, easeOutBack(enterP, 1.1));
  const enterOpacity = windowProgress(mgFrame, 0, 16);

  // Tremida de entrada (pedido do founder 2026-10-09: "mais dinamicidade"):
  // oscilação de alta frequência com amplitude em decaimento exponencial,
  // só na janela de entrada (0-24 frames) — depois disso cai a zero e quem
  // assume é a respiração contínua abaixo. Não é o overshoot (que já existe
  // em enterScale); é um tremor SOBRE a entrada, como se o aparelho
  // "assentasse" com peso real em vez de só crescer suavemente.
  const SHAKE_WINDOW = 24;
  const shakeDecay = mgFrame < SHAKE_WINDOW ? Math.pow(1 - mgFrame / SHAKE_WINDOW, 1.6) : 0;
  const shake = Math.sin((mgFrame / SHAKE_WINDOW) * Math.PI * 2 * 3.2) * shakeDecay;
  const shakeX = shake * 11;
  const shakeRotZ = shake * 2.4;

  // Idle: respiração contínua (período longo, amplitude baixa) — o aparelho
  // nunca fica rígido, mas nunca "atua" chamando atenção pra si. Começa a
  // ganhar peso conforme a tremida decai (1-shakeDecay), pra não competir
  // com ela nos primeiros frames.
  const idleWeight = 1 - shakeDecay;
  const idle = Math.sin((mgFrame / 150) * Math.PI * 2) * idleWeight;
  const idleY = idle * 5;
  const idleRotY = idle * 1.6;
  const idleRotX = Math.cos((mgFrame / 170) * Math.PI * 2) * 0.8 * idleWeight;

  // Glint único: varre o vidro uma vez, não em loop (loop chamaria mais
  // atenção do que o produto real pede).
  const glintP = windowProgress(mgFrame, 26, 46);
  const glintX = lerp(-30, 160, glintP);
  const glintOpacity = glintP > 0 && glintP < 1 ? 0.85 : 0.35;

  return (
    <div style={{ position: "relative", width: outerWidth, height: height + 56 }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width,
          height,
          marginLeft: -width / 2,
          perspective: 1300,
          perspectiveOrigin: "50% 42%",
          opacity: enterOpacity,
        }}
      >
        <div
          style={{
            width,
            height,
            transformStyle: "preserve-3d",
            transform: `translateX(${shakeX}px) scale(${enterScale}) rotateX(${3 + idleRotX}deg) rotateY(${-9 + idleRotY}deg) rotateZ(${-1 + shakeRotZ}deg) translateY(${idleY}px)`,
          }}
        >
          <div style={{ position: "relative", width, height, transformStyle: "preserve-3d" }}>
            {/* espessura: 4 placas em Z negativo, mesmo raio do corpo */}
            {SLAB_LAYERS.map((f, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: PHONE_R,
                  background: "linear-gradient(100deg, #30403a 0%, #0e1612 38%, #1d2a24 62%, #050807 100%)",
                  transform: `translateZ(${-DEPTH * f}px)`,
                }}
              />
            ))}

            {/* botões físicos */}
            <div style={{ position: "absolute", right: -2, top: "26%", width: 3, height: "10%", borderRadius: 2, background: "linear-gradient(180deg,#4a5a52,#141c18 60%,#39473f)", transform: `translateZ(${-DEPTH * 0.5}px)` }} />
            <div style={{ position: "absolute", left: -2, top: "20%", width: 3, height: "6.5%", borderRadius: 2, background: "linear-gradient(180deg,#4a5a52,#141c18 60%,#39473f)", transform: `translateZ(${-DEPTH * 0.5}px)` }} />
            <div style={{ position: "absolute", left: -2, top: "28.5%", width: 3, height: "6.5%", borderRadius: 2, background: "linear-gradient(180deg,#4a5a52,#141c18 60%,#39473f)", transform: `translateZ(${-DEPTH * 0.5}px)` }} />

            {/* bezel metálico */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: PHONE_R,
                padding: 7,
                background: "linear-gradient(145deg, #4d5a53 0%, #171f1b 22%, #0b100d 55%, #212b26 82%, #070a09 100%)",
                transformStyle: "preserve-3d",
                boxShadow: [
                  "inset 0 0 0 1px rgba(255,255,255,.14)",
                  "inset 0 1px 1px rgba(255,255,255,.26)",
                  "inset 0 -1px 1px rgba(0,0,0,.5)",
                  "0 1px 2px rgba(6,16,10,.16)",
                  "0 2px 4px rgba(6,16,10,.14)",
                  "0 5px 9px rgba(6,16,10,.12)",
                  "0 10px 19px rgba(6,16,10,.10)",
                  "0 21px 38px rgba(6,16,10,.08)",
                  "0 40px 70px -10px rgba(6,16,10,.22)",
                ].join(", "),
              }}
            >
              {/* tela */}
              <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: PHONE_R - 7, overflow: "hidden", background: "#eef2ef" }}>
                {children}

                {/* dynamic island */}
                <div
                  style={{
                    position: "absolute",
                    zIndex: 6,
                    top: 7,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "34%",
                    height: 11,
                    borderRadius: 999,
                    background: "#050807",
                    boxShadow: "inset 0 0 0 .5px rgba(255,255,255,.1)",
                  }}
                />

                {/* vidro: brilho estático + glint único */}
                <div style={{ position: "absolute", inset: 0, zIndex: 7, pointerEvents: "none", borderRadius: PHONE_R - 7, overflow: "hidden" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "-40%",
                      bottom: "-40%",
                      left: `${glintX}%`,
                      width: "42%",
                      background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.30) 44%, rgba(255,255,255,.4) 54%, rgba(255,255,255,0) 100%)",
                      transform: "rotate(14deg)",
                      opacity: glintOpacity,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(160deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 34%), linear-gradient(20deg, rgba(4,20,10,.14) 0%, rgba(4,20,10,0) 42%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* sombra no chão — FORA da cadeia 3D, contra-fase com a flutuação */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: height + 6,
          width: width * 0.86,
          height: 24,
          transform: `translateX(-50%) scale(${1 + idle * 0.08}, ${1 - idle * 0.12})`,
          background: "radial-gradient(ellipse at center, rgba(6,32,16,.30), rgba(6,32,16,0) 72%)",
          filter: "blur(5px)",
          opacity: 0.8 * enterOpacity,
        }}
      />

      {/* Entram DEPOIS do aparelho assentar da tremida (que termina no frame
          24) — sequenciado, não simultâneo à entrada (pedido do founder
          2026-10-09). */}
      <FloatingTag
        title={tag1.title}
        sub={tag1.sub}
        mgFrame={mgFrame}
        enterAt={62}
        side="right"
        top="6%"
        driftPhase={0}
      />
      <FloatingTag
        title={tag2.title}
        sub={tag2.sub}
        mgFrame={mgFrame}
        enterAt={128}
        side="left"
        top="62%"
        driftPhase={2.1}
      />
    </div>
  );
};
