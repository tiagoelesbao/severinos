"use client";

import { useMemo } from "react";

/**
 * VEX-08: filmstrip de um clipe de vídeo na timeline. Amostra N frames do
 * ARQUIVO (via /api/thumbs, com cache em disco) ao longo do trecho que o clipe
 * ocupa e os enfileira. Lazy (loading=lazy) + limite de frames por clipe para
 * não travar o scroll em criativos longos.
 */

// Aspecto retrato (9:16) das gravações — largura de cada frame na tira.
const THUMB_ASPECT = 9 / 16;
const MAX_THUMBS = 40; // teto por clipe (perf); cache agressivo cobre o resto.

export function Filmstrip({
  client,
  creative,
  file,
  fromUploads,
  srcFromFrame,
  spanFrames,
  fps,
  width,
  height,
}: {
  client: string;
  creative: string;
  file: string;
  fromUploads?: boolean;
  /** In-point de origem (frames do arquivo). */
  srcFromFrame: number;
  /** Frames de ORIGEM que o clipe cobre (= durationInFrames × playbackRate). */
  spanFrames: number;
  fps: number;
  /** Largura do clipe em px. */
  width: number;
  /** Altura da tira em px. */
  height: number;
}) {
  const times = useMemo(() => {
    const thumbW = Math.max(12, Math.round(height * THUMB_ASPECT));
    const count = Math.min(MAX_THUMBS, Math.max(1, Math.floor(width / thumbW)));
    const span = Math.max(0, spanFrames);
    return Array.from({ length: count }, (_, i) => {
      // tempo de ORIGEM no centro de cada fatia (segundos)
      const srcFrame = srcFromFrame + ((i + 0.5) / count) * span;
      return Math.max(0, srcFrame / fps);
    });
  }, [width, height, srcFromFrame, spanFrames, fps]);

  const assets = fromUploads ? "&assets=1" : "";
  const reqH = Math.min(120, Math.max(48, Math.round(height * 1.4))); // resolução pedida > exibição

  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, display: "flex", overflow: "hidden", pointerEvents: "none" }}
    >
      {times.map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`/api/thumbs?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}&file=${encodeURIComponent(file)}&t=${t.toFixed(2)}&h=${reqH}${assets}`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
          style={{ flex: "1 1 0", minWidth: 0, height: "100%", objectFit: "cover", display: "block" }}
        />
      ))}
    </div>
  );
}
