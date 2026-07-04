import type { Caption } from "@remotion/captions";

/**
 * Chunking de legendas em CUES estáveis (padrão Netflix/BBC adaptado a vídeo
 * vertical viral). Resolve o bug da "janela deslizante palavra-a-palavra" — que
 * interrompia orações cedo e repetia palavras no design seguinte. Aqui a cue é
 * um BLOCO (1–2 linhas) que entra e sai inteiro; o destaque "karaokê" anda só
 * DENTRO da cue, sem repetição entre frases.
 *
 * Regras (calibráveis por estilo):
 *  - máx. 2 linhas; quebra balanceada ≤ maxCharsPerLine (ajustado ao tamanho da
 *    fonte gigante do 9:16, não os 42 do Netflix para tela cheia);
 *  - fecha a cue em pontuação forte (. ! ?), em pausa longa (gap), ao exceder
 *    maxWords/maxChars, ou maxCueMs;
 *  - reading speed: estende a cue curta até a duração mínima legível.
 */

export interface CueWord {
  text: string;
  startMs: number;
  endMs: number;
}
export interface CaptionCue {
  startMs: number;
  endMs: number;
  /** Palavras por linha (1 ou 2 linhas) — para render + destaque por palavra. */
  lines: CueWord[][];
  /** Todas as palavras da cue, em ordem (para o índice ativo do karaokê). */
  words: CueWord[];
}

export interface CueOptions {
  maxCharsPerLine?: number;
  maxLines?: number;
  maxWords?: number;
  /** Pausa (ms) entre palavras que força nova cue. */
  maxGapMs?: number;
  /** Duração máx. de uma cue (ms). */
  maxCueMs?: number;
  /** Velocidade de leitura (chars/seg) p/ duração mínima. */
  cps?: number;
}

const DEFAULTS: Required<CueOptions> = {
  maxCharsPerLine: 18, // caixa-alta gigante no 9:16 (~1080px) — não os 42 da TV
  maxLines: 2,
  maxWords: 6,
  maxGapMs: 700,
  maxCueMs: 4000,
  cps: 16,
};

const STRONG_PUNCT = /[.!?…]$/;

/** Quebra as palavras em ≤ maxLines linhas ≤ maxCharsPerLine. null se não couber. */
export function wrapLines(
  words: CueWord[],
  maxCharsPerLine: number,
  maxLines: number,
): CueWord[][] | null {
  const lines: CueWord[][] = [];
  let line: CueWord[] = [];
  let len = 0;
  for (const w of words) {
    const add = (line.length ? 1 : 0) + w.text.length;
    if (len + add > maxCharsPerLine && line.length) {
      lines.push(line);
      line = [];
      len = 0;
      if (lines.length >= maxLines) return null;
    }
    line.push(w);
    len += line.length === 1 ? w.text.length : add;
  }
  if (line.length) lines.push(line);
  return lines.length <= maxLines ? lines : null;
}

/** Agrupa Caption[] (palavras) em cues estáveis. Puro/testável. */
export function buildCues(captions: Caption[], opts: CueOptions = {}): CaptionCue[] {
  const o = { ...DEFAULTS, ...opts };
  const words: CueWord[] = captions
    .map((c) => ({ text: c.text.trim(), startMs: c.startMs, endMs: c.endMs }))
    .filter((w) => w.text.length > 0);
  if (!words.length) return [];

  const cues: CaptionCue[] = [];
  let cur: CueWord[] = [];

  const flush = () => {
    if (!cur.length) return;
    const lines = wrapLines(cur, o.maxCharsPerLine, o.maxLines) ?? [cur];
    const startMs = cur[0].startMs;
    let endMs = cur[cur.length - 1].endMs;
    // Reading speed: garante duração mínima legível.
    const chars = cur.reduce((n, w) => n + w.text.length + 1, 0);
    const minMs = (chars / o.cps) * 1000;
    if (endMs - startMs < minMs) endMs = startMs + minMs;
    cues.push({ startMs, endMs, lines, words: [...cur] });
    cur = [];
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = cur[cur.length - 1];
    const gap = prev ? w.startMs - prev.endMs : 0;
    const wouldOverflowTime = cur.length && w.endMs - cur[0].startMs > o.maxCueMs;

    // Fecha ANTES de adicionar se: pausa longa, estouro de tempo, ou a adição
    // não cabe em 2 linhas / excede maxWords.
    if (cur.length) {
      const tentative = [...cur, w];
      const fits = wrapLines(tentative, o.maxCharsPerLine, o.maxLines) !== null;
      if (gap > o.maxGapMs || wouldOverflowTime || cur.length >= o.maxWords || !fits) {
        flush();
      }
    }

    cur.push(w);

    // Fecha DEPOIS em pontuação forte (fim de oração).
    if (STRONG_PUNCT.test(w.text)) flush();
  }
  flush();

  // Evita sobreposição entre cues consecutivas (clamp do end no próximo start).
  for (let i = 0; i < cues.length - 1; i++) {
    if (cues[i].endMs > cues[i + 1].startMs) cues[i].endMs = cues[i + 1].startMs;
  }
  return cues;
}

/**
 * Substitui o TEXTO de uma cue (intervalo [startMs,endMs)) por `newText`,
 * redistribuindo as palavras novas ao longo do span (peso por tamanho). Mantém
 * as legendas fora do intervalo. Edição manual do painel de legendas (F2).
 */
export function editCueText(
  captions: Caption[],
  startMs: number,
  endMs: number,
  newText: string,
): Caption[] {
  const outside = captions.filter((c) => c.endMs <= startMs || c.startMs >= endMs);
  const words = newText.trim().split(/\s+/).filter(Boolean);
  const span = Math.max(1, endMs - startMs);
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const next: Caption[] = [];
  let cursor = startMs;
  for (let i = 0; i < words.length; i++) {
    const dur = (weights[i] / total) * span;
    const s = Math.round(cursor);
    const e = Math.round(cursor + dur);
    next.push({ text: words[i], startMs: s, endMs: e, timestampMs: Math.round(s + dur / 2), confidence: null });
    cursor += dur;
  }
  return [...outside, ...next].sort((a, b) => a.startMs - b.startMs);
}

/**
 * Desloca no tempo (deltaMs) as legendas dentro de [startMs, endMs) — re-sincroniza
 * uma cue arrastando-a na timeline. Mantém o resto. Clampa em 0.
 */
export function shiftCaptions(
  captions: Caption[],
  startMs: number,
  endMs: number,
  deltaMs: number,
): Caption[] {
  return captions
    .map((c) => {
      if (c.startMs >= startMs && c.startMs < endMs) {
        const s = Math.max(0, c.startMs + deltaMs);
        const e = Math.max(s + 60, c.endMs + deltaMs);
        return { ...c, startMs: s, endMs: e, timestampMs: Math.round((s + e) / 2) };
      }
      return c;
    })
    .sort((a, b) => a.startMs - b.startMs);
}

/** Índice da cue ativa em `ms` (a última que já começou). -1 se nenhuma. */
export function activeCueIndex(cues: CaptionCue[], ms: number): number {
  let idx = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].startMs <= ms) idx = i;
    else break;
  }
  // Some se passou do fim da última cue por muito tempo (> 400ms).
  if (idx >= 0 && ms > cues[idx].endMs + 400) return -1;
  return idx;
}
