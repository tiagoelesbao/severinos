import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type {
  AudioSegment,
  ClipRole,
  Timeline,
  TimelineAudio,
  TimelineClip,
} from "./timeline";
import {
  computeSpeechCut,
  speechSpansFromSilences,
  mapViaSegments,
  spansToSegments,
} from "./transcript.ts";

/**
 * Ingestão (MVC-08 + redesign Fase B): lê o material bruto de um criativo e monta
 * um timeline JSON sequenciado para a composição Remotion.
 *
 * Modelo **narração-driven**: a narração do miolo é a espinha temporal. Cada
 * insert (screen capture) é ancorado ao trecho da fala que o descreve
 * (`assembly.json` + `transcript.json`) e tem sua duração esticada/comprimida
 * (`playbackRate`) para cobrir exatamente essa janela. Hook e CTA são
 * talking-heads com áudio próprio e duração nativa. Determinístico e testável:
 * a lógica pura (classificação/ordem/janelas/build) é separada do I/O.
 */

const FPS = 30;
const TARGET_W = 1080;
const TARGET_H = 1920;
const GAP_SECONDS = 2; // duração do placeholder quando um clip falta
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv"]);
const AUDIO_EXTS = new Set([".ogg", ".mp3", ".wav", ".m4a", ".aac"]);

// Ordem canônica de montagem (papel do clip no arco do criativo).
const ROLE_ORDER: ClipRole[] = [
  "hook",
  "skill",
  "reference",
  "generation",
  "result",
  "cta",
];

// Talking-heads tocam o PRÓPRIO áudio (fala do criador) e mantêm duração nativa;
// o resto é screen capture, mudo, coberto pela narração (modelo híbrido).
const TALKING_HEAD: ReadonlySet<ClipRole> = new Set<ClipRole>(["hook", "cta"]);

/** Classifica o papel do clip pelo nome do arquivo (padrão do pipeline). */
export function classifyRole(filename: string): ClipRole {
  const n = filename.toLowerCase();
  if (/\bhook\b|hook/.test(n)) return "hook";
  if (/skill|activate|ativa/.test(n)) return "skill";
  if (/modeling|reference|referenc|modelo/.test(n)) return "reference";
  if (/resultado|result/.test(n)) return "result"; // antes de "final"/"gen"
  if (/\bgen\b|gen\.|gera|generat/.test(n)) return "generation";
  if (/final|cta|fecho/.test(n)) return "cta";
  return "unknown";
}

/** Ordena clips pela ordem canônica de papéis; "unknown" vai para o fim, estável. */
export function orderClips<T extends { role: ClipRole; file: string }>(clips: T[]): T[] {
  const idx = (r: ClipRole) => {
    const i = ROLE_ORDER.indexOf(r);
    return i === -1 ? ROLE_ORDER.length : i;
  };
  return [...clips].sort((a, b) => idx(a.role) - idx(b.role) || a.file.localeCompare(b.file));
}

// ── Âncoras narração → insert ────────────────────────────────────────────────

/** Normaliza para casamento robusto: minúsculo, sem acento, só [a-z0-9 ]. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface TranscriptWord {
  w: string;
  start: number;
  end: number;
}

export interface MioloAnchor {
  clip: string;
  anchor: string;
}

export interface MioloWindow {
  file: string;
  startSeconds: number;
  windowSeconds: number;
}

/**
 * Para cada âncora, acha o instante (start, em s) da 1ª ocorrência do texto-âncora
 * na narração e define a janela do insert como [âncora_i, âncora_{i+1}]. A 1ª
 * janela é ancorada em 0 (cobre o respiro inicial); a última vai até o fim da
 * narração. Garante cobertura contígua de [0, narrationDuration]. Pura/testável.
 */
export function computeMioloWindows(
  words: TranscriptWord[],
  anchors: MioloAnchor[],
  narrationDuration: number,
): MioloWindow[] {
  if (!anchors.length) return [];
  const norm = words.map((x) => normalizeText(x.w));

  const findStart = (anchor: string): number => {
    const toks = normalizeText(anchor).split(" ").filter(Boolean);
    if (!toks.length) return NaN;
    for (let i = 0; i + toks.length <= norm.length; i++) {
      let ok = true;
      for (let k = 0; k < toks.length; k++) {
        const w = norm[i + k];
        if (w !== toks[k] && !w.startsWith(toks[k])) {
          ok = false;
          break;
        }
      }
      if (ok) return words[i].start;
    }
    return NaN;
  };

  const starts = anchors.map((a) => findStart(a.anchor));
  starts[0] = 0; // 1ª janela cobre desde o início da narração
  // Monotônico: âncora não encontrada ou fora de ordem herda a anterior.
  for (let i = 1; i < starts.length; i++) {
    if (Number.isNaN(starts[i]) || starts[i] < starts[i - 1]) starts[i] = starts[i - 1];
  }

  return anchors.map((a, i) => {
    const startSeconds = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : narrationDuration;
    return { file: a.clip, startSeconds, windowSeconds: Math.max(0.1, end - startSeconds) };
  });
}

interface ProbeResult {
  durationSeconds: number;
  width: number;
  height: number;
}

/** ffprobe de duração/dimensões (I/O). Lança se o ffprobe falhar. */
export function probeMedia(absPath: string): ProbeResult {
  const out = execFileSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration:stream=width,height",
      "-of", "json",
      absPath,
    ],
    // windowsHide: roda a cada load da timeline — sem console piscando.
    { encoding: "utf-8", windowsHide: true },
  );
  const data = JSON.parse(out) as {
    format?: { duration?: string };
    streams?: Array<{ width?: number; height?: number }>;
  };
  const durationSeconds = Number(data.format?.duration ?? 0);
  const vstream = (data.streams ?? []).find((s) => s.width && s.height) ?? {};
  return {
    durationSeconds,
    width: vstream.width ?? TARGET_W,
    height: vstream.height ?? TARGET_H,
  };
}

export interface SilenceInterval {
  start: number;
  end: number;
}

/**
 * Detecta silêncios pela ENERGIA do áudio (ffmpeg silencedetect) — preciso, não
 * depende dos timestamps do Whisper. Detecta pausas a partir de `minSilenceSec`
 * abaixo de `noiseDb`. Base do auto-cut "de verdade" (sem clipar palavra).
 */
export function detectSilenceIntervals(
  absPath: string,
  opts: { minSilenceSec?: number; noiseDb?: number } = {},
): SilenceInterval[] {
  const minSil = opts.minSilenceSec ?? 0.1;
  const noiseDb = opts.noiseDb ?? -30;
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", absPath, "-af", `silencedetect=noise=${noiseDb}dB:d=${minSil}`, "-f", "null", "-"],
    { encoding: "utf-8", windowsHide: true },
  );
  const out = `${r.stderr || ""}`;
  const intervals: SilenceInterval[] = [];
  let start: number | null = null;
  for (const line of out.split("\n")) {
    const ms = line.match(/silence_start:\s*(-?[\d.]+)/);
    const me = line.match(/silence_end:\s*(-?[\d.]+)/);
    if (ms) start = Math.max(0, parseFloat(ms[1]));
    else if (me && start != null) {
      intervals.push({ start, end: parseFloat(me[1]) });
      start = null;
    }
  }
  return intervals;
}

/** Carrega silences.json (cache) ou detecta+cacheia (todos os silêncios ≥ 0.1s). */
export function loadOrDetectSilences(creativeDir: string, narrAbsPath: string): SilenceInterval[] | null {
  const cachePath = path.join(creativeDir, "silences.json");
  const cached = readJsonSafe<SilenceInterval[]>(cachePath);
  if (cached?.length) return cached;
  try {
    const intervals = detectSilenceIntervals(narrAbsPath, { minSilenceSec: 0.1 });
    if (intervals.length) fs.writeFileSync(cachePath, JSON.stringify(intervals), "utf-8");
    return intervals;
  } catch {
    return null;
  }
}

export interface RawMaterial {
  file: string;
  absPath: string;
  role: ClipRole;
  kind: "video" | "audio";
}

/** Lista e classifica os arquivos de mídia da pasta de materiais (I/O). */
export function resolveMaterials(materialsDir: string): RawMaterial[] {
  const out: RawMaterial[] = [];
  for (const file of fs.readdirSync(materialsDir)) {
    const ext = path.extname(file).toLowerCase();
    const absPath = path.join(materialsDir, file);
    if (VIDEO_EXTS.has(ext)) {
      out.push({ file, absPath, role: classifyRole(file), kind: "video" });
    } else if (AUDIO_EXTS.has(ext)) {
      out.push({ file, absPath, role: "unknown", kind: "audio" });
    }
  }
  return out;
}

const toFrames = (seconds: number) => Math.max(1, Math.round(seconds * FPS));

/**
 * Constrói o timeline JSON a partir dos materiais resolvidos. Pura em relação
 * ao probe: recebe uma função `probe` injetável (testável sem ffprobe).
 *
 * `mioloWindows`: janelas narração-driven por arquivo (do `computeMioloWindows`).
 * Quando presente para um insert, o clip ocupa a janela e o `playbackRate`
 * ajusta o nativo. Ausente → duração nativa (modo legado, talking-heads).
 */
export function buildTimeline(
  materials: RawMaterial[],
  opts: {
    client: string;
    creative: string;
    probe?: (absPath: string) => ProbeResult;
    /** Override opcional da ordem de clips (ex.: assembly do video-brief). */
    order?: string[];
    /** Janelas narração-driven por arquivo de insert. */
    mioloWindows?: MioloWindow[];
    /** Segmentos de fala da narração (auto-cut de respiros). */
    narrationSegments?: AudioSegment[];
  },
): Timeline {
  const probe = opts.probe ?? probeMedia;
  const windowFor = new Map((opts.mioloWindows ?? []).map((w) => [w.file, w]));

  const videos = materials.filter((m) => m.kind === "video");
  const audio = materials.find((m) => m.kind === "audio") ?? null;

  // Ordem: override explícito (lista de nomes) OU ordem canônica de papéis.
  let ordered: RawMaterial[];
  if (opts.order && opts.order.length) {
    const byFile = new Map(videos.map((v) => [v.file, v]));
    ordered = opts.order
      .map((f) => byFile.get(f))
      .filter((v): v is RawMaterial => Boolean(v));
    for (const v of videos) if (!opts.order.includes(v.file)) ordered.push(v);
  } else {
    ordered = orderClips(videos);
  }

  const gaps: string[] = [];
  const videoTrack: TimelineClip[] = [];
  let cursor = 0;
  for (const m of ordered) {
    let durationSeconds = GAP_SECONDS;
    let width = TARGET_W;
    let height = TARGET_H;
    let gap = false;
    try {
      const p = probe(m.absPath);
      durationSeconds = p.durationSeconds || GAP_SECONDS;
      width = p.width;
      height = p.height;
    } catch {
      gap = true;
      gaps.push(m.file);
    }

    const nativeDurationInFrames = toFrames(durationSeconds);
    // Janela narração-driven (só para inserts do miolo, não talking-heads).
    const win = !TALKING_HEAD.has(m.role) ? windowFor.get(m.file) : undefined;
    const windowFrames = win ? toFrames(win.windowSeconds) : nativeDurationInFrames;
    const playbackRate = win
      ? Number((nativeDurationInFrames / windowFrames).toFixed(4))
      : 1;

    videoTrack.push({
      file: m.file,
      absPath: m.absPath,
      role: m.role,
      durationSeconds: Number((windowFrames / FPS).toFixed(2)),
      durationInFrames: windowFrames,
      nativeDurationInFrames,
      playbackRate,
      width,
      height,
      startFrame: cursor,
      audioEnabled: TALKING_HEAD.has(m.role),
      ...(gap ? { gap: true } : {}),
    });
    cursor += windowFrames;
  }

  // Janela da narração = trecho contínuo dos clips MUDOS (miolo). No modo
  // narração-driven esse trecho == duração da narração (as janelas somam a ela).
  const muted = videoTrack.filter((c) => !c.audioEnabled);
  const voiceStart = muted.length ? muted[0].startFrame : 0;
  const voiceEnd = muted.length
    ? muted[muted.length - 1].startFrame + muted[muted.length - 1].durationInFrames
    : cursor;
  const voiceWindow = Math.max(1, voiceEnd - voiceStart);

  let audioTrack: TimelineAudio | null = null;
  if (audio) {
    let durationSeconds = 0;
    try {
      durationSeconds = probe(audio.absPath).durationSeconds;
    } catch {
      gaps.push(audio.file);
    }
    audioTrack = {
      file: audio.file,
      absPath: audio.absPath,
      durationSeconds,
      durationInFrames: toFrames(durationSeconds || 1),
      startFrame: voiceStart,
      windowFrames: voiceWindow,
      ...(opts.narrationSegments?.length ? { segments: opts.narrationSegments } : {}),
    };
  }

  const videoSeconds = videoTrack.reduce((s, c) => s + c.durationSeconds, 0);
  const audioSeconds = audioTrack?.durationSeconds ?? 0;
  const rhythmGapSeconds =
    audioSeconds > 0 ? Number((audioSeconds - videoSeconds).toFixed(2)) : null;

  // Duração total = fim da faixa de vídeo (miolo já dimensionado pela narração)
  // OU fim efetivo da narração, o que for maior.
  const voiceEndFrame = audioTrack ? audioTrack.startFrame + audioTrack.windowFrames : 0;
  const durationInFrames = Math.max(cursor, voiceEndFrame, 1);

  return {
    fps: FPS,
    width: TARGET_W,
    height: TARGET_H,
    durationInFrames,
    videoTrack,
    audioTrack,
    captionTrack: [],
    meta: {
      client: opts.client,
      creative: opts.creative,
      videoSeconds: Number(videoSeconds.toFixed(2)),
      audioSeconds: Number(audioSeconds.toFixed(2)),
      rhythmGapSeconds,
      gaps,
    },
  };
}

/**
 * Auto-cut: apara o silêncio FINAL dos talking-heads (hook/cta) — o dead air
 * mais comum — encurtando a duração do clip e reposicionando narração/inserts.
 * `trailFramesByFile`: frames de silêncio a remover por arquivo. Recomputa
 * startFrames, a janela da narração e a duração total. Pura/testável.
 */
export function applyTalkingHeadAutocut(
  timeline: Timeline,
  trailFramesByFile: Record<string, number>,
): Timeline {
  let cursor = 0;
  const videoTrack: TimelineClip[] = timeline.videoTrack.map((c) => {
    const trim = TALKING_HEAD.has(c.role) ? (trailFramesByFile[c.file] ?? 0) : 0;
    const durationInFrames = Math.max(1, c.durationInFrames - Math.max(0, trim));
    const clip: TimelineClip = {
      ...c,
      durationInFrames,
      durationSeconds: Number((durationInFrames / timeline.fps).toFixed(2)),
      startFrame: cursor,
    };
    cursor += durationInFrames;
    return clip;
  });

  const muted = videoTrack.filter((c) => !c.audioEnabled);
  const voiceStart = muted.length ? muted[0].startFrame : 0;
  let audioTrack = timeline.audioTrack;
  if (audioTrack) audioTrack = { ...audioTrack, startFrame: voiceStart };

  const voiceEndFrame = audioTrack ? audioTrack.startFrame + audioTrack.windowFrames : 0;
  return {
    ...timeline,
    videoTrack,
    audioTrack,
    durationInFrames: Math.max(cursor, voiceEndFrame, 1),
  };
}

/** Resolve a pasta do criativo no repo. */
export function creativeDirFor(repoRoot: string, client: string, creative: string): string {
  return path.join(repoRoot, "outputs", client, "video-plans", creative);
}

/** Resolve a pasta de Materiais Brutos de um criativo no repo. */
export function materialsDirFor(repoRoot: string, client: string, creative: string): string {
  return path.join(creativeDirFor(repoRoot, client, creative), "Materiais Brutos");
}

/**
 * Pasta de assets ENVIADOS pelo usuário no Studio (uploads do media bin — N2),
 * separada dos Materiais Brutos para NÃO ser lida pela ingestão (não vira clipe
 * da espinha). Servida via /api/media/<client>/<creative>/__assets__/<file>.
 */
export function studioAssetsDirFor(repoRoot: string, client: string, creative: string): string {
  return path.join(creativeDirFor(repoRoot, client, creative), "Studio Assets");
}

function readJsonSafe<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

export interface AssemblyClip {
  file: string;
  role?: string;
  order?: number;
}

interface AssemblyFile {
  narrationFile?: string;
  mioloAnchors?: MioloAnchor[];
  /** VEX-06: papéis/ordem dirigidos pelo PLANO (fonte primária de montagem). */
  clips?: AssemblyClip[];
}
type TranscriptFile = Record<string, { words?: TranscriptWord[]; duration?: number }>;

/** VEX-11: constrói o clip de uma variante de hook (talking-head, sem stretch). */
function hookVariantClip(m: RawMaterial, probe: (p: string) => ProbeResult): TimelineClip {
  let durationSeconds = GAP_SECONDS, width = TARGET_W, height = TARGET_H, gap = false;
  try {
    const p = probe(m.absPath);
    durationSeconds = p.durationSeconds || GAP_SECONDS;
    width = p.width; height = p.height;
  } catch { gap = true; }
  const frames = toFrames(durationSeconds);
  return {
    file: m.file, absPath: m.absPath, role: "hook",
    durationSeconds: Number((frames / FPS).toFixed(2)), durationInFrames: frames,
    nativeDurationInFrames: frames, playbackRate: 1, width, height,
    startFrame: 0, audioEnabled: true, ...(gap ? { gap: true } : {}),
  };
}

/** Pipeline completo: resolve materiais → (assembly+transcript) → timeline. */
export function ingestCreative(
  repoRoot: string,
  client: string,
  creative: string,
  opts: {
    order?: string[];
    tightenNarration?: boolean;
    /** Agressividade do auto-cut: corta pausas acima disto (s). */
    maxGapSec?: number;
    padSec?: number;
    /** VEX-11: arquivo do hook ativo na espinha (default: 1º em ordem). */
    activeHook?: string;
  } = {},
): Timeline {
  const FPS_LOCAL = 30;
  const dir = creativeDirFor(repoRoot, client, creative);
  let materials = resolveMaterials(path.join(dir, "Materiais Brutos"));

  // Montagem narração-driven (se houver assembly + transcript cacheados).
  let mioloWindows: MioloWindow[] | undefined;
  let narrationSegments: AudioSegment[] | undefined;
  const assembly = readJsonSafe<AssemblyFile>(path.join(dir, "assembly.json"));
  const transcript = readJsonSafe<TranscriptFile>(path.join(dir, "transcript.json"));

  // VEX-06: papéis/ordem do PLANO (assembly.clips) têm precedência sobre a
  // heurística de filename; ordem explícita substitui a canônica de papéis.
  let assemblyOrder: string[] | undefined;
  if (assembly?.clips?.length) {
    const roleFor = new Map(assembly.clips.map((c) => [c.file, c.role]));
    materials = materials.map((m) =>
      roleFor.get(m.file) ? { ...m, role: roleFor.get(m.file)! as ClipRole } : m,
    );
    assemblyOrder = [...assembly.clips]
      .filter((c) => c.file)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => c.file);
  }
  if (assembly?.mioloAnchors?.length && transcript) {
    const narrName = assembly.narrationFile ?? "audio_narrado.ogg";
    const narr = transcript[narrName];
    if (narr?.words?.length) {
      const srcDur = narr.duration ?? narr.words[narr.words.length - 1].end;
      if (opts.tightenNarration) {
        // Auto-cut por ENERGIA do áudio (ffmpeg silencedetect) — corte preciso,
        // sem clipar palavra e sem deixar silêncio. Fallback: gaps do Whisper.
        const narrMat =
          materials.find((m) => m.file === narrName) ??
          materials.find((m) => m.kind === "audio");
        const silences = narrMat ? loadOrDetectSilences(dir, narrMat.absPath) : null;
        const cut = silences?.length
          ? speechSpansFromSilences(silences, srcDur, {
              minSilenceSec: opts.maxGapSec,
              padSec: opts.padSec,
            })
          : computeSpeechCut(narr, { maxGapSec: opts.maxGapSec, padSec: opts.padSec });
        narrationSegments = spansToSegments(cut.keptSpans, FPS_LOCAL);
        const mapped = narr.words.map((w) => ({
          w: w.w,
          start: mapViaSegments(w.start, narrationSegments, FPS_LOCAL),
          end: mapViaSegments(w.end, narrationSegments, FPS_LOCAL),
        }));
        mioloWindows = computeMioloWindows(mapped, assembly.mioloAnchors, cut.outDuration);
      } else {
        mioloWindows = computeMioloWindows(narr.words, assembly.mioloAnchors, srcDur);
      }
    }
  }

  // VEX-11: detecta variantes de hook (hook-1/2/3). Mantém só a ATIVA na espinha
  // (as demais viram `hookVariants`); assim o assembly narração-driven fica certo.
  const hookMats = materials.filter((m) => m.kind === "video" && m.role === "hook");
  const hookMatsSorted = [...hookMats].sort((a, b) => a.file.localeCompare(b.file));
  let activeHookFile: string | undefined;
  if (hookMatsSorted.length > 1) {
    activeHookFile = opts.activeHook && hookMatsSorted.some((m) => m.file === opts.activeHook)
      ? opts.activeHook
      : hookMatsSorted[0].file;
    materials = materials.filter((m) => m.role !== "hook" || m.file === activeHookFile);
  }

  const timeline = buildTimeline(materials, {
    client,
    creative,
    order: opts.order ?? assemblyOrder,
    mioloWindows,
    narrationSegments,
  });

  // Anexa as variantes de hook (clips; legendas por variante são preenchidas na
  // rota, onde o transcript está disponível). ≤1 hook → sem seletor A/B.
  if (hookMatsSorted.length > 1) {
    const activeClip = timeline.videoTrack.find((c) => c.role === "hook");
    const variants = hookMatsSorted.map((m, i) => ({
      file: m.file,
      label: `H${i + 1}`,
      clip: m.file === activeHookFile && activeClip ? activeClip : hookVariantClip(m, probeMedia),
    }));
    return {
      ...timeline,
      hookVariants: variants,
      activeHookVariant: Math.max(0, variants.findIndex((v) => v.file === activeHookFile)),
    };
  }

  return timeline;
}
