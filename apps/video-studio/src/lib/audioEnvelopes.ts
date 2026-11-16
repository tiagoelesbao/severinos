import type { Timeline } from "./timeline";

/**
 * Envelopes de áudio (VEX-05) — puros e compartilhados entre Player e render
 * (paridade por construção):
 *  - segmentEnvelope: micro-crossfade nos cortes da narração (anti-click);
 *  - speechIntervals + duckingGain: trilha abaixa sob a fala (sidechain
 *    simulado com rampas de attack/release);
 *  - tailGain: fade-out global no fim do vídeo (sem corte seco).
 * Tudo em FRAMES (fps da composição).
 */

export const SEGMENT_FADE_FRAMES = 3; // ~100ms @30fps — inaudível, mata o click
export const DUCK_RAMP_FRAMES = 8; // attack/release do ducking (~260ms)
export const TAIL_FADE_FRAMES = 12; // fade-out final (~400ms)

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Ganho 0..1 de um trecho de áudio no frame LOCAL `f` (0..duration-1):
 * rampa de entrada e de saída de `fade` frames. Trechos curtos (< 2×fade)
 * escalam o fade para metade da duração (nunca silenciam o miolo).
 */
export function segmentEnvelope(f: number, durationInFrames: number, fade = SEGMENT_FADE_FRAMES): number {
  if (durationInFrames <= 1) return 1;
  const eff = Math.max(1, Math.min(fade, Math.floor(durationInFrames / 2)));
  return clamp01(Math.min((f + 1) / eff, (durationInFrames - f) / eff, 1));
}

export interface FrameInterval {
  start: number;
  end: number; // exclusivo
}

/** Mescla intervalos sobrepostos/adjacentes (tolerância `gap`). */
export function mergeIntervals(intervals: FrameInterval[], gap = 0): FrameInterval[] {
  const sorted = [...intervals]
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const out: FrameInterval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end + gap) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

/**
 * Intervalos (frames ABSOLUTOS da timeline) onde há FALA: segmentos da
 * narração (ou a janela integral) + clipes falados (hook/CTA). Base do ducking.
 */
export function speechIntervals(timeline: Timeline): FrameInterval[] {
  const out: FrameInterval[] = [];
  for (const c of timeline.videoTrack) {
    if (c.audioEnabled && !c.gap) out.push({ start: c.startFrame, end: c.startFrame + c.durationInFrames });
  }
  const at = timeline.audioTrack;
  if (at && !timeline.meta.gaps.includes(at.file)) {
    if (at.segments?.length) {
      let cum = 0;
      for (const seg of at.segments) {
        const rel = seg.startFrame ?? cum;
        cum += seg.durationInFrames;
        out.push({ start: at.startFrame + rel, end: at.startFrame + rel + seg.durationInFrames });
      }
    } else {
      out.push({ start: at.startFrame, end: at.startFrame + at.windowFrames });
    }
  }
  // Buracos menores que 2×rampa não valem "subir e descer" a trilha.
  return mergeIntervals(out, DUCK_RAMP_FRAMES * 2);
}

/**
 * Ganho do DUCKING no frame ABSOLUTO `absFrame`: `duck` dentro da fala, 1 fora,
 * com rampas lineares de `ramp` frames nas bordas (release ao sair, attack ao
 * entrar). `intervals` deve vir de speechIntervals (mesclados/ordenados).
 */
export function duckingGain(
  absFrame: number,
  intervals: FrameInterval[],
  opts: { duck?: number; ramp?: number } = {},
): number {
  const duck = opts.duck ?? 0.35;
  const ramp = Math.max(1, opts.ramp ?? DUCK_RAMP_FRAMES);
  let gain = 1;
  for (const iv of intervals) {
    if (absFrame >= iv.start - ramp && absFrame < iv.end + ramp) {
      // Progresso para dentro do intervalo (1 = totalmente dentro).
      const inA = clamp01((absFrame - (iv.start - ramp)) / ramp);
      const inB = clamp01(((iv.end + ramp) - 1 - absFrame) / ramp);
      const depth = Math.min(inA, inB, 1);
      gain = Math.min(gain, 1 - depth * (1 - duck));
    }
  }
  return clamp01(gain);
}

/** Fade-out global: ganho 1 até o tail; rampa a 0 nos últimos `fade` frames. */
export function tailGain(absFrame: number, totalFrames: number, fade = TAIL_FADE_FRAMES): number {
  if (totalFrames <= fade) return 1;
  const from = totalFrames - fade;
  if (absFrame < from) return 1;
  return clamp01((totalFrames - absFrame) / fade);
}
