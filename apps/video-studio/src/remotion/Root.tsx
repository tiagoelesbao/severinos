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
  accent: "#FF3D68",
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
    </>
  );
};
