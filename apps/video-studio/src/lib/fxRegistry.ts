/**
 * Registry de FX (MVC-09): resolve cada ID de preset do video-templates.yaml
 * (MVC-06) para um renderer concreto. Heurística por categoria → SEMPRE devolve
 * um renderer válido (AC2: nenhum preset órfão), mesmo para IDs novos.
 */

export type HookRenderer = "snap-zoom" | "hard-cut" | "whip";
export type CaptionRenderer = "word-pop" | "mono-bold" | "underline" | "clean" | "gradient";
export type TransitionRenderer = "fade" | "slide" | "wipe";
export type MotionRenderer = "lower-third" | "progress-bar" | "big-number" | "underline";

export function resolveHook(id: string): HookRenderer {
  const n = id.toLowerCase();
  if (/snap|face|zoom/.test(n)) return "snap-zoom";
  if (/whip|curiosity|question|direct/.test(n)) return "whip";
  // hardcut, number, data, reveal, backstage, bigtext → corte seco
  return "hard-cut";
}

export function resolveCaption(id: string): CaptionRenderer {
  const n = id.toLowerCase();
  if (/gradient|knockout|togi/.test(n)) return "gradient";
  if (/underline|highlight|keyword/.test(n)) return "underline";
  if (/clean|minimal|plain/.test(n)) return "clean";
  if (/mono|bold/.test(n)) return "mono-bold";
  // pop, kinetic, stack, amber, coral → word-by-word com destaque
  return "word-pop";
}

export function resolveTransition(id: string): TransitionRenderer {
  const n = id.toLowerCase();
  if (/whip|push|slide|speed|ramp/.test(n)) return "slide";
  if (/glitch|zoom|punch|wipe/.test(n)) return "wipe";
  // cut-dry, cut → fade curto (corte limpo)
  return "fade";
}

export function resolveMotion(id: string): MotionRenderer {
  const n = id.toLowerCase();
  if (/progress|bar/.test(n)) return "progress-bar";
  if (/number|big|data/.test(n)) return "big-number";
  if (/underline/.test(n)) return "underline";
  // lowerthird, lower-third, founder, kinetic, headline → faixa inferior
  return "lower-third";
}

export type FxCategory = "hook" | "caption" | "transition" | "motion";

/** Resolve um id qualquer dada a categoria. Nunca devolve null (AC2). */
export function resolvePreset(category: FxCategory, id: string): string {
  switch (category) {
    case "hook":
      return resolveHook(id);
    case "caption":
      return resolveCaption(id);
    case "transition":
      return resolveTransition(id);
    case "motion":
      return resolveMotion(id);
  }
}

/**
 * Guard de fidelidade (AC5): um valor numérico só é exibível se for um número
 * REAL e não-vazio. Strings vazias, null, undefined ou placeholders não passam.
 * Espelha o princípio "preset de número só com dado real" do gate (MVC-04).
 */
export function isRenderableNumber(value: unknown): value is string | number {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (/^\[.*\]$/.test(s)) return false; // placeholder tipo [A PREENCHER]
  return /\d/.test(s); // precisa conter ao menos um dígito real
}
