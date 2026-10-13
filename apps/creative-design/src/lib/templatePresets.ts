/**
 * templatePresets.ts — Templates como PRESETS DE CAMADAS (MED-DS-02).
 *
 * Cada template gera um conjunto de camadas editáveis (text/image/shape) +
 * um fundo com `mood` premium. Assim o Studio mostra o template real E permite
 * editar/reposicionar cada elemento individualmente. O export usa LayeredSlide
 * → WYSIWYG total.
 *
 * Camadas recebem `role` para que, ao TROCAR de template, o conteúdo
 * (headline/body/kicker/number...) seja recarregado no novo layout (calibração).
 */

import {
  type Layer, type TextLayer, type ShapeLayer, type SlideBackground,
  type LayerRole, type Mood,
  makeTextLayer, makeShapeLayer, makeImageLayer, CANVAS_W,
} from './layers';

export interface PresetContent {
  headline?: string;
  subHeadline?: string;
  bodyText?: string;
  number?: string;
  unitSuffix?: string;
  callToThink?: string;
  accentColor?: string;
  image?: string | null;
  /** Termo de busca Pexels do slide (MED-06): habilita o card de imagem. */
  pexelsQuery?: string;
}

export interface PresetPalette {
  primary: string; secondary: string; accent: string;
  accentAlt: string; accentAurora: string;
}

export interface PresetMeta {
  slideNumber: number;
  totalSlides: number;
  signature?: string;
}

export interface PresetResult {
  background: SlideBackground;
  layers: Layer[];
}

export const STUDIO_TEMPLATES: { id: string; label: string; mood: Mood }[] = [
  { id: 'carousel-slide', label: 'Editorial / Notícia', mood: 'editorial' },
  { id: 'tiago-step', label: 'Didático / Passos', mood: 'technical' },
  { id: 'tiago-data', label: 'Insight / Dado', mood: 'data' },
  { id: 'tiago-provocation', label: 'Provocação', mood: 'cinematic' },
  { id: 'quote-slide', label: 'Citação / Inspiracional', mood: 'cinematic' },
  { id: 'tiago-diary', label: 'Bastidor / Diário', mood: 'diary' },
  { id: 'single-post', label: 'Post único / Insight', mood: 'editorial' },
  { id: 'benchmark-derived', label: 'Dialog-box (tweet)', mood: 'editorial' },
];

const MARGIN = 90;
const CW = CANVAS_W - MARGIN * 2;

// Fábrica de texto com papel.
function txt(role: LayerRole, name: string, content: string, p: Partial<TextLayer>): Layer {
  return makeTextLayer({ role, name, content, ...p }) as Layer;
}
function shp(role: LayerRole, name: string, p: Partial<ShapeLayer>): Layer {
  return makeShapeLayer({ role, name, ...p }) as Layer;
}

function autoHeadline(text: string, hero = false): number {
  const len = (text || '').length;
  if (hero) return len < 25 ? 100 : len < 45 ? 80 : len < 70 ? 62 : 48;
  return len < 30 ? 64 : len < 55 ? 54 : len < 80 ? 46 : 38;
}
function autoBody(text: string): number {
  const len = (text || '').length;
  return len < 90 ? 32 : len < 190 ? 27 : len < 290 ? 23 : 20;
}
function autoNumber(text: string): number {
  const len = (text || '').length;
  return len <= 2 ? 340 : len === 3 ? 290 : len <= 5 ? 220 : len <= 7 ? 170 : 130;
}

const TRACK_W = 128;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Cabeçalho/rodapé compartilhado (fechamento do gap de qualidade): paginação
 * "NN / NN" + barra de progresso (topo-direita) e, opcionalmente, "DESLIZE →"
 * (rodapé-direita). Só aparece em carrosséis (totalSlides > 1). Retorna o
 * próximo zIndex livre.
 */
function pushHeaderFooter(
  layers: Layer[], m: PresetMeta, accent: string, zStart: number, withSwipe = true,
): number {
  let z = zStart;
  if (m.totalSlides <= 1) return z;
  layers.push(txt('pagination', 'Paginação', `${pad(m.slideNumber)} / ${pad(m.totalSlides)}`, {
    x: CANVAS_W - MARGIN - 300, y: 74, w: 300, h: 40, fontSize: 20, fontWeight: 800,
    color: '#FFFFFF', opacity: 0.5, align: 'right', letterSpacing: 6, zIndex: z++,
  }));
  layers.push(shp('progressTrack', 'Trilho de progresso', {
    x: CANVAS_W - MARGIN - TRACK_W, y: 124, w: TRACK_W, h: 4, kind: 'rect',
    fill: 'rgba(255,255,255,0.14)', radius: 2, zIndex: z++,
  }));
  layers.push(shp('progressFill', 'Progresso', {
    x: CANVAS_W - MARGIN - TRACK_W, y: 124,
    w: Math.max(6, Math.round(TRACK_W * (m.slideNumber / m.totalSlides))),
    h: 4, kind: 'rect', fill: accent, radius: 2, zIndex: z++,
  }));
  if (withSwipe) {
    layers.push(txt('swipe', 'Deslize', 'DESLIZE →', {
      x: CANVAS_W - MARGIN - 360, y: 1244, w: 360, h: 40, fontSize: 19, fontWeight: 900,
      color: '#FFFFFF', opacity: 0.42, align: 'right', uppercase: true, letterSpacing: 4, zIndex: z++,
    }));
  }
  return z;
}

// ── Presets ──────────────────────────────────────────────────────────────────

function editorial(c: PresetContent, pal: PresetPalette, m: PresetMeta): PresetResult {
  const accent = c.accentColor || pal.accent;
  const layers: Layer[] = [];
  let z = 1;
  // Card de imagem aparece se há imagem OU um termo Pexels (será buscado no load).
  const hasImg = !!c.image || !!c.pexelsQuery;

  // Numeral-fantasma (profundidade): atrás de tudo. COM imagem fica no rodapé
  // (peek através do painel glass do corpo); SEM imagem, no terço inferior.
  if (m.totalSlides > 1) {
    const g = hasImg
      ? { x: 560, y: 980, w: 620, h: 460, fontSize: 440 }
      : { x: 540, y: 720, w: 620, h: 640, fontSize: 600 };
    layers.push(txt('ghost', 'Índice (fantasma)', pad(m.slideNumber), {
      ...g, fontWeight: 900, color: '#FFFFFF', opacity: 0.05, align: 'right', zIndex: z++,
    }));
  }
  if (m.signature) {
    layers.push(txt('signature', 'Assinatura', m.signature, {
      x: MARGIN, y: 70, w: 600, h: 50, fontSize: 22, fontWeight: 900,
      color: accent, uppercase: true, letterSpacing: 4, zIndex: z++,
    }));
  }
  z = pushHeaderFooter(layers, m, accent, z);

  // Posições: COM imagem → pilha vertical (título topo · imagem meio · corpo
  // abaixo da imagem). SEM imagem → editorial clássico (headline no terço inf.).
  const L = hasImg
    ? { kickerY: 186, ruleY: 208, headlineY: 246, headlineH: 236, headlineHero: false,
        bodyPanelY: 1058, bodyBarY: 1074, bodyY: 1074, bodyH: 140 }
    : { kickerY: 590, ruleY: 612, headlineY: 660, headlineH: 340, headlineHero: true,
        bodyPanelY: 1004, bodyBarY: 1024, bodyY: 1024, bodyH: 160 };

  if (c.subHeadline) {
    layers.push(shp('divider', 'Régua kicker', {
      x: MARGIN, y: L.ruleY, w: 56, h: 4, kind: 'rect', fill: accent, radius: 4, glow: true, zIndex: z++,
    }));
    layers.push(txt('kicker', 'Kicker', c.subHeadline, {
      x: MARGIN + 72, y: L.kickerY, w: CW - 72, h: 48, fontSize: 22, fontWeight: 900,
      color: accent, uppercase: true, letterSpacing: 6, glow: true, zIndex: z++,
    }));
  }
  layers.push(txt('headline', 'Headline', c.headline || 'Título do slide', {
    x: MARGIN, y: L.headlineY, w: CW, h: L.headlineH,
    fontSize: autoHeadline(c.headline || '', L.headlineHero),
    fontWeight: 800, color: '#FFFFFF', uppercase: true, lineHeight: 0.98,
    letterSpacing: -1, shadow: true, zIndex: z++,
  }));

  // Imagem centralizada no MEIO (entre título e corpo) — herói do slide.
  if (hasImg) {
    layers.push(makeImageLayer({
      role: 'image', name: 'Imagem (card)', src: c.image || '',
      query: c.pexelsQuery || '',
      x: 160, y: 506, w: 760, h: 534, radius: 34, objectFit: 'cover',
      frame: 'card', frameAccent: accent, zIndex: z++,
    }) as Layer);
  }

  if (c.bodyText) {
    // Caixa glass sutil atrás do corpo (profundidade tipo card).
    layers.push(shp('decor', 'Painel do corpo', {
      x: MARGIN, y: L.bodyPanelY, w: CW, h: L.bodyH + 36, kind: 'rect',
      fill: 'rgba(255,255,255,0.05)', radius: 20, glass: true, zIndex: z++,
    }));
    layers.push(shp('divider', 'Barra de corpo', {
      x: MARGIN, y: L.bodyBarY, w: 4, h: L.bodyH - 10, kind: 'rect', fill: accent, radius: 4, glow: true, zIndex: z++,
    }));
    layers.push(txt('body', 'Body', c.bodyText, {
      x: MARGIN + 28, y: L.bodyY, w: CW - 28, h: L.bodyH, fontSize: autoBody(c.bodyText),
      fontWeight: 500, color: '#FFFFFFCC', lineHeight: 1.4, zIndex: z++,
    }));
  }
  return { background: { type: 'brand', mood: 'editorial' }, layers };
}

function dataCard(c: PresetContent, pal: PresetPalette, m: PresetMeta): PresetResult {
  const accent = c.accentColor || pal.accent;
  const layers: Layer[] = [];
  let z = 1;
  // Card translúcido (glass) — centralizado, com respiro vertical.
  layers.push(shp('decor', 'Card', {
    x: 90, y: 286, w: 900, h: 800, kind: 'rect', fill: 'rgba(255,255,255,0.06)',
    stroke: 'rgba(255,255,255,0.16)', strokeWidth: 1, radius: 44, glass: true, zIndex: z++,
  }));
  z = pushHeaderFooter(layers, m, accent, z, false); // rodapé já tem CTA/assinatura
  if (c.subHeadline) {
    layers.push(txt('kicker', 'Kicker', c.subHeadline, {
      x: 140, y: 356, w: 800, h: 44, fontSize: 22, fontWeight: 900, color: accent,
      align: 'center', uppercase: true, letterSpacing: 8, glow: true, zIndex: z++,
    }));
  }
  if (c.number) {
    layers.push(txt('number', 'Número', c.number, {
      x: 140, y: 430, w: 800, h: 340, fontSize: autoNumber(c.number), fontWeight: 900,
      color: accent, align: 'center', lineHeight: 0.85, shadow: true, glow: true, zIndex: z++,
    }));
    if (c.unitSuffix) {
      layers.push(txt('unit', 'Unidade', c.unitSuffix, {
        x: 760, y: 556, w: 180, h: 120, fontSize: 92, fontWeight: 900,
        color: accent, opacity: 0.9, glow: true, zIndex: z++,
      }));
    }
  }
  layers.push(txt('headline', 'Contexto', c.headline || 'de resultado', {
    x: 140, y: 800, w: 800, h: 120, fontSize: autoHeadline(c.headline || ''), fontWeight: 900,
    color: '#FFFFFF', align: 'center', uppercase: true, lineHeight: 1.05, zIndex: z++,
  }));
  if (c.bodyText) {
    layers.push(txt('body', 'Body', c.bodyText, {
      x: 170, y: 936, w: 740, h: 96, fontSize: autoBody(c.bodyText), fontWeight: 500,
      color: '#FFFFFFBF', align: 'center', lineHeight: 1.4, zIndex: z++,
    }));
  }
  // Rodapé interno do card: divisor + call-to-think (esq.) + assinatura (dir.).
  layers.push(shp('divider', 'Divisor do rodapé', {
    x: 140, y: 1014, w: 800, h: 1, kind: 'rect', fill: 'rgba(255,255,255,0.14)', radius: 0, zIndex: z++,
  }));
  if (c.callToThink) {
    layers.push(txt('callToThink', 'Call-to-think', c.callToThink, {
      x: 140, y: 1040, w: 560, h: 48, fontSize: 20, fontWeight: 600, color: accent, zIndex: z++,
    }));
  }
  if (m.signature) {
    layers.push(txt('signature', 'Assinatura', m.signature, {
      x: 640, y: 1044, w: 300, h: 40, fontSize: 16, fontWeight: 900, color: accent,
      align: 'right', uppercase: true, letterSpacing: 3, opacity: 0.85, zIndex: z++,
    }));
  }
  return { background: { type: 'brand', mood: 'data' }, layers };
}

function stepList(c: PresetContent, pal: PresetPalette, m: PresetMeta): PresetResult {
  const accent = c.accentColor || pal.accent;
  const layers: Layer[] = [];
  let z = 1;
  z = pushHeaderFooter(layers, m, accent, z);
  layers.push(txt('number', 'Passo (gigante)', String(m.slideNumber), {
    x: MARGIN, y: 340, w: 520, h: 360, fontSize: 320, fontWeight: 900, color: accent,
    lineHeight: 0.8, shadow: true, glow: true, zIndex: z++,
  }));
  layers.push(txt('counter', 'Total', `/ ${m.totalSlides}`, {
    x: MARGIN + 360, y: 560, w: 240, h: 90, fontSize: 64, fontWeight: 800,
    color: '#FFFFFF66', zIndex: z++,
  }));
  if (c.subHeadline) {
    layers.push(shp('divider', 'Régua kicker', {
      x: MARGIN, y: 762, w: 56, h: 4, kind: 'rect', fill: accent, radius: 4, glow: true, zIndex: z++,
    }));
    layers.push(txt('kicker', 'Kicker', c.subHeadline, {
      x: MARGIN + 72, y: 740, w: CW - 72, h: 44, fontSize: 22, fontWeight: 900, color: accent,
      uppercase: true, letterSpacing: 6, glow: true, zIndex: z++,
    }));
  }
  layers.push(txt('headline', 'Headline', c.headline || 'O passo', {
    x: MARGIN, y: 808, w: CW, h: 200, fontSize: autoHeadline(c.headline || ''), fontWeight: 800,
    color: '#FFFFFF', uppercase: true, lineHeight: 1.02, zIndex: z++,
  }));
  if (c.bodyText) {
    layers.push(shp('decor', 'Painel do corpo', {
      x: MARGIN, y: 1022, w: CW, h: 196, kind: 'rect',
      fill: 'rgba(255,255,255,0.05)', radius: 20, glass: true, zIndex: z++,
    }));
    layers.push(shp('divider', 'Barra de corpo', {
      x: MARGIN, y: 1040, w: 4, h: 150, kind: 'rect', fill: accent, radius: 4, glow: true, zIndex: z++,
    }));
    layers.push(txt('body', 'Body', c.bodyText, {
      x: MARGIN + 28, y: 1040, w: CW - 28, h: 160, fontSize: autoBody(c.bodyText), fontWeight: 500,
      color: '#FFFFFFCC', lineHeight: 1.4, zIndex: z++,
    }));
  }
  if (m.signature) {
    layers.push(txt('signature', 'Assinatura', m.signature, {
      x: MARGIN, y: 70, w: 600, h: 50, fontSize: 22, fontWeight: 900, color: accent,
      uppercase: true, letterSpacing: 4, zIndex: z++,
    }));
  }
  return { background: { type: 'brand', mood: 'technical' }, layers };
}

function cinematic(c: PresetContent, pal: PresetPalette, m: PresetMeta): PresetResult {
  const accent = c.accentColor || pal.accent;
  const layers: Layer[] = [];
  let z = 1;
  z = pushHeaderFooter(layers, m, accent, z, false); // citação centrada — sem "DESLIZE"
  if (c.subHeadline) {
    layers.push(txt('kicker', 'Kicker', c.subHeadline, {
      x: 120, y: 420, w: 840, h: 50, fontSize: 24, fontWeight: 900, color: accent,
      align: 'center', uppercase: true, letterSpacing: 10, glow: true, zIndex: z++,
    }));
  }
  layers.push(txt('headline', 'Citação', c.headline || 'A frase de impacto', {
    x: 100, y: 500, w: 880, h: 420, fontSize: autoHeadline(c.headline || '', true) + 6,
    fontWeight: 900, color: '#FFFFFF', align: 'center', uppercase: true, lineHeight: 1.04,
    letterSpacing: -1, shadow: true, zIndex: z++,
  }));
  layers.push(shp('divider', 'Régua', {
    x: 480, y: 960, w: 120, h: 5, kind: 'rect', fill: accent, radius: 5, glow: true, zIndex: z++,
  }));
  if (c.bodyText) {
    layers.push(txt('body', 'Body', c.bodyText, {
      x: 200, y: 1000, w: 680, h: 140, fontSize: autoBody(c.bodyText), fontWeight: 500,
      color: '#FFFFFFA6', align: 'center', lineHeight: 1.4, zIndex: z++,
    }));
  }
  if (m.signature) {
    layers.push(txt('signature', 'Assinatura', m.signature, {
      x: 240, y: 1200, w: 600, h: 44, fontSize: 22, fontWeight: 900, color: accent,
      align: 'center', uppercase: true, letterSpacing: 4, zIndex: z++,
    }));
  }
  return { background: { type: 'brand', mood: 'cinematic' }, layers };
}

function diary(c: PresetContent, pal: PresetPalette, m: PresetMeta): PresetResult {
  const accent = c.accentColor || pal.accent;
  const layers: Layer[] = [];
  let z = 1;
  z = pushHeaderFooter(layers, m, accent, z, false); // polaroid central — sem "DESLIZE"
  // Moldura polaroid
  layers.push(shp('decor', 'Polaroid', {
    x: 190, y: 240, w: 700, h: 720, kind: 'rect', fill: '#FFFFFF', radius: 8, zIndex: z++,
  }));
  layers.push(makeImageLayer({
    role: 'image', name: 'Foto', src: c.image || '', query: c.pexelsQuery || '',
    x: 222, y: 272, w: 636, h: 560, radius: 2, zIndex: z++,
  }) as Layer);
  if (c.headline) {
    layers.push(txt('headline', 'Legenda', c.headline, {
      x: 240, y: 850, w: 600, h: 90, fontSize: 34, fontWeight: 700, color: '#0B0B0F',
      align: 'center', lineHeight: 1.1, zIndex: z++,
    }));
  }
  if (c.bodyText) {
    layers.push(txt('body', 'Body', c.bodyText, {
      x: 160, y: 1010, w: 760, h: 160, fontSize: autoBody(c.bodyText), fontWeight: 500,
      color: '#FFFFFFCC', align: 'center', lineHeight: 1.4, zIndex: z++,
    }));
  }
  if (m.signature) {
    layers.push(txt('signature', 'Assinatura', m.signature, {
      x: 240, y: 1210, w: 600, h: 40, fontSize: 18, fontWeight: 900, color: accent,
      align: 'center', uppercase: true, letterSpacing: 3, zIndex: z++,
    }));
  }
  return { background: { type: 'brand', mood: 'diary' }, layers };
}

function dialogBox(c: PresetContent, pal: PresetPalette, m: PresetMeta): PresetResult {
  const accent = c.accentColor || pal.accent;
  const layers: Layer[] = [];
  let z = 1;
  z = pushHeaderFooter(layers, m, accent, z);
  layers.push(shp('decor', 'Card', {
    x: 90, y: 430, w: 900, h: 500, kind: 'rect', fill: '#F4F4F5', radius: 36, zIndex: z++,
  }));
  layers.push(shp('decor', 'Avatar', {
    x: 150, y: 490, w: 90, h: 90, kind: 'ellipse', fill: accent, radius: 0, glow: true, zIndex: z++,
  }));
  layers.push(txt('signature', 'Nome', (m.signature || '@perfil').replace(/^@/, ''), {
    x: 260, y: 498, w: 600, h: 44, fontSize: 34, fontWeight: 900, color: '#0B0B0F', zIndex: z++,
  }));
  layers.push(txt('decor', 'Handle', m.signature || '@perfil', {
    x: 260, y: 544, w: 600, h: 36, fontSize: 26, fontWeight: 500, color: '#6B6B72', zIndex: z++,
  }));
  layers.push(txt('headline', 'Texto', c.headline || c.bodyText || 'Conteúdo do post', {
    x: 150, y: 620, w: 780, h: 280, fontSize: 48, fontWeight: 700, color: '#0B0B0F',
    lineHeight: 1.25, zIndex: z++,
  }));
  return { background: { type: 'brand', mood: 'editorial' }, layers };
}

const BUILDERS: Record<string, (c: PresetContent, p: PresetPalette, m: PresetMeta) => PresetResult> = {
  'carousel-slide': editorial,
  'single-post': editorial,
  'tiago-data': dataCard,
  'tiago-step': stepList,
  'quote-slide': cinematic,
  'tiago-provocation': cinematic,
  'tiago-diary': diary,
  'benchmark-derived': dialogBox,
};

/** Constrói o preset de camadas para um template. Fallback: editorial. */
export function buildPreset(
  templateId: string, content: PresetContent, palette: PresetPalette, meta: PresetMeta,
): PresetResult {
  const builder = BUILDERS[templateId] || editorial;
  return builder(content, palette, meta);
}

/** Extrai o conteúdo (por papel) das camadas atuais — para calibrar ao trocar de template. */
export function extractContent(layers: Layer[]): PresetContent {
  const byRole = (r: LayerRole) =>
    layers.find((l) => l.role === r && l.type === 'text') as (Layer & { content?: string }) | undefined;
  const img = layers.find((l) => l.type === 'image' && (l.role === 'image' || !!l.src)) as
    (Layer & { src?: string }) | undefined;
  return {
    headline: byRole('headline')?.content,
    subHeadline: byRole('kicker')?.content,
    bodyText: byRole('body')?.content,
    number: byRole('number')?.content,
    unitSuffix: byRole('unit')?.content,
    callToThink: byRole('callToThink')?.content,
    image: img?.src || null,
  };
}
