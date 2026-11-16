import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRole,
  orderClips,
  buildTimeline,
  computeMioloWindows,
  applyTalkingHeadAutocut,
  normalizeText,
  type RawMaterial,
} from "./ingest.ts";

// ── classifyRole ────────────────────────────────────────────────────────────
test("classifyRole — mapeia os nomes reais do pipeline", () => {
  assert.equal(classifyRole("hook.mp4"), "hook");
  assert.equal(classifyRole("Skill_activate.mov"), "skill");
  assert.equal(classifyRole("Site_modeling.mov"), "reference");
  assert.equal(classifyRole("Site_gen.mov"), "generation");
  assert.equal(classifyRole("Site_resultado.mov"), "result");
  assert.equal(classifyRole("final do video.mp4"), "cta");
  assert.equal(classifyRole("algo_aleatorio.mp4"), "unknown");
});

test("classifyRole — 'resultado' vence 'final'/'gen' (ordem de checagem)", () => {
  // Site_resultado NÃO deve cair em cta nem generation.
  assert.equal(classifyRole("Site_resultado_final.mov"), "result");
});

// ── orderClips ──────────────────────────────────────────────────────────────
test("orderClips — embaralhado vira ordem canônica de montagem", () => {
  const shuffled = [
    { role: "cta" as const, file: "final.mp4" },
    { role: "hook" as const, file: "hook.mp4" },
    { role: "generation" as const, file: "gen.mov" },
    { role: "reference" as const, file: "ref.mov" },
    { role: "result" as const, file: "res.mov" },
    { role: "skill" as const, file: "skill.mov" },
  ];
  const ordered = orderClips(shuffled).map((c) => c.role);
  assert.deepEqual(ordered, ["hook", "skill", "reference", "generation", "result", "cta"]);
});

// ── buildTimeline ───────────────────────────────────────────────────────────
function mats(): RawMaterial[] {
  return [
    { file: "hook.mp4", absPath: "/x/hook.mp4", role: "hook", kind: "video" },
    { file: "Site_gen.mov", absPath: "/x/Site_gen.mov", role: "generation", kind: "video" },
    { file: "Skill_activate.mov", absPath: "/x/Skill_activate.mov", role: "skill", kind: "video" },
    { file: "audio_narrado.ogg", absPath: "/x/audio_narrado.ogg", role: "unknown", kind: "audio" },
  ];
}

const probeStub = (durations: Record<string, number>) => (abs: string) => {
  const name = abs.split("/").pop()!;
  if (!(name in durations)) throw new Error("not found");
  return { durationSeconds: durations[name], width: 1920, height: 1080 };
};

test("buildTimeline — sequencia por papel, durações reais e startFrames", () => {
  const tl = buildTimeline(mats(), {
    client: "tiago-elesbao",
    creative: "demo",
    probe: probeStub({
      "hook.mp4": 4, "Skill_activate.mov": 5, "Site_gen.mov": 10, "audio_narrado.ogg": 30,
    }),
  });
  // ordem: hook → skill → generation
  assert.deepEqual(tl.videoTrack.map((c) => c.role), ["hook", "skill", "generation"]);
  // startFrames sequenciais (30fps): 0, 120, 270
  assert.deepEqual(tl.videoTrack.map((c) => c.startFrame), [0, 120, 270]);
  assert.equal(tl.audioTrack?.file, "audio_narrado.ogg");
  assert.equal(tl.audioTrack?.durationSeconds, 30);
  // ritmo: narração 30 - visual 19 = 11
  assert.equal(tl.meta.rhythmGapSeconds, 11);
  assert.equal(tl.meta.gaps.length, 0);
});

test("buildTimeline — clip ausente vira GAP, sem quebrar (AC5)", () => {
  const tl = buildTimeline(mats(), {
    client: "x",
    creative: "demo",
    // Site_gen sem duração → probe lança → GAP
    probe: probeStub({ "hook.mp4": 4, "Skill_activate.mov": 5, "audio_narrado.ogg": 20 }),
  });
  const gapClip = tl.videoTrack.find((c) => c.file === "Site_gen.mov");
  assert.equal(gapClip?.gap, true);
  assert.ok(tl.meta.gaps.includes("Site_gen.mov"));
  // O timeline ainda é válido (não quebrou).
  assert.ok(tl.durationInFrames > 0);
});

test("buildTimeline — order override respeita a lista explícita", () => {
  const tl = buildTimeline(mats(), {
    client: "x",
    creative: "demo",
    order: ["Site_gen.mov", "hook.mp4", "Skill_activate.mov"],
    probe: probeStub({
      "hook.mp4": 4, "Skill_activate.mov": 5, "Site_gen.mov": 10, "audio_narrado.ogg": 30,
    }),
  });
  assert.deepEqual(tl.videoTrack.map((c) => c.file), [
    "Site_gen.mov", "hook.mp4", "Skill_activate.mov",
  ]);
});

// ── normalizeText ─────────────────────────────────────────────────────────────
test("normalizeText — minúsculo, sem acento, só [a-z0-9 ]", () => {
  assert.equal(normalizeText("Otimização!"), "otimizacao");
  assert.equal(normalizeText("É só ATIVAR, agora."), "e so ativar agora");
});

// ── computeMioloWindows ───────────────────────────────────────────────────────
test("computeMioloWindows — âncoras viram janelas contíguas cobrindo [0, dur]", () => {
  const words = [
    { w: "intro", start: 0, end: 0.5 },
    { w: "ativar", start: 1, end: 1.4 },
    { w: "montar", start: 5, end: 5.4 },
    { w: "olhada", start: 8, end: 8.4 },
  ];
  const wins = computeMioloWindows(
    words,
    [
      { clip: "skill.mov", anchor: "ativar" },
      { clip: "model.mov", anchor: "montar" },
      { clip: "result.mov", anchor: "olhada" },
    ],
    10,
  );
  assert.deepEqual(wins.map((w) => w.file), ["skill.mov", "model.mov", "result.mov"]);
  // 1ª janela ancorada em 0; contíguas; somam a duração da narração (10).
  assert.equal(wins[0].startSeconds, 0);
  assert.deepEqual(wins.map((w) => Number(w.windowSeconds.toFixed(2))), [5, 3, 2]);
});

test("computeMioloWindows — âncora multi-palavra ('esses dados') casa", () => {
  const words = [
    { w: "com", start: 2, end: 2.2 },
    { w: "esses", start: 2.2, end: 2.5 },
    { w: "dados,", start: 2.5, end: 2.9 },
  ];
  const wins = computeMioloWindows(words, [{ clip: "gen.mov", anchor: "esses dados" }], 5);
  // âncora única → 1ª clampada a 0, janela até o fim (5).
  assert.equal(wins[0].startSeconds, 0);
  assert.equal(Number(wins[0].windowSeconds.toFixed(2)), 5);
});

// ── buildTimeline narração-driven ─────────────────────────────────────────────
test("buildTimeline — insert ganha janela + playbackRate; talking-head fica nativo", () => {
  const tl = buildTimeline(mats(), {
    client: "x",
    creative: "demo",
    probe: probeStub({
      "hook.mp4": 4, "Skill_activate.mov": 4, "Site_gen.mov": 6, "audio_narrado.ogg": 30,
    }),
    mioloWindows: [
      { file: "Skill_activate.mov", startSeconds: 0, windowSeconds: 8 },
      { file: "Site_gen.mov", startSeconds: 8, windowSeconds: 12 },
    ],
  });
  const hook = tl.videoTrack.find((c) => c.role === "hook")!;
  const skill = tl.videoTrack.find((c) => c.role === "skill")!;
  const gen = tl.videoTrack.find((c) => c.role === "generation")!;
  // talking-head: nativo, sem alterar velocidade
  assert.equal(hook.playbackRate, 1);
  assert.equal(hook.durationInFrames, 120);
  // insert: ocupa a janela (8s=240f) e desacelera o nativo (4s=120f) → 0.5×
  assert.equal(skill.durationInFrames, 240);
  assert.equal(skill.nativeDurationInFrames, 120);
  assert.equal(skill.playbackRate, 0.5);
  // gen: janela 12s=360f, nativo 6s=180f → 0.5×
  assert.equal(gen.playbackRate, 0.5);
});

// ── applyTalkingHeadAutocut ───────────────────────────────────────────────────
test("applyTalkingHeadAutocut — apara trailing e reposiciona narração", () => {
  const base = buildTimeline(mats(), {
    client: "x",
    creative: "demo",
    probe: probeStub({
      "hook.mp4": 4, "Skill_activate.mov": 5, "Site_gen.mov": 10, "audio_narrado.ogg": 30,
    }),
  });
  // hook ocupa 0–120; narração começa em 120 (após o hook).
  assert.equal(base.audioTrack?.startFrame, 120);
  const cut = applyTalkingHeadAutocut(base, { "hook.mp4": 30 }); // -1s no hook
  const hook = cut.videoTrack.find((c) => c.role === "hook")!;
  assert.equal(hook.durationInFrames, 90); // 120 - 30
  // miolo e narração deslizam 30 frames para trás.
  assert.equal(cut.videoTrack.find((c) => c.role === "skill")!.startFrame, 90);
  assert.equal(cut.audioTrack?.startFrame, 90);
});
