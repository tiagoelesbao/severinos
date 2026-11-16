import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filenameTokens,
  generateMioloAnchors,
  keywordsFrom,
  staleFiles,
  uniqueAnchorAt,
} from "./prepare.ts";
import type { TranscriptWord } from "./ingest";

/** Palavras com timestamps sintéticos (0,4s por palavra). */
const W = (text: string): TranscriptWord[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => ({ w, start: i * 0.4, end: i * 0.4 + 0.35 }));

// Narração espelhando o criativo real (Chase Chappell → Tiago).
const NARRATION = W(
  "é só ativar esse skill responder a três perguntas e em segundos a IA vai " +
    "montar o Brand Kit completo cores fontes e identidade visual " +
    "Ela escaneia um modelo de página que você queira se inspirar documentos da sua marca " +
    "seu site produtos identifica as objeções mais comuns tudo de forma simples " +
    "Com esses dados a IA aplica o playbook de otimização de conversão da Virals " +
    "desenha e executa a loja para você Dá uma olhada no que saiu " +
    "A página cobre psicologia do comprador enquadra o problema mostra credibilidade",
);

const INSERTS = [
  { file: "Skill_activate.mov", hints: ["Primeiro, eu mando a IA montar o brand kit — cores, fontes", "Skill activate"] },
  { file: "Site_modeling.mov", hints: ["Depois ela escaneia seu produto, a linguagem da sua página", "Site modeling"] },
  { file: "Site_gen.mov", hints: ["Com esses dados eu aplico o playbook de taxa de conversão", "Site gen"] },
  { file: "Site_resultado.mov", hints: ["A página cobre psicologia do comprador, enquadra o problema", "Site resultado"] },
];

test("keywordsFrom: normaliza, filtra stopwords e curtas", () => {
  const kws = keywordsFrom("Depois ela escaneia o seu Produto, a linguagem!");
  assert.ok(kws.includes("escaneia"));
  assert.ok(kws.includes("produto"));
  assert.ok(!kws.includes("depois")); // stopword
  assert.ok(!kws.includes("ela")); // curta
});

test("filenameTokens: separa _ - . e camelCase, remove extensão", () => {
  assert.deepEqual(filenameTokens("Skill_activate.mov"), ["skill", "activate"]);
  assert.ok(filenameTokens("SiteModeling-v2.mp4").includes("modeling"));
});

test("generateMioloAnchors: caso real — posições monotônicas nos trechos certos", () => {
  const { anchors, method } = generateMioloAnchors(NARRATION, INSERTS);
  assert.equal(method, "keywords");
  assert.equal(anchors.length, 4);
  // Monotônico.
  for (let i = 1; i < anchors.length; i++) {
    assert.ok(anchors[i].wordIndex > anchors[i - 1].wordIndex, "posições crescentes");
  }
  const norm = NARRATION.map((w) => w.w.toLowerCase());
  const near = (idx: number, needle: string, tol: number) => {
    const target = norm.findIndex((w) => w.startsWith(needle));
    return Math.abs(idx - target) <= tol;
  };
  // Cada janela escolhida deve estar perto do trecho que descreve o insert.
  assert.ok(near(anchors[1].wordIndex, "escaneia", 8), `modeling perto de 'escaneia' (got ${anchors[1].wordIndex})`);
  assert.ok(near(anchors[2].wordIndex, "esses", 8), `gen perto de 'esses dados' (got ${anchors[2].wordIndex})`);
  assert.ok(near(anchors[3].wordIndex, "psicologia", 12), `resultado perto do payoff (got ${anchors[3].wordIndex})`);
  // Confiança real (> 0.3) em todos.
  for (const a of anchors) assert.ok(a.confidence > 0.3, `confiança ${a.clip}=${a.confidence}`);
});

test("generateMioloAnchors: âncoras casáveis pelo computeMioloWindows (1ª ocorrência = posição)", async () => {
  const { computeMioloWindows } = await import("./ingest.ts");
  const { anchors } = generateMioloAnchors(NARRATION, INSERTS);
  const dur = NARRATION[NARRATION.length - 1].end;
  const windows = computeMioloWindows(
    NARRATION,
    anchors.map((a) => ({ clip: a.clip, anchor: a.anchor })),
    dur,
  );
  assert.equal(windows.length, 4);
  // Janelas contíguas cobrindo [0, dur] e na ordem.
  assert.equal(windows[0].startSeconds, 0);
  for (let i = 1; i < windows.length; i++) {
    const prevEnd = windows[i - 1].startSeconds + windows[i - 1].windowSeconds;
    assert.ok(Math.abs(prevEnd - windows[i].startSeconds) < 1e-6, "contíguas");
  }
  const total = windows.reduce((s, w) => s + w.windowSeconds, 0);
  assert.ok(Math.abs(total - dur) < 1e-6, "cobrem a narração inteira");
});

test("generateMioloAnchors: sem sinal → uniform com confiança 0", () => {
  const { anchors, method } = generateMioloAnchors(NARRATION, [
    { file: "a.mov", hints: ["zzzz xxxx"] },
    { file: "b.mov", hints: ["wwww yyyy"] },
  ]);
  assert.equal(method, "uniform");
  assert.ok(anchors.every((a) => a.confidence === 0));
  assert.ok(anchors[1].wordIndex > anchors[0].wordIndex);
});

test("uniqueAnchorAt: estende a âncora até desambiguar frase repetida", () => {
  const words = W("a ia gera o site a ia gera a loja completa");
  // posição 5 = segunda ocorrência de "a ia gera" → precisa de mais palavras.
  const anchor = uniqueAnchorAt(words, 5);
  const found = words.map((w) => w.w).join(" ").indexOf(anchor);
  // A âncora escolhida deve identificar a 2ª ocorrência (ou degradar p/ 2 palavras).
  assert.ok(anchor.split(" ").length >= 2);
  assert.ok(found >= 0);
});

test("staleFiles: detecta novo, alterado e já transcrito", () => {
  const current = {
    "a.mp4": { size: 10, mtimeMs: 100 },
    "b.mp4": { size: 20, mtimeMs: 200 },
    "c.ogg": { size: 30, mtimeMs: 300 },
  };
  const meta = { files: { "a.mp4": { size: 10, mtimeMs: 100 }, "b.mp4": { size: 19, mtimeMs: 200 } } };
  const out = staleFiles(current, meta, new Set(["a.mp4", "b.mp4"]));
  assert.deepEqual(out.sort(), ["b.mp4", "c.ogg"]); // b mudou de tamanho; c é novo
});
