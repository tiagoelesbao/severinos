import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEditSpec, makeSpeechFinder, parseMoment, transitionTypeFor } from "./editSpec.ts";
import type { Timeline } from "./timeline";

test("parseMoment: formatos reais do plano (incl. traço unicode)", () => {
  assert.deepEqual(parseMoment("b‑roll de brand kit @ 4‑8s"), { kind: "range", startSec: 4, endSec: 8 });
  assert.deepEqual(parseMoment("slow-zoom no site final entre 20‑28s"), { kind: "range", startSec: 20, endSec: 28 });
  assert.deepEqual(parseMoment("close-up de Tiago nos primeiros 3s"), { kind: "range", startSec: 0, endSec: 3 });
  assert.deepEqual(parseMoment("highlight @ 2,5s"), { kind: "point", startSec: 2.5 });
  assert.equal(parseMoment("cut rápido a cada 1,5‑2 s para manter ritmo").kind, "cadence");
  assert.equal(parseMoment("whip transition ao mostrar o playbook").kind, "none");
});

test("transitionTypeFor: mapeia o léxico do plano para TransitionType", () => {
  assert.equal(transitionTypeFor("whip transition ao mostrar o playbook"), "slide");
  assert.equal(transitionTypeFor("zoom punch na virada"), "zoom");
  assert.equal(transitionTypeFor("cut-dry"), "dissolve");
});

test("makeSpeechFinder: acha o trecho por keywords; null sem match", () => {
  const words = "com esses dados a ia aplica o playbook de conversão da virals"
    .split(" ")
    .map((w, i) => ({ w, absFrame: 100 + i * 12 }));
  const find = makeSpeechFinder(words);
  const f = find("ao mostrar o playbook de conversão");
  assert.ok(f !== null && f >= 100, `frame do playbook (got ${f})`);
  assert.equal(find("assunto totalmente alheio xyz"), null);
});

const tl = (): Timeline => ({
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 900,
  videoTrack: [
    { file: "hook.mp4", absPath: "", role: "hook", durationSeconds: 4, durationInFrames: 120, nativeDurationInFrames: 120, playbackRate: 1, width: 0, height: 0, startFrame: 0, audioEnabled: true },
    { file: "a.mov", absPath: "", role: "insert", durationSeconds: 10, durationInFrames: 300, nativeDurationInFrames: 300, playbackRate: 1, width: 0, height: 0, startFrame: 120, audioEnabled: false },
    { file: "b.mov", absPath: "", role: "insert", durationSeconds: 16, durationInFrames: 480, nativeDurationInFrames: 480, playbackRate: 1, width: 0, height: 0, startFrame: 420, audioEnabled: false },
  ],
  audioTrack: null,
  captionTrack: [],
  meta: { client: "x", creative: "y", videoSeconds: 30, audioSeconds: 0, rhythmGapSeconds: null, gaps: [] },
});

test("applyEditSpec: zoom no clipe certo, transição na virada, inserts/motion plotados", () => {
  const { timeline, applied, warnings } = applyEditSpec(
    tl(),
    {
      zooms: ["close-up nos primeiros 3s", "slow-zoom entre 20‑28s"],
      transitions: ["cut rápido a cada 1,5‑2 s", "whip transition @ 14s"],
      inserts: ["b-roll de brand kit @ 4‑8s"],
      motion_graphics: ["elemento de barra de progresso @ 0‑3s", "highlight dos tempos @ 2‑3s"],
    },
    () => null,
    30,
  );
  // Zoom 1 (0–3s → meio 1,5s) → hook; Zoom 2 (20–28s → meio 24s=frame 720) → b.mov.
  assert.equal(timeline.videoTrack[0].kenBurns, 0.08);
  assert.equal(timeline.videoTrack[2].kenBurns, 0.08);
  // Cadência global não vira transição; whip @14s (frame 420) → entrada do clipe 3.
  assert.equal(timeline.videoTrack[1].transitionIn, undefined);
  assert.deepEqual(timeline.videoTrack[2].transitionIn, { type: "slide", durationInFrames: 6 });
  // Insert placeholder na camada do plano, janela 4–8s.
  const ins = timeline.extraLayers!.find((L) => L.id === "L-editspec-inserts")!;
  assert.equal(ins.clips[0].startFrame, 120);
  assert.equal(ins.clips[0].durationInFrames, 120);
  assert.equal(ins.clips[0].src, undefined); // placeholder (usuário arrasta asset)
  // Barra de progresso é nativa → só o highlight vira texto.
  const mg = timeline.extraLayers!.find((L) => L.id === "L-editspec-motion")!;
  assert.equal(mg.clips.length, 1);
  assert.equal(mg.clips[0].type, "text");
  assert.equal(warnings.length, 0);
  assert.ok(applied.length >= 4);
});

test("applyEditSpec: momento não-resolvível vira warning, nunca quebra", () => {
  const { timeline, warnings } = applyEditSpec(
    tl(),
    { zooms: ["zoom na fala que não existe"], inserts: ["b-roll sem momento"] },
    () => null,
    30,
  );
  assert.equal(warnings.length, 2);
  assert.equal(timeline.videoTrack[0].kenBurns, undefined);
  assert.equal(timeline.extraLayers?.find((L) => L.id === "L-editspec-inserts"), undefined);
});

test("applyEditSpec: referência de fala resolvida pelo finder", () => {
  const { timeline } = applyEditSpec(
    tl(),
    { transitions: ["whip transition ao mostrar o playbook"] },
    () => 430, // fala localizada no frame 430 → entrada mais próxima = clipe 3 (420)
    30,
  );
  assert.equal(timeline.videoTrack[2].transitionIn?.type, "slide");
});

test("applyEditSpec: não muta a entrada e zoom não sobrescreve kenBurns manual", () => {
  const base = tl();
  base.videoTrack[0] = { ...base.videoTrack[0], kenBurns: 0.15 };
  const frozen = JSON.stringify(base);
  const { timeline } = applyEditSpec(base, { zooms: ["close-up nos primeiros 3s"] }, () => null, 30);
  assert.equal(JSON.stringify(base), frozen);
  assert.equal(timeline.videoTrack[0].kenBurns, 0.15); // manual preservado
});
