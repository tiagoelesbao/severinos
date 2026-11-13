import React from "react";
import { AbsoluteFill } from "remotion";
import { ensureFonts, FONT_SANS } from "../../fonts";
import {
  BlendSeam,
  SplitPanelBg,
  SplitPanelContent,
  CenterHeadlineBand,
  RankingOverlayContent,
  ImperioRankingOverlayStyle,
  DEFAULT_SPLIT_COPY_TEXT,
  DEFAULT_RANKING_ITEMS,
  type SplitBlendType,
  type RankingItem,
  type RankingPosition,
} from "./ImperioNewFormats";

/**
 * Decomposição dos 2 templates novos do Império em CAMADAS separadas —
 * mesma técnica de `SplitRankingLayers.tsx` (Garantido): reaproveita os
 * MESMOS componentes da peça real com `only` isolando 1 elemento por vez via
 * `HiddenSlot`, cada um vira um PNG de quadro cheio (fundo transparente) na
 * posição EXATA da peça original.
 */

// Headline Império não tem stagger tão longo quanto a Garantido (1 linha,
// não 2) — 200 dá folga confortável pra qualquer contagem de palavras.
const STILL_FRAME_SPLIT = 200;

// ═══════════════════════════ TELA DIVIDIDA ═══════════════════════════════

/** Fundo do painel (gradiente + glow dourado) + emenda — SEM headline/copy/botão. */
export const ImperioSplitBgLayer: React.FC<{ blendType?: SplitBlendType }> = ({ blendType = "dura" }) => (
  <AbsoluteFill>
    <BlendSeam type={blendType} />
    <SplitPanelBg mgFrame={STILL_FRAME_SPLIT} />
  </AbsoluteFill>
);

export const ImperioSplitHeadlineLayer: React.FC<{
  headlineText?: string;
  headlineHighlight?: string;
  centerHeadlineEnabled?: boolean;
}> = ({ headlineText, headlineHighlight, centerHeadlineEnabled }) => {
  ensureFonts([FONT_SANS]);
  const text = headlineText ?? "ESSA PODE SER A SUA VITÓRIA.";
  const highlight = headlineHighlight ?? "VITÓRIA.";
  if (centerHeadlineEnabled) {
    return (
      <AbsoluteFill>
        <CenterHeadlineBand mgFrame={STILL_FRAME_SPLIT} text={text} highlightWord={highlight} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <SplitPanelContent
        mgFrame={STILL_FRAME_SPLIT}
        headlineText={text}
        headlineHighlight={highlight}
        showHeadlineInPanel
        copyText=""
        buttonLabel=""
        only="headline"
      />
    </AbsoluteFill>
  );
};

export const ImperioSplitCopyLayer: React.FC<{ splitCopyText?: string; centerHeadlineEnabled?: boolean }> = ({
  splitCopyText,
  centerHeadlineEnabled,
}) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <SplitPanelContent
        mgFrame={STILL_FRAME_SPLIT}
        headlineText=""
        showHeadlineInPanel={!centerHeadlineEnabled}
        copyText={splitCopyText ?? DEFAULT_SPLIT_COPY_TEXT}
        buttonLabel=""
        only="copy"
      />
    </AbsoluteFill>
  );
};

export const ImperioSplitButtonLayer: React.FC<{ splitButtonLabel?: string; centerHeadlineEnabled?: boolean }> = ({
  splitButtonLabel,
  centerHeadlineEnabled,
}) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <SplitPanelContent
        mgFrame={STILL_FRAME_SPLIT}
        headlineText=""
        showHeadlineInPanel={!centerHeadlineEnabled}
        copyText=""
        buttonLabel={splitButtonLabel ?? "Ver o que está disponível"}
        only="button"
      />
    </AbsoluteFill>
  );
};

// ═══════════════════════════ RANKING DE PRÊMIOS ═══════════════════════════

/** Overlay escuro + glow dourado — fixo, sem variável. */
export const ImperioRankingOverlayLayer: React.FC = () => <AbsoluteFill style={ImperioRankingOverlayStyle} />;

export const ImperioRankingHeadlineLayer: React.FC<{
  rankingHeadlineText?: string;
  rankingItems?: RankingItem[];
  rankingPosition?: RankingPosition;
}> = ({ rankingHeadlineText, rankingItems, rankingPosition }) => {
  ensureFonts([FONT_SANS]);
  const items = rankingItems && rankingItems.length > 0 ? rankingItems : DEFAULT_RANKING_ITEMS;
  return (
    <AbsoluteFill>
      <RankingOverlayContent
        mgFrame={200}
        items={items}
        headlineText={rankingHeadlineText ?? "Prêmios em jogo hoje"}
        only="headline"
        position={rankingPosition}
      />
    </AbsoluteFill>
  );
};

export const ImperioRankingListLayer: React.FC<{ rankingItems?: RankingItem[]; rankingPosition?: RankingPosition }> = ({
  rankingItems,
  rankingPosition,
}) => {
  ensureFonts([FONT_SANS]);
  const items = rankingItems && rankingItems.length > 0 ? rankingItems : DEFAULT_RANKING_ITEMS;
  const stillFrame = 24 + (items.length - 1) * 16 + 16 + 10;
  return (
    <AbsoluteFill>
      <RankingOverlayContent mgFrame={stillFrame} items={items} headlineText="" only="list" position={rankingPosition} />
    </AbsoluteFill>
  );
};
