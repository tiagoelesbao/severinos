import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { Crown } from "./Crown";
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  lerp,
  windowProgress,
} from "../easing";
// Eixo de hook/câmera via receita (ad-recipes/*.yaml do Império) — mesmo
// catálogo real de câmera que GarantidoAds.tsx usa (prova de conceito
// 2026-10-10, squads/virals-marketing-squad/docs/pipeline-templates-video-
// escala-2026-10-10.md), não uma reimplementação paralela.
import { cameraTransform, type CameraId, type CameraMove } from "../../../lib/fxCatalog";

/**
 * "Ignição do Punho" — Império Prêmios. Reimplementação em Remotion/código
 * real do `ae-spec.md` (mesma pasta do material-fonte), substituindo o
 * exportador ExtensScript de hoje mais cedo (coroa genérica, texto empilhado,
 * CTA quebrado).
 *
 * Estrutura (revisada 2026-10-18 — ver achado abaixo):
 *   Take 1 (real, com overlay animado)  →  TransicaoCoroacao  →  Comp03
 *   brasão reveal  →  Comp04 CTA cinético.
 *
 * Achado 2026-10-18 (founder, avaliando as 6 variações da receita):
 * "a animação de punho é totalmente quebrada e desconexa... os fogos
 * dourados aparecem do nada" — a sequência original empilhava 4-5 efeitos
 * em ~76 frames (flare pontual → flash branco de tela cheia → freeze-frame
 * do still → crossfade branco→preto do fundo → partículas espalhando do
 * punho → partículas convergindo na coroa), violando a mesma lição que já
 * está documentada em `GarantidoTransicoes.tsx`: "cada transição tem UM
 * gesto só, nunca dois efeitos empilhados". Substituído por
 * `TransicaoCoroacao` — um único bloom dourado contido, pico exatamente
 * onde a coroa está prestes a aparecer (não um ponto arbitrário), mesma
 * técnica comprovada de `TransicaoAbraco` (Garantido). O bloco final
 * (Comp03 brasão + Comp04 headline/CTA) continua como estava — foi a parte
 * que o founder avaliou como aceitável.
 *
 * Frame budget (30fps):
 *   Take1:             0   – 141  (4,7s, duração real do `take1_conformado.mov`)
 *   TransicaoCoroacao: sobrepõe os últimos `BRIDGE` frames do Take1 (sem somar ao total)
 *   Comp03:            0   – 40   (coroa + wordmark, frame local da camada de MG)
 *   Comp04:            40  – 115  (75f  crest recua, headline, CTA cinético + pulso)
 *   Total:             256 frames (~8,53s) — 36 frames mais curto que a versão
 *   anterior (292f) porque o handoff quebrado foi removido, não comprimido.
 */

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const TAKE1_FRAMES = 141; // 4.7s @ 30fps (duração real do take1_conformado.mov)
const BRIDGE = 20; // frames de transição (sobreposição com o fim do Take1, mesma técnica do Garantido)
const MG_COMP03 = 40;
const MG_COMP04 = 75;

// Marcos (em frame local da camada de motion graphics, 0-indexado).
// T_COMP03_START = BRIDGE (não 0) — achado 2026-10-18 na 1ª versão desta
// correção: com T_COMP03_START=0, o brasão começava a escalar NO MEIO do
// bloom (pico em BRIDGE/2), sobre o fundo ainda semi-transparente —
// resultado: coroa sobreposta no rosto do protagonista, exatamente o tipo
// de "elemento aparecendo sem transição" que a correção deveria eliminar.
// Com T_COMP03_START=BRIDGE, o brasão só começa a aparecer (mgFrame >=
// T_COMP03_START+10) depois que `incomingOpacity` da transição já está
// perto de 1 — a coroa nasce sobre fundo já opaco, nunca sobre o take.
const T_COMP03_START = BRIDGE;
const T_COMP04_START = T_COMP03_START + MG_COMP03; // 60
export const MG_FRAMES = T_COMP04_START + MG_COMP04; // 135 (já inclui o BRIDGE)
export const TOTAL_FRAMES = TAKE1_FRAMES - BRIDGE + MG_FRAMES; // 256

// Paleta de marca (apps/imperio-premios-lp/index.html :root)
const BG = "#0a0a0f";
const GOLD = "#e3a73e";
const GOLD_LIGHT = "#f4c869";
const GREEN = "#3ddc6f";
const GREEN_DARK = "#2bb85a";
const TEXT = "#f5f5f7";

// Âncora do brasão em tela cheia (Comp03) vs. crest recuado (Comp04).
// CREST_FINAL_Y calibrado para o grupo (coroa + wordmark, escala 55%) inteiro
// ficar com o topo em y>=420 — zona segura (mesma regra de y≈420-1500 do
// README do Garantido/Império, citada no `ae-spec.md` pra não cair sob a UI
// do Meta em Stories/Reels nem no corte 1:1 do Feed).
const CREST_FULL_Y = 760;
const CREST_FINAL_Y = 600;
const CREST_X = W / 2;
const CROWN_BASE_WIDTH = 620;

/**
 * Copy do headline de fechamento (Comp04) — eixo independente do hook/
 * câmera, vindo de uma receita (`ad-recipes/*.yaml`). `highlightWord` casa
 * por igualdade exata (case-insensitive) contra cada palavra do `text`
 * splitado por espaço — mesma convenção de `HeadlineCopy.highlightWord` em
 * GarantidoAds.tsx. Default preserva o texto aprovado em
 * `copy-angles-2026-10-09.md` §1a (Ângulo Prêmio, única copy com beats de
 * overlay escritos pra ESTE take especificamente — ver nota em
 * `ImperioHeadlines` abaixo antes de trocar o texto do `OverlayBar`, que
 * continua fixo de propósito.
 */
export interface ImperioHeadlineCopy {
  text: string;
  highlightWord?: string;
}

export const IMPERIO_HEADLINE_DEFAULT: ImperioHeadlineCopy = {
  text: "ESSA PODE SER A SUA VITÓRIA.",
  highlightWord: "VITÓRIA.",
};

export interface ImperioIgnicaoPunhoProps {
  /** Caminho do clipe conformado, relativo ao publicDir do bundle. */
  takeFile: string;
  /**
   * Still do pico do punho — não é mais usado pela composição desde a
   * correção da transição (2026-10-18, cross-fada do vídeo real, não de um
   * freeze-frame). Opcional, mantido só por compatibilidade com scripts de
   * render existentes que ainda passam esse campo.
   */
  stillFile?: string;
  /**
   * Eixo de hook/câmera sobre o Take 1 — vindo do `camera` do hook_pack
   * escolhido na receita (video-templates.yaml do cliente). Opcional,
   * default é câmera parada (comportamento anterior, pixel-idêntico).
   */
  hookCamera?: CameraId;
  /** Eixo de copy do headline de fechamento — ver `ImperioHeadlineCopy` acima. */
  headlineCopy?: ImperioHeadlineCopy;
}

// ───────────────────────────── Overlays sobre o Take 1 ─────────────────────

/**
 * Legenda animada sobre o Take 1 — revelação palavra-a-palavra (achado
 * 2026-10-18: a versão anterior fazia a frase inteira entrar/sair como 1
 * bloco só, sem nenhum movimento tipográfico — lido pelo founder como
 * "fontes não estilizadas"). Mesma matemática de stagger já provada em
 * `Wordmark`/`Headline` abaixo (p = clamp01((frame-start)/dur), scale
 * 0.85→1, opacity=p) — e dobra como o template "legenda animada nos
 * primeiros segundos" pedido pelo founder, reaproveitável fora do Império.
 * Saída continua em bloco único (staggerar a saída também seria ruído).
 */
const OverlayBar: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
  y: number;
}> = ({ text, startFrame, durationInFrames, y }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  if (local < -1 || local > durationInFrames + 12) return null;

  const fadeOut = 1 - windowProgress(local, durationInFrames - 10, 10);
  const containerOpacity = clamp01(fadeOut);
  if (containerOpacity <= 0.01) return null;

  const words = text.split(" ");
  const STAGGER = 3;
  const DUR = 10;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          marginTop: y,
          opacity: containerOpacity,
          background: "linear-gradient(180deg, rgba(10,10,15,0.0) 0%, rgba(10,10,15,0.62) 28%, rgba(10,10,15,0.62) 72%, rgba(10,10,15,0.0) 100%)",
          padding: "26px 48px",
          borderRadius: 18,
          maxWidth: "88%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 14px",
        }}
      >
        {words.map((w, i) => {
          const wStart = i * STAGGER;
          const p = clamp01((local - wStart) / DUR);
          const scale = lerp(0.82, 1, p);
          const rise = lerp(14, 0, p);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${rise}px) scale(${scale})`,
                fontFamily: FONT_SANS,
                fontWeight: 800,
                fontSize: 58,
                lineHeight: 1.12,
                textAlign: "center",
                color: "#ffffff",
                letterSpacing: -0.5,
                WebkitTextStroke: "1px rgba(0,0,0,0.35)",
                textShadow: "0 3px 18px rgba(0,0,0,0.65)",
                textTransform: "uppercase",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Take1WithOverlays: React.FC<{ takeFile: string; camera?: CameraMove }> = ({ takeFile, camera }) => {
  // IMPORTANTE (limitação real do Remotion, não do código): `take1_conformado.mov`
  // é ProRes — o `<video>` nativo do Chrome NÃO decodifica ProRes (testado: trocar
  // para `<Video>` trava em "delayRender… not cleared after 28000ms", porque o
  // elemento HTML5 nunca carrega). `OffthreadVideo` (extrator Rust/FFmpeg) é
  // obrigatório para este arquivo. Ele flakou 1 de 3 renders aqui com "No frame
  // found at position..." (mesma classe de erro do `forceTagVideo` documentado em
  // `TimelineFxComposition.tsx`) — mas nesse caso a correção NÃO é trocar de tag
  // (quebraria o decode), é re-rodar o render (transiente, ligado à concorrência
  // de 8 tabs do bundler) ou, se persistir, baixar `Config.setConcurrency`.
  const frame = useCurrentFrame();
  // `scale`/`x`/`y` vêm do catálogo real de câmera — mesma função que o
  // editor orgânico usa pra Ken Burns (reuso, não um clone paralelo). Camera
  // ausente devolve a transform identidade (scale=1, x=y=0): comportamento
  // anterior, pixel-idêntico.
  const { scale, x, y } = cameraTransform(camera, frame, TAKE1_FRAMES);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ width: "100%", height: "100%", transform: `scale(${scale}) translate(${x}%, ${y}%)` }}>
        <OffthreadVideo
          src={staticFile(takeFile)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <Audio src={staticFile(takeFile)} volume={0.85} />
      <OverlayBar text="A CHANCE JÁ TÁ ABERTA." startFrame={12} durationInFrames={46} y={500} />
      <OverlayBar
        text="100 NÚMEROS. VÁRIAS RODADAS POR DIA."
        startFrame={64}
        durationInFrames={50}
        y={500}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────── Transição: Take 1 → motion graphics ───────────────

/**
 * UM gesto só: bloom dourado contido, pico em p=0.5, no ponto EXATO onde a
 * coroa está prestes a nascer (CREST_X/CREST_FULL_Y) — não um ponto
 * arbitrário do quadro. Mesma técnica de `TransicaoAbraco`
 * (GarantidoTransicoes.tsx): círculo menor que o quadro, opacidade
 * contida, nunca cobre a tela inteira. Substitui Flare+WhiteFlash+still
 * freeze+crossfade branco→preto+partículas-espalhando (achado 2026-10-18,
 * ver nota no topo do arquivo).
 */
const TransicaoCoroacao: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const p = clamp01(f / frames);
  const bloomP = 1 - Math.abs(p * 2 - 1); // 0 → 1 → 0, pico em p=0.5
  const incomingOpacity = easeInOutCubic(p);

  return (
    <>
      <AbsoluteFill style={{ opacity: incomingOpacity }}>{children}</AbsoluteFill>
      {bloomP > 0.01 && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: CREST_X,
              top: CREST_FULL_Y,
              width: 640,
              height: 640,
              transform: `translate(-50%, -50%) scale(${lerp(0.5, 1.2, bloomP)})`,
              opacity: bloomP * 0.5,
              borderRadius: "50%",
              background: `radial-gradient(circle, #ffffff 0%, ${GOLD_LIGHT} 30%, ${GOLD} 55%, rgba(227,167,62,0) 75%)`,
              filter: "blur(10px)",
            }}
          />
        </AbsoluteFill>
      )}
    </>
  );
};

// ───────────────────────────── Camadas de fundo (Comp03→04) ────────────────

const GlowTop: React.FC<{ opacity: number }> = ({ opacity }) =>
  opacity <= 0.001 ? null : (
    <AbsoluteFill
      style={{
        opacity,
        background: `radial-gradient(ellipse 120% 42% at 50% 0%, rgba(227,167,62,0.28) 0%, rgba(227,167,62,0) 70%)`,
      }}
    />
  );

// ───────────────────────────── Comp03 — Wordmark ───────────────────────────

const Wordmark: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const letters = ["I", "M", "P", "É", "R", "I", "O"];
  const WORDMARK_START = T_COMP03_START + 20; // comp3 local frame 20
  const STAGGER = 2;
  const DUR = 8;
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 28 }}>
      {letters.map((ch, i) => {
        const start = WORDMARK_START + i * STAGGER;
        const p = easeOutQuadLocal(windowProgress(mgFrame, start, DUR));
        const y = lerp(40, 0, p);
        const opacity = p;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: FONT_SANS,
              fontWeight: 900,
              fontSize: 96,
              color: GOLD_LIGHT,
              letterSpacing: 2,
              transform: `translateY(${y}px)`,
              opacity,
              textShadow: "0 4px 24px rgba(227,167,62,0.45)",
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

function easeOutQuadLocal(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

// ───────────────────────────── Comp04 — Headline + CTA ─────────────────────

const Headline: React.FC<{ mgFrame: number; copy: ImperioHeadlineCopy }> = ({ mgFrame, copy }) => {
  const words = copy.text.split(" ");
  const highlightWord = copy.highlightWord?.toUpperCase();
  // Começa só DEPOIS do crest terminar de recuar pro topo (frame T_COMP04_START+20)
  // — começar antes fazia a headline nascer por baixo do wordmark "IMPÉRIO" ainda
  // em tamanho cheio, colidindo (visto no still de QA do frame 230).
  const start = T_COMP04_START + 22;
  const windowLen = 12;
  const stagger = windowLen / words.length;
  const dur = 8;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 20px",
        maxWidth: "86%",
        margin: "0 auto",
      }}
    >
      {words.map((w, i) => {
        const wStart = start + i * stagger;
        const p = clamp01((mgFrame - wStart) / dur);
        const scale = lerp(0.85, 1, p);
        const opacity = p;
        const isHighlight = highlightWord !== undefined && w.toUpperCase() === highlightWord;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: FONT_SANS,
              fontWeight: 800,
              fontSize: 72,
              lineHeight: 1.18,
              color: isHighlight ? GOLD_LIGHT : TEXT,
              transform: `scale(${scale})`,
              opacity,
              textTransform: "uppercase",
              textShadow: "0 3px 16px rgba(0,0,0,0.45)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const CtaButton: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const bounceStart = T_COMP04_START + 40;
  const bounceDur = 10;
  const p = windowProgress(mgFrame, bounceStart, bounceDur);
  const eased = easeOutBack(p);
  const entryScale = p <= 0 ? 0 : eased;

  const pulseStart = T_COMP04_START + 55;
  let pulseScale = 1;
  if (mgFrame >= bounceStart + bounceDur) {
    const t = Math.max(0, mgFrame - pulseStart);
    pulseScale = 1 + 0.04 * Math.max(0, Math.sin((2 * Math.PI * t) / 20));
  }

  const scale = mgFrame < bounceStart + bounceDur ? entryScale : pulseScale;
  const opacity = p > 0 ? 1 : 0;
  if (opacity <= 0) return null;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
        borderRadius: 999,
        padding: "30px 54px",
        boxShadow: "0 16px 40px rgba(61,220,111,0.35)",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: 40,
          color: "#06230f",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        VER O QUE ESTÁ DISPONÍVEL AGORA
      </div>
    </div>
  );
};

// ───────────────────────────── Crest group (coroa + wordmark) ──────────────

const CrestGroup: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  // Escala: 0 até frame 46; 0→108%→100% entre 46-58; segura 100% até 76;
  // recua para 55% entre 76-86 (reposicionamento do crest, Comp04).
  let scale: number;
  if (mgFrame < T_COMP03_START + 10) {
    scale = 0;
  } else if (mgFrame < T_COMP03_START + 16) {
    const p = windowProgress(mgFrame, T_COMP03_START + 10, 6);
    scale = easeOutBack(p) * 1.08;
  } else if (mgFrame < T_COMP03_START + 22) {
    const p = windowProgress(mgFrame, T_COMP03_START + 16, 6);
    scale = lerp(1.08, 1.0, easeInOutCubic(p));
  } else if (mgFrame < T_COMP04_START + 10) {
    scale = 1.0;
  } else if (mgFrame < T_COMP04_START + 20) {
    const p = windowProgress(mgFrame, T_COMP04_START + 10, 10);
    scale = lerp(1.0, 0.55, easeInOutCubic(p));
  } else {
    scale = 0.55;
  }

  let centerY: number;
  if (mgFrame < T_COMP04_START + 10) {
    centerY = CREST_FULL_Y;
  } else if (mgFrame < T_COMP04_START + 20) {
    const p = windowProgress(mgFrame, T_COMP04_START + 10, 10);
    centerY = lerp(CREST_FULL_Y, CREST_FINAL_Y, easeInOutCubic(p));
  } else {
    centerY = CREST_FINAL_Y;
  }

  if (scale <= 0.001) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: CREST_X,
        top: centerY,
        transform: `translate(-50%, -50%) scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Crown width={CROWN_BASE_WIDTH} goldDark={GOLD} goldLight={GOLD_LIGHT} />
      <Wordmark mgFrame={mgFrame} />
    </div>
  );
};

// ───────────────────────────── Motion graphics (Comp03→04) ─────────────────

const MotionGraphics: React.FC<{ headlineCopy: ImperioHeadlineCopy }> = ({ headlineCopy }) => {
  const mgFrame = useCurrentFrame();

  const glowOpacity = clamp01((mgFrame - (T_COMP03_START - 6)) / 10);
  const showHeadlineCta = mgFrame >= T_COMP04_START;

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <GlowTop opacity={glowOpacity} />

      {mgFrame >= T_COMP03_START ? <CrestGroup mgFrame={mgFrame} /> : null}

      {showHeadlineCta ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
          <div style={{ marginTop: 870 }}>
            <Headline mgFrame={mgFrame} copy={headlineCopy} />
          </div>
          <div style={{ marginTop: 1180, position: "absolute" }}>
            <CtaButton mgFrame={mgFrame} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ───────────────────────────── Composição raiz ─────────────────────────────

export const ImperioIgnicaoPunho: React.FC<ImperioIgnicaoPunhoProps> = ({
  takeFile,
  hookCamera,
  headlineCopy,
}) => {
  ensureFonts([FONT_SANS]);
  useVideoConfig();

  // peso "agressivo" (não "medio") — mesmo achado do GarantidoAds.tsx
  // (2026-10-10): em "medio" o delta de escala é sutil demais pra ler como
  // movimento intencional numa cena com fundo complexo.
  const camera: CameraMove | undefined = hookCamera ? { tipo: hookCamera, peso: "agressivo" } : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={TAKE1_FRAMES}>
        <Take1WithOverlays takeFile={takeFile} camera={camera} />
      </Sequence>
      {/* `from` recua BRIDGE frames pra sobrepor o fim do Take1 — a
          transição revela o conteúdo ENQUANTO o take ainda está visível
          por baixo, mesma técnica de overlap do Garantido (ver nota no
          topo do arquivo). `stillFile` não é mais usado aqui (a transição
          nova cross-fada do vídeo real, não de um freeze-frame) — mantido
          em `ImperioIgnicaoPunhoProps` só por compatibilidade com os
          scripts de render existentes. */}
      <Sequence from={TAKE1_FRAMES - BRIDGE} durationInFrames={MG_FRAMES}>
        <TransicaoCoroacao frames={BRIDGE}>
          <MotionGraphics headlineCopy={headlineCopy ?? IMPERIO_HEADLINE_DEFAULT} />
        </TransicaoCoroacao>
      </Sequence>
    </AbsoluteFill>
  );
};

export const imperioDefaultProps: ImperioIgnicaoPunhoProps = {
  takeFile: "take1_conformado.mov",
  stillFile: "take1_still_punho.png",
};
