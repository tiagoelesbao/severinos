import type { Caption } from "@remotion/captions";
import type { CueOptions } from "./cues.ts";
import { captionsFromScript } from "./captions.ts";
import {
  resolveCaption,
  resolveHook,
  resolveMotion,
  type CaptionRenderer,
  type HookRenderer,
  type MotionRenderer,
} from "./fxRegistry.ts";

/**
 * Plano de FX (MVC-09): resolve os presets do video-templates.yaml para
 * renderers concretos + gera as legendas a partir do roteiro. Pura/serializável
 * — vira inputProps da composição com FX. O timeline (MVC-08) entra à parte.
 */
export interface FxBrand {
  accent: string;
  primary: string;
  displayName: string;
  fontFamily: string;
  /** Keywords do léxico do cliente destacadas nas legendas (VEX-05). */
  keywords?: string[];
}

export interface FxPlan {
  brand: FxBrand;
  hookRenderer: HookRenderer;
  captionRenderer: CaptionRenderer;
  motionRenderers: MotionRenderer[];
  captions: Caption[];
  /** Calibração do chunking das legendas (estilo: 1/2 linhas, palavras/cue). */
  captionStyle?: CueOptions;
}

export interface BuildFxPlanInput {
  brand: FxBrand;
  /** edit_spec.template_refs do content_plan (ids do video-templates.yaml). */
  templateRefs?: {
    hook?: string;
    caption?: string;
    transition?: string;
    motion?: string;
  } | null;
  /** Roteiro (content_plan.script) — fonte das legendas. */
  script: string;
  /** Duração da narração em ms (do timeline). */
  audioMs: number;
}

export function buildFxPlan(input: BuildFxPlanInput): FxPlan {
  const refs = input.templateRefs ?? {};
  const motion = resolveMotion(refs.motion ?? "motion-lower-third");
  return {
    brand: input.brand,
    hookRenderer: resolveHook(refs.hook ?? "hook-hardcut"),
    captionRenderer: resolveCaption(refs.caption ?? "cap-word-pop"),
    // Barra de progresso de retenção (sempre presente). A assinatura deixou de
    // ser um motion dedicado — vira um elemento (texto/overlay) quando desejado.
    motionRenderers: motion === "progress-bar" ? [motion] : [motion, "progress-bar"],
    captions: captionsFromScript(input.script, input.audioMs),
  };
}
