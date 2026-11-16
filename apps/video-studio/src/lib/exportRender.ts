import type { Timeline } from "./timeline";

/**
 * Export final (VEX-01): reescrita do timeline salvo/em edição para o render
 * headless. No Player os assets são servidos por URLs do app (`/api/media/...`,
 * `/library/...`); no `renderMedia` só existe o `publicDir` (staticFile). Este
 * módulo (puro/testável) converte cada referência de URL num path relativo de
 * staging e lista os assets a copiar. O I/O (staging físico) vive no worker.
 *
 * Layout do staging (== paths staticFile após a reescrita):
 *   <staging>/<arquivo>              ← Materiais Brutos (raiz, igual ao preview)
 *   <staging>/__assets__/<arquivo>   ← uploads (Studio Assets)
 *   <staging>/library/<rel>          ← public/library do app
 */

export type ExportAssetKind = "material" | "upload" | "library";

export interface ExportAssetRef {
  kind: ExportAssetKind;
  /** Path relativo dentro da pasta de origem (decodificado). */
  name: string;
}

/** Path relativo no staging (e no staticFile) para uma referência. */
export function stagedPathFor(ref: ExportAssetRef): string {
  if (ref.kind === "upload") return `__assets__/${ref.name}`;
  if (ref.kind === "library") return `library/${ref.name}`;
  return ref.name;
}

/**
 * Interpreta uma URL de mídia do app. Formatos aceitos (ver /api/assets):
 *   /library/<rel>
 *   /api/media/<client>/<creative>/__assets__/<file>
 *   /api/media/<client>/<creative>/<file>
 * URLs externas/desconhecidas → null (ficam intocadas no timeline).
 */
export function parseMediaUrl(
  src: string,
  client: string,
  creative: string,
): ExportAssetRef | null {
  if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src)) return null; // http:, data:, etc.

  if (src.startsWith("/library/")) {
    const rel = decodeURIComponent(src.slice("/library/".length));
    return rel ? { kind: "library", name: rel } : null;
  }

  const mediaPrefix = `/api/media/${client}/${creative}/`;
  if (src.startsWith(mediaPrefix)) {
    let rest = src.slice(mediaPrefix.length);
    let kind: ExportAssetKind = "material";
    if (rest.startsWith("__assets__/")) {
      kind = "upload";
      rest = rest.slice("__assets__/".length);
    }
    const name = decodeURIComponent(rest);
    return name ? { kind, name } : null;
  }

  return null;
}

export interface RewriteResult {
  timeline: Timeline;
  assets: ExportAssetRef[];
  /** Referências que não puderam ser interpretadas (ficaram como estavam). */
  unresolved: string[];
}

/**
 * Reescreve o timeline para o render headless: clips principais/narração viram
 * refs de material (ficam na raiz do staging, mesmo `file` do preview); clips
 * de camadas extras trocam `src` (URL do app) por `file` relativo ao staging.
 * Não muta o timeline de entrada.
 */
export function rewriteForRender(
  timeline: Timeline,
  client: string,
  creative: string,
): RewriteResult {
  const assets = new Map<string, ExportAssetRef>();
  const unresolved: string[] = [];
  const add = (ref: ExportAssetRef) => assets.set(`${ref.kind}:${ref.name}`, ref);

  for (const clip of timeline.videoTrack) {
    if (!clip.gap && clip.file) add({ kind: "material", name: clip.file });
  }
  const at = timeline.audioTrack;
  const audioGap = at ? timeline.meta.gaps.includes(at.file) : true;
  if (at && !audioGap) add({ kind: "material", name: at.file });

  const extraLayers = (timeline.extraLayers ?? []).map((layer) => ({
    ...layer,
    clips: layer.clips.map((clip) => {
      if (clip.src) {
        const ref = parseMediaUrl(clip.src, client, creative);
        if (!ref) {
          unresolved.push(clip.src);
          return clip;
        }
        add(ref);
        const { src: _src, ...rest } = clip;
        return { ...rest, file: stagedPathFor(ref) };
      }
      if (clip.file) {
        // Legado: `file` de camada extra é servido da pasta de materiais.
        add({ kind: "material", name: clip.file });
      }
      return clip;
    }),
  }));

  return {
    timeline: { ...timeline, extraLayers },
    assets: [...assets.values()],
    unresolved,
  };
}

/**
 * Remapeia referências de arquivo do timeline (pós-staging). Usado quando o
 * staging normaliza uma fonte (ex.: .mov VFR transcodificado para .mp4 CFR —
 * o compositor do Remotion falha com "No frame found" em screen captures VFR).
 * `map`: path staged antigo → novo. Não muta a entrada.
 */
export function remapFiles(timeline: Timeline, map: Record<string, string>): Timeline {
  if (!Object.keys(map).length) return timeline;
  const re = (f: string | undefined) => (f && map[f] ? map[f] : f);
  return {
    ...timeline,
    videoTrack: timeline.videoTrack.map((c) => ({ ...c, file: re(c.file)! })),
    audioTrack: timeline.audioTrack
      ? { ...timeline.audioTrack, file: re(timeline.audioTrack.file)! }
      : timeline.audioTrack,
    extraLayers: (timeline.extraLayers ?? []).map((L) => ({
      ...L,
      clips: L.clips.map((c) => (c.file ? { ...c, file: re(c.file) } : c)),
    })),
  };
}
