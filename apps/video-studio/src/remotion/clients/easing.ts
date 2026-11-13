/**
 * Easings compartilhados pelas composições-cliente (Império/Garantido). Puro
 * JS, sem dependência — as mesmas curvas descritas nos `ae-spec.md` originais
 * (ease-in quadrático, ease-out cúbico, ease-out-back com overshoot, etc.),
 * reimplementadas em código em vez de keyframes do After Effects.
 */

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export const easeInQuad = (t: number): number => t * t;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number => t * t * t;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInExpo = (t: number): number => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));

/** Overshoot clássico (scale 0% → 108% → 100%). */
export const easeOutBack = (t: number, overshoot = 1.70158): number => {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * Progresso 0..1 de uma janela [start, start+duration] no frame atual,
 * já clampado — o idiom mais repetido nestas composições.
 */
export function windowProgress(frame: number, start: number, duration: number): number {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return clamp01((frame - start) / duration);
}

/** Interpolação linear entre dois números. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Interpolação linear entre duas cores hex (#rrggbb), devolve hex. */
export function lerpHex(hexA: string, hexB: string, t: number): string {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** PRNG determinístico (mulberry32) — mesma sequência sempre, essencial para
 * um render Remotion (cada frame é avaliado isoladamente; `Math.random()`
 * geraria partículas diferentes em cada frame). */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
