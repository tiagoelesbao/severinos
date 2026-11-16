import type { Caption } from "@remotion/captions";

/**
 * Geração de legendas word-by-word (MVC-09). Duas vias:
 *  - whisper local (@remotion/install-whisper-cpp) → timing real por palavra
 *    [não usado nesta story: download/build pesado];
 *  - FALLBACK determinístico: distribui as palavras do roteiro pela duração da
 *    narração, ponderando pelo tamanho da palavra. Robusto, sem rede, testável.
 *
 * O risco-PO (whisper pode falhar no setup) é mitigado tratando este fallback
 * como caminho principal validável.
 */

/** Distribui as palavras do `script` ao longo de `totalMs` (timing estimado). */
export function captionsFromScript(script: string, totalMs: number): Caption[] {
  const words = (script || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length || totalMs <= 0) return [];

  // Peso por palavra: tamanho + 1 (palavras maiores ficam mais tempo na tela).
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1);
  const totalW = weights.reduce((a, b) => a + b, 0);

  const caps: Caption[] = [];
  let cursorMs = 0;
  for (let i = 0; i < words.length; i++) {
    const durMs = (weights[i] / totalW) * totalMs;
    const startMs = Math.round(cursorMs);
    const endMs = Math.round(cursorMs + durMs);
    caps.push({
      text: words[i],
      startMs,
      endMs,
      timestampMs: Math.round(startMs + durMs / 2),
      confidence: null,
    });
    cursorMs += durMs;
  }
  return caps;
}

/** Caption ativa em `ms` (ou null). */
export function activeCaption(captions: Caption[], ms: number): Caption | null {
  return captions.find((c) => ms >= c.startMs && ms < c.endMs) ?? null;
}

/** Janela de N palavras ao redor da ativa (para o estilo TikTok de frase curta). */
export function captionWindow(
  captions: Caption[],
  ms: number,
  size = 4,
): { window: Caption[]; activeIndex: number } {
  const idx = captions.findIndex((c) => ms >= c.startMs && ms < c.endMs);
  if (idx === -1) return { window: [], activeIndex: -1 };
  const start = Math.max(0, idx - Math.floor(size / 2));
  const window = captions.slice(start, start + size);
  return { window, activeIndex: idx - start };
}
