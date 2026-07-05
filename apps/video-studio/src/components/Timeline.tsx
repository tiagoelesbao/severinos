"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Timeline as TL, ExtraLayer } from "@/lib/timeline";
import type { FxPlan } from "@/lib/fxPlan";
import type { CaptionCue } from "@/lib/cues";
import { trackFlag, type TrackFlag, type TrackKey } from "@/lib/trackMix";
import { Headphones, Lock, Volume2, VolumeX } from "lucide-react";
import { Waveform } from "./Waveform";
import { Filmstrip } from "./Filmstrip";

const ROLE_COLOR: Record<string, string> = {
  hook: "#FFB800",
  skill: "#7B5BFF",
  reference: "#2DE2C8",
  generation: "#FF3D68",
  result: "#36C5F0",
  cta: "#FF4D2E",
  insert: "#8FA3B8",
  unknown: "#666",
};

// VEX-06: papel NOVO vindo do plano ganha cor estável derivada do nome.
const FALLBACK_HUES = ["#B58900", "#859900", "#2AA198", "#6C71C4", "#D33682", "#CB4B16"];
function roleColor(role: string): string {
  if (ROLE_COLOR[role]) return ROLE_COLOR[role];
  let h = 0;
  for (let i = 0; i < role.length; i++) h = (h * 31 + role.charCodeAt(i)) >>> 0;
  return FALLBACK_HUES[h % FALLBACK_HUES.length];
}

const ROW_H = 54;
const RULER_H = 26;
const GUTTER = 122; // calha à esquerda: track headers com nome + mute/solo/lock (VEX-08)
const SCROLLBAR = 16;

export function Timeline({
  timeline,
  fxPlan,
  currentFrame,
  pps,
  selectedIndex,
  selectedIndices,
  selectedTrim,
  mediaBaseUrl,
  client = "",
  creative = "",
  snapEnabled = true,
  onTrackFlag,
  onRemoveMarker,
  onSelectTrim,
  onSelectClip,
  onSeek,
  onTrim,
  onTrimStart,
  onTrimEnd,
  cues = [],
  selectedCue = -1,
  onSelectCue,
  selectedAudio = "",
  onSelectAudio,
  onAudioTrim,
  razorMode = false,
  onReorder,
  onTrimStartLeft,
  onSplit,
  onCueShift,
  onNarrShift,
  onSegMove,
  selectedLayerClip = "",
  onSelectLayerClip,
  onLayerClipMove,
  onLayerClipTrim,
  onAssetDrop,
}: {
  timeline: TL;
  fxPlan: FxPlan;
  currentFrame: number;
  pps: number;
  selectedIndex: number;
  /** VEX-08: índices de vídeo em multi-seleção (shift+clique). */
  selectedIndices?: number[];
  /** VEX-08: pinça (alça de aparar) selecionada p/ nudge pelas setas. */
  selectedTrim?: { index: number; edge: "L" | "R" } | null;
  mediaBaseUrl: string;
  /** VEX-08: filmstrip pede thumbs por client/creative. */
  client?: string;
  creative?: string;
  /** VEX-08: snap magnético ligado (tecla N desliga no page). */
  snapEnabled?: boolean;
  /** VEX-08: alterna mute/solo/lock de uma faixa (track headers). */
  onTrackFlag?: (key: TrackKey, flag: TrackFlag) => void;
  /** VEX-08: remover um marcador (alt+clique na régua). */
  onRemoveMarker?: (frame: number) => void;
  /** VEX-08: seleciona uma pinça (borda de aparo) p/ ajuste pelas setas. */
  onSelectTrim?: (index: number, edge: "L" | "R") => void;
  /** `additive` = shift pressionado (multi-seleção). */
  onSelectClip: (i: number, additive?: boolean) => void;
  onSeek: (frame: number) => void;
  onTrim: (index: number, deltaFrames: number) => void;
  onTrimStart?: () => void;
  onTrimEnd?: () => void;
  cues?: CaptionCue[];
  selectedCue?: number;
  onSelectCue?: (i: number) => void;
  selectedAudio?: string;
  onSelectAudio?: (id: string) => void;
  onAudioTrim?: (blockId: string, deltaFrames: number) => void;
  razorMode?: boolean;
  onReorder?: (from: number, to: number) => void;
  onTrimStartLeft?: (index: number, deltaFrames: number) => void;
  onSplit?: (index: number, atFrame: number) => void;
  onCueShift?: (index: number, deltaFrames: number) => void;
  onNarrShift?: (deltaFrames: number) => void;
  onSegMove?: (segIndex: number, deltaFrames: number) => void;
  /** "layerId/clipId" do clipe de camada extra selecionado. */
  selectedLayerClip?: string;
  onSelectLayerClip?: (layerId: string, clipId: string) => void;
  onLayerClipMove?: (layerId: string, clipId: string, deltaFrames: number) => void;
  onLayerClipTrim?: (layerId: string, clipId: string, deltaFrames: number) => void;
  /** Drop de asset do media bin: (payload, frame, camada-alvo|null = criar nova). */
  onAssetDrop?: (
    payload: { src: string; name: string; kind: "audio" | "video" | "image" },
    atFrame: number,
    layerId: string | null,
  ) => void;
}) {
  const { fps } = timeline;
  const totalSec = timeline.durationInFrames / fps;
  const width = Math.max(320, totalSec * pps);
  const fToX = (f: number) => (f / fps) * pps;
  const xToF = (x: number) => Math.round((x / pps) * fps);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<
    { kind: "trimR"; index: number; startX: number }
    | { kind: "trimL"; index: number; startX: number }
    | { kind: "audio"; id: string; startX: number }
    | { kind: "reorder"; index: number; startX: number; dx: number }
    | { kind: "scrub" }
    | { kind: "cueMove"; index: number; startX: number }
    | { kind: "narrShift"; startX: number }
    | { kind: "segMove"; index: number; startX: number }
    | { kind: "layerMove"; layerId: string; clipId: string; startX: number }
    | { kind: "layerTrimR"; layerId: string; clipId: string; startX: number }
    | null
  >(null);

  // Índice-alvo do reorder a partir do deslocamento (compara centros dos clipes).
  const reorderTarget = useCallback(
    (from: number, dx: number) => {
      const clips = timeline.videoTrack;
      const dragged = fToX(clips[from].startFrame + clips[from].durationInFrames / 2) + dx;
      let pos = 0;
      clips.forEach((c, k) => {
        if (k === from) return;
        if (fToX(c.startFrame + c.durationInFrames / 2) < dragged) pos++;
      });
      return Math.max(0, Math.min(clips.length - 1, pos));
    },
    [timeline.videoTrack, pps, fps],
  );

  // Pontos de snap: 0, fim, bordas de clipes e de segmentos de áudio, playhead.
  const snapPoints = useMemo(() => {
    const pts: number[] = [0, timeline.durationInFrames, currentFrame];
    timeline.videoTrack.forEach((c) => {
      pts.push(c.startFrame, c.startFrame + c.durationInFrames);
    });
    const at = timeline.audioTrack;
    if (at?.segments?.length) {
      let cum = 0;
      at.segments.forEach((s) => {
        const st = at.startFrame + (s.startFrame ?? cum);
        cum += s.durationInFrames;
        pts.push(st, st + s.durationInFrames);
      });
    }
    return pts;
  }, [timeline, currentFrame]);

  // Gruda `f` no ponto de snap mais próximo dentro de ~8px (se o snap estiver
  // ligado). VEX-08: `snapGuide` guarda o frame grudado p/ desenhar a linha ímã.
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const snapFrame = useCallback(
    (f: number) => {
      if (!snapEnabled) return f;
      // Raio de ~8px, mas no máx. 5 frames: em zoom baixo 8px valem dezenas de
      // frames e a borda "saltava em bloco" ao grudar. Cap mantém o arraste fino.
      const thr = Math.min((8 / pps) * fps, 5);
      let best = f;
      let bestD = thr;
      for (const p of snapPoints) {
        const d = Math.abs(p - f);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best;
    },
    [snapPoints, pps, fps, snapEnabled],
  );

  // Frame absoluto sob um clientX (para o razor).
  const frameAtClientX = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return xToF(clientX - rect.left + el.scrollLeft - GUTTER);
    },
    [pps, fps],
  );

  // Scrub: clicar/arrastar na régua move o playhead.
  const scrubFrom = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - GUTTER;
      onSeek(Math.max(0, Math.min(timeline.durationInFrames - 1, xToF(x))));
    },
    [onSeek, timeline.durationInFrames],
  );

  // Drag de trim (clip esq/dir ou bloco de áudio) e de REORDER — 1 transação.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      if (drag.kind === "scrub") {
        const raw = frameAtClientX(e.clientX);
        const f = snapFrame(raw);
        setSnapGuide(f !== raw ? f : null);
        onSeek(Math.max(0, Math.min(timeline.durationInFrames - 1, f)));
        return;
      }
      if (drag.kind === "reorder") {
        setDrag({ ...drag, dx: e.clientX - drag.startX });
        return;
      }
      // Pinças do clipe de vídeo: alvo ABSOLUTO com snap → delta até a borda atual.
      if (drag.kind === "trimR" || drag.kind === "trimL") {
        const c = timeline.videoTrack[drag.index];
        if (!c) return;
        const raw = frameAtClientX(e.clientX);
        const target = snapFrame(raw);
        setSnapGuide(target !== raw ? target : null);
        if (drag.kind === "trimR") onTrim(drag.index, target - (c.startFrame + c.durationInFrames));
        else onTrimStartLeft?.(drag.index, target - c.startFrame);
        return;
      }
      const deltaFrames = Math.round(((e.clientX - drag.startX) / pps) * fps);
      if (drag.kind === "cueMove") onCueShift?.(drag.index, deltaFrames);
      else if (drag.kind === "narrShift") onNarrShift?.(deltaFrames);
      else if (drag.kind === "segMove") onSegMove?.(drag.index, deltaFrames);
      else if (drag.kind === "layerMove") onLayerClipMove?.(drag.layerId, drag.clipId, deltaFrames);
      else if (drag.kind === "layerTrimR") onLayerClipTrim?.(drag.layerId, drag.clipId, deltaFrames);
      else onAudioTrim?.(drag.id, deltaFrames);
      setDrag({ ...drag, startX: e.clientX });
    };
    const onUp = () => {
      if (drag.kind === "reorder") {
        const to = reorderTarget(drag.index, drag.dx);
        if (to !== drag.index) onReorder?.(drag.index, to);
      }
      setDrag(null);
      setSnapGuide(null);
      if (drag.kind !== "scrub") onTrimEnd?.();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, pps, fps, onTrim, onAudioTrim, onTrimStartLeft, onCueShift, onNarrShift, onSegMove, onLayerClipMove, onLayerClipTrim, onReorder, onTrimEnd, onSeek, frameAtClientX, snapFrame, timeline, reorderTarget]);

  // Régua ADAPTATIVA (VEX-08): o intervalo entre rótulos cresce/encolhe com o
  // zoom para manter ~60px entre labels; minor ticks = 1/5 do intervalo. Em
  // zoom alto os rótulos ganham decimais (sub-segundo/nível de frame).
  const ticks = useMemo(() => {
    const CANDIDATES = [0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
    const labelStep = CANDIDATES.find((s) => s * pps >= 60) ?? 120;
    const minorStep = labelStep / 5;
    const decimals = labelStep < 1 ? 1 : 0;
    const out: React.ReactNode[] = [];
    const n = Math.ceil(totalSec / minorStep);
    for (let k = 0; k <= n; k++) {
      const t = k * minorStep;
      const isMajor = Math.abs(t / labelStep - Math.round(t / labelStep)) < 1e-6;
      out.push(
        <div key={k} style={{ position: "absolute", left: t * pps, top: 0, height: RULER_H }}>
          <div style={{ width: 1, height: isMajor ? 12 : 6, background: "var(--color-fg-faint)" }} />
          {isMajor && (
            <span style={{ position: "absolute", left: 3, top: 10, fontSize: 11, color: "var(--color-fg-muted)", whiteSpace: "nowrap" }}>
              {t.toFixed(decimals)}s
            </span>
          )}
        </div>,
      );
    }
    return out;
  }, [totalSec, pps]);

  const audio = timeline.audioTrack;
  const mediaUrl = (f: string) => `${mediaBaseUrl}/${encodeURIComponent(f)}`;
  const extraLayers = timeline.extraLayers ?? [];

  // Ordem das faixas no painel (topo → base) = fidelidade ao stack de render:
  //   Texto (frente) → Overlays → Vídeo → Áudio (narração + SFX/trilha, ao fundo).
  // Overlays entram acima do vídeo; áudios extras agrupam abaixo da narração.
  type RowDesc =
    | { type: "text" }
    | { type: "video" }
    | { type: "narration" }
    | { type: "extra"; layer: ExtraLayer };
  const overlayLayers = extraLayers.filter((L) => L.kind === "video");
  const audioLayers = extraLayers.filter((L) => L.kind === "audio");
  const rows: RowDesc[] = [
    { type: "text" },
    ...overlayLayers.map((L) => ({ type: "extra" as const, layer: L })),
    { type: "video" },
    { type: "narration" },
    ...audioLayers.map((L) => ({ type: "extra" as const, layer: L })),
  ];
  const rowCount = rows.length;
  const rowTop = (i: number) => RULER_H + ROW_H * i;
  const textRow = rows.findIndex((r) => r.type === "text");
  const videoRow = rows.findIndex((r) => r.type === "video");
  const narrRow = rows.findIndex((r) => r.type === "narration");
  const extraRow = (id: string) => rows.findIndex((r) => r.type === "extra" && r.layer.id === id);
  const tracksH = RULER_H + ROW_H * rowCount;
  const totalH = tracksH + SCROLLBAR + 6;

  // Faixa A = espelho do vídeo: áudio próprio de cada talking-head (hook/CTA,
  // vinculado/mesma cor do clipe) + segmentos da narração (selecionáveis).
  const audioBlocks = useMemo(() => {
    type AB = {
      id: string; label: string; startFrame: number; frames: number;
      src: string; srcStart: number; srcEnd: number; color: string; linked: boolean;
      clipIndex?: number; segIndex?: number;
    };
    const blocks: AB[] = [];
    timeline.videoTrack.forEach((c, ci) => {
      if (c.audioEnabled && !c.gap) {
        blocks.push({
          id: `talk-${ci}`, label: c.role, startFrame: c.startFrame,
          frames: c.durationInFrames, src: mediaUrl(c.file), srcStart: 0,
          srcEnd: c.durationSeconds, color: roleColor(c.role), linked: true,
          clipIndex: ci,
        });
      }
    });
    if (audio?.segments?.length) {
      let cum = 0;
      audio.segments.forEach((seg, i) => {
        const rel = seg.startFrame ?? cum;
        cum += seg.durationInFrames;
        blocks.push({
          id: `narr-${i}`, label: `corte ${i + 1}`, startFrame: audio.startFrame + rel,
          frames: seg.durationInFrames, src: mediaUrl(audio.file),
          srcStart: seg.srcFromFrame / fps, srcEnd: (seg.srcFromFrame + seg.durationInFrames) / fps,
          color: "#2DE2C8", linked: false, segIndex: i,
        });
      });
    } else if (audio) {
      blocks.push({
        id: "narr-0", label: "narração", startFrame: audio.startFrame,
        frames: audio.windowFrames, src: mediaUrl(audio.file), srcStart: 0,
        srcEnd: audio.windowFrames / fps, color: "#2DE2C8", linked: false,
      });
    }
    return blocks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, audio, fps, mediaBaseUrl]);

  return (
    <div
      ref={wrapRef}
      onDragOver={onAssetDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } : undefined}
      onDrop={onAssetDrop ? (e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        let payload: { src: string; name: string; kind: "audio" | "video" | "image" };
        try { payload = JSON.parse(raw); } catch { return; }
        const atFrame = Math.max(0, snapFrame(frameAtClientX(e.clientX)));
        let layerId: string | null = null;
        const node = wrapRef.current;
        if (node) {
          const rect = node.getBoundingClientRect();
          const rowIdx = Math.floor((e.clientY - rect.top - RULER_H) / ROW_H);
          const row = rows[rowIdx];
          if (row && row.type === "extra") layerId = row.layer.id;
        }
        onAssetDrop(payload, atFrame, layerId);
      } : undefined}
      style={{
        position: "relative",
        height: totalH,
        overflowX: "auto",
        overflowY: "hidden",
        background: "var(--color-surface-1)",
        borderTop: "1px solid rgba(255,255,255,.1)",
      }}
    >
      <div style={{ position: "relative", width: width + GUTTER, height: tracksH }}>
        {/* Calha de rótulos (sticky horizontal, sempre visível) */}
        <div style={{ position: "sticky", left: 0, top: 0, width: GUTTER, height: tracksH, zIndex: 5, background: "var(--color-surface-1)", borderRight: "1px solid var(--color-line)" }}>
          {rows.map((r, i) => {
            if (r.type === "text") {
              return <TrackHeader key="T" top={rowTop(i)} name="Legendas" color={fxPlan.brand.accent} />;
            }
            if (r.type === "video") {
              return (
                <TrackHeader
                  key="V" top={rowTop(i)} name="Vídeo" color="#7B5BFF" trackKey="video" audio
                  muted={trackFlag(timeline, "video", "muted")} solo={trackFlag(timeline, "video", "solo")} locked={trackFlag(timeline, "video", "locked")}
                  onFlag={onTrackFlag}
                />
              );
            }
            if (r.type === "narration") {
              return (
                <TrackHeader
                  key="A" top={rowTop(i)} name="Narração" color="#2DE2C8" trackKey="narration" audio
                  muted={trackFlag(timeline, "narration", "muted")} solo={trackFlag(timeline, "narration", "solo")} locked={trackFlag(timeline, "narration", "locked")}
                  onFlag={onTrackFlag}
                />
              );
            }
            const L = r.layer;
            return (
              <TrackHeader
                key={L.id} top={rowTop(i)} name={L.name} color={L.kind === "audio" ? "#FF9F1C" : "#A06CD5"}
                trackKey={L.id} audio={L.kind === "audio"}
                muted={!!L.muted} solo={!!L.solo} locked={!!L.locked}
                onFlag={onTrackFlag}
              />
            );
          })}
        </div>

        {/* Régua (scrub) */}
        <div
          onMouseDown={(e) => {
            scrubFrom(e.clientX);
            setDrag({ kind: "scrub" });
          }}
          style={{ position: "absolute", top: 0, left: GUTTER, width, height: RULER_H, cursor: "ew-resize" }}
        >
          {ticks}
        </div>

        {/* Track VÍDEO */}
        <Row top={rowTop(videoRow)} tint="rgba(123,91,255,.06)">
          {timeline.videoTrack.map((c, i) => {
            const w = Math.max(10, fToX(c.durationInFrames));
            const color = roleColor(c.role);
            const selected = i === selectedIndex;
            const multiSel = (selectedIndices ?? []).includes(i); // VEX-08: multi-seleção
            const dragging = drag?.kind === "reorder" && drag.index === i;
            const tr = i > 0 ? c.transitionIn?.type ?? "dissolve" : null;
            const trIcon = tr === "none" ? "⊣" : tr === "slide" ? "▷" : tr === "zoom" ? "⊙" : "◑";
            const handle = (kind: "trimL" | "trimR") => {
              const edge = kind === "trimL" ? "L" : "R";
              const trimActive = selectedTrim?.index === i && selectedTrim.edge === edge;
              return (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectTrim?.(i, edge); // seleciona a pinça (setas afinam ±1 frame)
                  onTrimStart?.();
                  setDrag(
                    kind === "trimL"
                      ? { kind: "trimL", index: i, startX: e.clientX }
                      : { kind: "trimR", index: i, startX: e.clientX },
                  );
                }}
                title={`${kind === "trimL" ? "Aparar início (in-point)" : "Aparar fim"} — clique e use ← → p/ ±1 frame`}
                style={{ position: "absolute", [kind === "trimL" ? "left" : "right"]: 0, top: 0, width: trimActive ? 13 : 11, height: "100%", cursor: "ew-resize", background: trimActive ? "var(--color-accent)" : selected ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: trimActive ? 3 : undefined }}
              >
                <div style={{ width: 3, height: "45%", background: trimActive ? "#06121a" : "var(--color-fg)", opacity: 0.85, borderRadius: 2 }} />
              </div>
              );
            };
            return (
              <div
                key={`${c.file}-${i}`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectClip(i, e.shiftKey);
                  if (e.shiftKey) return; // shift = só (des)marca; não arrasta
                  if (timeline.videoLocked) return; // faixa travada: seleciona, não edita
                  if (razorMode) {
                    onSplit?.(i, snapFrame(frameAtClientX(e.clientX)));
                    return;
                  }
                  onTrimStart?.();
                  setDrag({ kind: "reorder", index: i, startX: e.clientX, dx: 0 });
                }}
                title={`${c.role} · ${c.durationSeconds}s${c.playbackRate !== 1 ? ` · ${c.playbackRate.toFixed(2)}×` : ""}${razorMode ? " — clique para CORTAR" : " — arraste para reordenar"}`}
                style={{
                  position: "absolute",
                  left: GUTTER + fToX(c.startFrame),
                  width: w,
                  top: 4,
                  height: ROW_H - 8,
                  background: c.gap ? "#3a1a1a" : `${color}2e`,
                  border: `2px solid ${selected ? "var(--color-fg)" : multiSel ? "var(--color-accent)" : color}`,
                  boxShadow: dragging ? "0 6px 20px rgba(0,0,0,.6)" : selected ? "0 0 0 2px rgba(255,255,255,.25)" : multiSel ? "0 0 0 2px var(--color-accent)" : "none",
                  borderRadius: 6,
                  cursor: razorMode ? "crosshair" : dragging ? "grabbing" : "grab",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  transform: dragging ? `translateX(${drag.dx}px)` : undefined,
                  zIndex: dragging ? 20 : undefined,
                  opacity: dragging ? 0.88 : 1,
                  userSelect: "none",
                }}
              >
                {/* VEX-08: filmstrip do arquivo (thumbs com cache) atrás do rótulo */}
                {!c.gap && c.file && client && creative && (
                  <Filmstrip
                    client={client}
                    creative={creative}
                    file={c.file}
                    srcFromFrame={c.trimStartFrames ?? 0}
                    spanFrames={c.durationInFrames * c.playbackRate}
                    fps={fps}
                    width={w}
                    height={ROW_H - 8}
                  />
                )}
                <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", paddingLeft: 14, paddingRight: 14, pointerEvents: "none", background: "linear-gradient(90deg, rgba(6,6,12,.88) 0%, rgba(6,6,12,.55) 42%, rgba(6,6,12,0) 82%)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 3px rgba(0,0,0,.9)" }}>
                    {c.role} {c.audioEnabled ? "🔊" : "🔇"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-fg-muted)", whiteSpace: "nowrap", textShadow: "0 1px 3px rgba(0,0,0,.9)" }}>
                    {c.durationSeconds}s{c.playbackRate !== 1 ? ` · ${c.playbackRate.toFixed(2)}×` : ""}
                  </span>
                </div>
                {!razorMode && !timeline.videoLocked && handle("trimL")}
                {!razorMode && !timeline.videoLocked && handle("trimR")}
                {tr && (
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); onSelectClip(i); }}
                    title={`Transição: ${tr} (edite no inspector)`}
                    style={{ position: "absolute", left: -9, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: "50%", background: "#0b0b14", border: "1px solid rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-fg)", cursor: "pointer", zIndex: 4 }}
                  >
                    {trIcon}
                  </div>
                )}
              </div>
            );
          })}
        </Row>

        {/* Track ÁUDIO — espelho do vídeo: blocos próprios do hook/CTA (vinculados)
            + segmentos da narração. Todos selecionáveis; divisória ✂ marca o corte. */}
        <Row top={rowTop(narrRow)} tint="rgba(45,226,200,.06)">
          {audioBlocks.map((b, i) => {
            const left = GUTTER + fToX(b.startFrame);
            const w = Math.max(6, fToX(b.frames));
            const sel = selectedAudio === b.id;
            // último segmento de narração não leva marca de corte à direita
            const isNarr = b.id.startsWith("narr-");
            const nextIsNarr = audioBlocks[i + 1]?.id.startsWith("narr-");
            const cutMark = isNarr && nextIsNarr;
            const side = `${sel ? 2 : 1.5}px solid ${sel ? "var(--color-fg)" : b.color}`;
            const dragging = drag?.kind === "reorder" && drag.index === b.clipIndex;
            return (
              <div
                key={b.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectAudio?.(b.id);
                  // Lock: talking-head segue a faixa de vídeo; narração/cortes, a narração.
                  if (b.linked ? timeline.videoLocked : timeline.audioTrack?.locked) return;
                  if (b.linked && b.clipIndex != null) {
                    // talking-head: arrastar reordena o clipe vinculado
                    setDrag({ kind: "reorder", index: b.clipIndex, startX: e.clientX, dx: 0 });
                  } else if (b.segIndex != null) {
                    // corte do auto-cut: move ESTE segmento isoladamente
                    onTrimStart?.();
                    setDrag({ kind: "segMove", index: b.segIndex, startX: e.clientX });
                  } else {
                    // narração inteira (sem auto-cut): move no tempo (re-sync)
                    onTrimStart?.();
                    setDrag({ kind: "narrShift", startX: e.clientX });
                  }
                }}
                title={`${b.label} · ${b.srcStart.toFixed(1)}–${b.srcEnd.toFixed(1)}s${b.linked ? " (áudio do clipe 🔗 — arraste p/ reordenar)" : b.segIndex != null ? " (corte — arraste p/ mover isolado)" : " (arraste p/ mover a narração)"}`}
                style={{
                  position: "absolute",
                  left,
                  width: w,
                  top: 4,
                  height: ROW_H - 8,
                  background: b.linked ? `${b.color}22` : "var(--color-surface-3)",
                  borderTop: side,
                  borderBottom: side,
                  borderLeft: side,
                  borderRight: cutMark ? "3px solid #FF4D2E" : side,
                  boxShadow: dragging ? "0 6px 20px rgba(0,0,0,.6)" : sel ? "0 0 0 2px rgba(255,255,255,.22)" : "none",
                  borderRadius: 3,
                  overflow: "hidden",
                  cursor: "grab",
                  boxSizing: "border-box",
                  transform: dragging ? `translateX(${drag.dx}px)` : undefined,
                  zIndex: dragging ? 20 : undefined,
                  opacity: dragging ? 0.88 : 1,
                }}
              >
                <Waveform
                  src={b.src}
                  width={w}
                  height={ROW_H - 8}
                  color={b.color}
                  startSec={b.srcStart}
                  endSec={b.srcEnd}
                  buckets={Math.max(20, Math.floor(w / 3))}
                />
                {b.linked && (
                  <span style={{ position: "absolute", left: 4, top: 2, fontSize: 11, color: "var(--color-fg)", textShadow: "0 1px 2px #000" }}>
                    🔗 {b.label}
                  </span>
                )}
                {/* Handle de trim (move o corte; talking-head linka ao clipe) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectAudio?.(b.id);
                    if (b.linked ? timeline.videoLocked : timeline.audioTrack?.locked) return;
                    onTrimStart?.();
                    setDrag({ kind: "audio", id: b.id, startX: e.clientX });
                  }}
                  title={b.linked ? "Arraste para aparar o clipe" : "Arraste para mover o corte"}
                  style={{ position: "absolute", right: 0, top: 0, width: 9, height: "100%", cursor: "ew-resize", background: sel ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <div style={{ width: 2, height: "40%", background: "var(--color-fg)", opacity: 0.7 }} />
                </div>
              </div>
            );
          })}
        </Row>

        {/* Track LEGENDAS — CUES (blocos editáveis; clique seleciona p/ editar). */}
        <Row top={rowTop(textRow)} tint="rgba(255,184,0,.05)">
          {cues.map((cue, i) => {
            const startF = (cue.startMs / 1000) * fps;
            const w = Math.max(14, ((cue.endMs - cue.startMs) / 1000) * pps);
            const text = cue.words.map((wd) => wd.text).join(" ");
            const sel = i === selectedCue;
            return (
              <div
                key={`${cue.startMs}-${i}`}
                title={`${text} — arraste para re-sincronizar`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectCue?.(i);
                  onTrimStart?.();
                  setDrag({ kind: "cueMove", index: i, startX: e.clientX });
                }}
                style={{
                  position: "absolute",
                  left: GUTTER + fToX(startF),
                  width: w,
                  top: 8,
                  height: ROW_H - 16,
                  background: sel ? `${fxPlan.brand.accent}55` : `${fxPlan.brand.accent}22`,
                  border: `${sel ? 2 : 1}px solid ${sel ? "var(--color-fg)" : `${fxPlan.brand.accent}99`}`,
                  borderRadius: 4,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 5,
                  cursor: "grab",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--color-fg)", whiteSpace: "nowrap" }}>{text}</span>
              </div>
            );
          })}
        </Row>

        {/* Camadas extras (SFX/trilha/overlays) — uma Row por camada, posicionada
            pelo modelo de linhas (overlays acima do vídeo; áudios abaixo da narração). */}
        {extraLayers.map((L) => (
          <Row key={L.id} top={rowTop(extraRow(L.id))} tint={L.kind === "audio" ? "rgba(255,159,28,.06)" : "rgba(160,108,213,.06)"}>
            {L.clips.map((cl) => {
              const left = GUTTER + fToX(cl.startFrame);
              const w = Math.max(12, fToX(cl.durationInFrames));
              const sel = selectedLayerClip === `${L.id}/${cl.id}`;
              const col = L.kind === "audio" ? "#FF9F1C" : "#A06CD5";
              const src = cl.src ?? (cl.file ? mediaUrl(cl.file) : "");
              return (
                <div
                  key={cl.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectLayerClip?.(L.id, cl.id);
                    if (L.locked) return; // camada travada: seleciona, não edita
                    onTrimStart?.();
                    setDrag({ kind: "layerMove", layerId: L.id, clipId: cl.id, startX: e.clientX });
                  }}
                  title={`${cl.label} — arraste p/ mover`}
                  style={{
                    position: "absolute", left, width: w, top: 6, height: ROW_H - 12,
                    background: `${col}2e`, border: `${sel ? 2 : 1.5}px solid ${sel ? "var(--color-fg)" : col}`,
                    borderRadius: 5, overflow: "hidden", cursor: "grab", boxSizing: "border-box",
                    display: "flex", alignItems: "center", paddingLeft: 6,
                  }}
                >
                  {L.kind === "audio" && src ? (
                    <Waveform src={src} width={w} height={ROW_H - 12} color={col} buckets={Math.max(20, Math.floor(w / 3))} />
                  ) : null}
                  <span style={{ position: "absolute", left: 6, fontSize: 11, fontWeight: 700, color: "var(--color-fg)", textShadow: "0 1px 2px #000", whiteSpace: "nowrap" }}>
                    {(() => {
                      const t = cl.type ?? (L.kind === "audio" ? "media-audio" : "media-video");
                      const icon = t === "media-audio" ? "♪" : t === "text" ? "T" : t === "image" ? "🖼" : "▦";
                      return `${icon} ${cl.label}`;
                    })()}
                  </span>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSelectLayerClip?.(L.id, cl.id);
                      if (L.locked) return;
                      onTrimStart?.();
                      setDrag({ kind: "layerTrimR", layerId: L.id, clipId: cl.id, startX: e.clientX });
                    }}
                    title="Aparar fim"
                    style={{ position: "absolute", right: 0, top: 0, width: 10, height: "100%", cursor: "ew-resize", background: "rgba(255,255,255,.2)" }}
                  />
                </div>
              );
            })}
          </Row>
        ))}

        {/* Playhead — linha + alça arrastável (scrub frame a frame) */}
        <div style={{ position: "absolute", left: GUTTER + fToX(currentFrame), top: 0, height: tracksH, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 2, height: "100%", background: "var(--color-fg)", boxShadow: "0 0 6px rgba(255,255,255,.6)" }} />
          {/* alça (knob) no topo — grabbável */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              setDrag({ kind: "scrub" });
            }}
            title="Arraste para mover o playhead"
            style={{ position: "absolute", left: -7, top: 0, width: 16, height: 16, background: "var(--color-fg)", clipPath: "polygon(0 0, 100% 0, 50% 100%)", cursor: "ew-resize", pointerEvents: "auto" }}
          />
          {/* faixa de captura larga ao longo da linha (mais fácil de pegar) */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              setDrag({ kind: "scrub" });
            }}
            style={{ position: "absolute", left: -5, top: RULER_H, width: 12, height: ROW_H * rowCount, cursor: "ew-resize", pointerEvents: "auto" }}
          />
        </div>

        {/* VEX-08: marcadores (tecla M) — bandeira na régua + linha fina; clique
            busca, alt+clique remove. */}
        {(timeline.markers ?? []).map((mk) => {
          const c = mk.color ?? "#36C5F0";
          return (
            <div key={mk.frame} style={{ position: "absolute", left: GUTTER + fToX(mk.frame), top: 0, height: tracksH, width: 0, zIndex: 6 }}>
              <div style={{ position: "absolute", left: 0, top: RULER_H, width: 1, height: ROW_H * rowCount, background: c, opacity: 0.35, pointerEvents: "none" }} />
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.altKey) onRemoveMarker?.(mk.frame);
                  else onSeek(mk.frame);
                }}
                title={`Marcador @ ${(mk.frame / fps).toFixed(2)}s — clique busca, Alt+clique remove`}
                style={{ position: "absolute", left: 0, top: 1, width: 10, height: 10, background: c, clipPath: "polygon(0 0, 100% 0, 50% 100%)", cursor: "pointer", pointerEvents: "auto" }}
              />
            </div>
          );
        })}

        {/* VEX-08: linha magnética de snap (visível só enquanto gruda num ponto) */}
        {snapGuide !== null && (
          <div data-snap-guide style={{ position: "absolute", left: GUTTER + fToX(snapGuide), top: 0, height: tracksH, width: 0, pointerEvents: "none", zIndex: 9 }}>
            <div style={{ position: "absolute", left: -1, top: 0, width: 2, height: "100%", background: "var(--color-accent)", boxShadow: "0 0 6px var(--color-accent)", opacity: 0.9 }} />
            <div style={{ position: "absolute", left: -3, top: RULER_H - 5, width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * VEX-08: header de faixa na calha — nome + toggles mute/solo/lock (NLE).
 * Faixas de áudio (vídeo/narração/camada-áudio) mostram mute+solo; todas as
 * faixas mostram lock. O mute vale no preview E no export (composição).
 */
function TrackHeader({
  top, name, color, trackKey, audio, muted, solo, locked, onFlag,
}: {
  top: number;
  name: string;
  color: string;
  trackKey?: TrackKey;
  audio?: boolean;
  muted?: boolean;
  solo?: boolean;
  locked?: boolean;
  onFlag?: (key: TrackKey, flag: TrackFlag) => void;
}) {
  const toggle = (flag: TrackFlag) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trackKey && onFlag) onFlag(trackKey, flag);
  };
  const btn = (active: boolean, activeColor: string, title: string, on: (e: React.MouseEvent) => void, icon: React.ReactNode) => (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={on}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 20,
        borderRadius: 5, cursor: "pointer", border: "1px solid var(--color-line)",
        background: active ? activeColor : "var(--color-surface-3)",
        color: active ? "#06121a" : "var(--color-fg-muted)",
      }}
    >
      {icon}
    </button>
  );
  return (
    <div style={{ position: "absolute", top, left: 0, width: GUTTER, height: ROW_H, display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, padding: "0 8px", boxSizing: "border-box", borderRight: `2px solid ${color}`, background: "var(--color-surface-1)" }}>
      <span style={{ fontSize: 11, color: "var(--color-fg)", fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span style={{ color, marginRight: 5 }}>▍</span>{name}
      </span>
      {trackKey && (
        <div style={{ display: "flex", gap: 4 }}>
          {audio && btn(!!muted, "var(--color-warn)", muted ? "Reativar áudio" : "Silenciar (mute)", toggle("muted"), muted ? <VolumeX size={12} /> : <Volume2 size={12} />)}
          {audio && btn(!!solo, "var(--color-ok)", solo ? "Desfazer solo" : "Solo (só esta soa)", toggle("solo"), <Headphones size={12} />)}
          {btn(!!locked, "var(--color-accent)", locked ? "Destravar faixa" : "Travar faixa (bloqueia edição)", toggle("locked"), <Lock size={12} />)}
        </div>
      )}
    </div>
  );
}

function Row({ top, children, tint }: { top: number; children: React.ReactNode; tint: string }) {
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, height: ROW_H, background: tint, borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(0,0,0,.3)" }}>
      {children}
    </div>
  );
}
