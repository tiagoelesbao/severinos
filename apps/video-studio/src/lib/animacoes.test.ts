import { test } from "node:test";
import assert from "node:assert/strict";
import { deltaAnimacao, duracaoAnimacao } from "./animacoes.ts";
import { ANIMACOES } from "./fxCatalog.ts";

test("assentada (p=1) é sempre neutra, em qualquer animação", () => {
  for (const a of ANIMACOES) {
    const d = deltaAnimacao(a.id, 1);
    assert.equal(d.opacidade, 1, a.id);
    assert.equal(d.dx, 0, a.id);
    assert.equal(d.dy, 0, a.id);
    assert.ok(Math.abs(d.escala - 1) < 1e-9, `${a.id} escala ${d.escala}`);
    assert.equal(d.desfoque, 0, a.id);
  }
});

test("nenhuma não mexe em nada nem no meio da animação", () => {
  assert.deepEqual(deltaAnimacao("nenhuma", 0.3), { opacidade: 1, dx: 0, dy: 0, escala: 1, desfoque: 0 });
  assert.deepEqual(deltaAnimacao(undefined, 0.3), { opacidade: 1, dx: 0, dy: 0, escala: 1, desfoque: 0 });
});

test("entrada e saída são simétricas — foi o defeito da versão anterior", () => {
  for (const id of ["sobe", "desce", "entra-esq", "entra-dir"] as const) {
    const ent = deltaAnimacao(id, 0.25, 1);
    const sai = deltaAnimacao(id, 0.25, -1);
    assert.ok(Math.abs(ent.dx + sai.dx) < 1e-9, `${id} dx assimétrico`);
    assert.ok(Math.abs(ent.dy + sai.dy) < 1e-9, `${id} dy assimétrico`);
  }
});

test("toda animação carrega fade — senão o elemento cruza a borda visível", () => {
  for (const a of ANIMACOES) {
    if (a.id === "nenhuma") continue;
    assert.ok(deltaAnimacao(a.id, 0).opacidade < 0.01, a.id);
  }
});

test("cresce vem de menor, encolhe vem de maior", () => {
  assert.ok(deltaAnimacao("cresce", 0).escala < 1);
  assert.ok(deltaAnimacao("encolhe", 0).escala > 1);
});

test("pop passa do alvo no meio e volta ao assentar", () => {
  const meio = deltaAnimacao("pop", 0.5).escala;
  const fim = deltaAnimacao("pop", 1).escala;
  assert.ok(meio > fim, "pop sem overshoot é só um cresce");
  assert.ok(Math.abs(fim - 1) < 1e-9);
});

test("desfoca só desfoca no começo", () => {
  assert.ok(deltaAnimacao("desfoca", 0).desfoque > 5);
  assert.equal(deltaAnimacao("desfoca", 1).desfoque, 0);
});

test("nomes antigos continuam válidos", () => {
  // slide → sobe, zoom → cresce, none → nenhuma
  assert.deepEqual(deltaAnimacao("slide", 0.4), deltaAnimacao("sobe", 0.4));
  assert.deepEqual(deltaAnimacao("zoom", 0.4), deltaAnimacao("cresce", 0.4));
  assert.deepEqual(deltaAnimacao("none", 0.4), deltaAnimacao("nenhuma", 0.4));
});

test("progresso fora do intervalo não estoura", () => {
  for (const p of [-5, 0, 1, 9]) {
    const d = deltaAnimacao("pop", p);
    assert.ok(d.opacidade >= 0 && d.opacidade <= 1);
    assert.ok(Number.isFinite(d.escala));
  }
});

test("duração: explícita vence, ausência cai no padrão, nenhuma zera", () => {
  assert.equal(duracaoAnimacao({ type: "sobe", durationInFrames: 30 }, 12), 30);
  assert.equal(duracaoAnimacao({ type: "sobe" }, 12), 12);
  assert.equal(duracaoAnimacao({ type: "nenhuma", durationInFrames: 30 }, 12), 0);
  assert.equal(duracaoAnimacao(undefined, 12), 0);
});
