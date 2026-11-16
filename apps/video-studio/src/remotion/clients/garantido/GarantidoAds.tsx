import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { clamp01, easeOutBack, lerp, windowProgress } from "../easing";
import { TransicaoAbraco, TransicaoChegada, TransicaoCombinado } from "./GarantidoTransicoes";
import { PhoneMockup, type PhoneTag } from "./PhoneMockup";
import { GOLD, GREEN, GREEN_DEEP, GREEN_MID, NEON_HI } from "./palette";
// Prova de conceito 2026-10-10 (pipeline-templates-video-escala): eixo de
// hook/câmera lido do catálogo REAL de câmera (src/lib/fxCatalog.ts), não
// reinventado aqui. `cameraTransform` é a mesma função que o editor orgânico
// (TimelineFxComposition.tsx) já usa pra Ken Burns — reuso de verdade, não
// um clone paralelo.
import { cameraTransform, type CameraId, type CameraMove } from "../../../lib/fxCatalog";

/**
 * Garantido Prêmios — 3 peças publicitárias SEPARADAS (uma por take real),
 * substituindo a peça única sequencial de `GarantidoTakes.tsx` por pedido
 * explícito do founder (2026-10-09): "cada take vira uma peça publicitária
 * separada". Cada peça segue o arco take real → transição → bloco de motion
 * graphics do celular (mockup 3D + grade de dezenas animada + copy).
 *
 * Tom deliberadamente mais contido que `ImperioIgnicaoPunho.tsx`: sem flash
 * branco, sem partículas, overshoot de entrada reduzido (1.1 em vez de
 * 1.7), pulso do CTA mais lento e de amplitude menor. Ver `GarantidoTransicoes.tsx`
 * pra justificativa de cada transição.
 *
 * Copy: Ângulo 3 (emocional) do `copy-angles-2026-10-09.md` — headline/CTA
 * repetidos nas 3 peças de propósito (mesmo registro de tom pro set de
 * whitelist/teste, decisão permitida pelo brief), com a legenda SOBRE o
 * take variando por peça conforme a tabela 3a do mesmo documento (texto que
 * substitui a legenda original removida de cada arco).
 */

export const W = 1080;
export const H = 1920;
export const FPS = 30;

const TAKE1_FRAMES = 228; // 7.6s — take1_video1 (conversa → abraço)
export const TAKE2_FRAMES = 213; // 7.1s — take2_video1 (expectativa → chegada do carro)
const TAKE3_FRAMES = 105; // 3.5s — take3_video1 (despedida → gesto de combinado)

export const BRIDGE = 22; // frames de transição (sobreposição, mesma técnica do dip original)
export const PHONE_FRAMES = 170; // ~5.7s de bloco de celular após a transição

export const TOTAL_FRAMES_1 = TAKE1_FRAMES + PHONE_FRAMES;
export const TOTAL_FRAMES_2 = TAKE2_FRAMES + PHONE_FRAMES;
export const TOTAL_FRAMES_3 = TAKE3_FRAMES + PHONE_FRAMES;

// ─────────────────────────── Take real (vídeo) ───────────────────────────

/**
 * `<OffthreadVideo>`, não `<Video>` nativo — achado 2026-10-09 (founder
 * reportou "tremida de travamento" nos 3 vídeos finais, confirmado via
 * still: 8 frames consecutivos do take real praticamente sem avanço de
 * movimento, ~267ms "congelados"). Causa raiz: as fontes originais eram
 * H264 com GOP irregular (B-frames espalhados sem cadência fixa) — o
 * `<Video>` nativo fazia seek impreciso nesse conteúdo (retornava o frame
 * decodificado mais próximo em vez do frame exato pedido), o que lia como
 * stutter no export final. Fix: as 3 fontes foram reencodadas com GOP
 * fechado/regular, sem B-frames, keyframe a cada 30 frames
 * (`ffmpeg -bf 0 -g 30 -keyint_min 30 -sc_threshold 0`, arquivos `*_clean.mp4`
 * em `takes-base/`) — isso resolve o motivo original de `<Video>` existir
 * (extrator Rust do OffthreadVideo falhava no GOP irregular antigo) E o
 * stutter do seek do `<Video>`, então `<OffthreadVideo>` volta a ser o
 * componente certo (frame-exato de verdade, não depende de seek de browser).
 */
/**
 * `camera` é o eixo de hook validado em 2026-10-10 (prova de conceito da
 * receita YAML pro Take2) — `cameraTransform` vem direto do catálogo real
 * (`fxCatalog.ts`), aplicado sobre o take inteiro (mesmo uso que o editor
 * orgânico faz em clipe de Ken Burns). `camera` ausente/`"parada"` devolve
 * a transform identidade — Take1/Take3 continuam pixel-idênticos a antes.
 */
export const TakeClip: React.FC<{ file: string; durationInFrames: number; camera?: CameraMove }> = ({
  file,
  durationInFrames,
  camera,
}) => {
  const frame = useCurrentFrame();
  const { scale, x, y } = cameraTransform(camera, frame, durationInFrames);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Achado 2026-10-10 (founder reportou "zoom-out não funcionou"):
          investigado com instrumentação real (overlay de debug mostrando o
          `scale` computado, depois teste de valor extremo `scale(3)`) —
          NÃO é bug de transform não aplicar: scale(3) mudou o quadro
          dramaticamente, confirmando que o mecanismo (transform num wrapper
          por fora do vídeo, nunca no componente de mídia direto — mesmo
          padrão do `ElementWrap` em TimelineFxComposition.tsx) funciona.
          Causa real: no peso "medio", zoom-in e zoom-out têm o MESMO delta
          de escala (5 pontos percentuais: 1.00→1.05 vs. 1.10→1.05) — mas
          numa cena de rua cheia de ruído visual (árvore, fiação, fundo
          complexo), 5% de crop é sutil demais pra ler como movimento
          intencional em QUALQUER direção, não só no zoom-out. Peso
          "agressivo" (ver AMPLITUDE_POR_PESO em fxCatalog.ts) dá um delta
          real e perceptível — aplicado na montagem do CameraMove abaixo. */}
      <div style={{ width: "100%", height: "100%", transform: `scale(${scale}) translate(${x}%, ${y}%)` }}>
        <OffthreadVideo
          src={staticFile(file)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Legenda sobre o take real — texto que SUBSTITUI a legenda original
 * removida do arquivo-fonte (tabela 3a do `copy-angles-2026-10-09.md`).
 * Deliberadamente sem barra de fundo (ao contrário do `OverlayBar` do
 * Império): só contorno + sombra pro texto respirar sobre a cena real, tom
 * mais contido. Reposicionada pro terço central do frame (pedido do founder
 * 2026-10-09 — antes marginTop=480, perto demais do topo; agora 820 centra
 * o texto dentro do terço 640-1280). Zona segura y≈420-1500: ancorada em y=480.
 */
const CaptionLeve: React.FC<{ text: string; startFrame: number; durationInFrames: number }> = ({
  text,
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  if (local < -1 || local > durationInFrames + 14) return null;

  const fadeIn = windowProgress(local, 0, 14);
  const fadeOut = 1 - windowProgress(local, durationInFrames - 14, 14);
  const opacity = clamp01(Math.min(fadeIn, fadeOut));
  const rise = lerp(14, 0, fadeIn);
  if (opacity <= 0.01) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          marginTop: 820,
          opacity,
          transform: `translateY(${rise}px)`,
          maxWidth: "84%",
          textAlign: "center",
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: 50,
          lineHeight: 1.14,
          color: "#ffffff",
          letterSpacing: -0.3,
          textTransform: "uppercase",
          WebkitTextStroke: "1px rgba(0,0,0,0.5)",
          textShadow: "0 3px 16px rgba(0,0,0,0.55)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────── Bloco do celular ─────────────────────────────

const HEADLINE_SIZE = 54;

/**
 * Copy do H1 por peça — achado 2026-10-09 (founder): a Garantido não
 * sorteia mais carro, os 3 takes são reaproveitados só como prova de
 * emoção genuína, nenhuma das 3 H1 pode nomear o tipo de prêmio. Antes as
 * 3 composições repetiam o MESMO texto hardcoded ("O carro chegou...");
 * agora cada peça tem a sua própria, vindo da tabela 3a do
 * `copy-angles-2026-10-09.md`. `highlightWord` casa por string exata (não
 * por prefixo "DE VERDADE" cravado) pra funcionar com qualquer fecho.
 */
export interface HeadlineCopy {
  line1: string;
  line2Words: string[];
  highlightWord: string;
}

export const GARANTIDO_HEADLINES: Record<"take1" | "take2" | "take3", HeadlineCopy> = {
  take1: { line1: "ISSO NÃO TEM ENSAIO.", line2Words: ["O RESULTADO", "TAMBÉM NÃO."], highlightWord: "TAMBÉM NÃO." },
  take2: { line1: "A ESPERA ACABA RÁPIDO.", line2Words: ["O PAGAMENTO", "TAMBÉM."], highlightWord: "TAMBÉM." },
  take3: { line1: "FOI UM TRATO DE VERDADE.", line2Words: ["100 NÚMEROS,", "SEM PEGADINHA."], highlightWord: "SEM PEGADINHA." },
};

export const Headline: React.FC<{ mgFrame: number; copy: HeadlineCopy }> = ({ mgFrame, copy }) => {
  const { line1, line2Words, highlightWord } = copy;
  const START = 14;
  const STAGGER = 6;
  const DUR = 12;

  // Stagger por palavra GENÉRICO — a versão anterior cravava 1 palavra na
  // linha 1 + 3 na linha 2; "NINGUÉM AVISOU."/"A ESPERA ACABOU." têm
  // contagens diferentes de palavra por linha, então o índice de stagger
  // agora conta line1 como slot 0 e cada palavra de line2Words em sequência,
  // sem assumir quantidade fixa.
  const wordStyle = (i: number): React.CSSProperties => {
    const start = START + i * STAGGER;
    const p = clamp01((mgFrame - start) / DUR);
    return {
      display: "inline-block",
      opacity: p,
      transform: `translateY(${lerp(16, 0, p)}px)`,
    };
  };

  return (
    <div style={{ maxWidth: "90%", textAlign: "center", flex: "0 0 auto" }}>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: HEADLINE_SIZE,
          lineHeight: 1.1,
          color: "#ffffff",
          textShadow: "0 3px 14px rgba(0,0,0,0.35)",
          ...wordStyle(0),
        }}
      >
        {line1}
      </div>
      <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 9px" }}>
        {line2Words.map((w, i) => {
          const isHighlight = w === highlightWord;
          return (
            <span
              key={w}
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 800,
                fontSize: HEADLINE_SIZE,
                lineHeight: 1.1,
                color: isHighlight ? "#06230f" : "#ffffff",
                textShadow: isHighlight ? "none" : "0 3px 14px rgba(0,0,0,0.35)",
                position: "relative",
                padding: isHighlight ? "0 .14em" : undefined,
                ...wordStyle(i + 1),
              }}
            >
              {isHighlight && (
                <span
                  style={{
                    position: "absolute",
                    zIndex: -1,
                    inset: "0.1em -0.05em 0.02em",
                    background: `linear-gradient(100deg, ${NEON_HI}, #01bf01)`,
                    borderRadius: "4px 12px 5px 10px",
                    transform: "rotate(-0.8deg)",
                  }}
                />
              )}
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// Timing do bounce/pulso do CTA — extraído de CtaButtonPill pra CtaSubtitle
// poder usar a MESMA curva de entrada sem duplicar os números.
function ctaBounceState(mgFrame: number) {
  const bounceStart = 118;
  const bounceDur = 12;
  const p = windowProgress(mgFrame, bounceStart, bounceDur);
  const entryScale = p <= 0 ? 0 : easeOutBack(p, 1.0);
  let pulseScale = 1;
  if (mgFrame >= bounceStart + bounceDur) {
    const t = Math.max(0, mgFrame - (bounceStart + bounceDur));
    pulseScale = 1 + 0.015 * Math.max(0, Math.sin((2 * Math.PI * t) / 36));
  }
  const scale = mgFrame < bounceStart + bounceDur ? entryScale : pulseScale;
  return { scale, opacity: p > 0 ? 1 : 0 };
}

/** Só o botão (pílula verde) — pedido do founder 2026-10-18: o subtítulo
 * "Garantido Prêmios" vira elemento PRÓPRIO (ver CtaSubtitle), não fica mais
 * cravado dentro do mesmo PNG do botão. */
export const CtaButtonPill: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const { scale, opacity } = ctaBounceState(mgFrame);
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        background: `linear-gradient(135deg, ${GREEN_MID} 0%, ${GREEN} 48%, ${GREEN_DEEP} 100%)`,
        borderRadius: 999,
        padding: "20px 38px",
        boxShadow: "0 14px 32px -10px rgba(9,127,35,0.5)",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: 27,
          color: "#ffffff",
          letterSpacing: 0.2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        Ver o que está disponível agora
      </div>
    </div>
  );
};

/** Só o subtítulo abaixo do botão — elemento isolado (ver CtaButtonPill). */
export const CtaSubtitle: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const { opacity } = ctaBounceState(mgFrame);
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 700,
        fontSize: 20,
        letterSpacing: 2,
        color: "rgba(255,255,255,0.78)",
        textTransform: "uppercase",
      }}
    >
      Garantido Prêmios
    </div>
  );
};

/** Composta (botão + subtítulo juntos) — usada pela peça "queimada" original
 * (GarantidoTake2Ad, fluxo de geração em lote). A ponte do editor usa
 * CtaButtonPill/CtaSubtitle separados. */
export const CtaButton: React.FC<{ mgFrame: number }> = ({ mgFrame }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <CtaButtonPill mgFrame={mgFrame} />
    <CtaSubtitle mgFrame={mgFrame} />
  </div>
);

// Textura de grão (ruído) em SVG puro — camada estática e sutilíssima
// (opacity .05) só pra tirar o fundo do "plano/chapado" sem virar
// decoração chamativa. Gerada 1x no load do módulo, não por frame.
const GRAIN_URI = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
)}")`;

/**
 * Fundo do bloco do celular — pedido do founder 2026-10-09 ("fundo legal,
 * dinâmico, com luzar/blur/gradiente/textura, que dê vida"): base
 * verde-escura da marca (mantida, não é o que estava errado) + 2 glows que
 * DERIVAM lentamente (período longo, nunca param, nunca chamam atenção pra
 * si) + grão estático + eco bem discreto do dourado do banner do app, pra
 * dar coerência visual entre o fundo e a tela do celular.
 */
export const PhoneBlockBg: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const driftA = {
    x: 50 + Math.sin(mgFrame / 210) * 24,
    y: 18 + Math.cos(mgFrame / 260) * 10,
  };
  const driftB = {
    x: 50 + Math.cos(mgFrame / 180 + 1.4) * 28,
    y: 92 + Math.sin(mgFrame / 230 + 1.4) * 6,
  };
  const goldPulse = 0.22 + 0.1 * Math.sin(mgFrame / 140);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* base: ainda verde-escuro da marca, mas com contraste real entre
          topo/meio/base (a versão anterior usava 3 tons quase idênticos — na
          prática lia como preto chapado). */}
      <AbsoluteFill style={{ background: "linear-gradient(165deg, #173d27 0%, #0c2417 32%, #061008 68%, #020503 100%)" }} />

      {/* "spotlight" fixo atrás do celular — luz de produto, não decoração */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 48% 34% at 50% 38%, rgba(207,255,214,.22), rgba(207,255,214,0) 72%)",
        }}
      />

      {/* 2 glows verdes que DERIVAM lentamente, nunca param */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 62% 42% at ${driftA.x}% ${driftA.y}%, rgba(11,154,42,.55), rgba(11,154,42,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 58% 38% at ${driftB.x}% ${driftB.y}%, rgba(55,227,50,.32), rgba(55,227,50,0) 72%)`,
        }}
      />

      {/* eco dourado do banner do app — pulso lento, amarra fundo+tela */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 72% 28% at 50% 100%, ${GOLD}${Math.round(goldPulse * 255)
            .toString(16)
            .padStart(2, "0")}, rgba(227,167,62,0) 70%)`,
        }}
      />

      {/* grão — blend "screen" (soma luz), pra aparecer de verdade sobre um
          fundo escuro em vez de desaparecer como "overlay" faria */}
      <AbsoluteFill style={{ backgroundImage: GRAIN_URI, opacity: 0.6, mixBlendMode: "screen" }} />

      {/* vinheta leve só nos cantos extremos — não escurece o centro */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 150% 90% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,.35) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Bloco de motion graphics (mockup + grade + headline + CTA). `mgFrame` é o
 * ÚNICO relógio de toda a cena — a transição de entrada E o conteúdo
 * compartilham o mesmo frame local (frame 0 = início da Sequence), então o
 * celular já começa a surgir ENQUANTO a transição revela a cena, em vez de
 * esperar ela terminar.
 *
 * Layout por flex column + gap (não mais 3 `AbsoluteFill` empilhados com
 * `marginTop` cravado) — bug real da 1ª versão: headline terminava em
 * y≈653 e o celular começava em y≈660, praticamente colados ("amontoado",
 * no relato do founder). `gap` garante respiro estrutural, não aritmética
 * manual que ninguém media contra o conteúdo real.
 */
const DEFAULT_PHONE_SCREEN_FILE = "garantido/tela-app-garantido.png";

export const PhoneBlock: React.FC<{ headlineCopy: HeadlineCopy; phoneScreenFile?: string; tags?: PhoneTag[] }> = ({
  headlineCopy,
  phoneScreenFile,
  tags,
}) => {
  const mgFrame = useCurrentFrame();
  ensureFonts([FONT_SANS]);

  return (
    <AbsoluteFill>
      <PhoneBlockBg mgFrame={mgFrame} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 410,
          gap: 36,
        }}
      >
        <Headline mgFrame={mgFrame} copy={headlineCopy} />
        <PhoneMockup mgFrame={mgFrame} width={332} tags={tags}>
          {/* Print real da v2 (founder, 2026-10-09: "o mesmo fundo da LP v2
              que é um print real, ainda tá puxando uma tela que não quero")
              — mesma técnica da LP real (`apps/garantido-premios-lp/v2/
              index.html`, `.ph-screen img.s-shot { object-fit: cover;
              object-position: top center; }`), não mais a recriação React
              (`GarantidoAppScreen`, que ficou sem uso). Troca aceita perder a
              animação ao vivo da grade — a LP real também é só imagem
              parada. `phoneScreenFile` (2026-10-18): usuário pode subir a
              própria tela na configuração de copy do /studio/generate. */}
          <Img
            src={staticFile(phoneScreenFile || DEFAULT_PHONE_SCREEN_FILE)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
          />
        </PhoneMockup>
        <CtaButton mgFrame={mgFrame} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────── Composições (1 por take) ─────────────────────

export interface GarantidoAdProps {
  takeFile: string;
  /**
   * Eixo de copy, vindo de uma receita (ad-recipes/*.yaml) — opcional,
   * default preserva o comportamento anterior (texto fixo por take).
   */
  headlineCopy?: HeadlineCopy;
  /**
   * Eixo de hook/câmera, vindo do `camera` do hook_pack escolhido na receita
   * (video-templates.yaml do cliente) — opcional, default é câmera parada
   * (comportamento anterior, sem movimento).
   */
  hookCamera?: CameraId;
  /**
   * Tela do celular e copy das pílulas flutuantes (pedido do founder
   * 2026-10-18: "eu upar qual tela que quero pro celular... copys dos
   * gadgets") — opcionais, default preserva os assets/textos fixos atuais.
   */
  phoneScreenFile?: string;
  tags?: PhoneTag[];
}

export const GarantidoTake1Ad: React.FC<GarantidoAdProps> = ({ takeFile }) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={TAKE1_FRAMES}>
        <TakeClip file={takeFile} durationInFrames={TAKE1_FRAMES} />
        <CaptionLeve text="Isso aqui não foi ensaiado." startFrame={40} durationInFrames={130} />
      </Sequence>
      <Sequence from={TAKE1_FRAMES - BRIDGE} durationInFrames={PHONE_FRAMES + BRIDGE}>
        <TransicaoAbraco frames={BRIDGE}>
          <PhoneBlock headlineCopy={GARANTIDO_HEADLINES.take1} />
        </TransicaoAbraco>
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * Prova de conceito 2026-10-10 (pipeline-templates-video-escala-2026-10-10.md,
 * seção 4): única das 3 composições com os 2 eixos de receita de verdade —
 * `headlineCopy`/`hookCamera` chegam de uma `ad-recipes/*.yaml`, resolvida por
 * `scripts/render-garantido-recipe.mjs` (hook_pack → `camera` real do
 * video-templates.yaml do cliente). Take1/Take3 permanecem no padrão anterior
 * (texto fixo, câmera parada) — migração deles fica pra depois da validação.
 */
export const GarantidoTake2Ad: React.FC<GarantidoAdProps> = ({ takeFile, headlineCopy, hookCamera, phoneScreenFile, tags }) => {
  ensureFonts([FONT_SANS]);
  // peso "agressivo" (não "medio") — achado 2026-10-10: em "medio" o delta de
  // escala (5 pontos percentuais) é sutil demais pra ler como movimento
  // intencional nesta cena com fundo complexo (ver nota em TakeClip acima).
  const camera: CameraMove | undefined = hookCamera ? { tipo: hookCamera, peso: "agressivo" } : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={TAKE2_FRAMES}>
        <TakeClip file={takeFile} durationInFrames={TAKE2_FRAMES} camera={camera} />
        <CaptionLeve text="O prêmio chegou de verdade." startFrame={50} durationInFrames={120} />
      </Sequence>
      <Sequence from={TAKE2_FRAMES - BRIDGE} durationInFrames={PHONE_FRAMES + BRIDGE}>
        <TransicaoChegada frames={BRIDGE}>
          <PhoneBlock headlineCopy={headlineCopy ?? GARANTIDO_HEADLINES.take2} phoneScreenFile={phoneScreenFile} tags={tags} />
        </TransicaoChegada>
      </Sequence>
    </AbsoluteFill>
  );
};

export const GarantidoTake3Ad: React.FC<GarantidoAdProps> = ({ takeFile }) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={TAKE3_FRAMES}>
        <TakeClip file={takeFile} durationInFrames={TAKE3_FRAMES} />
        <CaptionLeve text="Garantido. De verdade." startFrame={14} durationInFrames={65} />
      </Sequence>
      <Sequence from={TAKE3_FRAMES - BRIDGE} durationInFrames={PHONE_FRAMES + BRIDGE}>
        <TransicaoCombinado frames={BRIDGE}>
          <PhoneBlock headlineCopy={GARANTIDO_HEADLINES.take3} />
        </TransicaoCombinado>
      </Sequence>
    </AbsoluteFill>
  );
};

export const garantidoTake1DefaultProps: GarantidoAdProps = {
  takeFile: "take1_video1-fonte_sem-texto_20261008_clean.mp4",
};
export const garantidoTake2DefaultProps: GarantidoAdProps = {
  takeFile: "take2_video1-fonte_sem-texto_20261008_clean.mp4",
};
export const garantidoTake3DefaultProps: GarantidoAdProps = {
  takeFile: "take3_video1-fonte_sem-texto_20261008_clean.mp4",
};
