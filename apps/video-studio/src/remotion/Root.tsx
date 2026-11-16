import React, { type ComponentType } from "react";
import { Composition } from "remotion";
import { BaseComposition, type BaseCompositionProps } from "./BaseComposition";
import {
  TimelineComposition,
  calculateTimelineMetadata,
  EMPTY_TIMELINE,
} from "./TimelineComposition";
import {
  TimelineFxComposition,
  calculateTimelineFxMetadata,
  EMPTY_FXPLAN,
} from "./TimelineFxComposition";
import {
  ImperioIgnicaoPunho,
  imperioDefaultProps,
  TOTAL_FRAMES as IMPERIO_TOTAL_FRAMES,
  W as IMPERIO_W,
  H as IMPERIO_H,
  FPS as IMPERIO_FPS,
} from "./clients/imperio/ImperioIgnicaoPunho";
import {
  GarantidoTakes,
  garantidoDefaultProps,
  TOTAL_FRAMES as GARANTIDO_TOTAL_FRAMES,
  W as GARANTIDO_W,
  H as GARANTIDO_H,
  FPS as GARANTIDO_FPS,
} from "./clients/garantido/GarantidoTakes";
import {
  GarantidoTake1Ad,
  GarantidoTake2Ad,
  GarantidoTake3Ad,
  garantidoTake1DefaultProps,
  garantidoTake2DefaultProps,
  garantidoTake3DefaultProps,
  TOTAL_FRAMES_1 as GARANTIDO_AD1_FRAMES,
  TOTAL_FRAMES_2 as GARANTIDO_AD2_FRAMES,
  TOTAL_FRAMES_3 as GARANTIDO_AD3_FRAMES,
  W as GARANTIDO_AD_W,
  H as GARANTIDO_AD_H,
  FPS as GARANTIDO_AD_FPS,
} from "./clients/garantido/GarantidoAds";
import {
  GarantidoEndingBg,
  GarantidoEndingHeadline,
  GarantidoEndingPhone,
  GarantidoEndingCta,
  GarantidoEndingCtaSubtitle,
  PHONE_FRAMES as GARANTIDO_ENDING_FRAMES,
} from "./clients/garantido/EndingLayers";
import {
  GarantidoSplitScreenAd,
  GarantidoRankingAd,
  garantidoSplitScreenDefaultProps,
  garantidoRankingDefaultProps,
  calculateSplitScreenMetadata,
  calculateRankingMetadata,
  SPLIT_TOTAL_FRAMES as GARANTIDO_SPLIT_FRAMES,
  RANKING_TOTAL_FRAMES as GARANTIDO_RANKING_FRAMES,
} from "./clients/garantido/GarantidoNewFormats";
import {
  GarantidoSplitBgLayer,
  GarantidoSplitHeadlineLayer,
  GarantidoSplitCopyLayer,
  GarantidoSplitButtonLayer,
  GarantidoRankingOverlayLayer,
  GarantidoRankingHeadlineLayer,
  GarantidoRankingListLayer,
} from "./clients/garantido/SplitRankingLayers";
import {
  ImperioSplitScreenAd,
  ImperioRankingAd,
  imperioSplitScreenDefaultProps,
  imperioRankingDefaultProps,
  calculateImperioSplitScreenMetadata,
  calculateImperioRankingMetadata,
  SPLIT_TOTAL_FRAMES as IMPERIO_SPLIT_FRAMES,
  RANKING_TOTAL_FRAMES as IMPERIO_RANKING_FRAMES,
} from "./clients/imperio/ImperioNewFormats";
import {
  ImperioSplitBgLayer,
  ImperioSplitHeadlineLayer,
  ImperioSplitCopyLayer,
  ImperioSplitButtonLayer,
  ImperioRankingOverlayLayer,
  ImperioRankingHeadlineLayer,
  ImperioRankingListLayer,
} from "./clients/imperio/ImperioSplitRankingLayers";

/**
 * Registro das composições do Remotion. Por ora, só a composição base
 * (1080×1920@30). Brand tokens reais são injetados via inputProps no render
 * headless (scripts/render.mjs); os defaults abaixo usam a paleta Virals.
 */

// Validado contra BaseCompositionProps (segurança nos valores) e depois exposto
// como Record para a API do Composition (que exige Record<string, unknown>).
const defaultProps = {
  title: "VIDEO STUDIO",
  displayName: "Virals",
  primary: "#0C0A1F",
  secondary: "#181436",
  accent: "#FF5B3F",
  textPrimary: "#FFFFFF",
  fontFamily: "Outfit, system-ui, sans-serif",
} satisfies BaseCompositionProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BaseComposition"
        component={BaseComposition as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="Timeline"
        component={TimelineComposition as unknown as ComponentType<Record<string, unknown>>}
        calculateMetadata={
          calculateTimelineMetadata as unknown as undefined
        }
        durationInFrames={EMPTY_TIMELINE.durationInFrames}
        fps={EMPTY_TIMELINE.fps}
        width={EMPTY_TIMELINE.width}
        height={EMPTY_TIMELINE.height}
        defaultProps={{ timeline: EMPTY_TIMELINE } as unknown as Record<string, unknown>}
      />
      <Composition
        id="TimelineFx"
        component={TimelineFxComposition as unknown as ComponentType<Record<string, unknown>>}
        calculateMetadata={
          calculateTimelineFxMetadata as unknown as undefined
        }
        durationInFrames={EMPTY_TIMELINE.durationInFrames}
        fps={EMPTY_TIMELINE.fps}
        width={EMPTY_TIMELINE.width}
        height={EMPTY_TIMELINE.height}
        defaultProps={
          { timeline: EMPTY_TIMELINE, fxPlan: EMPTY_FXPLAN } as unknown as Record<string, unknown>
        }
      />
      <Composition
        id="ImperioIgnicaoPunho"
        component={ImperioIgnicaoPunho as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={IMPERIO_TOTAL_FRAMES}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={imperioDefaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="GarantidoTakes"
        component={GarantidoTakes as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={GARANTIDO_TOTAL_FRAMES}
        fps={GARANTIDO_FPS}
        width={GARANTIDO_W}
        height={GARANTIDO_H}
        defaultProps={garantidoDefaultProps as unknown as Record<string, unknown>}
      />
      {/*
        3 peças separadas (uma por take real) — direção nova do founder
        (2026-10-09), substitui o uso pretendido de `GarantidoTakes` acima
        (mantida registrada só por referência/compatibilidade). Cada uma:
        take real → transição dedicada → bloco de motion graphics do
        celular (mockup 3D + grade de dezenas animada + copy do Ângulo 3).
      */}
      <Composition
        id="GarantidoTake1Ad"
        component={GarantidoTake1Ad as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={GARANTIDO_AD1_FRAMES}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={garantidoTake1DefaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="GarantidoTake2Ad"
        component={GarantidoTake2Ad as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={GARANTIDO_AD2_FRAMES}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={garantidoTake2DefaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="GarantidoTake3Ad"
        component={GarantidoTake3Ad as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={GARANTIDO_AD3_FRAMES}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={garantidoTake3DefaultProps as unknown as Record<string, unknown>}
      />
      {/* Camadas do encerramento (2026-10-18) — ver EndingLayers.tsx. Usadas
          pela ponte "Editar" (lib/generateEditorBridge.ts) pra decompor o
          motion final em clipe-fundo + imagens removíveis, não pelo fluxo
          de geração em lote (que continua usando GarantidoTake2Ad inteiro). */}
      <Composition
        id="GarantidoEndingBg"
        component={GarantidoEndingBg as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={GARANTIDO_ENDING_FRAMES}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoEndingHeadline"
        component={GarantidoEndingHeadline as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoEndingPhone"
        component={GarantidoEndingPhone as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoEndingCta"
        component={GarantidoEndingCta as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoEndingCtaSubtitle"
        component={GarantidoEndingCtaSubtitle as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      {/* 2 formatos novos (2026-10-18, founder + AskUserQuestion: "Tela
          dividida + Ranking de prêmios"). REESCRITOS no mesmo dia (pedido
          seguinte): não reaproveitam mais o encerramento (GarantidoEnding*)
          — são peças de 1 fase só, ver GarantidoNewFormats.tsx. Ambas usam
          `calculateMetadata` (2026-10-19): a duração é a do vídeo-fonte
          ESCOLHIDO inteiro (sourceDurationFrames), não uma constante fixa —
          Ranking soma o piso de revelar a quantidade de ganhadores. */}
      <Composition
        id="GarantidoSplitScreenAd"
        component={GarantidoSplitScreenAd as unknown as ComponentType<Record<string, unknown>>}
        calculateMetadata={calculateSplitScreenMetadata as unknown as undefined}
        durationInFrames={GARANTIDO_SPLIT_FRAMES}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={garantidoSplitScreenDefaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="GarantidoRankingAd"
        component={GarantidoRankingAd as unknown as ComponentType<Record<string, unknown>>}
        calculateMetadata={calculateRankingMetadata as unknown as undefined}
        durationInFrames={GARANTIDO_RANKING_FRAMES}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={garantidoRankingDefaultProps as unknown as Record<string, unknown>}
      />
      {/* Camadas isoladas dos 2 formatos acima (2026-10-19, founder: "cada
          elemento venha editável... tudo separado nas camadas da nossa
          timeline") — mesmo princípio de GarantidoEnding* (usadas só pela
          ponte "Editar" em generateEditorBridge.ts, nunca pelo fluxo de
          geração em lote). */}
      <Composition
        id="GarantidoSplitBgLayer"
        component={GarantidoSplitBgLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoSplitHeadlineLayer"
        component={GarantidoSplitHeadlineLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoSplitCopyLayer"
        component={GarantidoSplitCopyLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoSplitButtonLayer"
        component={GarantidoSplitButtonLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoRankingOverlayLayer"
        component={GarantidoRankingOverlayLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoRankingHeadlineLayer"
        component={GarantidoRankingHeadlineLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="GarantidoRankingListLayer"
        component={GarantidoRankingListLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={GARANTIDO_AD_FPS}
        width={GARANTIDO_AD_W}
        height={GARANTIDO_AD_H}
        defaultProps={{} as Record<string, unknown>}
      />
      {/* Ranking/Tela Dividida — versão Império (2026-10-19, founder: "mesmas
          variações de template, porém modifique o estilo visual e paleta...
          não pode ficar uma edição igual em dois clientes do mesmo nicho").
          Mesma mecânica (duração = vídeo-fonte inteiro, sem celular/gadgets,
          botão estático, decomponível no editor), pele dourada/coroação —
          ver ImperioNewFormats.tsx. */}
      <Composition
        id="ImperioSplitScreenAd"
        component={ImperioSplitScreenAd as unknown as ComponentType<Record<string, unknown>>}
        calculateMetadata={calculateImperioSplitScreenMetadata as unknown as undefined}
        durationInFrames={IMPERIO_SPLIT_FRAMES}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={imperioSplitScreenDefaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="ImperioRankingAd"
        component={ImperioRankingAd as unknown as ComponentType<Record<string, unknown>>}
        calculateMetadata={calculateImperioRankingMetadata as unknown as undefined}
        durationInFrames={IMPERIO_RANKING_FRAMES}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={imperioRankingDefaultProps as unknown as Record<string, unknown>}
      />
      <Composition
        id="ImperioSplitBgLayer"
        component={ImperioSplitBgLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="ImperioSplitHeadlineLayer"
        component={ImperioSplitHeadlineLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="ImperioSplitCopyLayer"
        component={ImperioSplitCopyLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="ImperioSplitButtonLayer"
        component={ImperioSplitButtonLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="ImperioRankingOverlayLayer"
        component={ImperioRankingOverlayLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="ImperioRankingHeadlineLayer"
        component={ImperioRankingHeadlineLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
      <Composition
        id="ImperioRankingListLayer"
        component={ImperioRankingListLayer as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={IMPERIO_FPS}
        width={IMPERIO_W}
        height={IMPERIO_H}
        defaultProps={{} as Record<string, unknown>}
      />
    </>
  );
};
