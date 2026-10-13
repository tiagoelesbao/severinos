import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMediaUrl, rewriteForRender, stagedPathFor } from "./exportRender.ts";
import type { Timeline, TimelineClip } from "./timeline";

const CLIENT = "tiago-elesbao";
const CREATIVE = "13-realchasechappell-84d69e";

const clip = (over: Partial<TimelineClip>): TimelineClip => ({
  file: "hook.mp4",
  absPath: "X:/hook.mp4",
  role: "hook",
  durationSeconds: 2,
  durationInFrames: 60,
  nativeDurationInFrames: 60,
  playbackRate: 1,
  width: 1080,
  height: 1920,
  startFrame: 0,
  audioEnabled: true,
  ...over,
});

const baseTimeline = (over: Partial<Timeline> = {}): Timeline => ({
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 120,
  videoTrack: [clip({}), clip({ file: "Site_gen.mov", role: "generation", startFrame: 60, audioEnabled: false })],
  audioTrack: {
    file: "audio_narrado.ogg",
    absPath: "X:/audio_narrado.ogg",
    durationSeconds: 4,
    durationInFrames: 120,
    startFrame: 60,
    windowFrames: 60,
  },
  captionTrack: [],
  meta: { client: CLIENT, creative: CREATIVE, videoSeconds: 4, audioSeconds: 4, rhythmGapSeconds: null, gaps: [] },
  ...over,
});

test("parseMediaUrl: library, materiais, uploads e externas", () => {
  assert.deepEqual(parseMediaUrl("/library/sfx/whoosh.wav", CLIENT, CREATIVE), {
    kind: "library",
    name: "sfx/whoosh.wav",
  });
  assert.deepEqual(
    parseMediaUrl(`/api/media/${CLIENT}/${CREATIVE}/${encodeURIComponent("final do video.mp4")}`, CLIENT, CREATIVE),
    { kind: "material", name: "final do video.mp4" },
  );
  assert.deepEqual(
    parseMediaUrl(`/api/media/${CLIENT}/${CREATIVE}/__assets__/${encodeURIComponent("logo do cliente.png")}`, CLIENT, CREATIVE),
    { kind: "upload", name: "logo do cliente.png" },
  );
  assert.equal(parseMediaUrl("https://cdn.example.com/x.mp4", CLIENT, CREATIVE), null);
  assert.equal(parseMediaUrl("data:audio/wav;base64,AAA", CLIENT, CREATIVE), null);
  assert.equal(parseMediaUrl(`/api/media/outro-cliente/x/arquivo.mp4`, CLIENT, CREATIVE), null);
});

test("stagedPathFor: raiz para material, subpastas para upload/library", () => {
  assert.equal(stagedPathFor({ kind: "material", name: "hook.mp4" }), "hook.mp4");
  assert.equal(stagedPathFor({ kind: "upload", name: "a.png" }), "__assets__/a.png");
  assert.equal(stagedPathFor({ kind: "library", name: "music/lofi.wav" }), "library/music/lofi.wav");
});

test("rewriteForRender: coleta materiais + narração, sem duplicar", () => {
  const { assets, unresolved } = rewriteForRender(baseTimeline(), CLIENT, CREATIVE);
  assert.deepEqual(
    assets.map((a) => `${a.kind}:${a.name}`).sort(),
    ["material:Site_gen.mov", "material:audio_narrado.ogg", "material:hook.mp4"],
  );
  assert.equal(unresolved.length, 0);
});

test("rewriteForRender: clip gap e narração em meta.gaps não viram assets", () => {
  const tl = baseTimeline({
    videoTrack: [clip({}), clip({ file: "faltando.mp4", gap: true, startFrame: 60 })],
    meta: { client: CLIENT, creative: CREATIVE, videoSeconds: 4, audioSeconds: 4, rhythmGapSeconds: null, gaps: ["audio_narrado.ogg"] },
  });
  const { assets } = rewriteForRender(tl, CLIENT, CREATIVE);
  assert.deepEqual(assets.map((a) => a.name), ["hook.mp4"]);
});

test("rewriteForRender: src de camada extra vira file de staging; externa fica", () => {
  const tl = baseTimeline({
    extraLayers: [
      {
        id: "L1",
        kind: "audio",
        name: "SFX",
        clips: [
          { id: "c1", type: "media-audio", src: "/library/sfx/impact.wav", label: "impact", startFrame: 0, durationInFrames: 18, volume: 0.4 },
          { id: "c2", type: "media-audio", src: "https://ext.example.com/x.mp3", label: "ext", startFrame: 30, durationInFrames: 18 },
        ],
      },
      {
        id: "L2",
        kind: "video",
        name: "Overlay",
        clips: [
          { id: "c3", type: "image", src: `/api/media/${CLIENT}/${CREATIVE}/__assets__/logo.png`, label: "logo", startFrame: 0, durationInFrames: 60, opacity: 1 },
        ],
      },
    ],
  });
  const { timeline, assets, unresolved } = rewriteForRender(tl, CLIENT, CREATIVE);

  const c1 = timeline.extraLayers![0].clips[0];
  assert.equal(c1.src, undefined);
  assert.equal(c1.file, "library/sfx/impact.wav");
  const c2 = timeline.extraLayers![0].clips[1];
  assert.equal(c2.src, "https://ext.example.com/x.mp3"); // intocada
  const c3 = timeline.extraLayers![1].clips[0];
  assert.equal(c3.file, "__assets__/logo.png");

  assert.ok(assets.some((a) => a.kind === "library" && a.name === "sfx/impact.wav"));
  assert.ok(assets.some((a) => a.kind === "upload" && a.name === "logo.png"));
  assert.deepEqual(unresolved, ["https://ext.example.com/x.mp3"]);
});

test("rewriteForRender: não muta o timeline de entrada", () => {
  const tl = baseTimeline({
    extraLayers: [
      { id: "L1", kind: "audio", name: "SFX", clips: [{ id: "c1", src: "/library/sfx/pop.wav", label: "pop", startFrame: 0, durationInFrames: 10 }] },
    ],
  });
  const frozen = JSON.stringify(tl);
  rewriteForRender(tl, CLIENT, CREATIVE);
  assert.equal(JSON.stringify(tl), frozen);
});

test("remapFiles: troca refs de vídeo/áudio/camadas sem mutar a entrada", async () => {
  const { remapFiles } = await import("./exportRender.ts");
  const tl = baseTimeline({
    extraLayers: [
      { id: "L1", kind: "video", name: "Ovl", clips: [{ id: "c1", file: "Site_gen.mov", label: "b", startFrame: 0, durationInFrames: 10 }] },
    ],
  });
  const frozen = JSON.stringify(tl);
  const out = remapFiles(tl, { "Site_gen.mov": "Site_gen.mov.mp4" });
  assert.equal(out.videoTrack[1].file, "Site_gen.mov.mp4");
  assert.equal(out.videoTrack[0].file, "hook.mp4"); // não mapeado, intocado
  assert.equal(out.extraLayers![0].clips[0].file, "Site_gen.mov.mp4");
  assert.equal(out.audioTrack!.file, "audio_narrado.ogg");
  assert.equal(JSON.stringify(tl), frozen);
});

test("rewriteForRender: elemento de texto (sem src/file) passa intocado", () => {
  const tl = baseTimeline({
    extraLayers: [
      { id: "L1", kind: "video", name: "Texto", clips: [{ id: "t1", type: "text", label: "Texto", startFrame: 0, durationInFrames: 60, text: "Olá", fontSize: 64 }] },
    ],
  });
  const { timeline, assets } = rewriteForRender(tl, CLIENT, CREATIVE);
  assert.equal(timeline.extraLayers![0].clips[0].text, "Olá");
  assert.equal(assets.filter((a) => a.kind !== "material").length, 0);
});
