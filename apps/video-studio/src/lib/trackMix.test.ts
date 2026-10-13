import { test } from "node:test";
import assert from "node:assert/strict";
import type { Timeline } from "./timeline.ts";
import { resolveAudible, toggleTrackFlag, trackFlag } from "./trackMix.ts";

// Timeline mínima: resolveAudible só lê os flags de mixagem.
function tl(over: Partial<Timeline> = {}): Timeline {
  return {
    fps: 30, width: 1080, height: 1920, durationInFrames: 300,
    videoTrack: [],
    audioTrack: { file: "n.ogg", absPath: "", durationSeconds: 10, durationInFrames: 300, startFrame: 0, windowFrames: 300 },
    captionTrack: [],
    extraLayers: [
      { id: "L1", kind: "audio", name: "SFX", clips: [] },
      { id: "L2", kind: "video", name: "Overlay", clips: [] },
    ],
    meta: { client: "c", creative: "cr", videoSeconds: 10, audioSeconds: 10, rhythmGapSeconds: null, gaps: [] },
    ...over,
  };
}

test("resolveAudible — sem flags, tudo soa", () => {
  const m = resolveAudible(tl());
  assert.equal(m.video, true);
  assert.equal(m.narration, true);
  assert.equal(m.layers.L1, true);
  assert.equal(m.layers.L2, true);
});

test("resolveAudible — mute do vídeo silencia só o vídeo", () => {
  const m = resolveAudible(tl({ videoMuted: true }));
  assert.equal(m.video, false);
  assert.equal(m.narration, true);
  assert.equal(m.layers.L1, true);
});

test("resolveAudible — solo da narração muda TODO o resto", () => {
  const base = tl();
  const soloed = { ...base, audioTrack: { ...base.audioTrack!, solo: true } };
  const m = resolveAudible(soloed);
  assert.equal(m.narration, true);
  assert.equal(m.video, false);
  assert.equal(m.layers.L1, false);
  assert.equal(m.layers.L2, false);
});

test("resolveAudible — mute vence solo (soloed + muted = não soa)", () => {
  const base = tl({ videoSolo: true, videoMuted: true });
  const m = resolveAudible(base);
  assert.equal(m.video, false); // muted sempre silencia
});

test("resolveAudible — solo numa camada isola essa camada", () => {
  const base = tl();
  const soloed = {
    ...base,
    extraLayers: base.extraLayers!.map((L) => (L.id === "L1" ? { ...L, solo: true } : L)),
  };
  const m = resolveAudible(soloed);
  assert.equal(m.layers.L1, true);
  assert.equal(m.layers.L2, false);
  assert.equal(m.video, false);
  assert.equal(m.narration, false);
});

test("toggleTrackFlag — alterna e serializa por faixa", () => {
  let t = tl();
  t = toggleTrackFlag(t, "video", "muted");
  assert.equal(t.videoMuted, true);
  assert.equal(trackFlag(t, "video", "muted"), true);

  t = toggleTrackFlag(t, "narration", "solo");
  assert.equal(t.audioTrack!.solo, true);
  assert.equal(trackFlag(t, "narration", "solo"), true);

  t = toggleTrackFlag(t, "L1", "locked");
  assert.equal(t.extraLayers!.find((L) => L.id === "L1")!.locked, true);
  assert.equal(trackFlag(t, "L1", "locked"), true);

  // idempotência do toggle: volta ao estado anterior
  t = toggleTrackFlag(t, "video", "muted");
  assert.equal(!!t.videoMuted, false);
});

test("toggleTrackFlag — não muta o objeto original (imutável)", () => {
  const t0 = tl();
  const t1 = toggleTrackFlag(t0, "video", "locked");
  assert.equal(!!t0.videoLocked, false);
  assert.equal(t1.videoLocked, true);
  assert.notEqual(t0, t1);
});
