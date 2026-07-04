"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Waveform via Web Audio API (decodifica o áudio e desenha os picos). Roda no
 * browser; degrada em silêncio se o decode falhar. Peaks são cacheados por src.
 */
export function Waveform({
  src,
  width,
  height,
  color,
  startSec,
  endSec,
  buckets = 400,
}: {
  src: string;
  width: number;
  height: number;
  color: string;
  /** Desenha só o trecho [startSec, endSec] do áudio (auto-cut na timeline). */
  startSec?: number;
  endSec?: number;
  buckets?: number;
}) {
  const [peaks, setPeaks] = useState<number[]>([]);
  // Cache dos samples decodificados por src (evita re-decodificar por segmento).
  const cache = useRef<Record<string, { data: Float32Array; sampleRate: number }>>({});

  useEffect(() => {
    let cancelled = false;
    const slice = (decoded: { data: Float32Array; sampleRate: number }) => {
      const { data, sampleRate } = decoded;
      const from = startSec != null ? Math.floor(startSec * sampleRate) : 0;
      const to = endSec != null ? Math.floor(endSec * sampleRate) : data.length;
      const seg = data.subarray(Math.max(0, from), Math.min(data.length, to));
      const step = Math.max(1, Math.floor(seg.length / buckets));
      const out: number[] = [];
      for (let i = 0; i < buckets; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) {
          const v = Math.abs(seg[i * step + j] || 0);
          if (v > max) max = v;
        }
        out.push(max);
      }
      if (!cancelled) setPeaks(out);
    };

    if (cache.current[src]) {
      slice(cache.current[src]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(src);
        const buf = await res.arrayBuffer();
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new Ctx();
        const audio = await actx.decodeAudioData(buf);
        const decoded = { data: audio.getChannelData(0).slice(), sampleRate: audio.sampleRate };
        await actx.close();
        if (!cancelled) {
          cache.current[src] = decoded;
          slice(decoded);
        }
      } catch {
        /* sem waveform — degrada */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, startSec, endSec, buckets]);

  if (!peaks.length) return null;
  const bw = width / peaks.length;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {peaks.map((p, i) => {
        const h = Math.max(1, p * height);
        return (
          <rect
            key={i}
            x={i * bw}
            y={(height - h) / 2}
            width={Math.max(0.5, bw - 0.5)}
            height={h}
            fill={color}
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}
