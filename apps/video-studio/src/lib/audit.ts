import type { Caption } from "@remotion/captions";
import type { Timeline } from "./timeline";
import type { Transcript } from "./transcript";
import { buildCues } from "./cues.ts";
import { momentToFrame, type SoundDesign } from "./soundPlan.ts";
import { coveredZoneAt, platformById } from "./safeZones.ts";

/**
 * Motor de auditoria (E1) — revalida o criativo para garantir qualidade na
 * entrega. Dois gates:
 *  - Gate A (congruência): o que foi GRAVADO bate com o PLANO? (divergências).
 *  - Gate B (pós-edição): legendas (ritmo de leitura, palavras suspeitas),
 *    edição (playbackRate extremo, clipes curtos, gaps).
 * Puro/serializável — vira `audit` na resposta da API e alimenta o painel.
 */

export type AuditSeverity = "info" | "aviso" | "erro";
export type AuditCategory = "congruencia" | "legenda" | "ritmo" | "edicao" | "som" | "composicao";

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  message: string;
  /** Ponto na timeline (ms) para "pular para". */
  atMs?: number;
  suggestion?: string;
}

export interface AuditReport {
  score: number; // 0–100
  findings: AuditFinding[];
  stats: { erro: number; aviso: number; info: number };
}

const STOP = new Set([
  "o", "a", "e", "de", "da", "do", "que", "um", "uma", "em", "no", "na", "para",
  "pra", "com", "os", "as", "se", "eu", "voce", "ja", "ao", "mais", "seu", "sua",
  "isso", "esse", "essa", "ela", "ele", "por", "mas", "ou", "como", "tudo", "the",
  "to", "of", "and", "ate", "aqui", "la", "vai", "ser", "tem", "foi", "sao", "dos",
  // números por extenso (o roteiro costuma usar dígitos) — evita falso-positivo
  "dois", "duas", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
]);

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Vocabulário normalizado do roteiro (plano). */
export function planVocab(script: string): Set<string> {
  return new Set((script || "").split(/\s+/).map(norm).filter(Boolean));
}

/** Algum token do vocabulário é "a mesma palavra" (prefixo 3+ ou contém)? */
function inVocabFuzzy(w: string, vocab: Set<string>): boolean {
  if (vocab.has(w)) return true;
  const p3 = w.slice(0, 3);
  for (const v of vocab) {
    if (v.length >= 3 && (v.slice(0, 3) === p3 || v.startsWith(w) || w.startsWith(v))) return true;
  }
  return false;
}

const MAX_SUSPECT = 8; // não floodar o painel

/** Gate B — legendas: ritmo de leitura + palavras possivelmente erradas. */
export function auditCaptions(captions: Caption[], vocab: Set<string>): AuditFinding[] {
  const out: AuditFinding[] = [];
  const cues = buildCues(captions);
  cues.forEach((cue, i) => {
    const chars = cue.words.reduce((n, w) => n + w.text.length + 1, 0);
    const sec = Math.max(0.1, (cue.endMs - cue.startMs) / 1000);
    const cps = chars / sec;
    if (cps > 24) {
      out.push({
        id: `rs-${i}`,
        category: "ritmo",
        severity: "aviso",
        message: `Legenda rápida demais (${cps.toFixed(0)} cps): "${cue.words.map((w) => w.text).join(" ")}"`,
        atMs: cue.startMs,
        suggestion: "Estender a duração ou dividir a cue (leitura confortável ≤ 20 cps).",
      });
    }
  });

  if (vocab.size) {
    let suspect = 0;
    for (let i = 0; i < captions.length && suspect < MAX_SUSPECT; i++) {
      const w = norm(captions[i].text);
      if (w.length >= 4 && !STOP.has(w) && !inVocabFuzzy(w, vocab)) {
        suspect++;
        out.push({
          id: `w-${i}`,
          category: "legenda",
          severity: "aviso",
          message: `Palavra possivelmente errada: "${captions[i].text}" (fora do roteiro)`,
          atMs: captions[i].startMs,
          suggestion: "Revisar no painel de legendas (clique na cue da faixa T).",
        });
      }
    }
  }
  return out;
}

/** Gate B — edição: velocidade extrema, clipes curtos, material ausente. */
export function auditEdit(timeline: Timeline): AuditFinding[] {
  const out: AuditFinding[] = [];
  const fps = timeline.fps;
  timeline.videoTrack.forEach((c, i) => {
    const atMs = (c.startFrame / fps) * 1000;
    if (c.gap) {
      out.push({
        id: `gap-${i}`,
        category: "edicao",
        severity: "erro",
        message: `Material ausente: ${c.file}`,
        atMs,
        suggestion: "Gravar/repor o clipe ou remover do plano.",
      });
      return;
    }
    if (c.playbackRate < 0.5 || c.playbackRate > 1.8) {
      out.push({
        id: `pb-${i}`,
        category: "edicao",
        severity: "aviso",
        message: `Insert "${c.role}" muito ${c.playbackRate < 1 ? "lento" : "acelerado"} (${c.playbackRate.toFixed(2)}×)`,
        atMs,
        suggestion: "Re-ancorar a janela da narração, dividir o trecho ou regravar mais material.",
      });
    }
    if (c.durationInFrames < fps * 0.8) {
      out.push({
        id: `sh-${i}`,
        category: "edicao",
        severity: "info",
        message: `Clipe "${c.role}" curto (${(c.durationInFrames / fps).toFixed(1)}s)`,
        atMs,
      });
    }
  });
  return out;
}

/** Gate A — congruência: % de palavras-conteúdo da gravação presentes no plano. */
export function auditCongruence(transcript: Transcript | null, vocab: Set<string>): AuditFinding[] {
  if (!transcript || !vocab.size) return [];
  const out: AuditFinding[] = [];
  for (const [file, entry] of Object.entries(transcript)) {
    const words = (entry?.words ?? [])
      .map((w) => norm(w.w))
      .filter((w) => w.length >= 4 && !STOP.has(w));
    if (!words.length) continue;
    const matched = words.filter((w) => inVocabFuzzy(w, vocab)).length;
    const pct = Math.round((matched / words.length) * 100);
    if (pct < 70) {
      out.push({
        id: `cong-${file}`,
        category: "congruencia",
        severity: pct < 50 ? "aviso" : "info",
        message: `Gravação "${file}" diverge do plano (${pct}% das palavras conferem)`,
        suggestion: "Readequar o roteiro do plano à fala real (ou regravar conforme o plano).",
      });
    }
  }
  return out;
}

/**
 * Gate A (som) — F4.2: reavalia o sound_design PLANEJADO contra a timeline
 * GRAVADA: densidade de SFX vs cortes reais, momentos ambíguos (ancorados no
 * início por falta de referência) e adequação da trilha à duração real.
 */
export function auditSoundDesign(sd: SoundDesign | null | undefined, timeline: Timeline): AuditFinding[] {
  if (!sd) return [];
  const out: AuditFinding[] = [];
  const fps = timeline.fps;
  const cuts = timeline.videoTrack.length;
  const videoSec = timeline.durationInFrames / fps;
  const sfx = sd.sfx ?? [];

  if (sfx.length > Math.max(2, cuts) * 1.5) {
    out.push({
      id: "sd-dense",
      category: "som",
      severity: "aviso",
      message: `Muitos SFX (${sfx.length}) para ${cuts} cortes reais — risco de poluição sonora`,
      suggestion: "Reduzir aos momentos de maior impacto (hook, reveals, CTA).",
    });
  } else if (sfx.length > 0 && cuts >= 4 && sfx.length < 2) {
    out.push({
      id: "sd-sparse",
      category: "som",
      severity: "info",
      message: `Poucos SFX (${sfx.length}) para ${cuts} cortes`,
      suggestion: "Considerar SFX em mais viradas para sustentar o ritmo.",
    });
  }

  sfx.forEach((s, i) => {
    const m = (s.moment || "").toLowerCase();
    const f = momentToFrame(s.moment ?? "", fps, timeline.videoTrack);
    const looksStart =
      m.includes("hook") || /@\s*0(?:[.,]0+)?\s*s/.test(m) || /beat[_\s]*n?\s*[:=]?\s*1\b/.test(m);
    if (s.moment && f === 0 && !looksStart) {
      out.push({
        id: `sd-amb-${i}`,
        category: "som",
        severity: "info",
        message: `SFX "${s.category}" sem momento claro ("${s.moment}") — ancorado no início`,
        atMs: 0,
        suggestion: "Arrastar o SFX para o corte certo na timeline.",
      });
    }
  });

  if (sd.music?.recommended && videoSec < 8) {
    out.push({
      id: "sd-music-short",
      category: "som",
      severity: "info",
      message: `Vídeo curto (${videoSec.toFixed(0)}s) com trilha — pode competir com a fala`,
      suggestion: "Manter ducking forte sob a narração (ou dispensar a trilha).",
    });
  }

  return out;
}

const WEIGHT: Record<AuditSeverity, number> = { erro: 15, aviso: 5, info: 1 };

/**
 * VEX-10: composição — elemento de texto/overlay cujo CENTRO cai sob a UI da
 * plataforma (safe-zones) gera aviso com sugestão de reposicionamento.
 */
export function auditComposition(timeline: Timeline, platformId = "instagram"): AuditFinding[] {
  const out: AuditFinding[] = [];
  const zones = platformById(platformId).zones;
  for (const layer of timeline.extraLayers ?? []) {
    for (const cl of layer.clips) {
      const type = cl.type ?? (layer.kind === "audio" ? "media-audio" : "media-video");
      if (type === "media-audio") continue;
      const cx = (cl.x ?? 50) / 100;
      const cy = (cl.y ?? 50) / 100;
      const zone = coveredZoneAt(cx, cy, zones);
      if (zone) {
        out.push({
          id: `comp-${layer.id}-${cl.id}`,
          category: "composicao",
          severity: "aviso",
          message: `"${cl.label}" está sob a UI da plataforma (${zone.label}).`,
          atMs: Math.round((cl.startFrame / timeline.fps) * 1000),
          suggestion: "Reposicione para a área segura (centro do vídeo) para não ficar coberto.",
        });
      }
    }
  }
  return out;
}

/** Auditoria completa (Gate A + B) + score de qualidade. */
export function buildAudit(
  timeline: Timeline,
  captions: Caption[],
  transcript: Transcript | null,
  planScript: string,
  soundDesign?: SoundDesign | null,
): AuditReport {
  const vocab = planVocab(planScript);
  const findings = [
    ...auditCongruence(transcript, vocab),
    ...auditCaptions(captions, vocab),
    ...auditEdit(timeline),
    ...auditSoundDesign(soundDesign, timeline),
    ...auditComposition(timeline),
  ];
  const stats = { erro: 0, aviso: 0, info: 0 };
  let penalty = 0;
  for (const f of findings) {
    stats[f.severity]++;
    penalty += WEIGHT[f.severity];
  }
  return { score: Math.max(0, 100 - penalty), findings, stats };
}
