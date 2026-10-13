import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

/**
 * Loader do video-templates.yaml por cliente (MVC-06) — espelha o
 * video_templates.py em TS. Alimenta o registry de FX (MVC-09): os IDs de
 * preset do registry viram componentes Remotion.
 */

export interface VideoTemplatePreset {
  id: string;
  label?: string;
  device?: string;
  style?: string;
  color?: string;
  type?: string;
  kind?: string;
  description?: string;
}

export interface VideoTemplates {
  hook_packs: VideoTemplatePreset[];
  caption_styles: VideoTemplatePreset[];
  transition_packs: VideoTemplatePreset[];
  motion_presets: VideoTemplatePreset[];
  scoring_match?: Record<string, Record<string, string[]>>;
}

export const CATEGORIES = [
  "hook_packs",
  "caption_styles",
  "transition_packs",
  "motion_presets",
] as const;

function registryPath(repoRoot: string, slug: string): string {
  return path.join(
    repoRoot,
    "squads/virals-marketing-squad/data/clients",
    slug,
    "video-templates.yaml",
  );
}

/** Carrega o registry do cliente; retorna null se ausente (degradação). */
export function loadVideoTemplates(repoRoot: string, slug = "virals"): VideoTemplates | null {
  const p = registryPath(repoRoot, slug);
  if (!fs.existsSync(p)) return null;
  const data = (parse(fs.readFileSync(p, "utf-8")) as Partial<VideoTemplates>) || {};
  return {
    hook_packs: data.hook_packs ?? [],
    caption_styles: data.caption_styles ?? [],
    transition_packs: data.transition_packs ?? [],
    motion_presets: data.motion_presets ?? [],
    scoring_match: data.scoring_match,
  };
}

/** Todos os IDs de preset do registry (para validar cobertura do FX registry). */
export function allPresetIds(t: VideoTemplates): string[] {
  return CATEGORIES.flatMap((c) => t[c].map((p) => p.id));
}
