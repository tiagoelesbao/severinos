import { test } from "node:test";
import assert from "node:assert/strict";
import {
  duckingGain,
  mergeIntervals,
  segmentEnvelope,
  speechIntervals,
  tailGain,
} from "./audioEnvelopes.ts";
import type { Timeline } from "./timeline";

test("segmentEnvelope: rampas nas bordas, 1 no miolo, escala em trecho curto", () => {
  assert.ok(segmentEnvelope(0, 100, 3) < 1); // início em rampa
  assert.equal(segmentEnvelope(50, 100, 3), 1); // miolo pleno
  assert.ok(segmentEnvelope(99, 100, 3) < 0.5); // fim em rampa
  // Trecho de 4 frames com fade 3 → fade efetivo 2, miolo nunca zera.
  for (let f = 0; f < 4; f++) assert.ok(segmentEnvelope(f, 4, 3) > 0);
  assert.equal(segmentEnvelope(0, 1, 3), 1); // degenerado
});

test("mergeIntervals: sobrepostos, adjacentes com gap e ordenação", () => {
  const out = mergeIntervals(
    [{ start: 50, end: 60 }, { start: 0, end: 10 }, { start: 9, end: 20 }, { start: 24, end: 30 }],
    5,
  );
  assert.deepEqual(out, [{ start: 0, end: 30 }, { start: 50, end: 60 }]);
});

const tl = (over: Partial<Timeline> = {}): Timeline => ({
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 300,
  videoTrack: [
    { file: "hook.mp4", absPath: "", role: "hook", durationSeconds: 2, durationInFrames: 60, nativeDurationInFrames: 60, playbackRate: 1, width: 0, height: 0, startFrame: 0, audioEnabled: true },
    { file: "ins.mov", absPath: "", role: "generation", durationSeconds: 6, durationInFrames: 180, nativeDurationInFrames: 180, playbackRate: 1, width: 0, height: 0, startFrame: 60, audioEnabled: false },
  ],
  audioTrack: {
    file: "narr.ogg", absPath: "", durationSeconds: 6, durationInFrames: 180,
    startFrame: 60, windowFrames: 180,
    segments: [
      { srcFromFrame: 0, durationInFrames: 80, startFrame: 0 },
      { srcFromFrame: 100, durationInFrames: 80, startFrame: 90 },
    ],
  },
  captionTrack: [],
  meta: { client: "x", creative: "y", videoSeconds: 8, audioSeconds: 6, rhythmGapSeconds: null, gaps: [] },
  ...over,
});

test("speechIntervals: hook + segmentos da narração em frames absolutos", () => {
  const iv = speechIntervals(tl());
  // hook 0..60; narr seg1 60..140; seg2 150..230 — gap 10 < 2×ramp → mescla.
  assert.equal(iv[0].start, 0);
  assert.equal(iv[iv.length - 1].end, 230);
  assert.ok(iv.length <= 2);
});

test("speechIntervals: narração em meta.gaps é ignorada", () => {
  const t = tl();
  t.meta.gaps = ["narr.ogg"];
  const iv = speechIntervals(t);
  assert.deepEqual(iv, [{ start: 0, end: 60 }]);
});

test("duckingGain: 1 longe, duck dentro, rampa nas bordas", () => {
  const iv = [{ start: 100, end: 200 }];
  assert.equal(duckingGain(0, iv, { duck: 0.3, ramp: 8 }), 1);
  assert.ok(Math.abs(duckingGain(150, iv, { duck: 0.3, ramp: 8 }) - 0.3) < 1e-9);
  const nearIn = duckingGain(96, iv, { duck: 0.3, ramp: 8 }); // meio da rampa
  assert.ok(nearIn > 0.3 && nearIn < 1, `rampa de entrada (got ${nearIn})`);
  const nearOut = duckingGain(203, iv, { duck: 0.3, ramp: 8 });
  assert.ok(nearOut > 0.3 && nearOut < 1, `rampa de saída (got ${nearOut})`);
});

test("tailGain: 1 antes do tail, rampa a ~0 no último frame", () => {
  assert.equal(tailGain(0, 300, 12), 1);
  assert.equal(tailGain(287, 300, 12), 1);
  assert.ok(tailGain(294, 300, 12) < 1);
  assert.ok(tailGain(299, 300, 12) <= 0.1);
});
