import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setClipTransitionTipo,
  setClipTransitionPeso,
  setClipCameraTipo,
  setClipCameraPeso,
  setClipKenBurns,
  setCameraEmTodos,
  addEfeito,
} from "./editorState.ts";
import { cameraTransform, framesDaTransicao } from "./fxCatalog.ts";
import type { Timeline, TimelineClip } from "./timeline.ts";

const clipe = (over: Partial<TimelineClip> = {}): TimelineClip => ({
  file: "a.png",
  absPath: "/a.png",
  role: "generation",
  durationSeconds: 5,
  durationInFrames: 150,
  nativeDurationInFrames: 150,
  playbackRate: 1,
  width: 1920,
  height: 1080,
  startFrame: 0,
  audioEnabled: false,
  ...over,
});

const tl = (clips: TimelineClip[]): Timeline =>
  ({
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 900,
    videoTrack: clips,
    meta: { gaps: [] },
  }) as unknown as Timeline;

test("trocar o tipo da transição faz a duração acompanhar o preset", () => {
  const t0 = tl([clipe(), clipe({ transitionIn: { type: "dissolve", durationInFrames: 12, peso: "medio" } })]);
  const t1 = setClipTransitionTipo(t0, 1, "whip-esq");
  assert.equal(t1.videoTrack[1].transitionIn!.type, "whip-esq");
  assert.equal(t1.videoTrack[1].transitionIn!.durationInFrames, framesDaTransicao("whip-esq", "medio"));
  // um whip com a duração do dissolve seria um whip lento — o pior dos dois
  assert.notEqual(t1.videoTrack[1].transitionIn!.durationInFrames, 12);
  assert.equal(t1.videoTrack[1].transitionIn!.peso, "medio", "o peso se preserva");
});

test("peso agressivo encurta a transição; calmo alonga", () => {
  const base = tl([clipe(), clipe({ transitionIn: { type: "dissolve", durationInFrames: 12 } })]);
  const forte = setClipTransitionPeso(base, 1, "agressivo").videoTrack[1].transitionIn!.durationInFrames;
  const calmo = setClipTransitionPeso(base, 1, "calmo").videoTrack[1].transitionIn!.durationInFrames;
  assert.ok(forte < 12 && calmo > 12, `forte=${forte} calmo=${calmo}`);
});

test("corte seco continua com zero frames em qualquer peso", () => {
  const t = setClipTransitionTipo(tl([clipe(), clipe()]), 1, "corte");
  assert.equal(t.videoTrack[1].transitionIn!.durationInFrames, 0);
  const p = setClipTransitionPeso(t, 1, "agressivo");
  assert.equal(p.videoTrack[1].transitionIn!.durationInFrames, 0);
});

test("gravar câmera apaga o kenBurns — uma fonte de verdade só", () => {
  const t0 = tl([clipe({ kenBurns: 0.06 })]);
  const t1 = setClipCameraTipo(t0, 0, "pan-dir");
  assert.equal(t1.videoTrack[0].camera!.tipo, "pan-dir");
  assert.equal(t1.videoTrack[0].kenBurns, undefined);
});

test("trocar o tipo herdando de kenBurns preserva o peso convertido", () => {
  const t1 = setClipCameraTipo(tl([clipe({ kenBurns: 0.02 })]), 0, "deriva");
  assert.equal(t1.videoTrack[0].camera!.peso, "calmo", "0.02 é movimento calmo");
});

test("mudar o peso descarta a intensidade herdada — senão o ajuste não faz nada", () => {
  // kenBurns 0.12 vira camera com `intensidade` calculada. Ao pedir "calmo",
  // essa intensidade não pode sobreviver, ou o clipe continua agressivo.
  const t1 = setClipCameraPeso(tl([clipe({ kenBurns: 0.12 })]), 0, "calmo");
  assert.equal(t1.videoTrack[0].camera!.intensidade, undefined);
  const amp = cameraTransform(t1.videoTrack[0].camera, 150, 150).scale - 1;
  assert.ok(amp < 0.05, `amplitude ainda alta: ${amp}`);
});

test("setClipKenBurns aceita negativo — o zoom-out era impossível pela UI", () => {
  const t = setClipKenBurns(tl([clipe()]), 0, -0.06);
  assert.equal(t.videoTrack[0].kenBurns, -0.06);
  // e o clamp continua valendo nas duas pontas
  assert.equal(setClipKenBurns(tl([clipe()]), 0, -9).videoTrack[0].kenBurns, -0.2);
  assert.equal(setClipKenBurns(tl([clipe()]), 0, 9).videoTrack[0].kenBurns, 0.2);
});

test("aplicar em todos com sentido alternado inverte a cada clipe", () => {
  const t = setCameraEmTodos(tl([clipe(), clipe(), clipe(), clipe()]), { tipo: "zoom-in", peso: "calmo" }, true);
  assert.deepEqual(t.videoTrack.map((c) => c.camera!.tipo), ["zoom-in", "zoom-out", "zoom-in", "zoom-out"]);
  // sem alternar, todos iguais
  const u = setCameraEmTodos(tl([clipe(), clipe()]), { tipo: "pan-dir" }, false);
  assert.deepEqual(u.videoTrack.map((c) => c.camera!.tipo), ["pan-dir", "pan-dir"]);
});

test("índice fora da faixa não quebra nem altera nada", () => {
  const t0 = tl([clipe()]);
  assert.deepEqual(setClipCameraTipo(t0, 7, "deriva"), t0);
  assert.deepEqual(setClipTransitionTipo(t0, -1, "glitch"), t0);
});

test("addEfeito monta a camada pronta — blend, opacidade e repetição", () => {
  const t0 = { ...tl([clipe()]), durationInFrames: 900 } as Timeline; // 30 s a 30 fps
  const t1 = addEfeito(t0, "particulas-lentas");
  const layer = t1.extraLayers![0];
  assert.equal(layer.kind, "video");
  // 30 s cobertos por um arquivo de 10 s = 3 clipes, sem sobra nem falta
  assert.equal(layer.clips.length, 3);
  assert.equal(layer.clips[0].startFrame, 0);
  assert.equal(layer.clips[2].startFrame, 600);
  assert.equal(layer.clips.at(-1)!.startFrame + layer.clips.at(-1)!.durationInFrames, 900);
  // o blend é o que faz o overlay aparecer: sem ele, só escurece
  assert.equal(layer.clips[0].blend, "screen");
  assert.ok(layer.clips[0].opacity! > 0 && layer.clips[0].opacity! < 0.6);
  assert.equal(layer.clips[0].volume, 0, "overlay não pode trazer áudio");
});

test("addEfeito respeita a janela pedida e não passa dela", () => {
  const t0 = { ...tl([clipe()]), durationInFrames: 900 } as Timeline;
  const t1 = addEfeito(t0, "vhs", 120, 400);
  const cl = t1.extraLayers![0].clips;
  assert.equal(cl[0].startFrame, 120);
  assert.equal(cl.at(-1)!.startFrame + cl.at(-1)!.durationInFrames, 400);
});

test("textura de papel usa soft-light — em screen ela só clareia", () => {
  const t = addEfeito({ ...tl([clipe()]), durationInFrames: 300 } as Timeline, "textura-de-papel");
  assert.equal(t.extraLayers![0].clips[0].blend, "soft-light");
});

test("cada efeito vira UMA camada — dá para desligar um sem mexer nos outros", () => {
  let t = { ...tl([clipe()]), durationInFrames: 300 } as Timeline;
  t = addEfeito(t, "nevoa");
  t = addEfeito(t, "riscos-de-pelicula");
  assert.equal(t.extraLayers!.length, 2);
  assert.deepEqual(t.extraLayers!.map((l) => l.name), ["Névoa", "Riscos de película"]);
});

test("efeito inexistente não altera a timeline", () => {
  const t0 = { ...tl([clipe()]), durationInFrames: 300 } as Timeline;
  assert.deepEqual(addEfeito(t0, "nao-existe" as never), t0);
});
