import { test } from "node:test";
import assert from "node:assert/strict";
import type { Timeline } from "./timeline.ts";
import { estimateLevel } from "./levels.ts";

function tl(over: Partial<Timeline> = {}): Timeline {
  return {
    fps: 30, width: 1080, height: 1920, durationInFrames: 300,
    videoTrack: [],
    audioTrack: { file: "n.ogg", absPath: "", durationSeconds: 10, durationInFrames: 300, startFrame: 0, windowFrames: 300 },
    captionTrack: [],
    extraLayers: [],
    meta: { client: "c", creative: "cr", videoSeconds: 10, audioSeconds: 10, rhythmGapSeconds: null, gaps: [] },
    ...over,
  };
}

test("estimateLevel — só narração fica bem abaixo do clipping", () => {
  const s = estimateLevel(tl(), 100);
  assert.ok(s.level > 0 && s.level < 1);
  assert.equal(s.clipping, false);
});

test("estimateLevel — SFX a 1.0 sobre a narração ESTOURA (caso do AC2)", () => {
  const t = tl({
    extraLayers: [{ id: "sfx", kind: "audio", name: "SFX", clips: [
      { id: "s1", type: "media-audio", label: "boom", src: "/x.mp3", startFrame: 0, durationInFrames: 300, volume: 1 },
    ] }],
  });
  const s = estimateLevel(t, 100);
  assert.ok(s.level > 1.0, `nível ${s.level} deveria passar de 1`);
  assert.equal(s.clipping, true);
});

test("estimateLevel — o MESMO SFX com ducking NÃO estoura", () => {
  const t = tl({
    extraLayers: [{ id: "sfx", kind: "audio", name: "Trilha", clips: [
      { id: "s1", type: "media-audio", label: "trilha", src: "/x.mp3", startFrame: 0, durationInFrames: 300, volume: 1, ducking: true },
    ] }],
  });
  const s = estimateLevel(t, 100);
  assert.equal(s.clipping, false);
});

test("estimateLevel — camada muda não contribui", () => {
  const t = tl({
    extraLayers: [{ id: "sfx", kind: "audio", name: "SFX", muted: true, clips: [
      { id: "s1", type: "media-audio", label: "boom", src: "/x.mp3", startFrame: 0, durationInFrames: 300, volume: 1 },
    ] }],
  });
  const s = estimateLevel(t, 100);
  // sobra só a narração
  assert.ok(s.level < 1 && s.level > 0);
});

test("estimateLevel — fora de qualquer áudio = 0", () => {
  const t = tl({ audioTrack: { file: "n.ogg", absPath: "", durationSeconds: 3, durationInFrames: 90, startFrame: 0, windowFrames: 90 } });
  assert.equal(estimateLevel(t, 200).level, 0);
});
