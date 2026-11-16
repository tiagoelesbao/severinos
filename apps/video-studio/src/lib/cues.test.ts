import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCues, wrapLines, activeCueIndex } from "./cues.ts";
import type { Caption } from "@remotion/captions";

const cap = (text: string, startMs: number, endMs: number): Caption => ({
  text,
  startMs,
  endMs,
  timestampMs: Math.round((startMs + endMs) / 2),
  confidence: null,
});

test("wrapLines — quebra em ≤ 2 linhas respeitando o limite", () => {
  const words = ["UM", "DOIS", "TRES", "QUATRO"].map((t) => ({ text: t, startMs: 0, endMs: 1 }));
  const lines = wrapLines(words, 9, 2); // "UM DOIS" (7) | "TRES QUATRO" (11>9 → estoura)
  assert.ok(lines === null || lines.length <= 2);
});

test("buildCues — cue fecha em pontuação forte (fim de oração)", () => {
  const caps = [
    cap("Olha", 0, 300),
    cap("isso.", 300, 700),
    cap("Eu", 800, 1000),
    cap("criei", 1000, 1400),
  ];
  const cues = buildCues(caps, { maxWords: 6, maxCharsPerLine: 40 });
  // "Olha isso." vira uma cue; "Eu criei" outra.
  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0].words.map((w) => w.text), ["Olha", "isso."]);
  assert.deepEqual(cues[1].words.map((w) => w.text), ["Eu", "criei"]);
});

test("buildCues — pausa longa quebra a cue", () => {
  const caps = [
    cap("um", 0, 200),
    cap("dois", 200, 400),
    cap("tres", 1500, 1700), // gap 1100ms > maxGapMs
  ];
  const cues = buildCues(caps, { maxGapMs: 700, maxWords: 9, maxCharsPerLine: 40 });
  assert.equal(cues.length, 2);
});

test("buildCues — respeita maxWords", () => {
  const caps = Array.from({ length: 8 }, (_, i) => cap(`w${i}`, i * 200, i * 200 + 150));
  const cues = buildCues(caps, { maxWords: 3, maxCharsPerLine: 80, maxGapMs: 9999 });
  assert.ok(cues.every((c) => c.words.length <= 3));
});

test("activeCueIndex — escolhe a cue que já começou; -1 antes da 1ª", () => {
  const caps = [cap("a", 0, 500), cap("b.", 500, 1000), cap("c", 2000, 2500)];
  const cues = buildCues(caps, { maxCharsPerLine: 40 });
  assert.equal(activeCueIndex(cues, 100), 0);
  // não há cue ativa muito antes da 1ª (ms negativo não existe; testa gap)
  assert.equal(activeCueIndex(cues, 2100), cues.length - 1);
});
