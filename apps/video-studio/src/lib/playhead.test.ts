import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  setPlayheadFrame,
  getPlayheadFrame,
  subscribePlayhead,
} from "./playhead.ts";

test("store notifica só quando o valor muda", () => {
  let n = 0;
  const off = subscribePlayhead(() => n++);
  setPlayheadFrame(10);
  setPlayheadFrame(10); // repetido: não notifica
  setPlayheadFrame(11);
  off();
  setPlayheadFrame(12); // já desinscrito
  assert.equal(n, 2);
  assert.equal(getPlayheadFrame(), 12);
});

test("desinscrever um ouvinte não afeta os outros", () => {
  const vistos: string[] = [];
  const offA = subscribePlayhead(() => vistos.push("a"));
  const offB = subscribePlayhead(() => vistos.push("b"));
  setPlayheadFrame(100);
  offA();
  setPlayheadFrame(101);
  offB();
  assert.deepEqual(vistos, ["a", "b", "b"]);
});

/**
 * Teste de ARQUITETURA, e não de comportamento. A regressão que ele impede é a
 * mais fácil de cometer sem perceber: alguém precisa do frame na Timeline,
 * volta a passar `currentFrame` como prop, e a reprodução volta a remontar
 * filmstrip, waveform e uma célula por cue 30 vezes por segundo — sem que nada
 * quebre, só ficando lento de novo.
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

test("Timeline é memo e NÃO recebe o frame corrente como prop", () => {
  const t = src("components/Timeline.tsx");
  assert.ok(/export const Timeline = React\.memo\(/.test(t), "Timeline precisa ser memoizada");
  assert.ok(!/^\s*currentFrame[?]?:\s*number;/m.test(t), "currentFrame voltou a ser prop da Timeline");
});

test("a página do studio não guarda o frame em estado", () => {
  const p = src("app/studio/page.tsx");
  assert.ok(
    !/useState\([^)]*\)\s*;\s*$/m.test("") && !/const \[currentFrame, setCurrentFrame\]/.test(p),
    "currentFrame voltou a ser estado da página — a reprodução re-renderiza tudo de novo",
  );
  assert.ok(/setPlayheadFrame\(/.test(p), "a página precisa alimentar o store");
});

test("Filmstrip e Waveform são memoizados", () => {
  assert.ok(/export const Filmstrip = React\.memo\(/.test(src("components/Filmstrip.tsx")));
  assert.ok(/export const Waveform = React\.memo\(/.test(src("components/Waveform.tsx")));
});
