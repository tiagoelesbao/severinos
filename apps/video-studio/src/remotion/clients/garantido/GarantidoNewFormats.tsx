import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { easeOutBack, lerp, windowProgress } from "../easing";
import { CaptionsOverlay } from "../../fx/Captions";
import type { CaptionRenderer } from "../../../lib/fxRegistry";
import { DK, GOLD, GOLD_LIGHT, GREEN, GREEN_DEEP, GREEN_MID } from "./palette";
import type { CameraId, CameraMove } from "../../../lib/fxCatalog";
import { rankingDurationFrames, splitScreenDurationFrames } from "../../../lib/rankingMath";
import { TakeClip, Headline, GARANTIDO_HEADLINES, type HeadlineCopy } from "./GarantidoAds";

/**
 * Legenda automática (2026-10-19, founder: "o motor de legendar vídeo
 * automático pronto, inclusive com posicionamento otimizado pra redes
 * sociais") — reaproveita `CaptionsOverlay` (src/remotion/fx/Captions.tsx,
 * já com os 5 estilos + safe-zone) tal como está, SEM reimplementar nada.
 * `captions` ausente/vazio = não renderiza nada (overlay desligado).
 */
export interface CaptionProps {
  captions?: Caption[];
  captionRenderer?: CaptionRenderer;
  captionLines?: 1 | 2;
  captionWordByWord?: boolean;
  captionHighlight?: boolean;
  captionFontFamily?: string;
}

const CaptionsLayer: React.FC<CaptionProps & { accentColor: string; bottomPct?: number }> = ({
  captions,
  captionRenderer,
  captionLines,
  captionWordByWord,
  captionHighlight,
  captionFontFamily,
  accentColor,
  bottomPct,
}) => {
  if (!captions || captions.length === 0) return null;
  return (
    <CaptionsOverlay
      captions={captions}
      accentColor={accentColor}
      renderer={captionRenderer ?? "clean"}
      cueOptions={{ maxLines: captionLines ?? 2, maxWords: captionWordByWord ? 1 : undefined }}
      theme={{ highlight: captionHighlight, fontFamily: captionFontFamily, bottomPct }}
    />
  );
};

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/**
 * 2 formatos novos pro Garantido (2026-10-18, founder: "estude algum formato
 * interessante... parametrizável igual fizemos aqui" — confirmado via
 * AskUserQuestion: "Tela dividida + Ranking de prêmios").
 *
 * REESCRITOS (2026-10-18, mesmo dia, pedido seguinte do founder): a v1
 * reaproveitava pixel-a-pixel o encerramento do Take2Ad (headline+celular
 * 3D+CTA após uma transição). O founder foi explícito: esse encerramento
 * "pertence ao template 01 apenas" — Ranking e Tela Dividida agora são
 * peças de UMA fase só, sem celular, sem transição final. Cada um ganha seu
 * próprio conjunto de variáveis (ver comentário de cada seção).
 */

// ═══════════════════════════ TELA DIVIDIDA ═══════════════════════════════

// Fallback (sem vídeo-fonte probado ainda, ex.: registro em Root.tsx) — a
// duração REAL (2026-10-19, correção do bug "upei 7s, saiu 6s") é a do
// vídeo-fonte inteiro escolhido pelo usuário, não esta constante — ver
// `calculateSplitScreenMetadata` + `splitScreenDurationFrames`.
export const SPLIT_FRAMES = 200; // ~6.7s
export const SPLIT_TOTAL_FRAMES = SPLIT_FRAMES;

export const SPLIT_TOP_H = 1056; // ~55% — take real
export const SPLIT_BOTTOM_H = H - SPLIT_TOP_H; // ~45% — painel de copy

export type SplitBlendType = "suave" | "dura";
export type SplitContentMode = "video" | "imagem";

export const DEFAULT_SPLIT_COPY_TEXT = "Participe agora e acompanhe tudo em tempo real, direto no app.";
export const DEFAULT_SPLIT_BUTTON_LABEL = "Ver oferta agora";

/**
 * Emenda entre o take (cima) e o painel (baixo) — variável do founder
 * ("mesclagem suave ou dura"). Dura = corte limpo com 1 linha de definição;
 * suave = faixa de gradiente que esmaece o take no verde do topo do painel,
 * em vez do corte seco.
 */
export const BlendSeam: React.FC<{ type: SplitBlendType }> = ({ type }) => {
  if (type === "dura") {
    return (
      <div
        style={{
          position: "absolute",
          top: SPLIT_TOP_H - 1,
          left: 0,
          width: "100%",
          height: 3,
          background: "rgba(0,0,0,0.5)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
          zIndex: 2,
        }}
      />
    );
  }
  const BAND = 130;
  return (
    <div
      style={{
        position: "absolute",
        top: SPLIT_TOP_H - BAND,
        left: 0,
        width: "100%",
        height: BAND,
        background: `linear-gradient(180deg, rgba(4,90,22,0) 0%, ${GREEN_DEEP} 100%)`,
        zIndex: 2,
      }}
    />
  );
};

/** Headline central opcional, com fundo sólido, straddling a emenda — variável
 * independente ("se tera ou nao uma headline no centro com background
 * solido"). Quando ativa, o painel de baixo NÃO repete a headline (evita
 * duplicar o mesmo texto 2x na tela). */
const CENTER_BAND_H = 220; // bump 2026-10-19 (founder: headline pequena demais)

export const CenterHeadlineBand: React.FC<{ mgFrame: number; copy: HeadlineCopy }> = ({ mgFrame, copy }) => {
  const enter = windowProgress(mgFrame, 6, 16);
  if (enter <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: SPLIT_TOP_H - CENTER_BAND_H / 2,
        left: 0,
        width: "100%",
        height: CENTER_BAND_H,
        background: DK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: enter,
        zIndex: 3,
      }}
    >
      <div style={{ transform: "scale(0.74)" }}>
        <Headline mgFrame={mgFrame} copy={copy} />
      </div>
    </div>
  );
};

const SplitCopyText: React.FC<{ mgFrame: number; text: string; delayFrame: number }> = ({ mgFrame, text, delayFrame }) => {
  const p = windowProgress(mgFrame, delayFrame, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${lerp(16, 0, p)}px)`,
        maxWidth: 680,
        textAlign: "center",
        fontFamily: FONT_SANS,
        fontWeight: 650,
        fontSize: 31,
        lineHeight: 1.3,
        color: "rgba(255,255,255,0.94)",
      }}
    >
      {text}
    </div>
  );
};

/**
 * Botão/elemento complementar do painel — genérico (label variável), não
 * mais o CtaButtonPill do encerramento (timing diferente, peça mais curta).
 * SEM animação de propósito (2026-10-19, founder: "a animação do botão está
 * quebrada... deixe sem animação, eu coloco no refino do editor") — estático
 * desde o frame 0, só acompanha o fade geral do painel (`SplitPanelBg`).
 */
const SplitButton: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${GREEN_MID} 0%, ${GREEN} 48%, ${GREEN_DEEP} 100%)`,
        borderRadius: 999,
        padding: "22px 44px",
        boxShadow: "0 16px 36px -10px rgba(9,127,35,0.55)",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: 29,
          color: "#ffffff",
          letterSpacing: 0.2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

/**
 * Painel de baixo — copy estilizada (headline opcional + copy + botão) +
 * balões de notificação flutuantes. SEM celular (pedido explícito do
 * founder: "celular aqui não, talvez só os balões de notificações").
 * `mgFrame` já vem PRÉ-RESOLVIDO pelo chamador (ver `panelMgFrame` na
 * composição): em modo "imagem" chega travado num valor alto, fazendo toda
 * entrada resolver pra "já assentada" — o mesmo truque usado no CTA da v1,
 * agora aplicado ao painel inteiro.
 */
/** Esconde SEM tirar do fluxo de layout (opacity, nunca display:none) — é o
 * que permite isolar 1 elemento por vez nas camadas do editor (ver
 * `SplitRankingLayers.tsx`) na MESMA posição exata da peça real, sem
 * recalcular layout manualmente. Mesmo truque de `EndingLayers.tsx`. */
export const HiddenSlot: React.FC<{ visible: boolean; children: React.ReactNode }> = ({ visible, children }) => (
  <div style={{ opacity: visible ? 1 : 0 }}>{children}</div>
);

/** Fundo do painel (gradiente) — separado do conteúdo (2026-10-19) pra virar
 * camada isolada própria no editor (`GarantidoSplitBgLayer`, junto com
 * `BlendSeam`), sem precisar levar headline/copy/botão junto. */
export const SplitPanelBg: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const enter = windowProgress(mgFrame, 4, 16);
  return (
    <div
      style={{
        position: "absolute",
        top: SPLIT_TOP_H,
        left: 0,
        width: "100%",
        height: SPLIT_BOTTOM_H,
        background: `linear-gradient(180deg, ${GREEN_DEEP} 0%, ${DK} 100%)`,
        opacity: enter,
      }}
    />
  );
};

/** Headline (opcional) + copy + botão do painel — `only` isola 1 elemento
 * por vez (os outros ficam com opacity:0 mas MANTÊM o espaço no flex, pra
 * preservar a posição exata de quem fica visível). `only` ausente = mostra
 * os 3 juntos (uso real da peça). */
export const SplitPanelContent: React.FC<{
  mgFrame: number;
  headlineCopy: HeadlineCopy;
  showHeadlineInPanel: boolean;
  copyText: string;
  buttonLabel: string;
  only?: "headline" | "copy" | "button";
}> = ({ mgFrame, headlineCopy, showHeadlineInPanel, copyText, buttonLabel, only }) => {
  const copyDelay = showHeadlineInPanel ? 34 : 14;
  const showHeadline = showHeadlineInPanel && (only === undefined || only === "headline");
  const showCopy = only === undefined || only === "copy";
  const showButton = only === undefined || only === "button";
  return (
    <div
      style={{
        position: "absolute",
        top: SPLIT_TOP_H,
        left: 0,
        right: 0,
        height: SPLIT_BOTTOM_H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // Centralizado de verdade no painel (2026-10-19, founder: "a
        // distribuição dos elementos no espaço não está legal" — achado no
        // print real: o bloco ficava ENCOSTADO no topo do painel, sobrando
        // um vazio enorme embaixo do botão). `justifyContent:center` usa a
        // altura INTEIRA do painel em vez de um `top` fixo pensado pra uma
        // altura de conteúdo específica — funciona pra qualquer tamanho de
        // copy sem recalcular nada.
        justifyContent: "center",
        gap: 30,
        padding: "0 60px",
        // Sem headline própria (centerHeadlineEnabled=true): a faixa
        // central (CenterHeadlineBand, CENTER_BAND_H=220) invade ~110px do
        // topo do painel — reserva esse respiro ANTES de centralizar o
        // resto, senão colide (achado renderizando: copy aparecia por
        // baixo da faixa).
        paddingTop: showHeadlineInPanel ? 0 : 130,
        boxSizing: "border-box",
      }}
    >
      {/* H1 do painel (2026-10-19, founder: "muito pequena") — 0.64 → 0.78. */}
      {showHeadlineInPanel && (
        <HiddenSlot visible={showHeadline}>
          <div style={{ transform: "scale(0.78)", transformOrigin: "top center" }}>
            <Headline mgFrame={mgFrame} copy={headlineCopy} />
          </div>
        </HiddenSlot>
      )}
      <HiddenSlot visible={showCopy}>
        <SplitCopyText mgFrame={mgFrame} text={copyText} delayFrame={copyDelay} />
      </HiddenSlot>
      <HiddenSlot visible={showButton}>
        <SplitButton label={buttonLabel} />
      </HiddenSlot>
    </div>
  );
};

const SplitScreenBody: React.FC<{
  file: string;
  camera?: CameraMove;
  headlineCopy: HeadlineCopy;
  blendType: SplitBlendType;
  contentMode: SplitContentMode;
  centerHeadlineEnabled: boolean;
  copyText: string;
  buttonLabel: string;
}> = ({ file, camera, headlineCopy, blendType, contentMode, centerHeadlineEnabled, copyText, buttonLabel }) => {
  const frame = useCurrentFrame();
  // Duração REAL resolvida por `calculateSplitScreenMetadata` (vídeo-fonte
  // inteiro) — `useVideoConfig` lê o valor JÁ resolvido da composição atual,
  // única fonte de verdade (2026-10-19, corrige "upei 7s, saiu 6s": SPLIT_FRAMES
  // fixo era vício herdado do template 1, que cortava antes pra transitar).
  const { durationInFrames } = useVideoConfig();
  // "imagem" = estático: trava o relógio do painel num valor alto, toda
  // entrada (windowProgress/clamp01) resolve pra "já concluída" desde o
  // frame 0 — o mesmo mecanismo do take sempre continua rodando normal
  // (é vídeo real, não gráfico).
  const panelMgFrame = contentMode === "imagem" ? 999 : frame;
  return (
    <AbsoluteFill style={{ backgroundColor: DK }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: SPLIT_TOP_H, overflow: "hidden" }}>
        <TakeClip file={file} durationInFrames={durationInFrames} camera={camera} />
      </div>
      <BlendSeam type={blendType} />
      <SplitPanelBg mgFrame={panelMgFrame} />
      <SplitPanelContent
        mgFrame={panelMgFrame}
        headlineCopy={headlineCopy}
        showHeadlineInPanel={!centerHeadlineEnabled}
        copyText={copyText}
        buttonLabel={buttonLabel}
      />
      {centerHeadlineEnabled && <CenterHeadlineBand mgFrame={panelMgFrame} copy={headlineCopy} />}
    </AbsoluteFill>
  );
};

export interface GarantidoSplitScreenProps extends CaptionProps {
  takeFile: string;
  headlineCopy?: HeadlineCopy;
  hookCamera?: CameraId;
  /** Mesclagem na emenda take/painel — "suave" (gradiente) ou "dura" (corte). */
  blendType?: SplitBlendType;
  /** "video" = painel animado; "imagem" = painel estático (travado na pose final). */
  contentMode?: SplitContentMode;
  /** Headline centralizada com fundo sólido na emenda (substitui a headline do painel). */
  centerHeadlineEnabled?: boolean;
  splitCopyText?: string;
  splitButtonLabel?: string;
  /** Duração (frames) do vídeo-fonte probado em route.ts — a peça dura o
   * vídeo ESCOLHIDO inteiro (2026-10-19, correção de bug). Ausente usa
   * `SPLIT_FRAMES` (fallback só pro registro estático em Root.tsx). */
  sourceDurationFrames?: number;
}

/** `calculateMetadata` (2026-10-19) — duração é a do vídeo-fonte escolhido
 * pelo usuário, não mais uma constante fixa (`SPLIT_FRAMES`) herdada do
 * template anterior (que cortava o take antes pra dar lugar à transição). */
export function calculateSplitScreenMetadata({ props }: { props: GarantidoSplitScreenProps }) {
  return { durationInFrames: splitScreenDurationFrames(props.sourceDurationFrames, SPLIT_FRAMES) };
}

/**
 * Tela dividida: produto visível o vídeo INTEIRO, sem celular — painel vira
 * copy estilizada (headline/central + texto + botão). SEM balões de
 * notificação (2026-10-19, founder: "não estão harmônicos, pode remover").
 * Variáveis: blend da emenda, modo estático/animado, headline central on/off.
 */
export const GarantidoSplitScreenAd: React.FC<GarantidoSplitScreenProps> = ({
  takeFile,
  headlineCopy,
  hookCamera,
  blendType = "dura",
  contentMode = "video",
  centerHeadlineEnabled = false,
  splitCopyText,
  splitButtonLabel,
  captions,
  captionRenderer,
  captionLines,
  captionWordByWord,
  captionHighlight,
  captionFontFamily,
}) => {
  ensureFonts([FONT_SANS]);
  const camera: CameraMove | undefined = hookCamera ? { tipo: hookCamera, peso: "agressivo" } : undefined;
  const copy = headlineCopy ?? GARANTIDO_HEADLINES.take2;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <SplitScreenBody
        file={takeFile}
        camera={camera}
        headlineCopy={copy}
        blendType={blendType}
        contentMode={contentMode}
        centerHeadlineEnabled={centerHeadlineEnabled}
        copyText={splitCopyText ?? DEFAULT_SPLIT_COPY_TEXT}
        buttonLabel={splitButtonLabel ?? DEFAULT_SPLIT_BUTTON_LABEL}
      />
      {/* bottomPct empurra a legenda pra ACIMA do painel (que ocupa os 45%
          de baixo inteiros) — achado renderizando: a legenda no default
          (safe-zone pensada pra vídeo cheio) caía EM CIMA da headline do
          painel, mesmo problema que `rankingPosition` resolve no Ranking. */}
      <CaptionsLayer
        captions={captions}
        captionRenderer={captionRenderer}
        captionLines={captionLines}
        captionWordByWord={captionWordByWord}
        captionHighlight={captionHighlight}
        captionFontFamily={captionFontFamily}
        accentColor={GREEN_MID}
        bottomPct={(SPLIT_BOTTOM_H + 40) / H}
      />
    </AbsoluteFill>
  );
};

export const garantidoSplitScreenDefaultProps: GarantidoSplitScreenProps = {
  takeFile: "take2_video1-fonte_sem-texto_20261008_clean.mp4",
};

// ═══════════════════════════ RANKING DE PRÊMIOS ═══════════════════════════

export interface RankingItem {
  position: string;
  value: string;
}

export const DEFAULT_RANKING_ITEMS: RankingItem[] = [
  { position: "1º lugar", value: "R$ 800" },
  { position: "2º lugar", value: "R$ 250" },
  { position: "3º lugar", value: "R$ 150" },
];

// Duração depende da QUANTIDADE de ganhadores E do vídeo-fonte escolhido
// (2026-10-19) — ver `rankingDurationFrames` em rankingMath.ts. Export
// abaixo só preserva o valor DEFAULT (3 itens, sem vídeo) pra quem registra
// a composição em Root.tsx com um fallback estático.
export const RANKING_TOTAL_FRAMES = rankingDurationFrames(DEFAULT_RANKING_ITEMS.length, undefined);

export const RankingHeadline: React.FC<{ mgFrame: number; text: string }> = ({ mgFrame, text }) => {
  const label = windowProgress(mgFrame, 8, 14);
  if (label <= 0) return null;
  return (
    <div
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 800,
        fontSize: 24,
        letterSpacing: 2.4,
        textTransform: "uppercase",
        color: GOLD,
        opacity: label,
        marginBottom: 4,
      }}
    >
      {text}
    </div>
  );
};

/**
 * Pílula de posição — cores do banner de prêmio REAL do produto (dourado,
 * não verde da marca — mesmo escopo estrito documentado em palette.ts:
 * "só o banner reusa esse dourado"), reforçando que é o MECANISMO do
 * produto (sorteio por número) sendo mostrado, não decoração. Ganha um
 * glow idle na borda depois de assentar (2026-10-19 — "apenas surgimento",
 * precisa de mais vida depois da entrada).
 */
export const RankingRow: React.FC<{ item: RankingItem; index: number; mgFrame: number }> = ({ item, index, mgFrame }) => {
  const enterAt = 24 + index * 16;
  const p = windowProgress(mgFrame, enterAt, 16);
  const eased = easeOutBack(p, 1.05);
  if (p <= 0) return null;
  const settleFrame = enterAt + 16;
  const glow = mgFrame < settleFrame ? 0.4 : 0.4 + 0.28 * (0.5 + 0.5 * Math.sin((2 * Math.PI * (mgFrame - settleFrame)) / 70));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        minWidth: 360,
        background: "rgba(6,16,10,0.8)",
        border: `1.5px solid rgba(227,167,62,${glow})`,
        borderRadius: 13,
        padding: "14px 24px",
        opacity: eased,
        transform: `translateX(${lerp(48, 0, eased)}px)`,
      }}
    >
      <span style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 25, color: "#ffffff", letterSpacing: -0.2 }}>
        {item.position}
      </span>
      <span style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 31, color: GOLD_LIGHT }}>{item.value}</span>
    </div>
  );
};

/** `only` isola headline OU a lista inteira (as posições viram UM bloco só,
 * não cada linha separada — "copys sendo um bloco", pedido do founder) pra
 * virar camada própria no editor (`GarantidoRankingHeadlineLayer`/
 * `GarantidoRankingListLayer`). Ausente = mostra os 2 juntos (peça real). */
export type RankingPosition = "top" | "bottom";

export const RankingOverlayContent: React.FC<{
  mgFrame: number;
  items: RankingItem[];
  headlineText: string;
  only?: "headline" | "list";
  /** Topo ou base do quadro (2026-10-19, founder: "como vai ter legenda, o
   * ranking tem que ir pra cima ou abaixo da legenda") — default "bottom"
   * preserva o comportamento original. */
  position?: RankingPosition;
}> = ({ mgFrame, items, headlineText, only, position = "bottom" }) => {
  const showHeadline = only === undefined || only === "headline";
  const showList = only === undefined || only === "list";
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        ...(position === "top" ? { top: 170 } : { bottom: 300 }),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <HiddenSlot visible={showHeadline}>
        <RankingHeadline mgFrame={mgFrame} text={headlineText} />
      </HiddenSlot>
      <HiddenSlot visible={showList}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {items.map((it, i) => (
            <RankingRow key={i} item={it} index={i} mgFrame={mgFrame} />
          ))}
        </div>
      </HiddenSlot>
    </div>
  );
};

/** Exportado (2026-10-19) pra `GarantidoRankingOverlayLayer` usar o MESMO
 * gradiente isolado como camada própria no editor. */
// Simétrico (escuro em cima E embaixo, mais claro no meio) — 2026-10-19:
// antes só escurecia embaixo, mas `rankingPosition` agora deixa a lista no
// TOPO também (pra não colidir com a legenda); um gradiente só-de-baixo
// deixaria o ranking no topo sem destaque nenhum.
export const RANKING_DARK_OVERLAY_GRADIENT =
  "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.30) 35%, rgba(0,0,0,0.30) 65%, rgba(0,0,0,0.66) 100%)";

const RankingBody: React.FC<{
  file: string;
  durationInFrames: number;
  camera?: CameraMove;
  items: RankingItem[];
  headlineText: string;
  position: RankingPosition;
}> = ({ file, durationInFrames, camera, items, headlineText, position }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <TakeClip file={file} durationInFrames={durationInFrames} camera={camera} />
      {/* Overlay escuro em tela cheia — pedido do founder: "destacar o
          prêmio". Fixo, não é variável. Gradiente (mais forte embaixo, onde
          fica a lista) em vez de opacidade uniforme — não apaga o take por
          completo no topo do frame. */}
      <AbsoluteFill style={{ background: RANKING_DARK_OVERLAY_GRADIENT }} />
      <RankingOverlayContent mgFrame={frame} items={items} headlineText={headlineText} position={position} />
    </AbsoluteFill>
  );
};

export interface GarantidoRankingProps extends CaptionProps {
  takeFile: string;
  hookCamera?: CameraId;
  /** Headline acima do ranking (variável — antes era "Prêmios de hoje" fixo). */
  rankingHeadlineText?: string;
  /** Posições do ranking — tamanho da lista = "quantidade de ganhadores" (variável). */
  rankingItems?: RankingItem[];
  /** Topo ou base do quadro — parametrizável pra não colidir com a legenda
   * automática (2026-10-19, founder). Default "bottom". */
  rankingPosition?: RankingPosition;
  /** Duração (frames) do vídeo-fonte probado em route.ts — a peça dura o
   * vídeo ESCOLHIDO inteiro, com piso pra sempre dar tempo de revelar todas
   * as posições (2026-10-19, correção de bug). */
  sourceDurationFrames?: number;
}

/** `calculateMetadata` (2026-10-19) — duração acompanha a QUANTIDADE de
 * ganhadores escolhida E o vídeo-fonte inteiro (não mais uma constante fixa
 * pensada pra uma transição que esse template não tem mais). */
export function calculateRankingMetadata({ props }: { props: GarantidoRankingProps }) {
  const items = props.rankingItems && props.rankingItems.length > 0 ? props.rankingItems : DEFAULT_RANKING_ITEMS;
  return { durationInFrames: rankingDurationFrames(items.length, props.sourceDurationFrames) };
}

/**
 * Ranking de prêmios: lista de posições revelando uma por vez sobre o take
 * real, com overlay escuro full-frame destacando o prêmio — bate direto com
 * o mecanismo do produto (sorteio por número, não prêmio único). Sem
 * celular/transição final (pertence só ao template 01).
 */
export const GarantidoRankingAd: React.FC<GarantidoRankingProps> = ({
  takeFile,
  hookCamera,
  rankingHeadlineText,
  rankingItems,
  rankingPosition,
  captions,
  captionRenderer,
  captionLines,
  captionWordByWord,
  captionHighlight,
  captionFontFamily,
}) => {
  ensureFonts([FONT_SANS]);
  const camera: CameraMove | undefined = hookCamera ? { tipo: hookCamera, peso: "agressivo" } : undefined;
  const items = rankingItems && rankingItems.length > 0 ? rankingItems : DEFAULT_RANKING_ITEMS;
  // Duração JÁ resolvida por `calculateRankingMetadata` (vídeo-fonte inteiro
  // + piso de revelação) — única fonte de verdade, ver nota no Split-Screen.
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <RankingBody
        file={takeFile}
        durationInFrames={durationInFrames}
        camera={camera}
        items={items}
        headlineText={rankingHeadlineText ?? "Prêmios de hoje"}
        position={rankingPosition ?? "bottom"}
      />
      <CaptionsLayer
        captions={captions}
        captionRenderer={captionRenderer}
        captionLines={captionLines}
        captionWordByWord={captionWordByWord}
        captionHighlight={captionHighlight}
        captionFontFamily={captionFontFamily}
        accentColor={GREEN_MID}
      />
    </AbsoluteFill>
  );
};

export const garantidoRankingDefaultProps: GarantidoRankingProps = {
  takeFile: "take2_video1-fonte_sem-texto_20261008_clean.mp4",
};
