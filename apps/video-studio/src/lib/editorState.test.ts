import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recompute,
  moveClip,
  trimClip,
  removeClip,
  removeClips,
  setHookRenderer,
  editCaption,
  editAudioSegmentBoundary,
  reorderClip,
  splitClip,
  trimClipStart,
  shiftNarration,
  moveAudioSegment,
  resizeAudioSegment,
  addLayer,
  addLayerClip,
  moveLayerClip,
  trimLayerClip,
  removeLayerClip,
  setLayerClipVolume,
  setClipTransition,
  setClipFrameMode,
  setClipKenBurns,
  addElementLayer,
  setElementParams,
  elementType,
  makeTextElement,
} from "./editorState.ts";
import type { Timeline, TimelineClip } from "./timeline.ts";
import type { FxPlan } from "./fxPlan.ts";

function clip(file: string, role: TimelineClip["role"], frames: number, start: number): TimelineClip {
  return {
    file, absPath: `/x/${file}`, role,
    durationSeconds: frames / 30, durationInFrames: frames,
    nativeDurationInFrames: frames, playbackRate: 1,
    width: 1920, height: 1080, startFrame: start,
    audioEnabled: role === "hook" || role === "cta",
  };
}

function tl(): Timeline {
  return {
    fps: 30, width: 1080, height: 1920, durationInFrames: 270,
    videoTrack: [clip("a.mp4", "hook", 90, 0), clip("b.mov", "skill", 90, 90), clip("c.mov", "cta", 90, 180)],
    audioTrack: { file: "n.ogg", absPath: "/x/n.ogg", durationSeconds: 9, durationInFrames: 270, startFrame: 90, windowFrames: 90 },
    captionTrack: [],
    meta: { client: "x", creative: "y", videoSeconds: 9, audioSeconds: 9, rhythmGapSeconds: 0, gaps: [] },
  };
}

test("trimClip — reposiciona a narração (startFrame no 1º clip mudo)", () => {
  const out = trimClip(tl(), 0, -30); // encurta o hook em 30
  // skill (mudo) começa em 60 → narração começa em 60.
  assert.equal(out.videoTrack[1].startFrame, 60);
  assert.equal(out.audioTrack?.startFrame, 60);
});

test("reorderClip — move um clip de from para to", () => {
  const out = reorderClip(tl(), 0, 2); // hook vai pro fim
  assert.deepEqual(out.videoTrack.map((c) => c.role), ["skill", "cta", "hook"]);
  // startFrames recompostos
  assert.deepEqual(out.videoTrack.map((c) => c.startFrame), [0, 90, 180]);
});

test("splitClip — divide o clipe no frame absoluto, com in-point na 2ª metade", () => {
  const out = splitClip(tl(), 1, 120); // skill [90..180], corte em 120 → offset 30
  assert.equal(out.videoTrack.length, 4);
  const parts = out.videoTrack.filter((c) => c.role === "skill");
  assert.equal(parts[0].durationInFrames, 30);
  assert.equal(parts[1].durationInFrames, 60);
  assert.equal(parts[1].trimStartFrames, 30); // 2ª metade começa adiante na origem
});

test("setClip* — transição, enquadramento e Ken Burns por clipe", () => {
  const t1 = setClipTransition(tl(), 1, "slide", 8);
  assert.deepEqual(t1.videoTrack[1].transitionIn, { type: "slide", durationInFrames: 8 });
  const t2 = setClipFrameMode(t1, 1, "panel");
  assert.equal(t2.videoTrack[1].frameMode, "panel");
  const t3 = setClipKenBurns(t2, 1, 0.08);
  assert.equal(t3.videoTrack[1].kenBurns, 0.08);
  // clamp
  assert.equal(setClipKenBurns(t2, 1, 99).videoTrack[1].kenBurns, 0.2);
});

test("camadas extras — add layer/clip, move, trim, volume, remove", () => {
  const l1 = addLayer(tl(), "audio", "SFX");
  assert.equal(l1.extraLayers?.length, 1);
  assert.equal(l1.extraLayers![0].kind, "audio");
  const lid = l1.extraLayers![0].id;

  const c1 = addLayerClip(l1, lid, { src: "/library/sfx/x.mp3", label: "whoosh", startFrame: 10, durationInFrames: 60 });
  assert.equal(c1.extraLayers![0].clips.length, 1);
  const cid = c1.extraLayers![0].clips[0].id;

  const moved = moveLayerClip(c1, lid, cid, 20);
  assert.equal(moved.extraLayers![0].clips[0].startFrame, 30);

  const trimmed = trimLayerClip(c1, lid, cid, 30);
  assert.equal(trimmed.extraLayers![0].clips[0].durationInFrames, 90);

  const vol = setLayerClipVolume(c1, lid, cid, 0.5);
  assert.equal(vol.extraLayers![0].clips[0].volume, 0.5);

  const rm = removeLayerClip(c1, lid, cid);
  assert.equal(rm.extraLayers![0].clips.length, 0);
});

test("shiftNarration — move a narração inteira no tempo", () => {
  const out = shiftNarration(tl(), 30); // narração começava em 90 → 120
  assert.equal(out.audioTrack?.startFrame, 120);
  assert.equal(out.audioTrack?.windowFrames, 90); // janela inalterada
});

test("trimClipStart — apara o início (in-point) e encurta", () => {
  const out = trimClipStart(tl(), 0, 30); // hook in-point +30
  assert.equal(out.videoTrack[0].durationInFrames, 60);
  assert.equal(out.videoTrack[0].trimStartFrames, 30);
});

test("moveAudioSegment — move um corte isoladamente (startFrame próprio)", () => {
  const base = tl();
  base.audioTrack = {
    ...base.audioTrack!,
    segments: [
      { srcFromFrame: 0, durationInFrames: 30, startFrame: 0 },
      { srcFromFrame: 60, durationInFrames: 40, startFrame: 30 },
    ],
    windowFrames: 70,
  };
  const out = moveAudioSegment(base, 1, 10); // 2º corte +10
  assert.equal(out.audioTrack!.segments![1].startFrame, 40);
  assert.equal(out.audioTrack!.segments![0].startFrame, 0); // o outro não se mexe
});

test("resizeAudioSegment — apara a duração de um corte (independente)", () => {
  const base = tl();
  base.audioTrack = {
    ...base.audioTrack!,
    segments: [{ srcFromFrame: 0, durationInFrames: 30, startFrame: 0 }],
    windowFrames: 30,
  };
  const out = resizeAudioSegment(base, 0, 15);
  assert.equal(out.audioTrack!.segments![0].durationInFrames, 45);
});

test("editAudioSegmentBoundary — move o corte mantendo a janela total", () => {
  const base = tl();
  base.audioTrack = {
    ...base.audioTrack!,
    segments: [
      { srcFromFrame: 0, durationInFrames: 30 },
      { srcFromFrame: 60, durationInFrames: 40 },
    ],
    windowFrames: 70,
  };
  const out = editAudioSegmentBoundary(base, 0, 10); // estende seg0 em 10
  const segs = out.audioTrack!.segments!;
  assert.equal(segs[0].durationInFrames, 40);
  assert.equal(segs[1].srcFromFrame, 70);
  assert.equal(segs[1].durationInFrames, 30);
  // total constante → sem drift com o vídeo
  assert.equal(out.audioTrack!.windowFrames, 70);
});

function fx(): FxPlan {
  return {
    brand: { accent: "#FFB800", primary: "#0B0B0F", displayName: "Tiago", fontFamily: "x" },
    hookRenderer: "hard-cut", captionRenderer: "word-pop",
    motionRenderers: ["lower-third", "progress-bar"],
    captions: [
      { text: "olha", startMs: 0, endMs: 500, timestampMs: 250, confidence: null },
      { text: "isso", startMs: 500, endMs: 1000, timestampMs: 750, confidence: null },
    ],
  };
}

test("addElementLayer + setElementParams — cria camada com elemento e edita params", () => {
  const t = addElementLayer(tl(), "video", "Texto", { type: "text", label: "Texto", startFrame: 0, durationInFrames: 60, text: "oi" });
  const L = t.extraLayers![0];
  assert.equal(L.name, "Texto");
  assert.equal(L.clips.length, 1);
  assert.equal(elementType(L.kind, L.clips[0]), "text");
  const t2 = setElementParams(t, L.id, L.clips[0].id, { text: "novo", fontSize: 80, color: "#FF0000" });
  assert.equal(t2.extraLayers![0].clips[0].text, "novo");
  assert.equal(t2.extraLayers![0].clips[0].fontSize, 80);
});

test("elementType — legado resolve por kind da camada", () => {
  assert.equal(elementType("audio", { id: "x", label: "", startFrame: 0, durationInFrames: 1 }), "media-audio");
  assert.equal(elementType("video", { id: "x", label: "", startFrame: 0, durationInFrames: 1 }), "media-video");
});

test("setElementParams — transform e animações de entrada/saída", () => {
  const t = addElementLayer(tl(), "video", "Overlay", { type: "media-video", src: "/x.mp4", label: "ov", startFrame: 0, durationInFrames: 60 });
  const L = t.extraLayers![0];
  const out = setElementParams(t, L.id, L.clips[0].id, {
    x: 30, y: 70, scale: 1.5, opacity: 0.8,
    animateIn: { type: "fade", durationInFrames: 10 },
    animateOut: { type: "slide", durationInFrames: 8 },
  });
  const c = out.extraLayers![0].clips[0];
  assert.equal(c.x, 30);
  assert.equal(c.scale, 1.5);
  assert.equal(c.animateIn!.type, "fade");
  assert.equal(c.animateOut!.durationInFrames, 8);
});

test("makeTextElement — texto centralizado (x/y), sem âncora de posição", () => {
  const el = makeTextElement(45, 30);
  assert.equal(el.type, "text");
  assert.equal(el.x, 50);
  assert.equal(el.y, 75);
  assert.equal(el.startFrame, 45);
});

test("recompute — startFrames sequenciais + total", () => {
  const { clips, total } = recompute(tl().videoTrack);
  assert.deepEqual(clips.map((c) => c.startFrame), [0, 90, 180]);
  assert.equal(total, 270);
});

test("moveClip — troca e recalcula startFrames", () => {
  const t = moveClip(tl(), 0, 1); // hook desce
  assert.deepEqual(t.videoTrack.map((c) => c.role), ["skill", "hook", "cta"]);
  assert.deepEqual(t.videoTrack.map((c) => c.startFrame), [0, 90, 180]);
});

test("moveClip — fora dos limites não altera", () => {
  const base = tl();
  assert.equal(moveClip(base, 0, -1), base); // já no topo
  assert.equal(moveClip(base, 2, +1), base); // já no fim
});

test("trimClip — ajusta duração e re-sequencia os seguintes", () => {
  const t = trimClip(tl(), 0, 30); // +1s no primeiro
  assert.equal(t.videoTrack[0].durationInFrames, 120);
  assert.deepEqual(t.videoTrack.map((c) => c.startFrame), [0, 120, 210]);
  assert.ok(t.durationInFrames >= 300);
});

test("trimClip — não deixa duração < 1 frame", () => {
  const t = trimClip(tl(), 0, -1000);
  assert.equal(t.videoTrack[0].durationInFrames, 1);
});

test("removeClip — remove e re-sequencia; não esvazia", () => {
  const t = removeClip(tl(), 1);
  assert.deepEqual(t.videoTrack.map((c) => c.role), ["hook", "cta"]);
  assert.deepEqual(t.videoTrack.map((c) => c.startFrame), [0, 90]);
  // não remove o último restante
  const one = removeClip(removeClip(t, 0), 0);
  assert.equal(one.videoTrack.length, 1);
});

test("removeClips — remove em lote com ripple (1 operação)", () => {
  const t = removeClips(tl(), [0, 2]); // tira hook e cta, sobra skill
  assert.deepEqual(t.videoTrack.map((c) => c.role), ["skill"]);
  assert.deepEqual(t.videoTrack.map((c) => c.startFrame), [0]); // ripple: começa em 0
  // nunca esvazia
  assert.equal(removeClips(tl(), [0, 1, 2]).videoTrack.length, 3);
  // índices inválidos são ignorados
  assert.equal(removeClips(tl(), [99, -1]).videoTrack.length, 3);
});

test("setHookRenderer / editCaption — imutável", () => {
  const f = fx();
  const f2 = setHookRenderer(f, "snap-zoom");
  assert.equal(f2.hookRenderer, "snap-zoom");
  assert.equal(f.hookRenderer, "hard-cut"); // original intacto
  const f3 = editCaption(f, 1, "AQUI");
  assert.equal(f3.captions[1].text, "AQUI");
  assert.equal(f.captions[1].text, "isso");
});
