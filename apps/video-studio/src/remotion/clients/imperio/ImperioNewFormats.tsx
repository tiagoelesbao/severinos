import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { easeOutBack, clamp01, lerp, windowProgress } from "../easing";
import { CaptionsOverlay } from "../../fx/Captions";
import type { CaptionRenderer } from "../../../lib/fxRegistry";
import { Crown } from "./Crown";
import { BG, BG_2, GOLD, GOLD_LIGHT, TEXT, TEXT_MUTED, MEDAL_GOLD, MEDAL_SILVER, MEDAL_BRONZE, DEFAULT_MEDAL } from "./palette";
import type { CameraId, CameraMove } from "../../../lib/fxCatalog";
import { cameraTransform } from "../../../lib/fxCatalog";
import { rankingDurationFrames, splitScreenDurationFrames } from "../../../lib/rankingMath";

/** Legenda automática (2026-10-19) — mesmo mecanismo da Garantido, ver nota
 * em GarantidoNewFormats.tsx. Reaproveita `CaptionsOverlay` tal como está. */
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
 * Ranking de Prêmios + Tela Dividida — versão Império Prêmios (2026-10-19,
 * founder: "quero as mesmas variações de templates na Império, porém
 * modifique o estilo visual e paleta de cores, para não ficar uma edição
 * igual em dois clientes do mesmo nicho"). MESMA mecânica estrutural de
 * `GarantidoNewFormats.tsx` (duração = vídeo-fonte inteiro, sem celular/
 * gadgets, botão estático, cada elemento decomponível no editor — ver
 * `ImperioSplitRankingLayers.tsx`) — só a pele muda:
 *
 *   Garantido = verde institucional, pílula de destaque sólida, lista em
 *   cartão plano.
 *   Império = dourado/coroação (paleta já estabelecida em
 *   ImperioIgnicaoPunho.tsx), headline com GLOW dourado no destaque (sem
 *   pílula), ranking com BADGE DE MEDALHA numerado (não pílula de texto),
 *   ícone de coroa como assinatura — nenhum dos dois reaproveita o
 *   tratamento visual do outro.
 */

// ═══════════════════════════ TAKE (câmera) ═════════════════════════════════

const TakeClip: React.FC<{ file: string; durationInFrames: number; camera?: CameraMove }> = ({ file, durationInFrames, camera }) => {
  const frame = useCurrentFrame();
  const { scale, x, y } = cameraTransform(camera, frame, durationInFrames);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", transform: `scale(${scale}) translate(${x}%, ${y}%)` }}>
        <OffthreadVideo src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};

/** Esconde SEM tirar do fluxo de layout — mesmo truque de GarantidoNewFormats.tsx. */
export const HiddenSlot: React.FC<{ visible: boolean; children: React.ReactNode }> = ({ visible, children }) => (
  <div style={{ opacity: visible ? 1 : 0 }}>{children}</div>
);

/** Glow radial dourado no topo — assinatura visual do Império (mesmo padrão
 * de `GlowTop` em ImperioIgnicaoPunho.tsx), reaproveitado aqui pra marcar
 * os templates novos como da MESMA marca sem copiar o visual da Garantido. */
const GoldGlowTop: React.FC<{ opacity?: number }> = ({ opacity = 1 }) =>
  opacity <= 0.001 ? null : (
    <AbsoluteFill
      style={{ opacity, background: `radial-gradient(ellipse 120% 38% at 50% 0%, rgba(227,167,62,0.30) 0%, rgba(227,167,62,0) 70%)` }}
    />
  );

// ═══════════════════════════ HEADLINE (1 linha + destaque) ═════════════════

/** Headline Império: 1 linha, palavra em destaque ganha GLOW dourado (sem
 * pílula sólida) — mesmo princípio de `Headline` em ImperioIgnicaoPunho.tsx,
 * deliberadamente diferente do tratamento de pílula da Garantido. */
const ImperioHeadline: React.FC<{ mgFrame: number; text: string; highlightWord?: string; fontSize?: number }> = ({
  mgFrame,
  text,
  highlightWord,
  fontSize = 52,
}) => {
  const words = text.split(" ");
  const hw = highlightWord?.toUpperCase();
  const START = 14;
  const STAGGER = 6;
  const DUR = 10;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 16px", maxWidth: "90%" }}>
      {words.map((w, i) => {
        const p = clamp01((mgFrame - (START + i * STAGGER)) / DUR);
        const isHighlight = hw !== undefined && w.toUpperCase() === hw;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${lerp(14, 0, p)}px) scale(${lerp(0.88, 1, p)})`,
              fontFamily: FONT_SANS,
              fontWeight: 800,
              fontSize,
              lineHeight: 1.16,
              color: isHighlight ? GOLD_LIGHT : TEXT,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              textShadow: isHighlight ? `0 0 26px rgba(227,167,62,0.65), 0 3px 14px rgba(0,0,0,0.5)` : "0 3px 14px rgba(0,0,0,0.5)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ═══════════════════════════ TELA DIVIDIDA ═══════════════════════════════

// Fallback (sem vídeo-fonte probado ainda) — duração REAL é a do vídeo
// escolhido, ver `calculateSplitScreenMetadata`.
export const SPLIT_FRAMES = 200;
export const SPLIT_TOTAL_FRAMES = SPLIT_FRAMES;

const SPLIT_TOP_H = 1056;
const SPLIT_BOTTOM_H = H - SPLIT_TOP_H;

export type SplitBlendType = "suave" | "dura";
export type SplitContentMode = "video" | "imagem";

export const DEFAULT_SPLIT_COPY_TEXT = "O próximo sorteio pode ser o seu. Acompanhe tudo em tempo real.";
export const DEFAULT_SPLIT_BUTTON_LABEL = "Ver o que está disponível";
const CENTER_BAND_H = 220;

/** Emenda — linha de luz dourada (dura) ou esmaecimento pro fundo do painel
 * (suave). Deliberadamente SEM preto/verde — o acento é sempre dourado. */
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
          background: `linear-gradient(90deg, rgba(227,167,62,0) 0%, ${GOLD} 50%, rgba(227,167,62,0) 100%)`,
          boxShadow: `0 0 18px 2px rgba(227,167,62,0.55)`,
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
        background: `linear-gradient(180deg, rgba(10,10,15,0) 0%, ${BG} 100%)`,
        zIndex: 2,
      }}
    />
  );
};

/** Headline central opcional, faixa sólida dourado-escura. */
export const CenterHeadlineBand: React.FC<{ mgFrame: number; text: string; highlightWord?: string }> = ({ mgFrame, text, highlightWord }) => {
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
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: enter,
        zIndex: 3,
      }}
    >
      <GoldGlowTop opacity={0.6} />
      <div style={{ transform: "scale(0.9)" }}>
        <ImperioHeadline mgFrame={mgFrame} text={text} highlightWord={highlightWord} fontSize={46} />
      </div>
    </div>
  );
};

/** Fundo do painel — gradiente quente escuro (BG_2→BG) com glow dourado no
 * topo, não o verde institucional da Garantido. */
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
        background: `linear-gradient(180deg, ${BG_2} 0%, ${BG} 100%)`,
        opacity: enter,
        overflow: "hidden",
      }}
    >
      <GoldGlowTop opacity={0.45} />
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
        maxWidth: 660,
        textAlign: "center",
        fontFamily: FONT_SANS,
        fontWeight: 600,
        fontSize: 29,
        lineHeight: 1.32,
        color: TEXT_MUTED,
      }}
    >
      {text}
    </div>
  );
};

/** Botão do painel — gradiente DOURADO com texto escuro (inversão
 * deliberada do botão verde-com-texto-branco da Garantido). SEM animação
 * de propósito (mesma decisão tomada pra Garantido 2026-10-19: estático,
 * editável no refino). */
const SplitButton: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
      borderRadius: 999,
      padding: "22px 44px",
      boxShadow: "0 16px 36px -10px rgba(227,167,62,0.5)",
    }}
  >
    <div
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 800,
        fontSize: 29,
        color: "#2a1c00",
        letterSpacing: 0.2,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  </div>
);

export const SplitPanelContent: React.FC<{
  mgFrame: number;
  headlineText: string;
  headlineHighlight?: string;
  showHeadlineInPanel: boolean;
  copyText: string;
  buttonLabel: string;
  only?: "headline" | "copy" | "button";
}> = ({ mgFrame, headlineText, headlineHighlight, showHeadlineInPanel, copyText, buttonLabel, only }) => {
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
        justifyContent: "center",
        gap: 30,
        padding: "0 60px",
        paddingTop: showHeadlineInPanel ? 0 : 130,
        boxSizing: "border-box",
      }}
    >
      {showHeadlineInPanel && (
        <HiddenSlot visible={showHeadline}>
          <ImperioHeadline mgFrame={mgFrame} text={headlineText} highlightWord={headlineHighlight} fontSize={46} />
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
  headlineText: string;
  headlineHighlight?: string;
  blendType: SplitBlendType;
  contentMode: SplitContentMode;
  centerHeadlineEnabled: boolean;
  copyText: string;
  buttonLabel: string;
}> = ({ file, camera, headlineText, headlineHighlight, blendType, contentMode, centerHeadlineEnabled, copyText, buttonLabel }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const panelMgFrame = contentMode === "imagem" ? 999 : frame;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: SPLIT_TOP_H, overflow: "hidden" }}>
        <TakeClip file={file} durationInFrames={durationInFrames} camera={camera} />
      </div>
      <BlendSeam type={blendType} />
      <SplitPanelBg mgFrame={panelMgFrame} />
      <SplitPanelContent
        mgFrame={panelMgFrame}
        headlineText={headlineText}
        headlineHighlight={headlineHighlight}
        showHeadlineInPanel={!centerHeadlineEnabled}
        copyText={copyText}
        buttonLabel={buttonLabel}
      />
      {centerHeadlineEnabled && <CenterHeadlineBand mgFrame={panelMgFrame} text={headlineText} highlightWord={headlineHighlight} />}
    </AbsoluteFill>
  );
};

export interface ImperioSplitScreenProps extends CaptionProps {
  takeFile: string;
  headlineText?: string;
  headlineHighlight?: string;
  hookCamera?: CameraId;
  blendType?: SplitBlendType;
  contentMode?: SplitContentMode;
  centerHeadlineEnabled?: boolean;
  splitCopyText?: string;
  splitButtonLabel?: string;
  /** Duração (frames) do vídeo-fonte probado em route.ts. */
  sourceDurationFrames?: number;
}

export function calculateImperioSplitScreenMetadata({ props }: { props: ImperioSplitScreenProps }) {
  return { durationInFrames: splitScreenDurationFrames(props.sourceDurationFrames, SPLIT_FRAMES) };
}

/**
 * Tela dividida (Império): produto visível o vídeo INTEIRO — painel vira
 * copy estilizada (headline/central + texto + botão dourado). Sem
 * celular, sem balões de notificação (mesma decisão da Garantido). Variáveis:
 * blend da emenda, modo estático/animado, headline central on/off.
 */
export const ImperioSplitScreenAd: React.FC<ImperioSplitScreenProps> = ({
  takeFile,
  headlineText,
  headlineHighlight,
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
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <SplitScreenBody
        file={takeFile}
        camera={camera}
        headlineText={headlineText ?? "ESSA PODE SER A SUA VITÓRIA."}
        headlineHighlight={headlineHighlight ?? "VITÓRIA."}
        blendType={blendType}
        contentMode={contentMode}
        centerHeadlineEnabled={centerHeadlineEnabled}
        copyText={splitCopyText ?? DEFAULT_SPLIT_COPY_TEXT}
        buttonLabel={splitButtonLabel ?? DEFAULT_SPLIT_BUTTON_LABEL}
      />
      {/* bottomPct empurra a legenda pra ACIMA do painel — mesmo achado da
          Garantido (ver nota lá): o default colidia com a headline/copy. */}
      <CaptionsLayer
        captions={captions}
        captionRenderer={captionRenderer}
        captionLines={captionLines}
        captionWordByWord={captionWordByWord}
        captionHighlight={captionHighlight}
        captionFontFamily={captionFontFamily}
        accentColor={GOLD}
        bottomPct={(SPLIT_BOTTOM_H + 40) / H}
      />
    </AbsoluteFill>
  );
};

export const imperioSplitScreenDefaultProps: ImperioSplitScreenProps = {
  takeFile: "take1_conformado.mov",
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

export const RANKING_TOTAL_FRAMES = rankingDurationFrames(DEFAULT_RANKING_ITEMS.length, undefined);

const RankingHeadline: React.FC<{ mgFrame: number; text: string }> = ({ mgFrame, text }) => {
  const label = windowProgress(mgFrame, 8, 14);
  if (label <= 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: label, marginBottom: 6 }}>
      <Crown width={30} gradientId="rankingCrown" glow={false} />
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: 24,
          letterSpacing: 2.4,
          textTransform: "uppercase",
          color: GOLD,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Badge de medalha numerado (ouro/prata/bronze pros 3 primeiros, dourado
 * neutro do 4º em diante) — linguagem visual de RANKING de verdade,
 * deliberadamente diferente da pílula plana de texto da Garantido. */
const RankBadge: React.FC<{ index: number }> = ({ index }) => {
  const medal = index === 0 ? MEDAL_GOLD : index === 1 ? MEDAL_SILVER : index === 2 ? MEDAL_BRONZE : DEFAULT_MEDAL;
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: medal.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ fontFamily: FONT_SANS, fontWeight: 900, fontSize: 20, color: medal.text }}>{index + 1}</span>
    </div>
  );
};

const RankingRow: React.FC<{ item: RankingItem; index: number; mgFrame: number }> = ({ item, index, mgFrame }) => {
  const enterAt = 24 + index * 16;
  const p = windowProgress(mgFrame, enterAt, 16);
  const eased = easeOutBack(p, 1.05);
  if (p <= 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        minWidth: 360,
        background: "rgba(15,13,20,0.82)",
        border: `1px solid rgba(227,167,62,0.3)`,
        borderRadius: 14,
        padding: "10px 22px 10px 10px",
        opacity: eased,
        transform: `translateX(${lerp(48, 0, eased)}px)`,
      }}
    >
      <RankBadge index={index} />
      <span style={{ flex: 1, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24, color: TEXT }}>{item.position}</span>
      <span style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 30, color: GOLD_LIGHT }}>{item.value}</span>
    </div>
  );
};

export type RankingPosition = "top" | "bottom";

export const RankingOverlayContent: React.FC<{
  mgFrame: number;
  items: RankingItem[];
  headlineText: string;
  only?: "headline" | "list";
  /** Topo ou base do quadro (2026-10-19, founder: "como vai ter legenda, o
   * ranking tem que ir pra cima ou abaixo da legenda") — default "bottom". */
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

/** Exportado pra `GarantidoRankingOverlayLayer`-equivalente reusar o MESMO
 * overlay — aqui com glow dourado no topo (assinatura Império), não um
 * gradiente neutro de preto puro. */
// Simétrico (ver nota equivalente em GarantidoNewFormats.tsx) — rankingPosition
// agora deixa a lista no topo também.
export const ImperioRankingOverlayStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(10,10,15,0.62) 0%, rgba(10,10,15,0.35) 35%, rgba(10,10,15,0.35) 65%, rgba(10,10,15,0.7) 100%)",
};

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
      <AbsoluteFill style={ImperioRankingOverlayStyle} />
      <GoldGlowTop opacity={0.5} />
      <RankingOverlayContent mgFrame={frame} items={items} headlineText={headlineText} position={position} />
    </AbsoluteFill>
  );
};

export interface ImperioRankingProps extends CaptionProps {
  takeFile: string;
  hookCamera?: CameraId;
  rankingHeadlineText?: string;
  rankingItems?: RankingItem[];
  /** Topo ou base do quadro — parametrizável pra não colidir com a legenda
   * automática (2026-10-19, founder). Default "bottom". */
  rankingPosition?: RankingPosition;
  sourceDurationFrames?: number;
}

export function calculateImperioRankingMetadata({ props }: { props: ImperioRankingProps }) {
  const items = props.rankingItems && props.rankingItems.length > 0 ? props.rankingItems : DEFAULT_RANKING_ITEMS;
  return { durationInFrames: rankingDurationFrames(items.length, props.sourceDurationFrames) };
}

/**
 * Ranking de prêmios (Império): lista de posições em badges de medalha
 * sobre o take real, com glow dourado destacando o prêmio — mesma mecânica
 * da Garantido (overlay + headline + lista variável), linguagem visual
 * própria (medalha numerada, não pílula de texto).
 */
export const ImperioRankingAd: React.FC<ImperioRankingProps> = ({
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
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <RankingBody
        file={takeFile}
        durationInFrames={durationInFrames}
        camera={camera}
        items={items}
        headlineText={rankingHeadlineText ?? "Prêmios em jogo hoje"}
        position={rankingPosition ?? "bottom"}
      />
      <CaptionsLayer
        captions={captions}
        captionRenderer={captionRenderer}
        captionLines={captionLines}
        captionWordByWord={captionWordByWord}
        captionHighlight={captionHighlight}
        captionFontFamily={captionFontFamily}
        accentColor={GOLD}
      />
    </AbsoluteFill>
  );
};

export const imperioRankingDefaultProps: ImperioRankingProps = {
  takeFile: "take1_conformado.mov",
};
