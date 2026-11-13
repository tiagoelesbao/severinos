import React from "react";
import { AbsoluteFill } from "remotion";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { GARANTIDO_HEADLINES, type HeadlineCopy } from "./GarantidoAds";
import {
  BlendSeam,
  SplitPanelBg,
  SplitPanelContent,
  CenterHeadlineBand,
  RankingOverlayContent,
  DEFAULT_SPLIT_COPY_TEXT,
  DEFAULT_RANKING_ITEMS,
  RANKING_DARK_OVERLAY_GRADIENT,
  type SplitBlendType,
  type RankingItem,
  type RankingPosition,
} from "./GarantidoNewFormats";

/**
 * Decomposição dos 2 templates novos (Tela Dividida/Ranking) em CAMADAS
 * separadas e exportáveis — pedido do founder 2026-10-19: "cada elemento
 * venha editável para nosso editor, tudo separado nas camadas da nossa
 * timeline, copys sendo um bloco, os gadgets que surgem nos cantos também".
 *
 * Mesma técnica de `EndingLayers.tsx`: reaproveita os MESMOS componentes da
 * peça real com um `only`/`show` isolando 1 elemento por vez via
 * `HiddenSlot` (opacity, nunca display:none — preserva o layout/posição dos
 * outros). Cada elemento vira um PNG de quadro cheio (1080×1920, fundo
 * transparente) pronto pra entrar como camada de imagem no editor na
 * posição EXATA da peça original — zero matemática de posição refeita aqui.
 *
 * `STILL_FRAME_*` é um frame "tudo assentado" (depois de toda entrada
 * terminar) — a imagem captura o elemento no estado final, e a ANIMAÇÃO de
 * entrada (fade/sobe/cresce) é reconstruída depois na ponte do editor via
 * `animateIn`/`tracks` (ver generateEditorBridge.ts), não fica cravada no
 * PNG.
 */

// Split: headline (stagger interno até ~44) é o pior caso de entrada. 240 dá
// folga confortável (balões de notificação REMOVIDOS 2026-10-19 — founder:
// "não estão harmônicos" — e o botão não tem mais entrada, é estático).
const STILL_FRAME_SPLIT = 240;

// ═══════════════════════════ TELA DIVIDIDA ═══════════════════════════════

/** Fundo do painel (gradiente) + emenda — SEM headline/copy/botão/balões. */
export const GarantidoSplitBgLayer: React.FC<{ blendType?: SplitBlendType }> = ({ blendType = "dura" }) => (
  <AbsoluteFill>
    <BlendSeam type={blendType} />
    <SplitPanelBg mgFrame={STILL_FRAME_SPLIT} />
  </AbsoluteFill>
);

/** Headline — posição no painel OU na faixa central, conforme `centerHeadlineEnabled`. */
export const GarantidoSplitHeadlineLayer: React.FC<{ headlineCopy?: HeadlineCopy; centerHeadlineEnabled?: boolean }> = ({
  headlineCopy,
  centerHeadlineEnabled,
}) => {
  ensureFonts([FONT_SANS]);
  const copy = headlineCopy ?? GARANTIDO_HEADLINES.take2;
  if (centerHeadlineEnabled) {
    return (
      <AbsoluteFill>
        <CenterHeadlineBand mgFrame={STILL_FRAME_SPLIT} copy={copy} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <SplitPanelContent
        mgFrame={STILL_FRAME_SPLIT}
        headlineCopy={copy}
        showHeadlineInPanel
        copyText=""
        buttonLabel=""
        only="headline"
      />
    </AbsoluteFill>
  );
};

/** Copy do painel — posição desloca sozinha conforme a headline estar no
 * painel ou na faixa central (mesmo `SplitPanelContent` da peça real). */
export const GarantidoSplitCopyLayer: React.FC<{ splitCopyText?: string; centerHeadlineEnabled?: boolean }> = ({
  splitCopyText,
  centerHeadlineEnabled,
}) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <SplitPanelContent
        mgFrame={STILL_FRAME_SPLIT}
        headlineCopy={GARANTIDO_HEADLINES.take2}
        showHeadlineInPanel={!centerHeadlineEnabled}
        copyText={splitCopyText ?? DEFAULT_SPLIT_COPY_TEXT}
        buttonLabel=""
        only="copy"
      />
    </AbsoluteFill>
  );
};

/** Botão/elemento complementar do painel. */
export const GarantidoSplitButtonLayer: React.FC<{ splitButtonLabel?: string; centerHeadlineEnabled?: boolean }> = ({
  splitButtonLabel,
  centerHeadlineEnabled,
}) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <SplitPanelContent
        mgFrame={STILL_FRAME_SPLIT}
        headlineCopy={GARANTIDO_HEADLINES.take2}
        showHeadlineInPanel={!centerHeadlineEnabled}
        copyText=""
        buttonLabel={splitButtonLabel ?? "Ver oferta agora"}
        only="button"
      />
    </AbsoluteFill>
  );
};

// ═══════════════════════════ RANKING DE PRÊMIOS ═══════════════════════════

/** Overlay escuro em tela cheia — fixo, sem variável (não precisa de inputProps). */
export const GarantidoRankingOverlayLayer: React.FC = () => (
  <AbsoluteFill style={{ background: RANKING_DARK_OVERLAY_GRADIENT }} />
);

/**
 * Headline acima do ranking — isolada. PRECISA do `rankingItems` real (não
 * só um default de 3) mesmo escondendo a lista: `HiddenSlot` preserva o
 * ESPAÇO do bloco de linhas no flex column mesmo invisível — se a contagem
 * aqui não bater com a de `GarantidoRankingListLayer`, as duas camadas
 * reservam alturas diferentes e a posição da headline sai do lugar (achado
 * renderizando: headline "fantasma" sobrepondo a 2ª posição quando a lista
 * real tinha 5 itens e esta camada reservava espaço pra só 3).
 */
export const GarantidoRankingHeadlineLayer: React.FC<{
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
        headlineText={rankingHeadlineText ?? "Prêmios de hoje"}
        only="headline"
        position={rankingPosition}
      />
    </AbsoluteFill>
  );
};

/** Lista de posições inteira — UM bloco só (founder: "copys sendo um
 * bloco"), não uma camada por linha — reflow de N linhas não é algo que
 * faça sentido editar posição individualmente sem recalcular o bloco todo. */
export const GarantidoRankingListLayer: React.FC<{ rankingItems?: RankingItem[]; rankingPosition?: RankingPosition }> = ({
  rankingItems,
  rankingPosition,
}) => {
  ensureFonts([FONT_SANS]);
  const items = rankingItems && rankingItems.length > 0 ? rankingItems : DEFAULT_RANKING_ITEMS;
  // Frame "assentado": depois da última posição terminar de entrar.
  const stillFrame = 24 + (items.length - 1) * 16 + 16 + 10;
  return (
    <AbsoluteFill>
      <RankingOverlayContent mgFrame={stillFrame} items={items} headlineText="" only="list" position={rankingPosition} />
    </AbsoluteFill>
  );
};
