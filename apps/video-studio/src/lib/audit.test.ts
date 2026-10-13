import { test } from "node:test";
import assert from "node:assert/strict";
import { planVocab, auditCaptions, auditEdit, auditSoundDesign, buildAudit } from "./audit.ts";
import type { Caption } from "@remotion/captions";
import type { Timeline, TimelineClip } from "./timeline.ts";

const cap = (text: string, startMs: number, endMs: number): Caption => ({
  text, startMs, endMs, timestampMs: Math.round((startMs + endMs) / 2), confidence: null,
});

test("planVocab — normaliza tokens do roteiro", () => {
  const v = planVocab("Olha o Brand Kit completo");
  assert.ok(v.has("brand") && v.has("completo"));
});

test("auditCaptions — flag de palavra fora do roteiro", () => {
  const vocab = planVocab("eu criei um site inteiro");
  const caps = [cap("criei", 0, 400), cap("guardanapo", 400, 900)];
  const out = auditCaptions(caps, vocab);
  assert.ok(out.some((f) => f.category === "legenda" && f.message.includes("guardanapo")));
});

test("auditCaptions — legendas bem espaçadas NÃO geram falso flag de ritmo", () => {
  // buildCues já garante duração mínima de leitura → sem aviso de ritmo.
  const caps = [cap("olha", 0, 600), cap("isso", 600, 1300), cap("agora", 1300, 2200)];
  const out = auditCaptions(caps, new Set());
  assert.ok(!out.some((f) => f.category === "ritmo"));
});

function clip(role: TimelineClip["role"], frames: number, playbackRate: number, start: number): TimelineClip {
  return {
    file: `${role}.mp4`, absPath: "", role, durationSeconds: frames / 30,
    durationInFrames: frames, nativeDurationInFrames: frames, playbackRate,
    width: 1920, height: 1080, startFrame: start, audioEnabled: false,
  };
}

test("auditEdit — flag de insert lento demais (playbackRate < 0.5)", () => {
  const tl = {
    fps: 30, width: 1080, height: 1920, durationInFrames: 600,
    videoTrack: [clip("reference", 600, 0.32, 0)],
    audioTrack: null, captionTrack: [],
    meta: { client: "x", creative: "y", videoSeconds: 20, audioSeconds: 0, rhythmGapSeconds: null, gaps: [] },
  } as Timeline;
  const out = auditEdit(tl);
  assert.ok(out.some((f) => f.category === "edicao" && f.message.includes("lento")));
});

function tl3(): Timeline {
  return {
    fps: 30, width: 1080, height: 1920, durationInFrames: 300,
    videoTrack: [clip("hook", 90, 1, 0), clip("skill", 90, 1, 90), clip("result", 60, 1, 180), clip("cta", 60, 1, 240)],
    audioTrack: null, captionTrack: [],
    meta: { client: "x", creative: "y", videoSeconds: 10, audioSeconds: 0, rhythmGapSeconds: null, gaps: [] },
  } as Timeline;
}

test("auditSoundDesign — sinaliza momento ambíguo (ancorado no início)", () => {
  const sd = { sfx: [{ moment: "no clímax", category: "impact" }] };
  const out = auditSoundDesign(sd, tl3());
  assert.ok(out.some((f) => f.category === "som" && f.message.includes("sem momento claro")));
});

test("auditSoundDesign — hook não é ambíguo; SFX em demasia gera aviso", () => {
  const many = { sfx: Array.from({ length: 9 }, () => ({ moment: "hook", category: "pop" })) };
  const out = auditSoundDesign(many, tl3()); // 4 cortes → 9 > 6
  assert.ok(out.some((f) => f.id === "sd-dense" && f.severity === "aviso"));
  assert.ok(!out.some((f) => f.id.startsWith("sd-amb"))); // hook resolve, sem ambiguidade
});

test("auditSoundDesign — sem sound_design → sem achados", () => {
  assert.equal(auditSoundDesign(null, tl3()).length, 0);
});

test("buildAudit — score cai com achados", () => {
  const tl = {
    fps: 30, width: 1080, height: 1920, durationInFrames: 600,
    videoTrack: [clip("reference", 600, 0.3, 0)],
    audioTrack: null, captionTrack: [],
    meta: { client: "x", creative: "y", videoSeconds: 20, audioSeconds: 0, rhythmGapSeconds: null, gaps: [] },
  } as Timeline;
  const report = buildAudit(tl, [], null, "site inteiro");
  assert.ok(report.score < 100);
  assert.ok(report.findings.length >= 1);
});
