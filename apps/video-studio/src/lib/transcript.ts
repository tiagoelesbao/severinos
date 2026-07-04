import fs from "node:fs";
import path from "node:path";
import type { Caption } from "@remotion/captions";
import type { AudioSegment, Timeline } from "./timeline";

/**
 * Legendas REAIS a partir da transcrição das próprias gravações (Whisper word
 * timestamps). Cada palavra falada — hook, narração do miolo e CTA — é colocada
 * no frame absoluto da timeline pelos offsets dos clips/áudio. Resultado:
 * legenda == o que é dito, no tempo exato (fidelidade máxima).
 *
 * Também deriva os silêncios da fala (gaps entre palavras) para o auto-cut.
 */

export interface TWord {
  w: string;
  start: number;
  end: number;
}
export interface TEntry {
  text?: string;
  words?: TWord[];
  duration?: number;
  error?: string;
}
export type Transcript = Record<string, TEntry>;

/**
 * Roteiro do `Plano-de-Criativo.md` (seção "## 📝 Roteiro") — a fonte de verdade
 * MANTIDA pelo dono, alinhada à gravação real. Preferida ao `content_plan.script`
 * do brief (que pode estar desatualizado). Vazio se ausente.
 */
export function loadRoteiroScript(creativeDir: string): string {
  try {
    const md = fs.readFileSync(path.join(creativeDir, "Plano-de-Criativo.md"), "utf-8");
    const m = md.match(/##\s*[^\n]*Roteiro[^\n]*\n([\s\S]*?)(?:\n##\s|$)/i);
    if (!m) return "";
    return m[1]
      .replace(/^>.*$/gm, "") // remove blockquotes
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

/** Carrega o transcript.json cacheado do criativo (ou null). */
export function loadTranscript(creativeDir: string): Transcript | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(creativeDir, "transcript.json"), "utf-8"),
    ) as Transcript;
  } catch {
    return null;
  }
}

/**
 * Monta as legendas word-by-word ancoradas na timeline. A narração toca a 1x
 * sobre o miolo (que foi dimensionado para a duração dela), então as palavras
 * caem no tempo real do áudio — sincronizadas com o que se ouve.
 */
export function buildRealCaptions(timeline: Timeline, transcript: Transcript): Caption[] {
  const { fps } = timeline;
  const caps: Caption[] = [];

  // `mapSrc` converte o tempo do arquivo no tempo de saída (identidade sem cut).
  const pushWords = (
    entry: TEntry | undefined,
    offsetSec: number,
    mapSrc: (s: number) => number = (s) => s,
  ) => {
    if (!entry?.words?.length) return;
    for (const wd of entry.words) {
      const text = wd.w.trim();
      if (!text) continue;
      const startMs = Math.round((offsetSec + mapSrc(wd.start)) * 1000);
      const endMs = Math.max(startMs + 80, Math.round((offsetSec + mapSrc(wd.end)) * 1000));
      caps.push({
        text,
        startMs,
        endMs,
        timestampMs: Math.round((startMs + endMs) / 2),
        confidence: null,
      });
    }
  };

  const hook = timeline.videoTrack.find((c) => c.role === "hook");
  if (hook) pushWords(transcript[hook.file], hook.startFrame / fps);

  const audio = timeline.audioTrack;
  if (audio) {
    pushWords(transcript[audio.file], audio.startFrame / fps, (s) =>
      mapViaSegments(s, audio.segments, fps),
    );
  }

  const cta = timeline.videoTrack.find((c) => c.role === "cta");
  if (cta) pushWords(transcript[cta.file], cta.startFrame / fps);

  caps.sort((a, b) => a.startMs - b.startMs);
  return caps;
}

// ── Correção de palavras via roteiro (alinhamento) ────────────────────────────

const normWord = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Distância de edição (Levenshtein) — para detectar erro de reconhecimento. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * "Mesma palavra mal reconhecida": igual, OU mesmo prefixo de 3+ letras, OU
 * Levenshtein pequeno relativo ao tamanho. Conservador — só troca quando é
 * claramente o mesmo termo (vírus↔virals, cloud↔claude), preservando o que foi
 * DITO quando a fala diverge do plano (fidelidade à gravação).
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 3 && a.slice(0, 3) === b.slice(0, 3)) return true;
  const tol = Math.max(1, Math.floor(minLen / 3) + 1);
  return levenshtein(a, b) <= tol;
}

export interface ScriptToken {
  orig: string;
  norm: string;
}

/** Tokeniza o roteiro preservando o caso/pontuação originais (orig) + normalizado. */
export function tokenizeScript(script: string): ScriptToken[] {
  return (script || "")
    .trim()
    .split(/\s+/)
    .map((t) => ({ orig: t, norm: normWord(t) }))
    .filter((t) => t.norm.length > 0);
}

/**
 * Corrige as PALAVRAS de um arquivo falado contra o roteiro, mantendo o TIMING
 * do Whisper. "Fitting alignment" (DP): a fala (curta) casa com uma janela
 * contígua do roteiro (longo) — flancos livres. Onde alinha (match/substituição)
 * usa a palavra do roteiro; palavra que o Whisper inventou (insert) é mantida;
 * palavra do roteiro sem áudio é mesclada na anterior (não perde texto).
 *
 * Fora de produção isso é o que garante "todas as palavras corretas" nas legendas.
 */
export function correctWordsToScript(words: TWord[], script: ScriptToken[]): TWord[] {
  if (!words.length || !script.length) return words;
  const A = words.map((w) => normWord(w.w));
  const B = script.map((t) => t.norm);
  const n = A.length;
  const m = B.length;
  const GAP = 1;

  // dp[i][j]: melhor custo alinhando A[0..i) consumido contra B até j (flanco
  // inicial livre em B → dp[0][j] = 0).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i * GAP;
  for (let j = 0; j <= m; j++) dp[0][j] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = dp[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1);
      const aIns = dp[i - 1][j] + GAP; // palavra do Whisper sem par no roteiro
      const bIns = dp[i][j - 1] + GAP; // palavra do roteiro sem par no áudio
      dp[i][j] = Math.min(sub, aIns, bIns);
    }
  }
  // Fim livre em B: menor dp[n][j]; em empate, o MAIOR j (alinha o máximo de
  // palavras — a guarda sameWord evita substituição indevida).
  let endJ = 0;
  for (let j = 1; j <= m; j++) if (dp[n][j] <= dp[n][endJ]) endJ = j;

  // Traceback.
  type Op = { a?: number; b?: number };
  const ops: Op[] = [];
  let i = n;
  let j = endJ;
  while (i > 0) {
    if (j > 0 && dp[i][j] === dp[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) {
      ops.push({ a: i - 1, b: j - 1 });
      i--;
      j--;
    } else if (dp[i][j] === dp[i - 1][j] + GAP) {
      ops.push({ a: i - 1 });
      i--;
    } else {
      ops.push({ b: j - 1 }); // B-only interno
      j--;
    }
  }
  ops.reverse();

  // Reconstrói corrigindo por TRECHO ancorado: uma palavra que casa (igual ou
  // claramente o mesmo termo) é âncora e mantém o roteiro. Entre duas âncoras, um
  // TRECHO divergente é substituído inteiro pela versão do roteiro (com o timing
  // do Whisper distribuído) — corrige "dei por recorde" → "tempo recorde". Trechos
  // nas pontas (sem âncora dos dois lados) ou sem palavras do roteiro são mantidos
  // como foram ditos (fidelidade / não injeta o plano fora de contexto).
  const out: TWord[] = [];
  let run: { aIdx: number[]; bIdx: number[] } = { aIdx: [], bIdx: [] };
  let leftAnchor = false;

  const weightOf = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1;

  const flushRun = (rightAnchor: boolean) => {
    if (!run.aIdx.length && !run.bIdx.length) return;
    if (leftAnchor && rightAnchor && run.bIdx.length && run.aIdx.length) {
      // trecho ancorado dos dois lados → usa o roteiro, distribui o timing.
      const start = words[run.aIdx[0]].start;
      const end = words[run.aIdx[run.aIdx.length - 1]].end;
      const span = Math.max(0.01, end - start);
      const planWords = run.bIdx.map((j) => script[j].orig);
      const weights = planWords.map((w) => weightOf(w));
      const total = weights.reduce((a, b) => a + b, 0) || 1;
      let cursor = start;
      for (let k = 0; k < planWords.length; k++) {
        const dur = (weights[k] / total) * span;
        out.push({ w: planWords[k], start: cursor, end: cursor + dur });
        cursor += dur;
      }
    } else {
      // ponta / sem roteiro → mantém o que foi dito.
      for (const ai of run.aIdx) out.push({ ...words[ai] });
    }
    run = { aIdx: [], bIdx: [] };
  };

  for (const op of ops) {
    const isAnchor =
      op.a !== undefined && op.b !== undefined && sameWord(A[op.a], B[op.b]);
    if (isAnchor) {
      flushRun(true);
      out.push({ w: script[op.b!].orig, start: words[op.a!].start, end: words[op.a!].end });
      leftAnchor = true;
    } else {
      if (op.a !== undefined) run.aIdx.push(op.a);
      if (op.b !== undefined) run.bIdx.push(op.b);
    }
  }
  flushRun(false);
  return out.length ? out : words;
}

/** Aplica a correção de roteiro a um transcript inteiro (cópia). */
export function correctTranscript(transcript: Transcript, script: ScriptToken[]): Transcript {
  if (!script.length) return transcript;
  const out: Transcript = {};
  for (const [file, entry] of Object.entries(transcript)) {
    out[file] = entry?.words?.length
      ? { ...entry, words: correctWordsToScript(entry.words, script) }
      : entry;
  }
  return out;
}

// ── Auto-cut de silêncios ─────────────────────────────────────────────────────

export interface SilenceSpan {
  /** Em segundos, relativo ao início do arquivo de mídia. */
  startSec: number;
  endSec: number;
}

/**
 * Detecta silêncios da fala num arquivo: gaps entre palavras maiores que
 * `minGapSec`, mais o respiro inicial (antes da 1ª palavra) e final (após a
 * última, até `duration`). Base do auto-cut "dinâmico" (remove dead air).
 */
export function detectSilences(
  entry: TEntry | undefined,
  opts: { minGapSec?: number; padSec?: number } = {},
): SilenceSpan[] {
  const minGap = opts.minGapSec ?? 0.5;
  const pad = opts.padSec ?? 0.08; // mantém um respiro mínimo nos cortes
  if (!entry?.words?.length) return [];
  const words = entry.words;
  const spans: SilenceSpan[] = [];

  // Respiro inicial.
  if (words[0].start > minGap) {
    spans.push({ startSec: 0, endSec: Math.max(0, words[0].start - pad) });
  }
  // Gaps internos.
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > minGap) {
      spans.push({
        startSec: words[i - 1].end + pad,
        endSec: words[i].start - pad,
      });
    }
  }
  // Respiro final.
  const last = words[words.length - 1];
  if (entry.duration && entry.duration - last.end > minGap) {
    spans.push({ startSec: last.end + pad, endSec: entry.duration });
  }

  return spans.filter((s) => s.endSec - s.startSec > 0.05);
}

/** Total de segundos removíveis por auto-cut num arquivo. */
export function silenceSeconds(spans: SilenceSpan[]): number {
  return Number(spans.reduce((s, x) => s + (x.endSec - x.startSec), 0).toFixed(2));
}

// ── Corte de fala (kept spans) + mapeamento tempo-fonte → tempo-saída ──────────

export interface KeptSpan {
  srcStart: number;
  srcEnd: number;
}
export interface SpeechCut {
  keptSpans: KeptSpan[];
  outDuration: number;
}

/**
 * Auto-cut "dinâmico" da narração: mantém os trechos de fala e remove os
 * respiros (gaps > maxGapSec), preservando um pad de respiro. Retorna os trechos
 * mantidos (em s, no arquivo) e a duração de saída. Pura/testável.
 */
export function computeSpeechCut(
  entry: TEntry | undefined,
  opts: { maxGapSec?: number; padSec?: number } = {},
): SpeechCut {
  const maxGap = opts.maxGapSec ?? 0.35; // gap acima disto vira CORTE
  const edge = opts.padSec ?? 0.08; // buffer anti-clip (slop do Whisper) — nunca corta na palavra
  const dur = entry?.duration ?? 0;
  const words = entry?.words ?? [];
  if (!words.length) {
    return { keptSpans: dur ? [{ srcStart: 0, srcEnd: dur }] : [], outDuration: dur };
  }

  // Agrupa palavras em SEGMENTOS: fecha um segmento quando o gap > maxGap.
  // O corte cai sempre na SILÊNCIO entre palavras; o `edge` mantém um respiro
  // mínimo nas bordas para não clipar o início/fim de uma palavra.
  const spans: KeptSpan[] = [];
  let startIdx = 0;
  for (let i = 1; i <= words.length; i++) {
    const isLast = i === words.length;
    const gap = isLast ? Infinity : words[i].start - words[i - 1].end;
    if (gap > maxGap || isLast) {
      const first = words[startIdx];
      const last = words[i - 1];
      // A borda só avança até METADE do gap → garante que não invade a palavra vizinha.
      const leadRoom = startIdx > 0 ? (first.start - words[startIdx - 1].end) / 2 : first.start;
      const trailRoom = isLast
        ? (dur ? dur - last.end : edge)
        : (words[i].start - last.end) / 2;
      const srcStart = Math.max(0, first.start - Math.min(edge, leadRoom));
      const srcEnd = last.end + Math.min(edge, trailRoom);
      spans.push({ srcStart, srcEnd: dur ? Math.min(dur, srcEnd) : srcEnd });
      startIdx = i;
    }
  }

  const keptSpans = spans.filter((s) => s.srcEnd - s.srcStart > 0.02);
  const outDuration = Number(
    keptSpans.reduce((a, s) => a + (s.srcEnd - s.srcStart), 0).toFixed(3),
  );
  return { keptSpans, outDuration };
}

/**
 * Trechos de FALA a partir dos silêncios reais (energia do áudio, ffmpeg).
 * Remove os silêncios ≥ `minSilenceSec`, mantendo um `padSec` de respiro nas
 * bordas (nunca clipa a palavra, pois o corte cai DENTRO do silêncio detectado).
 * Pura/testável.
 */
export function speechSpansFromSilences(
  silences: { start: number; end: number }[],
  durationSec: number,
  opts: { minSilenceSec?: number; padSec?: number } = {},
): SpeechCut {
  const minSil = opts.minSilenceSec ?? 0.35;
  const pad = opts.padSec ?? 0.07;
  const cuts = silences
    .filter((s) => s.end - s.start >= minSil)
    .sort((a, b) => a.start - b.start);
  if (!cuts.length) {
    return { keptSpans: durationSec ? [{ srcStart: 0, srcEnd: durationSec }] : [], outDuration: durationSec };
  }

  const spans: KeptSpan[] = [];
  let cursor = 0;
  for (const sil of cuts) {
    if (sil.start - cursor > 0.02) {
      const trail = Math.min(pad, (sil.end - sil.start) * 0.45);
      spans.push({ srcStart: Math.max(0, cursor - pad), srcEnd: Math.min(durationSec, sil.start + trail) });
    }
    cursor = sil.end;
  }
  if (durationSec - cursor > 0.02) spans.push({ srcStart: Math.max(0, cursor - pad), srcEnd: durationSec });

  // Resolve sobreposição entre spans (pad grande perto de silêncio curto).
  for (let i = 0; i < spans.length - 1; i++) {
    if (spans[i].srcEnd > spans[i + 1].srcStart) {
      const mid = (spans[i].srcEnd + spans[i + 1].srcStart) / 2;
      spans[i].srcEnd = mid;
      spans[i + 1].srcStart = mid;
    }
  }
  const keptSpans = spans.filter((s) => s.srcEnd - s.srcStart > 0.02);
  const outDuration = Number(keptSpans.reduce((a, s) => a + (s.srcEnd - s.srcStart), 0).toFixed(3));
  return { keptSpans, outDuration };
}

/** Converte kept spans (s) em segmentos de áudio (frames), posicionados em sequência. */
export function spansToSegments(spans: KeptSpan[], fps: number): AudioSegment[] {
  let cursor = 0;
  return spans.map((s) => {
    const durationInFrames = Math.max(1, Math.round((s.srcEnd - s.srcStart) * fps));
    const seg = {
      srcFromFrame: Math.round(s.srcStart * fps),
      durationInFrames,
      startFrame: cursor,
    };
    cursor += durationInFrames;
    return seg;
  });
}

/**
 * Mapeia um instante do ARQUIVO (s) para o instante de SAÍDA (s), seguindo os
 * segmentos consecutivos. Instante dentro de um silêncio removido encaixa na
 * fronteira do segmento mais próximo. Sem segmentos → identidade.
 */
export function mapViaSegments(srcSec: number, segments: AudioSegment[] | undefined, fps: number): number {
  if (!segments?.length) return srcSec;
  const srcFrame = srcSec * fps;
  let outFrames = 0;
  for (const seg of segments) {
    if (srcFrame < seg.srcFromFrame) return outFrames / fps;
    if (srcFrame <= seg.srcFromFrame + seg.durationInFrames) {
      return (outFrames + (srcFrame - seg.srcFromFrame)) / fps;
    }
    outFrames += seg.durationInFrames;
  }
  return outFrames / fps;
}
