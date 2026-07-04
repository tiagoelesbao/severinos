import type { Timeline, TimelineClip, ExtraClip, TransitionType } from "./timeline";
import { keywordsFrom } from "./prepare.ts";
import { resolveTransition } from "./fxRegistry.ts";

/**
 * Ponte edit_spec → editor (VEX-06): o plano da Fase A prescreve zooms,
 * transições, inserts e motion graphics em texto livre; este módulo (puro)
 * resolve cada momento contra a timeline real e PRÉ-PLOTA:
 *   - zooms  → Ken Burns no clipe ativo no momento;
 *   - transitions → transitionIn do clipe na virada;
 *   - inserts → placeholders rotulados na camada "Inserts (plano)";
 *   - motion_graphics → elementos de texto na camada "Motion (plano)".
 * Momento não-resolvível vira WARNING (aviso E1) — nunca quebra o load.
 * Aplicado APENAS no estado fresco (mesmo guard do sound design).
 */

export interface EditSpecInput {
  zooms?: unknown[];
  transitions?: unknown[];
  inserts?: unknown[];
  motion_graphics?: unknown[];
}

export interface ParsedMoment {
  kind: "range" | "point" | "cadence" | "none";
  startSec?: number;
  endSec?: number;
}

const num = (s: string) => parseFloat(s.replace(",", "."));

/**
 * Extrai o momento de um texto do edit_spec. Tolerante aos formatos reais:
 * "@ 4‑8s", "entre 20‑28s", "nos primeiros 3s", "@ 6s", "aos 12s".
 * "a cada 1,5‑2s" é CADÊNCIA global (não posicional) → kind "cadence".
 */
export function parseMoment(text: string): ParsedMoment {
  // Normaliza traços unicode (‑ – — ―) para '-'.
  const t = String(text || "").replace(/[‐-―]/g, "-").toLowerCase();
  if (/\ba cada\b/.test(t)) return { kind: "cadence" };

  const range = /(?:@|entre)\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*s/.exec(t);
  if (range) return { kind: "range", startSec: num(range[1]), endSec: num(range[2]) };

  const primeiros = /primeiros?\s*(\d+(?:[.,]\d+)?)\s*s/.exec(t);
  if (primeiros) return { kind: "range", startSec: 0, endSec: num(primeiros[1]) };

  const point = /(?:@|aos?)\s*(\d+(?:[.,]\d+)?)\s*s/.exec(t);
  if (point) return { kind: "point", startSec: num(point[1]) };

  return { kind: "none" };
}

/** Localizador de fala: keywords do texto → frame ABSOLUTO (ou null). */
export type SpeechFinder = (text: string) => number | null;

export interface SpeechWord {
  w: string;
  /** Frame ABSOLUTO na timeline (já mapeado por segmentos + startFrame). */
  absFrame: number;
}

// Termos de EDIÇÃO nos textos do plano ("whip transition", "slow-zoom") — não
// são fala; removidos antes do casamento para não poluir o score.
const EDIT_TERMS = new Set([
  "whip", "transition", "transicao", "zoom", "slow", "close", "fade", "wipe",
  "broll", "roll", "insert", "highlight", "elemento", "grafico", "motion",
  "corte", "rapido", "mostrar", "aparecer", "entra", "punch",
]);

/** Constrói um SpeechFinder sobre palavras da narração em frames absolutos. */
export function makeSpeechFinder(words: SpeechWord[], windowWords = 8): SpeechFinder {
  const norm = words.map((x) => x.w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""));
  return (text: string) => {
    const kws = keywordsFrom(text).filter((k) => !EDIT_TERMS.has(k));
    if (!kws.length || !words.length) return null;
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < norm.length; i++) {
      let s = 0;
      for (const kw of kws) {
        for (let x = i; x < Math.min(norm.length, i + windowWords); x++) {
          if (norm[x] === kw || (norm[x].length >= 4 && kw.length >= 4 && norm[x].slice(0, 4) === kw.slice(0, 4))) {
            s++;
            break;
          }
        }
      }
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    // Maioria das keywords de CONTEÚDO casadas (1 basta quando só há 1).
    const need = Math.max(1, Math.ceil(kws.length / 2));
    return bestScore >= need && best >= 0 ? words[best].absFrame : null;
  };
}

export interface ApplyResult {
  timeline: Timeline;
  applied: string[];
  warnings: string[];
}

const clipAt = (clips: TimelineClip[], frame: number): number => {
  for (let i = 0; i < clips.length; i++) {
    if (frame >= clips[i].startFrame && frame < clips[i].startFrame + clips[i].durationInFrames) return i;
  }
  return -1;
};

/** Mapeia o TransitionRenderer do fxRegistry para o TransitionType da timeline. */
export function transitionTypeFor(text: string): TransitionType {
  const r = resolveTransition(String(text || ""));
  return r === "slide" ? "slide" : r === "wipe" ? "zoom" : "dissolve";
}

const short = (s: string, n = 42) => {
  const t = String(s || "").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/**
 * Aplica o edit_spec do plano à timeline FRESCA. Puro (não muta a entrada);
 * `findSpeech` resolve referências de fala ("ao mostrar o playbook").
 */
export function applyEditSpec(
  timeline: Timeline,
  spec: EditSpecInput,
  findSpeech: SpeechFinder,
  fps: number,
): ApplyResult {
  const applied: string[] = [];
  const warnings: string[] = [];
  let videoTrack = timeline.videoTrack.map((c) => ({ ...c }));

  const resolveFrame = (text: string): { frame: number; endFrame?: number } | null => {
    const m = parseMoment(text);
    if (m.kind === "cadence") return null; // global — não é item posicional
    if (m.kind === "range") {
      return { frame: Math.round(m.startSec! * fps), endFrame: Math.round(m.endSec! * fps) };
    }
    if (m.kind === "point") return { frame: Math.round(m.startSec! * fps) };
    const f = findSpeech(text);
    return f == null ? null : { frame: f };
  };

  // ── Zooms → Ken Burns no clipe ativo ──────────────────────────────────────
  for (const raw of spec.zooms ?? []) {
    const text = String(raw ?? "");
    const at = resolveFrame(text);
    if (!at) {
      warnings.push(`zoom do plano não localizado: "${short(text)}"`);
      continue;
    }
    const mid = at.endFrame ? Math.round((at.frame + at.endFrame) / 2) : at.frame;
    const idx = clipAt(videoTrack, Math.max(0, mid));
    if (idx < 0) {
      warnings.push(`zoom fora da timeline: "${short(text)}"`);
      continue;
    }
    if (!videoTrack[idx].kenBurns) {
      videoTrack[idx] = { ...videoTrack[idx], kenBurns: 0.08 };
      applied.push(`zoom → clipe ${idx + 1} (${videoTrack[idx].role}): "${short(text)}"`);
    }
  }

  // ── Transições → transitionIn do clipe na virada ──────────────────────────
  for (const raw of spec.transitions ?? []) {
    const text = String(raw ?? "");
    const m = parseMoment(text);
    if (m.kind === "cadence") continue; // ritmo global: já é o corte seco default
    const at = resolveFrame(text);
    if (!at) {
      warnings.push(`transição do plano não localizada: "${short(text)}"`);
      continue;
    }
    // Clipe cuja ENTRADA está mais próxima do momento (nunca o 1º).
    let best = -1;
    let bestD = Math.round(fps * 2.5);
    for (let i = 1; i < videoTrack.length; i++) {
      const d = Math.abs(videoTrack[i].startFrame - at.frame);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) {
      warnings.push(`transição sem virada próxima: "${short(text)}"`);
      continue;
    }
    videoTrack[best] = {
      ...videoTrack[best],
      transitionIn: { type: transitionTypeFor(text), durationInFrames: 6 },
    };
    applied.push(`transição → entrada do clipe ${best + 1}: "${short(text)}"`);
  }

  // ── Inserts → placeholders na camada "Inserts (plano)" ────────────────────
  const insertClips: ExtraClip[] = [];
  (spec.inserts ?? []).forEach((raw, i) => {
    const text = String(raw ?? "");
    const at = resolveFrame(text);
    if (!at) {
      warnings.push(`insert do plano não localizado: "${short(text)}"`);
      return;
    }
    const dur = at.endFrame
      ? Math.max(Math.round(fps * 0.5), at.endFrame - at.frame)
      : Math.round(fps * 2);
    insertClips.push({
      id: `editspec-ins-${i}`,
      type: "media-video",
      label: `plano · ${short(text, 34)}`,
      startFrame: Math.max(0, at.frame),
      durationInFrames: dur,
      opacity: 1,
    });
  });

  // ── Motion graphics → elementos de texto na camada "Motion (plano)" ───────
  const motionClips: ExtraClip[] = [];
  (spec.motion_graphics ?? []).forEach((raw, i) => {
    const text = String(raw ?? "");
    // Barra de progresso já é nativa (ProgressBar) — não duplicar.
    if (/barra de progresso|progress bar/i.test(text)) return;
    const at = resolveFrame(text);
    if (!at) {
      warnings.push(`motion do plano não localizado: "${short(text)}"`);
      return;
    }
    motionClips.push({
      id: `editspec-mg-${i}`,
      type: "text",
      label: `plano · ${short(text, 34)}`,
      startFrame: Math.max(0, at.frame),
      durationInFrames: at.endFrame
        ? Math.max(Math.round(fps * 0.5), at.endFrame - at.frame)
        : Math.round(fps * 2.5),
      text: short(text, 30),
      fontSize: 44,
      color: "#FFFFFF",
      x: 50,
      y: 16,
      opacity: 0.9,
      animateIn: { type: "fade", durationInFrames: 6 },
    });
  });

  const extraLayers = [...(timeline.extraLayers ?? [])];
  if (insertClips.length) {
    extraLayers.push({ id: "L-editspec-inserts", kind: "video", name: "Inserts (plano)", clips: insertClips });
    applied.push(`${insertClips.length} insert(s) do plano plotados como placeholder`);
  }
  if (motionClips.length) {
    extraLayers.push({ id: "L-editspec-motion", kind: "video", name: "Motion (plano)", clips: motionClips });
    applied.push(`${motionClips.length} motion graphic(s) do plano plotados`);
  }

  return {
    timeline: { ...timeline, videoTrack, extraLayers },
    applied,
    warnings,
  };
}
