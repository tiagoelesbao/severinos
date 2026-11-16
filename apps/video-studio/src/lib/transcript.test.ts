import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSpeechCut,
  speechSpansFromSilences,
  spansToSegments,
  mapViaSegments,
  detectSilences,
  tokenizeScript,
  correctWordsToScript,
} from "./transcript.ts";

const entry = {
  duration: 3,
  words: [
    { w: "a", start: 0.2, end: 0.5 },
    { w: "b", start: 0.6, end: 0.9 },
    { w: "c", start: 2.0, end: 2.3 }, // gap 1.1s → silêncio removível
  ],
};

test("computeSpeechCut — agrupa fala e remove o respiro longo (sem clipar palavra)", () => {
  const cut = computeSpeechCut(entry, { maxGapSec: 0.4 });
  // 2 trechos mantidos (a+b juntos; c separado).
  assert.equal(cut.keptSpans.length, 2);
  // saída bem menor que 3s (silêncio longo removido).
  assert.ok(cut.outDuration > 1.0 && cut.outDuration < 1.8, `outDuration=${cut.outDuration}`);
  // a borda nunca entra na palavra: 1º trecho termina em <= início de 'c' (2.0).
  assert.ok(cut.keptSpans[0].srcEnd <= 2.0);
  // 2º trecho começa em >= fim de 'b' (0.9).
  assert.ok(cut.keptSpans[1].srcStart >= 0.9);
});

test("mapViaSegments — comprime o tempo removendo o silêncio", () => {
  // segmentos explícitos (independe do algoritmo de corte): [0–1s] e [2–2.5s] de origem.
  const segs = spansToSegments([{ srcStart: 0, srcEnd: 1 }, { srcStart: 2, srcEnd: 2.5 }], 30);
  // 0.5s cai no 1º segmento → ~0.5s de saída.
  assert.ok(Math.abs(mapViaSegments(0.5, segs, 30) - 0.5) < 0.05);
  // 2.0s (início do 2º) saltou o silêncio [1–2] → ~1.0s de saída (não 2.0s).
  assert.ok(mapViaSegments(2.0, segs, 30) < 1.2, "deve comprimir para <1.2s");
});

test("speechSpansFromSilences — remove o silêncio detectado, mantém respiro", () => {
  // silêncio real [1–2]s num áudio de 3s; minSilence 0.35.
  const cut = speechSpansFromSilences([{ start: 1, end: 2 }], 3, { minSilenceSec: 0.35, padSec: 0.07 });
  assert.equal(cut.keptSpans.length, 2);
  assert.ok(cut.outDuration < 3 && cut.outDuration > 2, `outDuration=${cut.outDuration}`);
  // o corte cai DENTRO do silêncio (não na fala): 1º trecho termina logo após 1s.
  assert.ok(cut.keptSpans[0].srcEnd <= 1.1 && cut.keptSpans[1].srcStart >= 1.9);
});

test("speechSpansFromSilences — pausa curta (< minSilence) NÃO é cortada", () => {
  const cut = speechSpansFromSilences([{ start: 1, end: 1.2 }], 3, { minSilenceSec: 0.35 });
  assert.equal(cut.keptSpans.length, 1); // nada removido
});

test("mapViaSegments — sem segmentos é identidade", () => {
  assert.equal(mapViaSegments(1.5, undefined, 30), 1.5);
});

test("detectSilences — pega o respiro longo entre palavras", () => {
  const spans = detectSilences(entry, { minGapSec: 0.4 });
  assert.ok(spans.some((s) => s.startSec > 0.9 && s.endSec < 2.0));
});

// ── correção via roteiro ──────────────────────────────────────────────────────
test("correctWordsToScript — corrige termo parecido (mal reconhecido), mantém timing", () => {
  // Whisper "recordi"/"completu" parecidos com roteiro "recorde"/"completo".
  const words = [
    { w: "site", start: 1.0, end: 1.3 },
    { w: "completu", start: 1.3, end: 1.8 },
    { w: "recordi.", start: 2.5, end: 3.4 },
  ];
  const script = tokenizeScript("site completo recorde.");
  const fixed = correctWordsToScript(words, script);
  assert.deepEqual(fixed.map((w) => w.w), ["site", "completo", "recorde."]);
  assert.equal(fixed[2].start, 2.5); // timing preservado
});

test("correctWordsToScript — corrige TRECHO divergente ancorado dos dois lados (hook real)", () => {
  // Whisper "site completo e dei por recorde"; roteiro "site inteiro em tempo recorde".
  const words = [
    { w: "site", start: 1.0, end: 1.3 },
    { w: "completo", start: 1.3, end: 1.8 },
    { w: "e", start: 1.8, end: 1.9 },
    { w: "dei", start: 1.9, end: 2.1 },
    { w: "por", start: 2.1, end: 2.3 },
    { w: "recorde", start: 2.3, end: 3.0 },
  ];
  const script = tokenizeScript("eu criei um site inteiro em tempo recorde hoje");
  const fixed = correctWordsToScript(words, script).map((w) => w.w);
  // o trecho entre "site" e "recorde" vira a versão do roteiro.
  assert.ok(fixed.includes("tempo"), `corrigido: ${fixed}`);
  assert.ok(!fixed.includes("dei") && !fixed.includes("por"), `corrigido: ${fixed}`);
  assert.equal(fixed[0], "site");
  assert.equal(fixed[fixed.length - 1], "recorde");
});

test("correctWordsToScript — CONSERVADOR: trecho na PONTA (sem âncora à direita) é mantido", () => {
  // Criador falou "completo"; plano diz "inteiro" — termos diferentes → mantém o dito.
  const words = [
    { w: "site", start: 1, end: 1.3 },
    { w: "completo", start: 1.3, end: 1.8 },
    { w: "novo", start: 1.8, end: 2.1 },
  ];
  const script = tokenizeScript("site inteiro lindo");
  const fixed = correctWordsToScript(words, script);
  assert.equal(fixed[1].w, "completo"); // NÃO vira "inteiro"
  assert.equal(fixed[2].w, "novo"); // NÃO vira "lindo"
});

test("correctWordsToScript — corrige erro ancorado pelo contexto, em roteiro maior", () => {
  // Whisper: "...conversão da vírus desenha..."; roteiro: "...da virals desenha...".
  // As vizinhas corretas (da/desenha) ancoram a substituição vírus→virals.
  const words = [
    { w: "conversão", start: 29, end: 29.7 },
    { w: "da", start: 29.7, end: 29.9 },
    { w: "vírus,", start: 29.9, end: 30.3 },
    { w: "desenha", start: 30.7, end: 31.5 },
  ];
  const script = tokenizeScript(
    "aplica o playbook de otimização da conversão da virals desenha e executa a loja",
  );
  const fixed = correctWordsToScript(words, script);
  assert.ok(fixed.map((w) => w.w).includes("virals"), `corrigido: ${fixed.map((w) => w.w)}`);
});

test("correctWordsToScript — sem roteiro retorna as palavras originais", () => {
  const words = [{ w: "qualquer", start: 0, end: 1 }];
  assert.deepEqual(correctWordsToScript(words, []), words);
});
