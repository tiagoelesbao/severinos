import { test } from "node:test";
import assert from "node:assert/strict";
import { momentToFrame, pickAudio, buildSoundLayers, snapToCut, deriveSfxFromTimeline, type LibraryAsset } from "./soundPlan.ts";
import type { Timeline, TimelineClip } from "./timeline.ts";

function clip(role: TimelineClip["role"], start: number, frames: number): TimelineClip {
  return {
    file: `${role}.mp4`, absPath: `/x/${role}.mp4`, role,
    durationSeconds: frames / 30, durationInFrames: frames, nativeDurationInFrames: frames,
    playbackRate: 1, width: 1080, height: 1920, startFrame: start, audioEnabled: false,
  };
}

function tl(): Timeline {
  return {
    fps: 30, width: 1080, height: 1920, durationInFrames: 300,
    videoTrack: [clip("hook", 0, 90), clip("skill", 90, 90), clip("cta", 180, 120)],
    audioTrack: null, captionTrack: [], extraLayers: [],
    meta: { client: "x", creative: "y", videoSeconds: 10, audioSeconds: 10, rhythmGapSeconds: 0, gaps: [] },
  };
}

test("momentToFrame — @Xs converte segundos em frames", () => {
  assert.equal(momentToFrame("riser @2s", 30, tl().videoTrack), 60);
  assert.equal(momentToFrame("@ 1.5 s", 30, tl().videoTrack), 45);
});

test("momentToFrame — beat_n e papel resolvem pelo startFrame do clipe", () => {
  const v = tl().videoTrack;
  assert.equal(momentToFrame("beat_n:2", 30, v), 90); // 2º clipe
  assert.equal(momentToFrame("no cta", 30, v), 180);  // clipe cta
  assert.equal(momentToFrame("hook reveal", 30, v), 0);
  assert.equal(momentToFrame("indefinido", 30, v), 0); // fallback
});

test("pickAudio — casa por substring do nome; null sem match", () => {
  const lib: LibraryAsset[] = [
    { name: "sfx/whoosh-01.mp3", url: "/library/sfx/whoosh-01.mp3", kind: "audio" },
    { name: "music/tense-loop.mp3", url: "/library/music/tense-loop.mp3", kind: "audio" },
  ];
  assert.equal(pickAudio(lib, ["whoosh"])?.url, "/library/sfx/whoosh-01.mp3");
  assert.equal(pickAudio(lib, ["tense", "lo-fi"])?.url, "/library/music/tense-loop.mp3");
  assert.equal(pickAudio(lib, ["impact"]), null);
});

test("buildSoundLayers — SFX nos frames + trilha; placeholder sem src quando não há match", () => {
  const sd = {
    sfx: [
      { moment: "hook", category: "whoosh", intensity: "strong" },
      { moment: "@2s", category: "impact" },
    ],
    music: { recommended: true, mood: "tense", energy: "high", genre: "lo-fi", ducking: true },
  };
  const lib: LibraryAsset[] = [{ name: "sfx/whoosh.mp3", url: "/library/sfx/whoosh.mp3", kind: "audio" }];
  const layers = buildSoundLayers(sd, tl(), lib);
  assert.equal(layers.length, 2); // SFX + trilha
  const sfxLayer = layers[0];
  assert.equal(sfxLayer.kind, "audio");
  assert.equal(sfxLayer.clips[0].src, "/library/sfx/whoosh.mp3"); // casou
  assert.equal(sfxLayer.clips[0].startFrame, 0); // hook
  assert.equal(sfxLayer.clips[0].volume, 0.6); // strong (contido)
  assert.equal(sfxLayer.clips[1].src, undefined); // impact sem match → placeholder
  assert.equal(sfxLayer.clips[1].startFrame, 60); // @2s
  const musicLayer = layers[1];
  assert.equal(musicLayer.clips[0].durationInFrames, 300); // cobre o vídeo
  // VEX-05: ducking virou envelope real — base 0.4 + flag (abaixa sob a fala).
  assert.equal(musicLayer.clips[0].volume, 0.4);
  assert.equal(musicLayer.clips[0].ducking, true);
  assert.equal(musicLayer.clips[0].src, undefined); // sem música na lib
});

test("snapToCut — aproxima do corte real dentro da janela; mantém fora dela", () => {
  const v = tl().videoTrack; // cortes em 0, 90, 180
  assert.equal(snapToCut(85, v, 12), 90); // 5 frames do corte 90 → snap
  assert.equal(snapToCut(60, v, 12), 60); // 30 do corte mais próximo → mantém
});

test("buildSoundLayers — SFX perto de um corte é re-timado (F4.2)", () => {
  const sd = { sfx: [{ moment: "@2.9s", category: "impact" }] }; // 87 frames → perto de 90
  const layers = buildSoundLayers(sd, tl(), []);
  assert.equal(layers[0].clips[0].startFrame, 90); // snap ao corte do 2º clipe
});

test("deriveSfxFromTimeline — impact no hook + SFX em cada corte interno", () => {
  const cues = deriveSfxFromTimeline(tl()); // 3 clipes
  assert.equal(cues.length, 3); // hook + 2 cortes internos
  assert.equal(cues[0].category, "impact");
  assert.equal(cues[0].moment, "hook");
  assert.equal(cues[1].moment, "beat_n:2");
  // ao montar, casa nos frames reais dos cortes (90, 180)
  const layers = buildSoundLayers({ sfx: cues }, tl(), [], "SFX (auto)");
  assert.equal(layers[0].name, "SFX (auto)");
  assert.deepEqual(layers[0].clips.map((c) => c.startFrame), [0, 90, 180]);
});

test("buildSoundLayers — sem sound_design ou vazio → nenhuma camada", () => {
  assert.equal(buildSoundLayers(undefined, tl(), []).length, 0);
  assert.equal(buildSoundLayers({ sfx: [], music: { recommended: false } }, tl(), []).length, 0);
});
