import { test } from "node:test";
import assert from "node:assert/strict";
import { captionsFromScript, activeCaption, captionWindow } from "./captions.ts";

test("captionsFromScript — gera 1 caption por palavra, timing crescente", () => {
  const caps = captionsFromScript("Olha isso aqui agora", 4000);
  assert.equal(caps.length, 4);
  assert.equal(caps[0].text, "Olha");
  assert.equal(caps[0].startMs, 0);
  // monotônico e cobre ~totalMs
  for (let i = 1; i < caps.length; i++) {
    assert.ok(caps[i].startMs >= caps[i - 1].startMs);
  }
  assert.ok(Math.abs(caps[caps.length - 1].endMs - 4000) <= 2);
});

test("captionsFromScript — vazio/zero não quebra", () => {
  assert.deepEqual(captionsFromScript("", 4000), []);
  assert.deepEqual(captionsFromScript("oi", 0), []);
});

test("activeCaption / captionWindow — janela ao redor da ativa", () => {
  const caps = captionsFromScript("um dois tres quatro cinco seis", 6000);
  const mid = caps[3].timestampMs!;
  const act = activeCaption(caps, mid);
  assert.ok(act);
  const { window, activeIndex } = captionWindow(caps, mid, 4);
  assert.ok(window.length > 0 && window.length <= 4);
  assert.ok(activeIndex >= 0 && activeIndex < window.length);
  assert.equal(window[activeIndex].text, act!.text);
});
