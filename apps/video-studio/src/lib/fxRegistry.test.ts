import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveHook,
  resolveCaption,
  resolveTransition,
  resolveMotion,
  resolvePreset,
  isRenderableNumber,
} from "./fxRegistry.ts";
import { loadVideoTemplates, allPresetIds } from "./videoTemplates.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .../apps/video-studio/src/lib → repo root (4 níveis acima).
const REPO = path.resolve(__dirname, "../../../..");

// ── resolvers ───────────────────────────────────────────────────────────────
test("resolveHook — mapeia ids de hook", () => {
  assert.equal(resolveHook("hook-face-snap"), "snap-zoom");
  assert.equal(resolveHook("hook-snap-zoom"), "snap-zoom");
  assert.equal(resolveHook("hook-number-hardcut"), "hard-cut");
  assert.equal(resolveHook("hook-curiosity-whip"), "whip");
  assert.equal(resolveHook("hook-direct-question"), "whip");
});

test("resolveMotion — number/progress/underline/lower-third", () => {
  assert.equal(resolveMotion("motion-big-number"), "big-number");
  assert.equal(resolveMotion("motion-progress-bar"), "progress-bar");
  assert.equal(resolveMotion("motion-amber-underline"), "underline");
  assert.equal(resolveMotion("motion-founder-lowerthird"), "lower-third");
});

// ── AC2: cobertura total dos presets dos 2 clientes ─────────────────────────
test("AC2 — todo preset do video-templates.yaml (tiago+virals) resolve", () => {
  for (const slug of ["tiago-elesbao", "virals"]) {
    const t = loadVideoTemplates(REPO, slug);
    assert.ok(t, `registry ausente para ${slug}`);
    const cats = [
      ["hook", t!.hook_packs],
      ["caption", t!.caption_styles],
      ["transition", t!.transition_packs],
      ["motion", t!.motion_presets],
    ] as const;
    for (const [cat, presets] of cats) {
      for (const p of presets) {
        const r = resolvePreset(cat, p.id);
        assert.ok(r && r.length > 0, `${slug}/${cat}/${p.id} não resolveu`);
      }
    }
    assert.ok(allPresetIds(t!).length >= 12, `${slug}: poucos presets`);
  }
});

// ── AC5: guard de número ─────────────────────────────────────────────────────
test("isRenderableNumber — só número real e não-vazio", () => {
  assert.equal(isRenderableNumber("150"), true);
  assert.equal(isRenderableNumber("1,2 mi"), true);
  assert.equal(isRenderableNumber(42), true);
  assert.equal(isRenderableNumber(""), false);
  assert.equal(isRenderableNumber(null), false);
  assert.equal(isRenderableNumber(undefined), false);
  assert.equal(isRenderableNumber("[A PREENCHER]"), false);
  assert.equal(isRenderableNumber("sem numero"), false);
});

void resolveCaption;
void resolveTransition;
