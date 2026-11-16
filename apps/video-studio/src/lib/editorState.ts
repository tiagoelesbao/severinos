import type { Timeline, TimelineClip, ExtraLayer, ExtraClip, ElementType, TransitionType, Keyframe } from "./timeline";
import type { FxPlan } from "./fxPlan";
import type { CaptionRenderer, HookRenderer } from "./fxRegistry";
import { deleteKeyframe, hasKeyframes, upsertKeyframe } from "./keyframes.ts";
import {
  framesDaTransicao, normalizaTransicao, cameraDoKenBurns,
  EFEITOS, srcDoEfeito, DURACAO_OVERLAY_S,
  type Peso, type TransicaoId, type CameraId, type CameraMove, type CameraCurva, type EfeitoId,
} from "./fxCatalog.ts";

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

/**
 * VEX-11: troca a variante de hook ATIVA (client-side, preservando o corpo).
 * Substitui o videoTrack[0] pelo clip da variante → recompõe (narração/inserts
 * re-ancoram). As legendas do hook são trocadas pelas da variante e as do corpo
 * deslocadas pela diferença de duração. Retorna { timeline, fxPlan }.
 */
export function switchHookVariant(
  tl: Timeline, fx: FxPlan, index: number,
): { timeline: Timeline; fxPlan: FxPlan } {
  const variants = tl.hookVariants;
  const oldHook = tl.videoTrack[0];
  if (!variants || index < 0 || index >= variants.length || !oldHook || oldHook.role !== "hook") {
    return { timeline: tl, fxPlan: fx };
  }
  const v = variants[index];
  const fps = tl.fps;
  const oldMs = (oldHook.durationInFrames / fps) * 1000;
  const newMs = (v.clip.durationInFrames / fps) * 1000;
  const deltaMs = newMs - oldMs;

  // Swap do hook + recompose (startFrames/narração re-ancoram).
  const newTrack = [{ ...v.clip, startFrame: 0 }, ...tl.videoTrack.slice(1)];
  const timeline = { ...withVideoTrack(tl, newTrack), activeHookVariant: index };

  // Legendas: fala do hook = as com startMs < fim do hook antigo; corpo = resto.
  const body = fx.captions
    .filter((c) => c.startMs >= oldMs)
    .map((c) => ({
      ...c,
      startMs: c.startMs + deltaMs,
      endMs: c.endMs + deltaMs,
      timestampMs: c.timestampMs == null ? c.timestampMs : c.timestampMs + deltaMs,
    }));
  const fxPlan = { ...fx, captions: [...(v.captions ?? []), ...body] };
  return { timeline, fxPlan };
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

/** Define a transição de entrada do clipe ("corte" = corte seco). */
export function setClipTransition(
  tl: Timeline,
  index: number,
  type: TransitionType,
  durationInFrames = 6,
  peso?: Peso,
): Timeline {
  // `peso` ausente NAO vira `peso: undefined`. A timeline e serializada em JSON
  // e comparada por igualdade profunda em varios lugares; uma chave presente
  // com valor indefinido aparece como diferenca onde nao ha nenhuma.
  return setClip(tl, index, {
    transitionIn: peso ? { type, durationInFrames, peso } : { type, durationInFrames },
  });
}

/**
 * Troca o TIPO da transição mantendo o peso, e faz a duração acompanhar o novo
 * preset. Trocar de dissolve (12f) para whip (8f) preservando a duração antiga
 * daria um whip lento — o pior dos dois mundos. Quem quiser a duração fixa
 * digita depois, e aí ela é explícita.
 */
export function setClipTransitionTipo(tl: Timeline, index: number, type: TransicaoId): Timeline {
  const atual = tl.videoTrack[index]?.transitionIn;
  const peso = atual?.peso ?? "medio";
  return setClip(tl, index, {
    transitionIn: { type, durationInFrames: framesDaTransicao(type, peso), peso },
  });
}

/** Troca o PESO da transição; a duração acompanha (agressivo é mais curto). */
export function setClipTransitionPeso(tl: Timeline, index: number, peso: Peso): Timeline {
  const atual = tl.videoTrack[index]?.transitionIn;
  const type = normalizaTransicao(atual?.type);
  return setClip(tl, index, {
    transitionIn: { type, durationInFrames: framesDaTransicao(type, peso), peso },
  });
}

// ── Grupo CÂMERA ────────────────────────────────────────────────────────────

/**
 * Define o movimento de câmera do clipe. Ao gravar `camera`, o `kenBurns`
 * legado é APAGADO de propósito: manter os dois deixaria a timeline com duas
 * fontes de verdade para a mesma coisa, e quem lesse o JSON não saberia qual
 * vale. Na leitura, quem só tem `kenBurns` continua sendo convertido.
 */
export function setClipCamera(tl: Timeline, index: number, camera: CameraMove): Timeline {
  return setClip(tl, index, { camera, kenBurns: undefined });
}

export function setClipCameraTipo(tl: Timeline, index: number, tipo: CameraId): Timeline {
  const atual = tl.videoTrack[index]?.camera ?? cameraDoKenBurns(tl.videoTrack[index]?.kenBurns);
  return setClipCamera(tl, index, { ...atual, tipo });
}

export function setClipCameraPeso(tl: Timeline, index: number, peso: Peso): Timeline {
  const atual = tl.videoTrack[index]?.camera ?? cameraDoKenBurns(tl.videoTrack[index]?.kenBurns);
  // O peso passa a mandar sozinho: um `intensidade` herdado da conversão do
  // kenBurns anularia justamente o ajuste que se acabou de fazer.
  return setClipCamera(tl, index, { tipo: atual?.tipo ?? "zoom-in", curva: atual?.curva, peso });
}

export function setClipCameraCurva(tl: Timeline, index: number, curva: CameraCurva): Timeline {
  const atual = tl.videoTrack[index]?.camera ?? cameraDoKenBurns(tl.videoTrack[index]?.kenBurns);
  return setClipCamera(tl, index, { tipo: atual?.tipo ?? "zoom-in", peso: atual?.peso, curva });
}

/** Aplica o mesmo movimento a TODOS os clipes de vídeo — calibração da peça. */
export function setCameraEmTodos(tl: Timeline, camera: CameraMove, alternarSentido = false): Timeline {
  const oposto: Record<string, CameraId> = {
    "zoom-in": "zoom-out", "zoom-out": "zoom-in",
    "pan-esq": "pan-dir", "pan-dir": "pan-esq",
    "tilt-cima": "tilt-baixo", "tilt-baixo": "tilt-cima",
  };
  return {
    ...tl,
    videoTrack: tl.videoTrack.map((c, i) => ({
      ...c,
      kenBurns: undefined,
      // Alternar o sentido a cada clipe é o que impede a peça inteira de
      // "respirar junto" — e é como a repetição de uma mesma imagem no rodízio
      // deixa de se denunciar.
      camera: alternarSentido && i % 2 === 1
        ? { ...camera, tipo: oposto[camera.tipo] ?? camera.tipo }
        : camera,
    })),
  };
}

/** Define o enquadramento do clipe (auto/cover/panel). */
export function setClipFrameMode(tl: Timeline, index: number, frameMode: "auto" | "cover" | "panel"): Timeline {
  return setClip(tl, index, { frameMode });
}

/**
 * LEGADO. Intensidade do Ken Burns como número único.
 *
 * O clamp era `Math.max(0, ...)`, o que tornava o zoom-out IMPOSSÍVEL pela
 * interface — o renderer já respeitava o sinal, mas o valor negativo nunca
 * chegava até ele. A faixa agora é simétrica. Para movimento novo use
 * `setClipCamera`, que tem direção nomeada.
 */
export function setClipKenBurns(tl: Timeline, index: number, kenBurns: number): Timeline {
  return setClip(tl, index, { kenBurns: Math.max(-0.2, Math.min(0.2, kenBurns)) });
}

/** Volume do áudio PRÓPRIO do clipe (talking-heads). VEX-05. */
export function setClipVolume(tl: Timeline, index: number, volume: number): Timeline {
  return setClip(tl, index, { volume: Math.max(0, Math.min(1, volume)) });
}

/**
 * Frente B: liga/desliga o áudio PRÓPRIO de QUALQUER clipe de vídeo. Padroniza o
 * inspector — toda faixa de vídeo pode ter seu áudio, não só talking-heads.
 * Recalcula a mixagem (muted/solo derivam de audioEnabled em alguns caminhos).
 */
export function setClipAudioEnabled(tl: Timeline, index: number, audioEnabled: boolean): Timeline {
  return setClip(tl, index, { audioEnabled });
}

/** VEX-09: fade de entrada/saída do clipe de vídeo (frames; ≥0, ≤ duração). */
export function setClipFade(tl: Timeline, index: number, edge: "in" | "out", frames: number): Timeline {
  const c = tl.videoTrack[index];
  if (!c) return tl;
  const v = Math.max(0, Math.min(c.durationInFrames, Math.round(frames)));
  return setClip(tl, index, edge === "in" ? { fadeIn: v || undefined } : { fadeOut: v || undefined });
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
/**
 * Insere um EFEITO do catálogo como camada de overlay — grupo 3.
 *
 * Faz num clique as quatro coisas que antes eram manuais e que, esquecidas,
 * fazem o efeito "não aparecer":
 *   1. o modo de mesclagem certo (sem ele, o preto do overlay apenas escurece
 *      a imagem em vez de sumir — a queixa mais comum);
 *   2. a opacidade calibrada por efeito (acima de ~0,5 o overlay deixa de ser
 *      atmosfera e vira assunto);
 *   3. a REPETIÇÃO para cobrir a janela pedida, porque o arquivo tem 10 s e a
 *      peça tem 20 minutos. Os overlays são gerados em loop perfeito, então
 *      repetir não deixa emenda visível;
 *   4. uma camada por efeito, para poder desligar um sem mexer nos outros.
 *
 * `ate` ausente = cobre a peça inteira.
 */
export function addEfeito(
  tl: Timeline,
  efeito: EfeitoId,
  de = 0,
  ate?: number,
): Timeline {
  const def = EFEITOS.find((e) => e.id === efeito);
  if (!def) return tl;
  const fim = Math.max(de + 1, ate ?? tl.durationInFrames);
  const passo = Math.max(1, Math.round(DURACAO_OVERLAY_S * (tl.fps || 30)));

  const clips: Omit<ExtraClip, "id">[] = [];
  for (let f = de; f < fim; f += passo) {
    clips.push({
      type: "media-video",
      src: srcDoEfeito(efeito),
      label: def.nome,
      startFrame: f,
      durationInFrames: Math.min(passo, fim - f),
      opacity: def.opacidade,
      blend: def.blend,
      volume: 0,
    });
  }

  const layer: ExtraLayer = {
    id: uid("L"),
    kind: "video",
    name: def.nome,
    clips: clips.map((c) => ({ ...c, id: uid("c") })),
  };
  return withLayers(tl, [...(tl.extraLayers ?? []), layer]);
}

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
