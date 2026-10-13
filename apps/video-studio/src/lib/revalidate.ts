import type { Timeline } from "./timeline";
import type { Transcript } from "./transcript";

/**
 * Revalidação pós-gravação (E1) — auto-readequação do plano.
 *
 * Depois que o usuário GRAVA, o que foi dito vira a verdade. Esta lib monta o
 * roteiro REAL a partir da transcrição (já corrigida contra o plano atual) e o
 * compara ao roteiro do Plano — para sinalizar a divergência e PROPOR um roteiro
 * readequado (que o dono aplica). Fecha o loop que a auditoria só sinalizava.
 */

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Texto falado de um arquivo (reconstruído das palavras — reflete a correção). */
function fileText(transcript: Transcript, file: string): string {
  const words = transcript[file]?.words ?? [];
  return words
    .map((w) => w.w)
    .join(" ")
    .replace(/\s+([,.!?…])/g, "$1")
    .trim();
}

/**
 * Monta o roteiro falado na ORDEM da timeline: hook → narração (miolo) → cta.
 * É o roteiro real do criativo gravado.
 */
export function assembleSpokenScript(transcript: Transcript, timeline: Timeline): string {
  const order: string[] = [];
  const hook = timeline.videoTrack.find((c) => c.role === "hook");
  if (hook) order.push(hook.file);
  if (timeline.audioTrack) order.push(timeline.audioTrack.file);
  const cta = timeline.videoTrack.find((c) => c.role === "cta");
  if (cta) order.push(cta.file);
  return order.map((f) => fileText(transcript, f)).filter(Boolean).join(" ");
}

export interface Revalidation {
  spokenScript: string;
  currentRoteiro: string;
  /** % de palavras-conteúdo do roteiro atual presentes na fala. */
  congruencePct: number;
  /** Palavras do plano que NÃO foram ditas (candidatas a remover/ajustar). */
  inPlanNotSpoken: string[];
  /** Palavras ditas que NÃO estão no plano (candidatas a incorporar). */
  spokenNotInPlan: string[];
  diverged: boolean;
}

const STOP = new Set([
  "o", "a", "e", "de", "da", "do", "que", "um", "uma", "em", "no", "na", "para",
  "pra", "com", "os", "as", "se", "eu", "voce", "ja", "ao", "mais", "seu", "sua",
  "isso", "esse", "essa", "ela", "ele", "por", "mas", "ou", "como", "tudo", "ate",
]);

function contentTokens(s: string): string[] {
  return s.split(/\s+/).map(norm).filter((w) => w.length >= 4 && !STOP.has(w));
}

/** Compara o roteiro atual com a fala e propõe a readequação. */
export function revalidate(
  transcript: Transcript,
  timeline: Timeline,
  currentRoteiro: string,
): Revalidation {
  const spokenScript = assembleSpokenScript(transcript, timeline);
  const planTok = new Set(contentTokens(currentRoteiro));
  const spokenTok = new Set(contentTokens(spokenScript));

  const inPlanNotSpoken = [...planTok].filter((w) => !spokenTok.has(w));
  const spokenNotInPlan = [...spokenTok].filter((w) => !planTok.has(w));
  const matched = planTok.size - inPlanNotSpoken.length;
  const congruencePct = planTok.size ? Math.round((matched / planTok.size) * 100) : 100;

  return {
    spokenScript,
    currentRoteiro: currentRoteiro.trim(),
    congruencePct,
    inPlanNotSpoken,
    spokenNotInPlan,
    diverged: congruencePct < 85 || spokenNotInPlan.length > 0,
  };
}

/**
 * Registra a fala real numa seção "## 🎙️ Transcrição da gravação (referência)"
 * do Plano — SEM tocar no "## 📝 Roteiro" intencionado (que é a fonte da correção
 * de legendas). Atualiza a seção se existir; senão, anexa ao fim. Assim a
 * readequação não destrói o roteiro on-brand.
 */
export function applyRoteiroToPlano(planoMd: string, spokenScript: string): string | null {
  const heading = "## 🎙️ Transcrição da gravação (referência)";
  const body = `\n> Fala efetivamente gravada (Whisper). Referência — o roteiro on-brand acima é a fonte da legenda.\n\n${spokenScript.trim()}\n`;
  const re = /##\s*🎙️\s*Transcrição da gravação[^\n]*\n[\s\S]*?(?=\n##\s|$)/;
  if (re.test(planoMd)) {
    return planoMd.replace(re, `${heading}\n${body}`);
  }
  return `${planoMd.replace(/\s*$/, "")}\n\n${heading}\n${body}`;
}
