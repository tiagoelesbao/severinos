/**
 * VEX-09: motor de keyframes puro. Compartilhado pelo Player e pelo render
 * headless (a composição amostra as mesmas trilhas) — animação idêntica no
 * preview e no mp4 por construção. `frame` é sempre LOCAL ao clipe.
 */
import type { Ease, Keyframe } from "./timeline";

/** Curvas de easing sobre t ∈ [0,1]. */
function easeT(t: number, ease: Ease = "linear"): number {
  switch (ease) {
    case "in":
      return t * t;
    case "out":
      return 1 - (1 - t) * (1 - t);
    case "inOut":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

/**
 * Valor de uma trilha de keyframes no `frame` (local). Sem keyframes → `base`.
 * Antes do 1º / depois do último → valor da ponta (hold). Entre dois → interpola
 * com o easing do keyframe da ESQUERDA. Assume `kfs` ordenado por frame.
 */
export function sampleTrack(kfs: Keyframe[] | undefined, frame: number, base: number): number {
  if (!kfs || kfs.length === 0) return base;
  if (kfs.length === 1) return kfs[0].value;
  if (frame <= kfs[0].frame) return kfs[0].value;
  const last = kfs[kfs.length - 1];
  if (frame >= last.frame) return last.value;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const span = b.frame - a.frame;
      if (span <= 0) return b.value;
      const t = (frame - a.frame) / span;
      return a.value + (b.value - a.value) * easeT(t, a.ease);
    }
  }
  return last.value;
}

/** Há alguma keyframe nesta trilha? (a UI decide mostrar o losango ◇ preenchido). */
export function hasKeyframes(kfs: Keyframe[] | undefined): boolean {
  return !!kfs && kfs.length > 0;
}

/**
 * Insere/atualiza um keyframe no `frame` (imutável, mantém ordenado). Se já
 * existe um no frame (±tol), substitui o valor/ease.
 */
export function upsertKeyframe(
  kfs: Keyframe[] | undefined,
  frame: number,
  value: number,
  ease: Ease = "linear",
  tol = 0,
): Keyframe[] {
  const list = (kfs ?? []).filter((k) => Math.abs(k.frame - frame) > tol);
  list.push({ frame, value, ease });
  return list.sort((a, b) => a.frame - b.frame);
}

/** Remove o keyframe no `frame` (±tol). */
export function deleteKeyframe(kfs: Keyframe[] | undefined, frame: number, tol = 0): Keyframe[] {
  return (kfs ?? []).filter((k) => Math.abs(k.frame - frame) > tol);
}

/** Desloca todos os keyframes no tempo (usado ao aparar o início do clipe). */
export function shiftKeyframes(kfs: Keyframe[] | undefined, deltaFrames: number): Keyframe[] | undefined {
  if (!kfs || kfs.length === 0) return kfs;
  return kfs.map((k) => ({ ...k, frame: k.frame + deltaFrames }));
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * VEX-09: ganho de fade de um clipe no frame LOCAL `f` (0..1). Rampa linear de
 * `fadeIn` frames no início e `fadeOut` frames no fim. Usado para opacidade
 * (fade visual p/ preto) E volume (rampa de áudio) — preview == export.
 */
export function fadeGain(f: number, durationInFrames: number, fadeIn?: number, fadeOut?: number): number {
  let g = 1;
  if (fadeIn && fadeIn > 0) g *= clamp01(f / fadeIn);
  if (fadeOut && fadeOut > 0) g *= clamp01((durationInFrames - f) / fadeOut);
  return g;
}
