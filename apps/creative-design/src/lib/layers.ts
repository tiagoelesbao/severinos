/**
 * layers.ts — Modelo de camadas compartilhado do Creative Studio (MED-05).
 *
 * É a "fonte de verdade" do editor avançado híbrido: o canvas interativo
 * (/studio) e o componente de render (LayeredSlide, consumido pelo Playwright
 * via /render) usam EXATAMENTE este modelo — garantindo WYSIWYG entre o que se
 * edita e o que se exporta.
 *
 * Sistema de coordenadas: canvas canônico DO DOCUMENTO. Todas as posições e
 * tamanhos das camadas são absolutos nesse espaço; o preview apenas aplica um
 * `scale` visual.
 *
 * FORMATO POR DOCUMENTO (2026-09-04): o canvas deixou de ser uma constante de
 * módulo fixa em 1080×1350 e passou a vir do `SlideDoc.format`. O motivo é que
 * o mesmo editor de camadas agora precisa produzir DOIS formatos —
 * carrossel/post de Instagram (4:5) e thumbnail de YouTube (16:9) — e travar o
 * canvas no módulo impedia qualquer peça que não fosse retrato.
 *
 * `CANVAS_W`/`CANVAS_H` continuam exportados como o DEFAULT (retrato), porque
 * dezenas de posições dos presets antigos são calculadas contra eles. Código
 * novo deve usar `canvasOf(format)`.
 */

/** Formatos de peça suportados pelo editor. */
export type CanvasFormat = 'instagram-portrait' | 'youtube-thumb';

export interface CanvasSpec {
  id: CanvasFormat;
  label: string;
  w: number;
  h: number;
}

export const CANVAS_FORMATS: Record<CanvasFormat, CanvasSpec> = {
  // Grade do Instagram: o feed exibe 4:5 inteiro e o perfil recorta pra 3:4.
  'instagram-portrait': {
    id: 'instagram-portrait', label: 'Instagram · 1080×1350 (4:5)', w: 1080, h: 1350,
  },
  // Thumb de YouTube: 1280×720 é a resolução normativa (thumb-system.yaml).
  'youtube-thumb': {
    id: 'youtube-thumb', label: 'Thumb YouTube · 1280×720 (16:9)', w: 1280, h: 720,
  },
};

/** Formato assumido quando o documento não declara nenhum (back-compat). */
export const DEFAULT_CANVAS_FORMAT: CanvasFormat = 'instagram-portrait';

/**
 * Resolve o canvas de um formato. Aceita `undefined`/string desconhecida
 * (briefs antigos, dados vindos de YAML sem validação) e cai no default —
 * nenhum documento existente pode quebrar por causa de um campo que não tem.
 */
export function canvasOf(format?: CanvasFormat | string | null): CanvasSpec {
  if (format && format in CANVAS_FORMATS) {
    return CANVAS_FORMATS[format as CanvasFormat];
  }
  return CANVAS_FORMATS[DEFAULT_CANVAS_FORMAT];
}

/** Default de retrato — mantido para os presets 4:5 já calibrados nesses números. */
export const CANVAS_W = CANVAS_FORMATS[DEFAULT_CANVAS_FORMAT].w;
export const CANVAS_H = CANVAS_FORMATS[DEFAULT_CANVAS_FORMAT].h;

export type LayerType = 'text' | 'image' | 'shape';

/** Mood do backdrop premium (espelha fx.Mood). Define luz/grão/profundidade. */
export type Mood = 'editorial' | 'cinematic' | 'technical' | 'data' | 'diary';

/**
 * Papel semântico da camada dentro de um preset de template. Permite:
 *  - carregar conteúdo (headline/body/...) ao trocar de template (calibração);
 *  - inspector contextual.
 */
export type LayerRole =
  | 'headline' | 'body' | 'kicker' | 'number' | 'unit' | 'callToThink'
  | 'signature' | 'ghost' | 'divider' | 'decor' | 'image' | 'badge' | 'counter'
  | 'pagination' | 'swipe' | 'progressTrack' | 'progressFill' | 'dot';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  /** Papel semântico (presets). Opcional para camadas livres do usuário. */
  role?: LayerRole;
  /** Coordenadas absolutas no canvas do documento (ver `SlideDoc.format`). */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  uppercase?: boolean;
  italic?: boolean;
  shadow?: boolean;
  /** Brilho de acento (glow) na cor do texto — usado em kicker/destaques (MED-06/G2). */
  glow?: boolean;
  /**
   * Riscado inline (MED-DS-03): trechos de `content` entre `~~..~~` renderizam
   * riscados. `strikeColor` tinge o próprio texto riscado (default: `color` com
   * opacidade reduzida); `strikeAccent` tinge a LINHA do riscado, que pode ter
   * cor diferente do texto (efeito "hook cancelado" do template clean-hook).
   */
  strikeColor?: string;
  strikeAccent?: string;
  /**
   * Ênfase de cor inline (MED-DS-03): trechos entre `**..**` renderizam na cor
   * `emphasisColor` (default: acento do preset) — para frases tipo "Somos seu
   * **departamento de Growth**" sem precisar quebrar em múltiplas camadas.
   */
  emphasisColor?: string;
  /**
   * Contorno do texto (thumb-system.yaml § tipografia.linha_principal:
   * "contorno de 6 a 10px em #0C0C0C"). Renderiza via `-webkit-text-stroke` +
   * `paint-order: stroke fill` — sem o paint-order o contorno é desenhado por
   * CIMA do preenchimento e come metade do peso do glifo; com ele, o contorno
   * só aparece PARA FORA, que é o comportamento que a thumb precisa para se
   * ler aos 168px de largura.
   */
  outlineWidth?: number;
  outlineColor?: string;
  /**
   * Sombra DURA e deslocada (não o blur suave do `shadow`). O sistema de thumb
   * pede "projetada, dura, deslocada 4px" — é ela que separa a tipografia do
   * gramado quando a peça encolhe no feed.
   */
  hardShadow?: boolean;
  /** Deslocamento da sombra dura, em px. Default: 5×6 (o do template de referência). */
  hardShadowX?: number;
  hardShadowY?: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  objectFit: 'cover' | 'contain';
  radius: number;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  flipX?: boolean;
  flipY?: boolean;
  /**
   * Enquadramento do recorte quando `objectFit: 'cover'` (percentuais 0..100,
   * default 50/50) — equivale ao `object-position` do CSS.
   *
   * Numa thumb é o controle mais usado de todos: a foto ocupa o quadro inteiro
   * e o que decide se a peça funciona é ONDE o rosto cai em relação à faixa de
   * texto. Sem isto, a única saída seria recortar a imagem fora do editor.
   */
  posX?: number;
  posY?: number;
  /**
   * Enquadramento premium "grau Photoshop" (MED-05 / fechamento do gap de
   * qualidade): 'card' aplica ring, sombra profunda, duotone de acento, grão e
   * barra de acento inferior — espelha o renderImagePanel do template
   * automático, porém como camada editável. 'none' = imagem chapada.
   */
  frame?: 'none' | 'card';
  /** Cor do duotone/barra do frame 'card' (default: accent do preset). */
  frameAccent?: string;
  /** Termo de busca Pexels do slide (MED-06): prefill do "Buscar no Pexels". */
  query?: string;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  kind: 'rect' | 'ellipse' | 'line';
  fill: string;
  /**
   * Preenchimento por gradiente CSS (`linear-gradient(...)`,
   * `radial-gradient(...)`, ou várias camadas separadas por vírgula). Quando
   * presente, SUBSTITUI o `fill` chapado.
   *
   * Por que existe: o fundo de gramado + luz de estádio da thumb e o disco
   * escuro atrás do escudo são gradientes, e a alternativa (assar isso no
   * componente de template) tiraria do usuário justamente o que o Studio
   * promete — poder mover, apagar ou repintar cada elemento. Como gradiente,
   * o fundo continua sendo UMA CAMADA editável.
   */
  fillGradient?: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  /** Brilho de acento (glow) ao redor da forma — réguas/barras (MED-06/G2). */
  glow?: boolean;
  /** Vidro: backdrop-blur + leve translucidez (caixa glass) (MED-06/G2). */
  glass?: boolean;
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

export type BackgroundType = 'brand' | 'solid' | 'image';

export interface SlideBackground {
  type: BackgroundType;
  color?: string;
  image?: string;
  /** Para type 'brand': mood do backdrop premium (luz/grão por tipo de conteúdo). */
  mood?: Mood;
  /** Enquadramento da imagem de fundo (type 'image'). */
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  /**
   * Atmosfera da marca SOBRE a imagem de fundo (type 'image'): aplica a mesma
   * linguagem de luz/cor/grão dos moods, translúcida, por cima da foto —
   * dá identidade e legibilidade sem esconder a imagem. 'none' = imagem pura.
   */
  overlayMood?: Mood | 'none';
  /** Intensidade do overlay de atmosfera (0..1). Default 0.65. */
  overlayStrength?: number;
}

export interface SlideDoc {
  slide_n: number;
  source_slide_n?: number;
  /** Formato do canvas deste documento. Ausente = 'instagram-portrait'. */
  format?: CanvasFormat;
  background: SlideBackground;
  layers: Layer[];
}

let _seq = 0;
export function newId(prefix = 'l'): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

const FONT_DEFAULT = 'Outfit, system-ui, sans-serif';

/** Fábricas de camadas com defaults sensatos (centradas no canvas). */
export function makeTextLayer(partial: Partial<TextLayer> = {}): TextLayer {
  return {
    id: newId('t'),
    type: 'text',
    name: partial.name ?? 'Texto',
    x: 90, y: 560, w: 900, h: 240,
    rotation: 0, opacity: 1, zIndex: 10,
    content: 'Texto',
    fontSize: 64,
    fontWeight: 800,
    color: '#FFFFFF',
    align: 'left',
    lineHeight: 1.1,
    letterSpacing: 0,
    fontFamily: FONT_DEFAULT,
    uppercase: false,
    italic: false,
    shadow: false,
    ...partial,
  };
}

export function makeImageLayer(partial: Partial<ImageLayer> = {}): ImageLayer {
  return {
    id: newId('i'),
    type: 'image',
    name: partial.name ?? 'Imagem',
    x: 240, y: 375, w: 600, h: 600,
    rotation: 0, opacity: 1, zIndex: 5,
    src: '',
    objectFit: 'cover',
    radius: 0,
    brightness: 100, contrast: 100, saturate: 100, blur: 0,
    flipX: false, flipY: false,
    frame: 'none',
    ...partial,
  };
}

export function makeShapeLayer(partial: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: newId('s'),
    type: 'shape',
    name: partial.name ?? 'Forma',
    x: 360, y: 525, w: 360, h: 300,
    rotation: 0, opacity: 1, zIndex: 3,
    kind: 'rect',
    fill: '#FFB800',
    stroke: 'transparent',
    strokeWidth: 0,
    radius: 24,
    ...partial,
  };
}

/**
 * Semeia camadas a partir do conteúdo textual de um slide do brief
 * (kicker / headline / body + imagem opcional). Dá ao usuário um ponto de
 * partida editável imediato ao "converter" um slide para o Studio.
 */
export function seedLayersFromSlide(input: {
  kicker?: string;
  headline?: string;
  body?: string;
  image?: string | null;
  accent?: string;
}): { background: SlideBackground; layers: Layer[] } {
  const accent = input.accent || '#FFB800';
  const layers: Layer[] = [];
  let z = 1;

  if (input.image) {
    layers.push(makeImageLayer({
      name: 'Imagem de fundo',
      src: input.image,
      x: 0, y: 0, w: CANVAS_W, h: CANVAS_H,
      zIndex: z++, opacity: 1,
    }));
  }
  if (input.kicker) {
    layers.push(makeTextLayer({
      name: 'Kicker',
      content: input.kicker,
      x: 90, y: 360, w: 900, h: 70,
      fontSize: 30, fontWeight: 900, color: accent,
      uppercase: true, letterSpacing: 6, zIndex: z++,
    }));
  }
  if (input.headline) {
    layers.push(makeTextLayer({
      name: 'Headline',
      content: input.headline,
      x: 90, y: 440, w: 900, h: 320,
      fontSize: 88, fontWeight: 800, color: '#FFFFFF',
      lineHeight: 1.05, zIndex: z++,
    }));
  }
  if (input.body) {
    layers.push(makeTextLayer({
      name: 'Body',
      content: input.body,
      x: 90, y: 800, w: 880, h: 260,
      fontSize: 40, fontWeight: 500, color: '#C8C8D0',
      lineHeight: 1.3, zIndex: z++,
    }));
  }

  return { background: { type: 'brand' }, layers };
}

/** Ordena camadas por zIndex (crescente = fundo→topo) ignorando ocultas. */
export function sortedVisibleLayers(layers: Layer[]): Layer[] {
  return [...layers]
    .filter((l) => !l.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);
}
