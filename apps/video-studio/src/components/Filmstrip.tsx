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
const THUMB_GRID = 0.25; // granularidade mínima da grade de tempo (s).
// Escada de intervalos "nice" (s/thumb) — mantém `step` estável durante o arraste.
const GRID_STEPS = [0.25, 0.5, 1, 2, 3, 5, 10, 15, 30];

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
  // Miniaturas amostradas numa GRADE ABSOLUTA de tempo (segundos), como num NLE
  // real: cada thumb tem um `t` múltiplo de `step`. Ao aparar o clipe, os thumbs
  // do meio mantêm exatamente a mesma URL (cache) e só somem/aparecem nas pontas
  // — nada de recriar a tira a cada frame → arraste suave.
  const thumbs = useMemo(() => {
    const thumbW = Math.max(12, Math.round(height * THUMB_ASPECT));
    const t0 = Math.max(0, srcFromFrame / fps);
    const durSec = Math.max(0.001, spanFrames / fps);
    const t1 = t0 + durSec;
    const maxThumbs = Math.min(MAX_THUMBS, Math.max(1, Math.floor(width / thumbW)));
    // segundos por thumb, quantizados numa escada "nice" → estável no arraste
    const raw = durSec / maxThumbs;
    const step = GRID_STEPS.find((s) => s >= raw) ?? Math.ceil(raw / THUMB_GRID) * THUMB_GRID;
    const out: { t: number; leftPct: number; wPct: number }[] = [];
    // primeiro centro de célula (k*step + step/2) dentro de [t0, t1]
    let k = Math.floor(t0 / step);
    for (; out.length < MAX_THUMBS; k++) {
      const center = k * step + step / 2;
      if (center >= t1) break;
      if (center < t0) continue;
      out.push({
        t: Math.round(center * 100) / 100,
        leftPct: ((center - step / 2 - t0) / durSec) * 100,
        wPct: (step / durSec) * 100,
      });
    }
    return out;
  }, [width, height, srcFromFrame, spanFrames, fps]);

  const assets = fromUploads ? "&assets=1" : "";
  const reqH = Math.min(120, Math.max(48, Math.round(height * 1.4))); // resolução pedida > exibição

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {thumbs.map((th) => (
        // key = t (estável) → o <img> é reaproveitado entre renders sem re-fetch.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={th.t}
          src={`/api/thumbs?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}&file=${encodeURIComponent(file)}&t=${th.t.toFixed(2)}&h=${reqH}${assets}`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
          style={{ position: "absolute", top: 0, height: "100%", left: `${th.leftPct}%`, width: `${th.wPct}%`, objectFit: "cover", display: "block" }}
        />
      ))}
    </div>
  );
}
