/**
 * VEX-08: mixagem das faixas (mute/solo/lock) dos track headers. Puro e
 * compartilhado entre o Player e o render headless — aplicar o mix na
 * composição garante que o mute vale no preview E no mp4 exportado.
 *
 * Regra de solo: se QUALQUER faixa está em solo, só as faixas em solo soam
 * (as demais ficam mudas); mute explícito sempre silencia.
 */
import type { Timeline } from "./timeline";

export interface AudibleMix {
  /** Áudio próprio dos clipes de vídeo (talking-heads) soa? */
  video: boolean;
  /** Narração soa? */
  narration: boolean;
  /** Por camada extra (id → soa?). */
  layers: Record<string, boolean>;
}

/** Resolve, com a regra de solo, quais faixas de áudio soam. */
export function resolveAudible(t: Timeline): AudibleMix {
  const layers = t.extraLayers ?? [];
  const anySolo =
    !!t.videoSolo || !!t.audioTrack?.solo || layers.some((L) => !!L.solo);
  const audible = (muted?: boolean, solo?: boolean) => !muted && (!anySolo || !!solo);
  return {
    video: audible(t.videoMuted, t.videoSolo),
    narration: audible(t.audioTrack?.muted, t.audioTrack?.solo),
    layers: Object.fromEntries(layers.map((L) => [L.id, audible(L.muted, L.solo)])),
  };
}

export type TrackFlag = "muted" | "solo" | "locked";
/** Chave de faixa: "video", "narration" ou o id de uma camada extra. */
export type TrackKey = "video" | "narration" | (string & {});

/** Estado atual de um flag numa faixa (para a UI marcar o botão). */
export function trackFlag(t: Timeline, key: TrackKey, flag: TrackFlag): boolean {
  if (key === "video") {
    return flag === "muted" ? !!t.videoMuted : flag === "solo" ? !!t.videoSolo : !!t.videoLocked;
  }
  if (key === "narration") {
    return !!t.audioTrack?.[flag];
  }
  const L = (t.extraLayers ?? []).find((x) => x.id === key);
  return !!L?.[flag];
}

/** Alterna um flag (muted/solo/locked) numa faixa. Retorna nova timeline. */
export function toggleTrackFlag(t: Timeline, key: TrackKey, flag: TrackFlag): Timeline {
  if (key === "video") {
    if (flag === "muted") return { ...t, videoMuted: !t.videoMuted };
    if (flag === "solo") return { ...t, videoSolo: !t.videoSolo };
    return { ...t, videoLocked: !t.videoLocked };
  }
  if (key === "narration") {
    if (!t.audioTrack) return t;
    return { ...t, audioTrack: { ...t.audioTrack, [flag]: !t.audioTrack[flag] } };
  }
  return {
    ...t,
    extraLayers: (t.extraLayers ?? []).map((L) =>
      L.id === key ? { ...L, [flag]: !L[flag] } : L,
    ),
  };
}
