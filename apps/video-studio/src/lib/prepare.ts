import { normalizeText } from "./ingest.ts";
import type { TranscriptWord } from "./ingest";

/**
 * Ponte automática Fase A→B (VEX-02): geração determinística do assembly
 * (âncoras narração→insert) a partir do transcript da narração + descritores
 * do plano (shotlist/storyboard) e dos nomes de arquivo. Puro e testável —
 * o I/O (whisper, leitura do brief, escrita do assembly.json) vive no script
 * `prepare-creative.ts`.
 *
 * Estratégia: cada insert recebe keywords (falas_chave do plano + tokens do
 * filename); a narração é varrida por janelas; um DP monotônico escolhe as
 * posições (ordem dos inserts = ordem na narração). A âncora emitida são as
 * PRÓPRIAS palavras do transcript naquela posição — o casamento pelo
 * `computeMioloWindows` é garantido por construção. Confiança por âncora;
 * sem sinal → partição uniforme com confiança 0 (aviso na auditoria).
 */

const STOP = new Set([
  "essa", "esse", "isso", "para", "pra", "com", "uma", "que", "voce", "vai",
  "aqui", "mais", "sua", "seu", "de", "da", "do", "em", "e", "a", "o", "na",
  "no", "um", "as", "os", "ela", "ele", "tudo", "como", "depois", "primeiro",
  "enquanto", "sobre", "the", "and", "video", "final", "mov", "mp4",
]);

/** Keywords normalizadas (≥4 chars, sem stopwords) de um texto livre. */
export function keywordsFrom(text: string): string[] {
  const out: string[] = [];
  for (const t of normalizeText(text).split(" ")) {
    if (t.length >= 4 && !STOP.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Tokens de um nome de arquivo (split em _ - . espaço e camelCase). */
export function filenameTokens(file: string): string[] {
  const base = file.replace(/\.[a-z0-9]+$/i, "");
  const spaced = base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ");
  return keywordsFrom(spaced);
}

export interface AnchorCandidate {
  file: string;
  /** Textos-pista (falas_chave/plano do plano + tokens do filename). */
  hints: string[];
}

export interface GeneratedAnchor {
  clip: string;
  anchor: string;
  /** 0..1 — fração das keywords do insert encontradas na janela escolhida. */
  confidence: number;
  wordIndex: number;
}

export interface GenerateResult {
  anchors: GeneratedAnchor[];
  method: "keywords" | "uniform";
}

/** Prefixo-4 tolerante: "escaneia"~"escanear", "playbook"~"playbook". */
function wordMatches(word: string, kw: string): boolean {
  if (word === kw) return true;
  if (word.length >= 4 && kw.length >= 4 && word.slice(0, 4) === kw.slice(0, 4)) return true;
  return false;
}

/**
 * Menor âncora (a partir de `pos`) cuja 1ª ocorrência na narração é `pos` —
 * garante que o `computeMioloWindows` (que casa a 1ª ocorrência) aponte para
 * a posição escolhida mesmo com frases repetidas.
 */
export function uniqueAnchorAt(words: TranscriptWord[], pos: number, maxLen = 5): string {
  const norm = words.map((w) => normalizeText(w.w));
  for (let len = 2; len <= maxLen; len++) {
    if (pos + len > words.length) break;
    const target = norm.slice(pos, pos + len);
    let first = -1;
    for (let i = 0; i + len <= norm.length; i++) {
      let ok = true;
      for (let k = 0; k < len; k++) {
        if (norm[i + k] !== target[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        first = i;
        break;
      }
    }
    if (first === pos) return words.slice(pos, pos + len).map((w) => w.w).join(" ");
  }
  // Ambíguo até maxLen → devolve 2 palavras (o fixup monotônico do
  // computeMioloWindows absorve o desvio).
  return words.slice(pos, Math.min(words.length, pos + 2)).map((w) => w.w).join(" ");
}

/**
 * Gera as âncoras narração→insert. `words` = transcript da narração;
 * `inserts` em ordem de montagem.
 */
export function generateMioloAnchors(
  words: TranscriptWord[],
  inserts: AnchorCandidate[],
  opts: { windowWords?: number; minGapWords?: number } = {},
): GenerateResult {
  const n = words.length;
  const k = inserts.length;
  if (!n || !k) return { anchors: [], method: "uniform" };

  const W = opts.windowWords ?? Math.max(8, Math.round(n / (k * 2)));
  const minGap = opts.minGapWords ?? 3;
  const norm = words.map((w) => normalizeText(w.w));
  const kws = inserts.map((ins) => {
    const set: string[] = [];
    for (const h of ins.hints) for (const kw of keywordsFrom(h)) if (!set.includes(kw)) set.push(kw);
    return set;
  });

  // score[j][i] = nº de keywords do insert j presentes na janela [i, i+W).
  const score = (j: number, i: number): number => {
    let s = 0;
    for (const kw of kws[j]) {
      for (let x = i; x < Math.min(n, i + W); x++) {
        if (wordMatches(norm[x], kw)) {
          s++;
          break;
        }
      }
    }
    return s;
  };

  // DP monotônico: posição de cada insert estritamente crescente (gap mínimo).
  const NEG = -1e9;
  const dp: number[][] = Array.from({ length: k }, () => new Array(n).fill(NEG));
  const prev: number[][] = Array.from({ length: k }, () => new Array(n).fill(-1));
  for (let i = 0; i < n; i++) dp[0][i] = score(0, i);
  for (let j = 1; j < k; j++) {
    let bestBefore = NEG;
    let bestIdx = -1;
    for (let i = 0; i < n; i++) {
      const cand = i - minGap;
      if (cand >= 0 && dp[j - 1][cand] > bestBefore) {
        bestBefore = dp[j - 1][cand];
        bestIdx = cand;
      }
      if (bestIdx >= 0) {
        dp[j][i] = bestBefore + score(j, i);
        prev[j][i] = bestIdx;
      }
    }
  }

  let end = 0;
  for (let i = 1; i < n; i++) if (dp[k - 1][i] > dp[k - 1][end]) end = i;
  const positions = new Array<number>(k);
  let cur = end;
  for (let j = k - 1; j >= 0; j--) {
    positions[j] = cur;
    cur = j > 0 ? prev[j][cur] : 0;
  }

  const totalScore = kws.reduce((acc, kwSet, j) => acc + (kwSet.length ? score(j, positions[j]) : 0), 0);
  if (totalScore === 0) {
    // Sem sinal → partição uniforme, confiança 0 (aviso na auditoria E1).
    const anchors = inserts.map((ins, j) => {
      const pos = Math.min(n - 1, Math.round((j * n) / k));
      return { clip: ins.file, anchor: uniqueAnchorAt(words, pos), confidence: 0, wordIndex: pos };
    });
    return { anchors, method: "uniform" };
  }

  const anchors = inserts.map((ins, j) => {
    const pos = positions[j];
    const hit = kws[j].length ? score(j, pos) / kws[j].length : 0;
    return {
      clip: ins.file,
      anchor: uniqueAnchorAt(words, pos),
      confidence: Number(hit.toFixed(2)),
      wordIndex: pos,
    };
  });
  return { anchors, method: "keywords" };
}

// ── Staleness do transcript (cache por tamanho+mtime) ────────────────────────

export interface FileStamp {
  size: number;
  mtimeMs: number;
}
export interface TranscriptMeta {
  files?: Record<string, FileStamp>;
}

/** Arquivos que precisam de (re)transcrição dado o _meta do transcript.json. */
export function staleFiles(
  current: Record<string, FileStamp>,
  meta: TranscriptMeta | undefined,
  transcribed: Set<string>,
): string[] {
  const stamped = meta?.files ?? {};
  const out: string[] = [];
  for (const [name, st] of Object.entries(current)) {
    const old = stamped[name];
    if (!transcribed.has(name) || !old || old.size !== st.size || old.mtimeMs !== st.mtimeMs) {
      out.push(name);
    }
  }
  return out;
}
