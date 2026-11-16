/**
 * VEX-10: estimativa determinística do nível de áudio do mix num frame — um VU
 * "preditivo", sem depender de tap no Player (frágil). Soma as contribuições
 * das faixas audíveis (narração + talking-heads + camadas de áudio), respeitando
 * mute/solo (VEX-08), ducking e fades. Clipping quando a soma passa de 1.0.
 * Puro e testável — responde "meu SFX vai estourar sobre a fala?" sem exportar.
 */
import type { Timeline } from "./timeline";
import { resolveAudible } from "./trackMix.ts";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// Nível RMS aproximado da voz (narração/talking-head) em unidade linear.
const VOICE = 0.7;
// Ganho residual de uma trilha com ducking sob a fala (VEX-05 ≈ 0.14).
const DUCK = 0.15;

const covers = (start: number, dur: number, f: number) => f >= start && f < start + dur;

function narrationCovers(tl: Timeline, f: number): boolean {
  const at = tl.audioTrack;
  if (!at) return false;
  return covers(at.startFrame, at.windowFrames, f);
}

export interface LevelSample {
  /** Nível linear estimado (0..~N). >1 = clipping. */
  level: number;
  clipping: boolean;
}

export function estimateLevel(tl: Timeline, frame: number): LevelSample {
  const mix = resolveAudible(tl);
  let level = 0;

  // Narração
  if (mix.narration && narrationCovers(tl, frame)) level += VOICE;

  // Talking-heads (áudio próprio de hook/CTA)
  if (mix.video) {
    for (const c of tl.videoTrack) {
      if (!c.audioEnabled || c.gap) continue;
      if (!covers(c.startFrame, c.durationInFrames, frame)) continue;
      let v = VOICE * (c.volume ?? 1);
      if (c.fadeIn) v *= clamp01((frame - c.startFrame) / c.fadeIn);
      if (c.fadeOut) v *= clamp01((c.startFrame + c.durationInFrames - frame) / c.fadeOut);
      level += v;
    }
  }

  // Camadas de áudio extras (SFX / trilha)
  for (const L of tl.extraLayers ?? []) {
    if (L.kind !== "audio" || mix.layers[L.id] === false) continue;
    for (const cl of L.clips) {
      if (!covers(cl.startFrame, cl.durationInFrames, frame)) continue;
      let v = cl.volume ?? 1;
      if (cl.ducking && narrationCovers(tl, frame)) v *= DUCK;
      if (cl.fadeIn) v *= clamp01((frame - cl.startFrame) / cl.fadeIn);
      if (cl.fadeOut) v *= clamp01((cl.startFrame + cl.durationInFrames - frame) / cl.fadeOut);
      level += v;
    }
  }

  return { level, clipping: level > 1.0 };
}
