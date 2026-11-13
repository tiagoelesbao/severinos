import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cameraTransform,
  cameraDoKenBurns,
  framesDaTransicao,
  aplicarCurva,
  TRANSICOES,
  ANIMACOES,
  EFEITOS,
  CAMERAS,
  type CameraMove,
} from "./fxCatalog.ts";

test("catálogos não têm id duplicado", () => {
  for (const lista of [TRANSICOES, ANIMACOES, EFEITOS, CAMERAS] as ReadonlyArray<ReadonlyArray<{ id: string }>>) {
    const ids = lista.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test("parada e ausência devolvem o quadro intacto", () => {
  assert.deepEqual(cameraTransform(undefined, 10, 100), { scale: 1, x: 0, y: 0 });
  assert.deepEqual(cameraTransform({ tipo: "parada" }, 10, 100), { scale: 1, x: 0, y: 0 });
});

test("zoom-in cresce; zoom-out assenta — e NENHUM fica abaixo de 1", () => {
  const zin: CameraMove = { tipo: "zoom-in" };
  const zout: CameraMove = { tipo: "zoom-out" };
  const inIni = cameraTransform(zin, 0, 100).scale;
  const inFim = cameraTransform(zin, 100, 100).scale;
  assert.ok(inFim > inIni, "zoom-in tem que crescer");

  const outIni = cameraTransform(zout, 0, 100).scale;
  const outFim = cameraTransform(zout, 100, 100).scale;
  assert.ok(outFim < outIni, "zoom-out tem que assentar");

  // Sob escala 1 apareceria o fundo do palco atrás da mídia.
  for (const f of [0, 25, 50, 75, 100]) {
    for (const c of CAMERAS) {
      assert.ok(cameraTransform({ tipo: c.id }, f, 100).scale >= 1, `${c.id} @${f} abaixo de 1`);
    }
  }
});

test("peso muda a amplitude, não a direção", () => {
  const calmo = cameraTransform({ tipo: "zoom-in", peso: "calmo" }, 100, 100).scale - 1;
  const medio = cameraTransform({ tipo: "zoom-in", peso: "medio" }, 100, 100).scale - 1;
  const forte = cameraTransform({ tipo: "zoom-in", peso: "agressivo" }, 100, 100).scale - 1;
  assert.ok(calmo < medio && medio < forte);
  assert.ok(calmo > 0 && forte > 0);
});

test("pan tem folga de escala — senão a borda do quadro aparece", () => {
  for (const id of ["pan-esq", "pan-dir", "tilt-cima", "tilt-baixo"] as const) {
    const t = cameraTransform({ tipo: id }, 100, 100);
    assert.ok(t.scale > 1, `${id} sem folga de escala`);
    assert.ok(Math.abs(t.x) + Math.abs(t.y) > 0, `${id} não deslocou`);
  }
});

test("handheld treme sem deslocamento líquido e não deriva", () => {
  const amostras = Array.from({ length: 60 }, (_, f) => cameraTransform({ tipo: "handheld" }, f, 60));
  const mediaX = amostras.reduce((a, t) => a + t.x, 0) / amostras.length;
  assert.ok(Math.abs(mediaX) < 0.2, "handheld não pode derivar para um lado");
  assert.ok(amostras.some((t) => Math.abs(t.x) > 0.05), "handheld tem que tremer");
});

test("kenBurns legado preserva a amplitude exata", () => {
  for (const kb of [0.03, 0.05, 0.08, -0.05, -0.12]) {
    const mv = cameraDoKenBurns(kb)!;
    const ini = cameraTransform(mv, 0, 100).scale;
    const fim = cameraTransform(mv, 100, 100).scale;
    assert.ok(Math.abs(Math.abs(fim - ini) - Math.abs(kb)) < 1e-6,
      `kb=${kb} amplitude ${Math.abs(fim - ini)}`);
    // sinal preserva a direção
    if (kb > 0) assert.ok(fim > ini); else assert.ok(fim < ini);
  }
  assert.equal(cameraDoKenBurns(0), undefined);
  assert.equal(cameraDoKenBurns(undefined), undefined);
});

test("corte tem duração zero em qualquer peso; agressivo encurta", () => {
  for (const p of ["calmo", "medio", "agressivo"] as const) {
    assert.equal(framesDaTransicao("corte", p), 0);
  }
  const calmo = framesDaTransicao("dissolve", "calmo");
  const medio = framesDaTransicao("dissolve", "medio");
  const forte = framesDaTransicao("dissolve", "agressivo");
  assert.ok(calmo > medio && medio > forte);
  assert.ok(forte >= 1, "nunca zero fora do corte seco");
  // override manual vence o peso
  assert.equal(framesDaTransicao("dissolve", "agressivo", 30), 30);
});

test("curvas são monotônicas e ancoradas em 0 e 1", () => {
  for (const c of ["linear", "suave", "acelera", "desacelera"] as const) {
    assert.equal(aplicarCurva(0, c), 0);
    assert.equal(aplicarCurva(1, c), 1);
    let ant = -1;
    for (let i = 0; i <= 20; i++) {
      const v = aplicarCurva(i / 20, c);
      assert.ok(v >= ant, `${c} não é monotônica`);
      ant = v;
    }
    // fora do intervalo não estoura
    assert.equal(aplicarCurva(-3, c), 0);
    assert.equal(aplicarCurva(9, c), 1);
  }
});

test("todo efeito declara blend e opacidade utilizável", () => {
  for (const e of EFEITOS) {
    assert.ok(e.opacidade > 0 && e.opacidade <= 1, e.id);
    assert.notEqual(e.blend, undefined);
  }
});
