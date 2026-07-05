import type { Timeline, TimelineClip, ExtraLayer, ExtraClip, ElementType, TransitionType, Keyframe } from "./timeline";
import type { FxPlan } from "./fxPlan";
import type { CaptionRenderer, HookRenderer } from "./fxRegistry";
import { deleteKeyframe, hasKeyframes, upsertKeyframe } from "./keyframes.ts";

/**
 * Operações de edição da timeline (MVC-10), puras e testáveis. Toda mutação
 * recomputa os `startFrame` e a `durationInFrames` total. O editor `/studio`
 * consome estas funções; a persistência durável é a MVC-11.
 */

/** Recalcula startFrames sequenciais + duração total (imutável). */
export function recompute(clips: TimelineClip[]): { clips: TimelineClip[]; total: number } {
  let cursor = 0;
  const out = clips.map((c) => {
    const nc = { ...c, startFrame: cursor };
    cursor += Math.max(1, c.durationInFrames);
    return nc;
  });
  return { clips: out, total: Math.max(1, cursor) };
}

function withVideoTrack(tl: Timeline, clips: TimelineClip[]): Timeline {
  const { clips: rebased, total } = recompute(clips);
  // Reposiciona a narração: começa no 1º clip mudo (miolo) após o rebase.
  let audioTrack = tl.audioTrack;
  if (audioTrack) {
    const muted = rebased.filter((c) => !c.audioEnabled);
    const voiceStart = muted.length ? muted[0].startFrame : audioTrack.startFrame;
    audioTrack = { ...audioTrack, startFrame: voiceStart };
  }
  const audioEnd = audioTrack ? audioTrack.startFrame + audioTrack.windowFrames : 0;
  const durationInFrames = Math.max(total, audioEnd, 1);
  return { ...tl, videoTrack: rebased, audioTrack, durationInFrames };
}

/** Move um clip por delta de posição (−1 sobe, +1 desce). */
export function moveClip(tl: Timeline, index: number, delta: number): Timeline {
  const clips = [...tl.videoTrack];
  const target = index + delta;
  if (index < 0 || index >= clips.length || target < 0 || target >= clips.length) return tl;
  [clips[index], clips[target]] = [clips[target], clips[index]];
  return withVideoTrack(tl, clips);
}

/** Apara/estende um clip (delta em frames; mínimo 1 frame). */
export function trimClip(tl: Timeline, index: number, deltaFrames: number): Timeline {
  if (index < 0 || index >= tl.videoTrack.length) return tl;
  const clips = tl.videoTrack.map((c, i) =>
    i === index
      ? {
          ...c,
          durationInFrames: Math.max(1, c.durationInFrames + deltaFrames),
          durationSeconds: Math.max(
            0.03,
            Number(((c.durationInFrames + deltaFrames) / tl.fps).toFixed(2)),
          ),
        }
      : c,
  );
  return withVideoTrack(tl, clips);
}

/** Remove um clip (não permite ficar vazio). */
export function removeClip(tl: Timeline, index: number): Timeline {
  if (tl.videoTrack.length <= 1 || index < 0 || index >= tl.videoTrack.length) return tl;
  return withVideoTrack(tl, tl.videoTrack.filter((_, i) => i !== index));
}

/**
 * VEX-08: remove VÁRIOS clips de uma vez (ripple delete em lote) — 1 operação,
 * logo 1 passo de undo. Nunca esvazia a track (mantém ≥1 clipe).
 */
export function removeClips(tl: Timeline, indices: number[]): Timeline {
  const set = new Set(indices.filter((i) => i >= 0 && i < tl.videoTrack.length));
  if (set.size === 0 || set.size >= tl.videoTrack.length) return tl;
  return withVideoTrack(tl, tl.videoTrack.filter((_, i) => !set.has(i)));
}

/** Reordena um clip de `from` para `to` (drag-and-drop). */
export function reorderClip(tl: Timeline, from: number, to: number): Timeline {
  const n = tl.videoTrack.length;
  if (from < 0 || from >= n || to < 0 || to >= n || from === to) return tl;
  const clips = [...tl.videoTrack];
  const [moved] = clips.splice(from, 1);
  clips.splice(to, 0, moved);
  return withVideoTrack(tl, clips);
}

/** Apara pela ESQUERDA (in-point): avança o início do clipe na origem. */
export function trimClipStart(tl: Timeline, index: number, deltaFrames: number): Timeline {
  if (index < 0 || index >= tl.videoTrack.length) return tl;
  const clips = tl.videoTrack.map((c, i) => {
    if (i !== index) return c;
    const dur = Math.max(2, c.durationInFrames - deltaFrames);
    const consumed = c.durationInFrames - dur; // frames de saída removidos do início
    const trimStart = Math.max(0, (c.trimStartFrames ?? 0) + Math.round(consumed * c.playbackRate));
    return {
      ...c,
      durationInFrames: dur,
      durationSeconds: Number((dur / tl.fps).toFixed(2)),
      trimStartFrames: trimStart,
    };
  });
  return withVideoTrack(tl, clips);
}

/** Divide o clipe (razor) no frame ABSOLUTO da timeline. */
export function splitClip(tl: Timeline, index: number, atTimelineFrame: number): Timeline {
  const clip = tl.videoTrack[index];
  if (!clip) return tl;
  const offset = atTimelineFrame - clip.startFrame; // frames de saída dentro do clipe
  if (offset <= 1 || offset >= clip.durationInFrames - 1) return tl; // sem corte degenerado
  const trim0 = clip.trimStartFrames ?? 0;
  const left: TimelineClip = {
    ...clip,
    durationInFrames: offset,
    durationSeconds: Number((offset / tl.fps).toFixed(2)),
  };
  const right: TimelineClip = {
    ...clip,
    durationInFrames: clip.durationInFrames - offset,
    durationSeconds: Number(((clip.durationInFrames - offset) / tl.fps).toFixed(2)),
    // a 2ª metade começa adiante na origem (avança playbackRate por frame de saída)
    trimStartFrames: trim0 + Math.round(offset * clip.playbackRate),
  };
  const clips = [...tl.videoTrack];
  clips.splice(index, 1, left, right);
  return withVideoTrack(tl, clips);
}

/**
 * Move a NARRAÇÃO inteira no tempo (arrastar a camada de áudio do corpo).
 * Desloca `audioTrack.startFrame` — re-sincroniza a narração com o vídeo. As
 * legendas da narração são deslocadas à parte (na página) para não dessincronizar.
 */
export function shiftNarration(tl: Timeline, deltaFrames: number): Timeline {
  const at = tl.audioTrack;
  if (!at) return tl;
  const startFrame = Math.max(0, at.startFrame + deltaFrames);
  const audioTrack = { ...at, startFrame };
  const last = tl.videoTrack[tl.videoTrack.length - 1];
  const videoEnd = last ? last.startFrame + last.durationInFrames : 0;
  const durationInFrames = Math.max(videoEnd, startFrame + at.windowFrames, 1);
  return { ...tl, audioTrack, durationInFrames };
}

/** Recalcula janela/duração do áudio a partir dos segmentos (clipes independentes). */
function withAudioSegments(tl: Timeline, segments: NonNullable<Timeline["audioTrack"]>["segments"]): Timeline {
  const at = tl.audioTrack;
  if (!at || !segments) return tl;
  const windowFrames = Math.max(
    1,
    ...segments.map((s) => (s.startFrame ?? 0) + s.durationInFrames),
  );
  const audioTrack = { ...at, segments, windowFrames };
  const last = tl.videoTrack[tl.videoTrack.length - 1];
  const videoEnd = last ? last.startFrame + last.durationInFrames : 0;
  const durationInFrames = Math.max(videoEnd, audioTrack.startFrame + windowFrames, 1);
  return { ...tl, audioTrack, durationInFrames };
}

/** Move um SEGMENTO da narração isoladamente (corte independente, drag livre). */
export function moveAudioSegment(tl: Timeline, segIndex: number, deltaFrames: number): Timeline {
  const segs = tl.audioTrack?.segments;
  if (!segs || segIndex < 0 || segIndex >= segs.length) return tl;
  const next = segs.map((s, i) =>
    i === segIndex ? { ...s, startFrame: Math.max(0, (s.startFrame ?? 0) + deltaFrames) } : s,
  );
  return withAudioSegments(tl, next);
}

/** Apara a DURAÇÃO de um segmento da narração (resize, independente). */
export function resizeAudioSegment(tl: Timeline, segIndex: number, deltaFrames: number): Timeline {
  const segs = tl.audioTrack?.segments;
  if (!segs || segIndex < 0 || segIndex >= segs.length) return tl;
  const next = segs.map((s, i) =>
    i === segIndex ? { ...s, durationInFrames: Math.max(2, s.durationInFrames + deltaFrames) } : s,
  );
  return withAudioSegments(tl, next);
}

/**
 * Move o CORTE entre o segmento de narração `segIndex` e o próximo (trim por
 * arraste do bloco de áudio). Estende/encolhe o segmento e compensa no vizinho
 * → a janela total da narração permanece constante (sem drift com o vídeo).
 * No último segmento (sem vizinho), ajusta a própria duração (muda o total).
 */
export function editAudioSegmentBoundary(
  tl: Timeline,
  segIndex: number,
  deltaFrames: number,
): Timeline {
  const at = tl.audioTrack;
  if (!at?.segments?.length || segIndex < 0 || segIndex >= at.segments.length) return tl;
  const segs = at.segments.map((s) => ({ ...s }));
  const cur = segs[segIndex];
  const next = segs[segIndex + 1];

  const newDur = Math.max(2, cur.durationInFrames + deltaFrames);
  const applied = newDur - cur.durationInFrames; // delta efetivo (após clamp)
  cur.durationInFrames = newDur;
  if (next) {
    // Move o corte: o vizinho começa mais tarde e encurta o mesmo tanto.
    next.srcFromFrame = Math.max(0, next.srcFromFrame + applied);
    next.durationInFrames = Math.max(2, next.durationInFrames - applied);
  }

  const windowFrames = segs.reduce((n, s) => n + s.durationInFrames, 0);
  const audioTrack = { ...at, segments: segs, windowFrames };
  const videoEnd = tl.videoTrack.length
    ? tl.videoTrack[tl.videoTrack.length - 1].startFrame +
      tl.videoTrack[tl.videoTrack.length - 1].durationInFrames
    : 0;
  const durationInFrames = Math.max(videoEnd, audioTrack.startFrame + windowFrames, 1);
  return { ...tl, audioTrack, durationInFrames };
}

// ── Transição e parâmetros do clipe ──────────────────────────────────────────

const setClip = (tl: Timeline, index: number, patch: Partial<TimelineClip>): Timeline =>
  index < 0 || index >= tl.videoTrack.length
    ? tl
    : { ...tl, videoTrack: tl.videoTrack.map((c, i) => (i === index ? { ...c, ...patch } : c)) };

/** Define a transição de entrada do clipe (type "none" = corte seco). */
export function setClipTransition(
  tl: Timeline,
  index: number,
  type: TransitionType,
  durationInFrames = 6,
): Timeline {
  return setClip(tl, index, { transitionIn: { type, durationInFrames } });
}

/** Define o enquadramento do clipe (auto/cover/panel). */
export function setClipFrameMode(tl: Timeline, index: number, frameMode: "auto" | "cover" | "panel"): Timeline {
  return setClip(tl, index, { frameMode });
}

/** Define a intensidade do Ken Burns (zoom lento) do clipe. */
export function setClipKenBurns(tl: Timeline, index: number, kenBurns: number): Timeline {
  return setClip(tl, index, { kenBurns: Math.max(0, Math.min(0.2, kenBurns)) });
}

/** Volume do áudio PRÓPRIO do clipe (talking-heads). VEX-05. */
export function setClipVolume(tl: Timeline, index: number, volume: number): Timeline {
  return setClip(tl, index, { volume: Math.max(0, Math.min(1, volume)) });
}

// ── Camadas extras (SFX, trilha, overlays) ───────────────────────────────────

let uidCounter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;

/** Fim (frame) considerando vídeo, narração e todas as camadas extras. */
function timelineEnd(tl: Timeline): number {
  const last = tl.videoTrack[tl.videoTrack.length - 1];
  let e = last ? last.startFrame + last.durationInFrames : 0;
  if (tl.audioTrack) e = Math.max(e, tl.audioTrack.startFrame + tl.audioTrack.windowFrames);
  for (const L of tl.extraLayers ?? []) {
    for (const c of L.clips) e = Math.max(e, c.startFrame + c.durationInFrames);
  }
  return Math.max(e, 1);
}

function withLayers(tl: Timeline, extraLayers: ExtraLayer[]): Timeline {
  const next = { ...tl, extraLayers };
  return { ...next, durationInFrames: Math.max(timelineEnd(next), 1) };
}

/** Cria uma camada extra vazia (áudio = SFX/trilha; vídeo = overlay). */
export function addLayer(tl: Timeline, kind: "audio" | "video", name?: string): Timeline {
  const layer: ExtraLayer = {
    id: uid("L"),
    kind,
    name: name ?? (kind === "audio" ? "Áudio" : "Overlay"),
    clips: [],
  };
  return withLayers(tl, [...(tl.extraLayers ?? []), layer]);
}

/** Remove uma camada extra. */
export function removeLayer(tl: Timeline, layerId: string): Timeline {
  return withLayers(tl, (tl.extraLayers ?? []).filter((L) => L.id !== layerId));
}

/** Insere um clipe numa camada (no frame dado). */
export function addLayerClip(
  tl: Timeline,
  layerId: string,
  clip: Omit<ExtraClip, "id">,
): Timeline {
  const layers = (tl.extraLayers ?? []).map((L) =>
    L.id === layerId ? { ...L, clips: [...L.clips, { ...clip, id: uid("c") }] } : L,
  );
  return withLayers(tl, layers);
}

function mapClip(
  tl: Timeline,
  layerId: string,
  clipId: string,
  fn: (c: ExtraClip) => ExtraClip,
): Timeline {
  const layers = (tl.extraLayers ?? []).map((L) =>
    L.id === layerId ? { ...L, clips: L.clips.map((c) => (c.id === clipId ? fn(c) : c)) } : L,
  );
  return withLayers(tl, layers);
}

/** Move um clipe de camada no tempo. */
export function moveLayerClip(tl: Timeline, layerId: string, clipId: string, deltaFrames: number): Timeline {
  return mapClip(tl, layerId, clipId, (c) => ({ ...c, startFrame: Math.max(0, c.startFrame + deltaFrames) }));
}

/** Apara o fim de um clipe de camada. */
export function trimLayerClip(tl: Timeline, layerId: string, clipId: string, deltaFrames: number): Timeline {
  return mapClip(tl, layerId, clipId, (c) => ({
    ...c,
    durationInFrames: Math.max(2, c.durationInFrames + deltaFrames),
  }));
}

/** Remove um clipe de uma camada. */
export function removeLayerClip(tl: Timeline, layerId: string, clipId: string): Timeline {
  const layers = (tl.extraLayers ?? []).map((L) =>
    L.id === layerId ? { ...L, clips: L.clips.filter((c) => c.id !== clipId) } : L,
  );
  return withLayers(tl, layers);
}

/** Ajusta o volume (0..1) de um clipe de áudio. */
export function setLayerClipVolume(tl: Timeline, layerId: string, clipId: string, volume: number): Timeline {
  return mapClip(tl, layerId, clipId, (c) => ({ ...c, volume: Math.max(0, Math.min(1, volume)) }));
}

/** Patch genérico dos parâmetros de um elemento (texto/lower-third/imagem/mídia). */
export function setElementParams(tl: Timeline, layerId: string, clipId: string, patch: Partial<ExtraClip>): Timeline {
  return mapClip(tl, layerId, clipId, (c) => ({ ...c, ...patch }));
}

// ── VEX-09: keyframes de elementos (x/y/scale/opacity/volume) ────────────────
export type KfProp = "x" | "y" | "scale" | "opacity" | "volume";

/**
 * Ajusta o valor de uma propriedade no `frame` (local). Se a propriedade JÁ tem
 * keyframes, faz upsert nesse frame (auto-keyframe ao animar); senão, muda só o
 * valor estático base.
 */
export function setElementKfValue(
  tl: Timeline, layerId: string, clipId: string, prop: KfProp, frame: number, value: number,
): Timeline {
  return mapClip(tl, layerId, clipId, (c) => {
    if (hasKeyframes(c.tracks?.[prop])) {
      return { ...c, tracks: { ...c.tracks, [prop]: upsertKeyframe(c.tracks?.[prop], frame, value) } };
    }
    return { ...c, [prop]: value };
  });
}

/** Alterna um keyframe no `frame` (◇): adiciona com `value` ou remove se existir. */
export function toggleElementKeyframe(
  tl: Timeline, layerId: string, clipId: string, prop: KfProp, frame: number, value: number,
): Timeline {
  return mapClip(tl, layerId, clipId, (c) => {
    const cur = c.tracks?.[prop];
    const exists = (cur ?? []).some((k) => k.frame === frame);
    const tracks = { ...(c.tracks ?? {}) };
    if (exists) {
      const nk = deleteKeyframe(cur, frame);
      if (nk.length) tracks[prop] = nk; else delete tracks[prop];
    } else {
      tracks[prop] = upsertKeyframe(cur, frame, value);
    }
    return { ...c, tracks };
  });
}

/** Move um keyframe de `fromFrame` para `toFrame` (arrastar o losango). */
export function moveElementKeyframe(
  tl: Timeline, layerId: string, clipId: string, prop: KfProp, fromFrame: number, toFrame: number,
): Timeline {
  return mapClip(tl, layerId, clipId, (c) => {
    const cur = c.tracks?.[prop];
    const kf = (cur ?? []).find((k) => k.frame === fromFrame);
    if (!kf) return c;
    return { ...c, tracks: { ...c.tracks, [prop]: upsertKeyframe(deleteKeyframe(cur, fromFrame), toFrame, kf.value, kf.ease) } };
  });
}

/** Remove o keyframe no `frame` (alt+clique no losango). */
export function removeElementKeyframe(
  tl: Timeline, layerId: string, clipId: string, prop: KfProp, frame: number,
): Timeline {
  return mapClip(tl, layerId, clipId, (c) => {
    const nk = deleteKeyframe(c.tracks?.[prop], frame);
    const tracks = { ...(c.tracks ?? {}) };
    if (nk.length) tracks[prop] = nk; else delete tracks[prop];
    return { ...c, tracks };
  });
}

/** Remove TODOS os keyframes (de todas as props) num frame (losango na timeline). */
export function removeKeyframesAt(tl: Timeline, layerId: string, clipId: string, frame: number): Timeline {
  return mapClip(tl, layerId, clipId, (c) => {
    if (!c.tracks) return c;
    const tracks: NonNullable<typeof c.tracks> = {};
    for (const [k, arr] of Object.entries(c.tracks) as [KfProp, Keyframe[]][]) {
      const nk = deleteKeyframe(arr, frame);
      if (nk.length) tracks[k] = nk;
    }
    return { ...c, tracks };
  });
}

/** Move TODOS os keyframes num frame para outro (arrastar o losango). */
export function moveKeyframesAt(tl: Timeline, layerId: string, clipId: string, fromFrame: number, toFrame: number): Timeline {
  return mapClip(tl, layerId, clipId, (c) => {
    if (!c.tracks) return c;
    const tracks: NonNullable<typeof c.tracks> = {};
    for (const [k, arr] of Object.entries(c.tracks) as [KfProp, Keyframe[]][]) {
      const kf = arr.find((x) => x.frame === fromFrame);
      tracks[k] = kf ? upsertKeyframe(deleteKeyframe(arr, fromFrame), toFrame, kf.value, kf.ease) : arr;
    }
    return { ...c, tracks };
  });
}

/** Resolve o tipo efetivo de um elemento (legado: por kind da camada). */
export function elementType(layerKind: ExtraLayer["kind"], clip: ExtraClip): ElementType {
  return clip.type ?? (layerKind === "audio" ? "media-audio" : "media-video");
}

/** Cria uma camada já com UM elemento (add atômico de texto/grafismo). */
export function addElementLayer(
  tl: Timeline,
  kind: "audio" | "video",
  name: string,
  element: Omit<ExtraClip, "id">,
): Timeline {
  const layer: ExtraLayer = { id: uid("L"), kind, name, clips: [{ ...element, id: uid("c") }] };
  return withLayers(tl, [...(tl.extraLayers ?? []), layer]);
}

/** Elemento de texto livre padrão (centro-inferior, ~2s a partir do frame dado). */
export function makeTextElement(startFrame: number, fps: number): Omit<ExtraClip, "id"> {
  return {
    type: "text",
    label: "Texto",
    startFrame: Math.max(0, startFrame),
    durationInFrames: Math.max(2, Math.round(fps * 2)),
    text: "Texto",
    fontSize: 64,
    color: "#FFFFFF",
    x: 50,
    y: 75,
  };
}

// ── Edições do FxPlan ────────────────────────────────────────────────────────
export function setHookRenderer(fx: FxPlan, renderer: HookRenderer): FxPlan {
  return { ...fx, hookRenderer: renderer };
}

export function setCaptionRenderer(fx: FxPlan, renderer: CaptionRenderer): FxPlan {
  return { ...fx, captionRenderer: renderer };
}

/** Edita o texto de uma legenda específica (override manual). */
export function editCaption(fx: FxPlan, index: number, text: string): FxPlan {
  if (index < 0 || index >= fx.captions.length) return fx;
  const captions = fx.captions.map((c, i) => (i === index ? { ...c, text } : c));
  return { ...fx, captions };
}
