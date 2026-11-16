import { test } from "node:test";
import assert from "node:assert/strict";
import { PLATFORMS, platformById, coveredZoneAt, SAFE_CAPTION_BOTTOM } from "./safeZones.ts";

test("SAFE_CAPTION_BOTTOM deriva o antigo 430 a 1920px", () => {
  assert.equal(Math.round(SAFE_CAPTION_BOTTOM * 1920), 430);
});

test("platformById — resolve e faz fallback p/ Instagram", () => {
  assert.equal(platformById("tiktok").id, "tiktok");
  assert.equal(platformById(undefined).id, "instagram");
  assert.equal(platformById("xyz").id, "instagram");
});

test("coveredZoneAt — ponto sob os botões do IG é coberto", () => {
  const ig = platformById("instagram").zones;
  // centro do rail de ações (x~0.93, y~0.6)
  const z = coveredZoneAt(0.93, 0.6, ig);
  assert.ok(z);
  assert.equal(z!.id, "ig-actions");
});

test("coveredZoneAt — centro do vídeo é livre", () => {
  const ig = platformById("instagram").zones;
  assert.equal(coveredZoneAt(0.5, 0.5, ig), null);
});

test("coveredZoneAt — rodapé cai na legenda/nav", () => {
  const ig = platformById("instagram").zones;
  assert.ok(coveredZoneAt(0.3, 0.85, ig)); // zona de legenda
  assert.ok(coveredZoneAt(0.5, 0.97, ig)); // barra de navegação
});

test("todas as plataformas têm zonas dentro de [0,1]", () => {
  for (const p of PLATFORMS) {
    for (const z of p.zones) {
      assert.ok(z.x >= 0 && z.x + z.w <= 1.0001, `${p.id}/${z.id} x`);
      assert.ok(z.y >= 0 && z.y + z.h <= 1.0001, `${p.id}/${z.id} y`);
    }
  }
});
