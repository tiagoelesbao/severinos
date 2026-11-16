import { test } from "node:test";
import assert from "node:assert/strict";
import { toggleMarker, removeMarkerNear, nextMarkerFrame, prevMarkerFrame } from "./markers.ts";

test("toggleMarker — adiciona ordenado", () => {
  let m = toggleMarker([], 50);
  m = toggleMarker(m, 10);
  m = toggleMarker(m, 30);
  assert.deepEqual(m.map((x) => x.frame), [10, 30, 50]);
});

test("toggleMarker — M perto de um existente remove (toggle)", () => {
  const m0 = toggleMarker([], 100);
  const m1 = toggleMarker(m0, 101); // dentro da tolerância (2)
  assert.equal(m1.length, 0);
});

test("toggleMarker — undefined inicial vira lista", () => {
  const m = toggleMarker(undefined, 7);
  assert.deepEqual(m.map((x) => x.frame), [7]);
});

test("removeMarkerNear — tira só o próximo, mantém o resto", () => {
  const m = toggleMarker(toggleMarker([], 20), 200);
  const r = removeMarkerNear(m, 21);
  assert.deepEqual(r.map((x) => x.frame), [200]);
});

test("nextMarkerFrame / prevMarkerFrame — navegação estrita", () => {
  const m = [{ frame: 10 }, { frame: 50 }, { frame: 90 }];
  assert.equal(nextMarkerFrame(m, 50), 90);
  assert.equal(nextMarkerFrame(m, 90), null);
  assert.equal(prevMarkerFrame(m, 50), 10);
  assert.equal(prevMarkerFrame(m, 10), null);
  assert.equal(nextMarkerFrame(m, 0), 10);
});

test("navegação em lista vazia é null", () => {
  assert.equal(nextMarkerFrame(undefined, 5), null);
  assert.equal(prevMarkerFrame([], 5), null);
});
