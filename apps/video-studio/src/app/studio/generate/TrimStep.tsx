"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Passo "corte/reenquadramento" (pedido do founder 2026-10-18): depois do
 * upload, antes de escolher template. "Pinça" = os 2 handles de trim sobre a
 * timeline; reenquadramento = a janela 9:16 arrastável sobre o vídeo + zoom.
 * Confirmar chama POST /api/generate/trim (lib do servidor faz o corte/crop
 * de verdade via ffmpeg) — ver src/app/api/generate/trim/route.ts pra como
 * esse mesmo panX/panY/zoom vira pixels.
 *
 * Player (2026-10-18, feedback do founder): a régua de trim NÃO é só um
 * indicador visual — é o scrubber de verdade. O <video> toca com áudio
 * (precisa ouvir onde cortar), o playhead acompanha o currentTime real,
 * clicar/arrastar na régua ou nas pinças faz seek de verdade, e durante a
 * reprodução o player faz loop dentro do trecho selecionado (startSec↔endSec)
 * em vez de tocar o vídeo inteiro.
 */

const TARGET_W = 1080;
const TARGET_H = 1920;

export interface TrimResult {
  startSec: number;
  endSec: number;
  panX: number;
  panY: number;
  zoom: number;
}

interface Props {
  sourceUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
  busy: boolean;
  error: string | null;
  onConfirm: (result: TrimResult) => void;
  onBack: () => void;
}

export default function TrimStep({ sourceUrl, durationSeconds, width, height, busy, error, onConfirm, onBack }: Props) {
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(durationSeconds);
  const [panX, setPanX] = useState(50);
  const [panY, setPanY] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const trimBarRef = useRef<HTMLDivElement>(null);
  const videoBoxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const dur = Math.max(durationSeconds, 0.2);

  // Caixa de corte (coordenadas % do vídeo original) — mesma matemática do
  // backend (scale "cover" + zoom + pan), só invertida pra desenhar o
  // retângulo sobre o preview em vez de gerar pixels de saída.
  const cropBox = useMemo(() => {
    const coverScale = Math.max(TARGET_W / width, TARGET_H / height);
    const scale = coverScale * (zoom / 100);
    const visW = TARGET_W / scale;
    const visH = TARGET_H / scale;
    const maxOffXOrig = Math.max(0, width - visW);
    const maxOffYOrig = Math.max(0, height - visH);
    const left = (maxOffXOrig * panX) / 100;
    const top = (maxOffYOrig * panY) / 100;
    return {
      leftPct: (left / width) * 100,
      topPct: (top / height) * 100,
      widthPct: (visW / width) * 100,
      heightPct: (visH / height) * 100,
    };
  }, [width, height, panX, panY, zoom]);

  const pctFromClientX = useCallback((clientX: number) => {
    const el = trimBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  // Refs pra ler o valor mais recente dentro de listeners de pointermove/
  // timeupdate sem precisar recriar os listeners (e sem fechar sobre estado
  // velho) a cada render.
  const startSecRef = useRef(startSec);
  startSecRef.current = startSec;
  const endSecRef = useRef(endSec);
  endSecRef.current = endSec;

  const seekTo = useCallback((t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
    setCurrentTime(t);
  }, []);

  const onTrimPointerDown = useCallback(
    (kind: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation(); // não deixa a régua (onBarPointerDown) também interpretar como seek solto
      videoRef.current?.pause();
      const move = (ev: PointerEvent) => {
        const p = pctFromClientX(ev.clientX) * dur;
        const t = kind === "start" ? Math.min(p, endSecRef.current - 0.2) : Math.max(p, startSecRef.current + 0.2);
        if (kind === "start") setStartSec(t);
        else setEndSec(t);
        seekTo(t); // "vinculado à reprodução" — a pinça mostra o frame exato onde vai cortar
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [dur, pctFromClientX, seekTo],
  );

  // Régua inteira funciona como scrubber (clicar/arrastar fora das pinças
  // faz seek, não só mostra posição).
  const onBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      seekTo(pctFromClientX(e.clientX) * dur);
      const move = (ev: PointerEvent) => seekTo(pctFromClientX(ev.clientX) * dur);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [dur, pctFromClientX, seekTo],
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime >= endSecRef.current - 0.05 || v.currentTime < startSecRef.current) {
        v.currentTime = startSecRef.current;
      }
      v.play();
    } else {
      v.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  // Loop dentro do trecho selecionado durante a reprodução — ouvir o corte
  // de ponta a ponta é o ponto do pedido ("ter áudio pra saber onde cortar").
  const onTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= endSecRef.current) {
      v.currentTime = startSecRef.current;
    }
  }, []);

  const onEnded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = startSecRef.current;
    v.play();
  }, []);

  // Força o navegador a desenhar o primeiro frame sem precisar dar play
  // (preload sozinho às vezes deixa o quadro em branco até tocar uma vez).
  const onLoadedData = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.currentTime === 0) v.currentTime = 0.001;
  }, []);

  const onPanPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const el = videoBoxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startPanX = panXRef.current;
      const startPanY = panYRef.current;
      const move = (ev: PointerEvent) => {
        const dxPct = ((ev.clientX - startClientX) / rect.width) * 100;
        const dyPct = ((ev.clientY - startClientY) / rect.height) * 100;
        // Arrastar a caixa pra direita = mostrar mais da esquerda → pan diminui.
        setPanX(Math.min(100, Math.max(0, startPanX - dxPct * 2)));
        setPanY(Math.min(100, Math.max(0, startPanY - dyPct * 2)));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [],
  );
  const panXRef = useRef(panX);
  panXRef.current = panX;
  const panYRef = useRef(panY);
  panYRef.current = panY;

  const fmt = (s: number) => `${s.toFixed(1)}s`;

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold">Corte e enquadramento</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Arraste as pinças pra cortar um trecho (ou deixe o vídeo inteiro) e a janela verde pra escolher o
        enquadramento dentro do quadro vertical 1080×1920. Use o zoom se quiser aproximar.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div
            ref={videoBoxRef}
            className="relative mx-auto overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: `${width} / ${height}`, maxHeight: 420 }}
          >
            <video
              ref={videoRef}
              src={sourceUrl}
              className="h-full w-full object-contain"
              playsInline
              preload="auto"
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedData={onLoadedData}
            />
            <div
              onPointerDown={onPanPointerDown}
              className="absolute cursor-move border-2 border-emerald-400 bg-emerald-400/10"
              style={{
                left: `${cropBox.leftPct}%`,
                top: `${cropBox.topPct}%`,
                width: `${cropBox.widthPct}%`,
                height: `${cropBox.heightPct}%`,
              }}
            >
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-emerald-300">
                9:16
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-sm hover:bg-neutral-700"
              aria-label={playing ? "Pausar" : "Reproduzir"}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <span className="font-mono text-xs text-neutral-400">
              {fmt(currentTime)} / {fmt(dur)}
            </span>
            <div className="flex-1" />
            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-sm hover:bg-neutral-700"
              aria-label={muted ? "Ativar áudio" : "Silenciar"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="w-10 text-xs text-neutral-500">Zoom</span>
            <input
              type="range"
              min={100}
              max={250}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-right text-xs text-neutral-400">{zoom}%</span>
          </div>

          <div className="mt-6">
            <div className="mb-1 flex justify-between text-xs text-neutral-500">
              <span>{fmt(startSec)}</span>
              <span>Clipe: {fmt(endSec - startSec)}</span>
              <span>{fmt(dur)}</span>
            </div>
            <div
              ref={trimBarRef}
              onPointerDown={onBarPointerDown}
              className="relative h-10 cursor-pointer rounded-lg bg-neutral-800"
            >
              <div
                className="absolute top-0 h-full rounded-lg bg-emerald-500/30"
                style={{ left: `${(startSec / dur) * 100}%`, right: `${100 - (endSec / dur) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${(currentTime / dur) * 100}%` }}
              />
              <div
                onPointerDown={onTrimPointerDown("start")}
                className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize rounded bg-emerald-400"
                style={{ left: `${(startSec / dur) * 100}%` }}
              />
              <div
                onPointerDown={onTrimPointerDown("end")}
                className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize rounded bg-emerald-400"
                style={{ left: `${(endSec / dur) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              videoRef.current?.pause();
              onConfirm({ startSec, endSec, panX, panY, zoom });
            }}
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "Processando…" : "Confirmar corte e enquadramento"}
          </button>
          <button
            onClick={() => {
              videoRef.current?.pause();
              onConfirm({ startSec: 0, endSec: dur, panX: 50, panY: 50, zoom: 100 });
            }}
            disabled={busy}
            className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
          >
            Usar vídeo inteiro, sem reenquadrar
          </button>
          <button
            onClick={onBack}
            disabled={busy}
            className="text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-50"
          >
            ← Trocar vídeo
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </section>
  );
}
