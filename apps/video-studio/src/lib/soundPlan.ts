import type { Timeline, TimelineClip, ExtraLayer, ExtraClip, ClipRole } from "./timeline";

/**
 * Ponte F4.3: converte o `sound_design` do plano (Fase A) em CAMADAS de áudio
 * pré-montadas no editor — SFX nos frames das batidas + trilha opcional. Puro e
 * testável; o I/O (listar a biblioteca) fica na rota /api/timeline.
 *
 * Mapeia a categoria do SFX (e o mood/gênero da trilha) para um arquivo da
 * biblioteca quando existir; senão, deixa um PLACEHOLDER rotulado (sem src) que
 * o usuário substitui arrastando um asset. Nunca inventa nome de faixa.
 */

export interface SfxCue {
  moment?: string;
  category?: string;
  intent?: string;
  intensity?: string;
}
export interface MusicPlan {
  recommended?: boolean;
  mood?: string;
  energy?: string;
  genre?: string;
  ducking?: boolean;
}
export interface SoundDesign {
  sfx?: SfxCue[];
  music?: MusicPlan;
  rationale?: string;
}

/** Asset da biblioteca (subconjunto do que /api/assets devolve). */
export interface LibraryAsset {
  name: string;
  url: string;
  kind: "audio" | "video" | "image";
}

const ROLES: ClipRole[] = ["hook", "skill", "reference", "generation", "result", "cta"];

/**
 * Resolve o frame de um `moment` textual do plano contra a timeline:
 *   "@3s" / "@ 3.5 s"  → segundos × fps
 *   "beat_n:2" / "beat 2" → startFrame do 2º clipe de vídeo
 *   contém um papel (hook/cta/…) → startFrame do 1º clipe daquele papel
 *   senão → 0 (início)
 */
export function momentToFrame(moment: string, fps: number, videoTrack: TimelineClip[]): number {
  const m = (moment || "").toLowerCase();
  const sec = /@\s*(\d+(?:[.,]\d+)?)\s*s/.exec(m);
  if (sec) return Math.max(0, Math.round(parseFloat(sec[1].replace(",", ".")) * fps));
  const beat = /beat[_\s]*n?\s*[:=]?\s*(\d+)/.exec(m);
  if (beat) {
    const idx = parseInt(beat[1], 10) - 1;
    if (videoTrack[idx]) return videoTrack[idx].startFrame;
  }
  for (const r of ROLES) {
    if (m.includes(r)) {
      const clip = videoTrack.find((c) => c.role === r);
      if (clip) return clip.startFrame;
    }
  }
  return 0;
}

/**
 * Re-timing F4.2: aproxima o frame de um SFX ao CORTE real mais próximo (início
 * de clipe) quando dentro de `windowFrames` — ajusta o plano ao que foi gravado.
 */
export function snapToCut(frame: number, videoTrack: TimelineClip[], windowFrames: number): number {
  let best = frame;
  let bestD = windowFrames;
  for (const c of videoTrack) {
    const d = Math.abs(c.startFrame - frame);
    if (d <= bestD) {
      bestD = d;
      best = c.startFrame;
    }
  }
  return best;
}

/** 1º asset de áudio cujo nome contenha algum dos termos (case-insensitive). */
export function pickAudio(library: LibraryAsset[], terms: (string | undefined)[]): LibraryAsset | null {
  const needles = terms.map((t) => (t || "").trim().toLowerCase()).filter(Boolean);
  if (!needles.length) return null;
  return (
    library.find((a) => a.kind === "audio" && needles.some((n) => a.name.toLowerCase().includes(n))) ?? null
  );
}

/**
 * Heurística F4 (fallback): quando o plano não traz SFX, deriva cues dos CORTES
 * reais do vídeo — impact no hook + whoosh/transição em cada virada de clipe.
 * Garante que todo criativo abra com uma camada de SFX nos momentos certos.
 */
export function deriveSfxFromTimeline(timeline: Timeline): SfxCue[] {
  const cuts = timeline.videoTrack;
  if (!cuts.length) return [];
  // Intensidades conservadoras: a geração automática NÃO deve estourar a fala.
  const cues: SfxCue[] = [{ moment: "hook", category: "impact", intensity: "medium" }];
  for (let i = 1; i < cuts.length; i++) {
    cues.push({
      moment: `beat_n:${i + 1}`,
      category: i % 2 === 0 ? "whoosh" : "transition",
      intensity: "subtle",
    });
  }
  return cues;
}

// Volumes contidos (0..1): SFX sentam SOB a narração, sem estourar.
const VOL_BY_INTENSITY: Record<string, number> = { subtle: 0.3, medium: 0.45, strong: 0.6 };

/**
 * Monta as camadas de áudio pré-planejadas (SFX + trilha) a partir do
 * sound_design. Clipes sem match na biblioteca ficam SEM src (placeholder).
 */
export function buildSoundLayers(
  sd: SoundDesign | undefined,
  timeline: Timeline,
  library: LibraryAsset[],
  sfxLayerName = "SFX (plano)",
): ExtraLayer[] {
  if (!sd) return [];
  const fps = timeline.fps;
  const layers: ExtraLayer[] = [];

  const sfx = sd.sfx ?? [];
  if (sfx.length) {
    const clips: ExtraClip[] = sfx.map((s, i) => {
      const cat = (s.category || "sfx").toLowerCase();
      const asset = pickAudio(library, [cat]);
      // F4.2: ancora no momento planejado e re-tima ao corte real mais próximo.
      const raw = momentToFrame(s.moment ?? "", fps, timeline.videoTrack);
      const startFrame = snapToCut(raw, timeline.videoTrack, Math.round(fps * 0.4));
      return {
        id: `sfx-plan-${i}`,
        type: "media-audio",
        src: asset?.url,
        label: `${cat}${s.moment ? ` · ${s.moment}` : ""}`,
        startFrame,
        durationInFrames: Math.max(6, Math.round(fps * 0.6)),
        volume: VOL_BY_INTENSITY[s.intensity ?? "medium"] ?? 0.75,
      };
    });
    layers.push({ id: "L-sfx-plan", kind: "audio", name: sfxLayerName, clips });
  }

  const music = sd.music;
  if (music?.recommended) {
    const asset = pickAudio(library, [music.genre, music.mood]);
    layers.push({
      id: "L-music-plan",
      kind: "audio",
      name: "Trilha (plano)",
      clips: [{
        id: "music-plan-0",
        type: "media-audio",
        src: asset?.url,
        label: `trilha ${music.mood ?? ""}`.trim(),
        startFrame: 0,
        durationInFrames: timeline.durationInFrames,
        volume: music.ducking ? 0.2 : 0.45,
      }],
    });
  }

  return layers;
}
