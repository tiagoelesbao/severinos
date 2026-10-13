import { test } from "node:test";
import assert from "node:assert/strict";
import type { Keyframe } from "./timeline.ts";
import { sampleTrack, upsertKeyframe, deleteKeyframe, shiftKeyframes, hasKeyframes, fadeGain } from "./keyframes.ts";

test("sampleTrack — sem keyframes usa o base", () => {
  assert.equal(sampleTrack(undefined, 10, 0.5), 0.5);
  assert.equal(sampleTrack([], 10, 7), 7);
});

test("sampleTrack — 1 keyframe é constante", () => {
  assert.equal(sampleTrack([{ frame: 5, value: 2 }], 0, 99), 2);
  assert.equal(sampleTrack([{ frame: 5, value: 2 }], 100, 99), 2);
});

test("sampleTrack — hold antes/depois das pontas", () => {
  const k: Keyframe[] = [{ frame: 10, value: 0 }, { frame: 20, value: 1 }];
  assert.equal(sampleTrack(k, 0, 9), 0);   // antes do 1º
  assert.equal(sampleTrack(k, 30, 9), 1);  // depois do último
});

test("sampleTrack — linear no meio", () => {
  const k: Keyframe[] = [{ frame: 0, value: 0 }, { frame: 10, value: 10 }];
  assert.equal(sampleTrack(k, 5, 0), 5);
  assert.equal(sampleTrack(k, 2, 0), 2);
});

test("sampleTrack — easing in/out/inOut nos extremos e meio", () => {
  const kin: Keyframe[] = [{ frame: 0, value: 0, ease: "in" }, { frame: 10, value: 1 }];
  assert.equal(sampleTrack(kin, 0, 0), 0);
  assert.equal(sampleTrack(kin, 10, 0), 1);
  assert.ok(sampleTrack(kin, 5, 0) < 0.5); // ease-in: meio abaixo da reta
  const kout: Keyframe[] = [{ frame: 0, value: 0, ease: "out" }, { frame: 10, value: 1 }];
  assert.ok(sampleTrack(kout, 5, 0) > 0.5); // ease-out: meio acima da reta
  const kio: Keyframe[] = [{ frame: 0, value: 0, ease: "inOut" }, { frame: 10, value: 1 }];
  assert.equal(Math.round(sampleTrack(kio, 5, 0) * 100) / 100, 0.5); // simétrico no meio
});

test("sampleTrack — 3 keyframes, segmento correto", () => {
  const k: Keyframe[] = [
    { frame: 0, value: 0 }, { frame: 10, value: 10 }, { frame: 20, value: 0 },
  ];
  assert.equal(sampleTrack(k, 5, 0), 5);   // sobe
  assert.equal(sampleTrack(k, 15, 0), 5);  // desce
  assert.equal(sampleTrack(k, 10, 0), 10); // pico exato
});

test("upsertKeyframe — insere ordenado e substitui no mesmo frame", () => {
  let k = upsertKeyframe(undefined, 10, 1);
  k = upsertKeyframe(k, 5, 2);
  k = upsertKeyframe(k, 20, 3);
  assert.deepEqual(k.map((x) => x.frame), [5, 10, 20]);
  k = upsertKeyframe(k, 10, 9); // substitui
  assert.equal(k.length, 3);
  assert.equal(k.find((x) => x.frame === 10)!.value, 9);
});

test("fadeGain — rampas de entrada e saída", () => {
  // fade-in de 10 frames
  assert.equal(fadeGain(0, 100, 10, 0), 0);
  assert.equal(fadeGain(5, 100, 10, 0), 0.5);
  assert.equal(fadeGain(10, 100, 10, 0), 1);
  assert.equal(fadeGain(50, 100, 10, 0), 1);
  // fade-out de 20 frames (dur 100)
  assert.equal(fadeGain(100, 100, 0, 20), 0);
  assert.equal(fadeGain(90, 100, 0, 20), 0.5);
  assert.equal(fadeGain(80, 100, 0, 20), 1);
  // sem fades = 1
  assert.equal(fadeGain(50, 100), 1);
});

test("deleteKeyframe / shiftKeyframes / hasKeyframes", () => {
  const k: Keyframe[] = [{ frame: 5, value: 1 }, { frame: 15, value: 2 }];
  assert.equal(hasKeyframes(k), true);
  assert.equal(hasKeyframes([]), false);
  assert.deepEqual(deleteKeyframe(k, 5).map((x) => x.frame), [15]);
  assert.deepEqual(shiftKeyframes(k, 10)!.map((x) => x.frame), [15, 25]);
});
