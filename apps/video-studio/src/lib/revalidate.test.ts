import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleSpokenScript, revalidate, applyRoteiroToPlano } from "./revalidate.ts";
import type { Timeline, TimelineClip } from "./timeline.ts";
import type { Transcript } from "./transcript.ts";

const w = (text: string) => ({ w: text, start: 0, end: 1 });
const clip = (file: string, role: TimelineClip["role"]): TimelineClip => ({
  file, absPath: "", role, durationSeconds: 1, durationInFrames: 30,
  nativeDurationInFrames: 30, playbackRate: 1, width: 1920, height: 1080,
  startFrame: 0, audioEnabled: role === "hook" || role === "cta",
});

const tl: Timeline = {
  fps: 30, width: 1080, height: 1920, durationInFrames: 90,
  videoTrack: [clip("hook.mp4", "hook"), clip("mid.mov", "skill"), clip("cta.mp4", "cta")],
  audioTrack: { file: "narr.ogg", absPath: "", durationSeconds: 3, durationInFrames: 90, startFrame: 30, windowFrames: 30 },
  captionTrack: [], meta: { client: "x", creative: "y", videoSeconds: 3, audioSeconds: 3, rhythmGapSeconds: null, gaps: [] },
};

const transcript: Transcript = {
  "hook.mp4": { words: ["Olha", "isso"].map(w) },
  "narr.ogg": { words: ["ativar", "skill", "agora"].map(w) },
  "cta.mp4": { words: ["comenta", "Claude"].map(w) },
};

test("assembleSpokenScript — monta hook → narração → cta na ordem", () => {
  assert.equal(assembleSpokenScript(transcript, tl), "Olha isso ativar skill agora comenta Claude");
});

test("revalidate — detecta divergência (plano fala de 'Shopify' não dito)", () => {
  const rev = revalidate(transcript, tl, "Olha isso ativar skill Shopify completo agora");
  assert.ok(rev.spokenScript.includes("ativar"));
  assert.ok(rev.inPlanNotSpoken.includes("shopify"));
  assert.ok(rev.congruencePct < 100);
  assert.equal(rev.diverged, true);
});

test("applyRoteiroToPlano — preserva o roteiro e adiciona a transcrição em seção própria", () => {
  const md = "# Plano\n\n## 📝 Roteiro\n\nroteiro intencionado\n\n## ✂️ Edição\n\nmanter\n";
  const out = applyRoteiroToPlano(md, "fala real gravada");
  assert.ok(out);
  // NÃO toca no roteiro on-brand (fonte da correção).
  assert.ok(out!.includes("roteiro intencionado"));
  // adiciona a fala numa seção de transcrição separada.
  assert.ok(out!.includes("Transcrição da gravação"));
  assert.ok(out!.includes("fala real gravada"));
  assert.ok(out!.includes("manter")); // resto preservado
});
