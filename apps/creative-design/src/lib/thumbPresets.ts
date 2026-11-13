/**
 * thumbPresets.ts — Presets de THUMBNAIL de YouTube (1280×720).
 *
 * Fonte normativa: `workspaces/businesses/virals/creative-studio/canais/
 * bora-de-bola/thumb-system.yaml`. Template visual de referência:
 * `apps/canal-futebol/thumb/estilos.html` (renderizado por catalogo_estilos.py).
 *
 * POR QUE UM MÓDULO SEPARADO DO templatePresets.ts
 *   Os presets 4:5 partilham uma gramática (kicker + headline + body sobre o
 *   backdrop premium da marca). A thumb tem outra, ditada por um documento
 *   normativo próprio: a FOTO ocupa o quadro inteiro e o texto entra em FAIXAS
 *   de largura total. Misturar as duas num arquivo só faria as constantes de
 *   uma vazarem na outra — e é justamente o acoplamento entre "canvas" e
 *   "preset" que este trabalho veio desfazer.
 *
 * A GRAMÁTICA (§ templates, decidida em 2026-09-04 depois de comparar dez
 * desenhos com a MESMA copy — comparar estilo com copy diferente compara copy):
 *   · a foto ocupa o quadro inteiro; o fundo de marca vira véu/vinheta, nunca
 *     disputa metade da peça;
 *   · o texto entra em faixas de largura total (rodapé quase sempre, topo às
 *     vezes);
 *   · a faixa amarela sólida com texto preto é o elemento mais constante — é
 *     o que faz a thumb ser reconhecida de longe.
 *
 * Cada elemento vira uma CAMADA de verdade (imagem/forma/texto): o founder
 * arrasta a faixa, troca a foto, reposiciona o X e apaga a etiqueta pelo mesmo
 * inspector dos outros templates. Nada aqui é assado num componente fechado.
 */

import {
  type Layer, type TextLayer, type ShapeLayer, type LayerRole,
  makeTextLayer, makeShapeLayer, makeImageLayer, canvasOf,
} from './layers';
import type { PresetContent, PresetPalette, PresetMeta, PresetResult } from './templatePresets';

/*
 * Nota de assinatura: os builders de thumb recebem só (conteúdo, paleta). Não
 * usam `PresetMeta` porque uma thumb não tem paginação, contador nem "deslize"
 * — ela é uma peça única, não um slide de carrossel. O Record abaixo declara a
 * aridade cheia porque é o contrato do `buildPreset`; funções com menos
 * parâmetros são atribuíveis a ele.
 */

const THUMB = canvasOf('youtube-thumb'); // 1280 × 720
const THUMB_W = THUMB.w;
const THUMB_H = THUMB.h;

/** Família tipográfica do canal — condensada, pesada (thumb-system § tipografia). */
export const THUMB_FONT = 'Anton, "Archivo Black", Impact, "Arial Black", sans-serif';

/** Ids dos quatro estilos selecionáveis para vídeo longo. */
export const THUMB_TEMPLATE_IDS = ['thumb-e3', 'thumb-e5', 'thumb-e7', 'thumb-e10'] as const;

function txt(role: LayerRole, name: string, content: string, p: Partial<TextLayer>): Layer {
  return makeTextLayer({ role, name, content, ...p }) as Layer;
}
function shp(role: LayerRole, name: string, p: Partial<ShapeLayer>): Layer {
  return makeShapeLayer({ role, name, ...p }) as Layer;
}

/**
 * Cores do sistema de thumb, derivadas da paleta do CLIENTE (o brand-config.yaml
 * do bora-de-bola já traz exatamente estes valores) — nunca hardcode de marca
 * aqui, o preset tem de servir a qualquer canal que declare a sua paleta.
 *
 * `alerta` é a exceção deliberada: é cor de FUNÇÃO (negação e realce sobre
 * amarelo), não de identidade, e o próprio brand-config a declara fora da
 * paleta base justamente por isso.
 */
function thumbTokens(pal: PresetPalette, c: PresetContent) {
  return {
    amarelo: c.accentColor || pal.accent, // #FCCC0C — carrega UMA coisa por peça
    profundo: '#0C0C0C',                  // contorno e sombra
    tinta: '#FCFCFC',
    alerta: '#E02020',                    // X, etiqueta-caixa e realce na faixa sólida
    fundo: pal.primary,                   // #0C240C
  };
}

/**
 * `{palavra}` é como a copy do canal marca o realce — é o que sai do
 * `/packaging` e está gravado em `01-embalagem/candidatos.json`. O LayerView
 * entende `**palavra**`. Converter aqui deixa o founder colar a copy aprovada
 * literalmente, sem reescrever marcação à mão.
 */
export function thumbMarkup(text: string): string {
  return (text || '').replace(/\{([^}]+)\}/g, '**$1**');
}

/** Comprimento do texto SEM a marcação de realce (é o que ocupa largura). */
function thumbLen(text: string): number {
  return (text || '').replace(/[{}]/g, '').replace(/\*\*/g, '').length;
}

/**
 * Corpo da linha principal por CONTAGEM DE CARACTERES, não por palpite
 * (thumb-system § corpo_da_faixa; a régua vem da função `corpo()` do
 * estilos.html). Uma linha de 30 caracteres a 96px vaza de 1280 — encolher
 * depois de vazar é tarde.
 *
 * Os degraus diferem entre faixa sólida (118/96/78) e texto sobre a foto
 * (112/90/72) porque o contorno grosso da segunda come largura útil.
 */
function thumbBody(text: string, solid: boolean): number {
  const n = thumbLen(text);
  if (solid) return n > 34 ? 78 : n > 22 ? 96 : 118;
  return n > 34 ? 72 : n > 22 ? 90 : 112;
}

/**
 * Véu da marca: vinheta nas bordas + escurecimento onde o texto entra.
 * Resolve um problema que só aparece no volume — cada foto chega com a
 * temperatura de cor do fotógrafo que a tirou, e sem o véu quarenta thumbs
 * parecem de quarenta canais.
 */
const THUMB_VEIL =
  'radial-gradient(ellipse 120% 88% at 50% 45%, transparent 32%, rgba(6,20,6,.72) 100%),'
  + 'linear-gradient(180deg, rgba(6,20,6,.42) 0%, transparent 26%,'
  + ' transparent 62%, rgba(6,20,6,.92) 100%)';

type BandSide = 'topo' | 'rodape';
type BandStyle = 'solida' | 'escura';

/**
 * Empilha uma FAIXA (fundo + linha 1 + linha 2 opcional). Devolve o próximo
 * zIndex livre.
 *
 * A ALTURA DA FAIXA ACOMPANHA O TEXTO, não o contrário (thumb-system §
 * corpo_da_faixa.regra) — foi o primeiro defeito apontado na primeira rodada:
 * o corpo estava dimensionado para a peça grande e virava borrão aos 168px.
 * Por isso a altura é calculada a partir do corpo já resolvido, nunca fixada.
 */
function pushBand(
  layers: Layer[], z: number, t: ReturnType<typeof thumbTokens>,
  side: BandSide, style: BandStyle, line1: string, line2: string,
): number {
  const solid = style === 'solida';
  const f1 = thumbBody(line1, solid);
  const lh1 = solid ? 0.88 : 0.9;
  const f2 = solid ? 46 : 48;
  const padTop = solid ? 18 : 14;
  const padBottom = solid ? 20 : 14;
  const gap = 2;

  const h1 = Math.round(f1 * lh1);
  const h2 = line2 ? f2 : 0;
  const bandH = padTop + h1 + (line2 ? gap + h2 : 0) + padBottom;
  const bandY = side === 'topo' ? 0 : THUMB_H - bandH;

  layers.push(shp('decor', side === 'topo' ? 'Faixa do topo' : 'Faixa do rodapé', {
    x: 0, y: bandY, w: THUMB_W, h: bandH, kind: 'rect', radius: 0,
    fill: solid ? t.amarelo : 'rgba(6,20,6,0.94)',
    // A faixa escura é degradê para dissolver na foto; a sólida é chapada.
    fillGradient: solid
      ? undefined
      : side === 'topo'
        ? 'linear-gradient(180deg, rgba(6,20,6,0), rgba(6,20,6,.94) 34%)'
        : 'linear-gradient(0deg, rgba(6,20,6,.94) 66%, rgba(6,20,6,0))',
    zIndex: z++,
  }));

  // SOBRE A FAIXA SÓLIDA: sem contorno, sem sombra, e realce VERMELHO.
  // Amarelo sobre amarelo é invisível (foi o defeito da primeira rodada), e
  // contorno sobre cor chapada só suja a letra — ele existe para descolar
  // texto claro de FOTO (thumb-system § corpo_da_faixa).
  layers.push(txt('headline', 'Linha principal', thumbMarkup(line1), {
    x: 30, y: bandY + padTop, w: THUMB_W - 60, h: h1,
    fontSize: f1, fontWeight: 400, lineHeight: lh1,
    letterSpacing: -Math.round(f1 * 0.012),
    fontFamily: THUMB_FONT, color: solid ? t.profundo : t.tinta,
    align: 'center', uppercase: true, italic: true,
    emphasisColor: solid ? t.alerta : t.amarelo,
    outlineWidth: solid ? undefined : 10,
    outlineColor: solid ? undefined : t.profundo,
    hardShadow: !solid,
    zIndex: z++,
  }));

  if (line2) {
    layers.push(txt('kicker', 'Linha secundária', line2, {
      x: 30, y: bandY + padTop + h1 + gap, w: THUMB_W - 60, h: h2,
      fontSize: f2, fontWeight: 400, lineHeight: 1, letterSpacing: 0,
      fontFamily: THUMB_FONT,
      // Na faixa amarela a secundária é oliva escuro (contraste sem gritar);
      // sobre a foto ela assume o amarelo, que a principal não usou
      // (thumb-system § tipografia.linha_secundaria).
      color: solid ? '#3A2F00' : t.amarelo,
      align: 'center', uppercase: true, italic: true,
      outlineWidth: solid ? undefined : 8,
      outlineColor: solid ? undefined : t.profundo,
      zIndex: z++,
    }));
  }
  return z;
}

/** Foto de fundo. `posY` é o enquadramento vertical do recorte (0..100). */
function pushPhoto(
  layers: Layer[], z: number, name: string, src: string | null | undefined,
  x: number, w: number, posY: number,
): number {
  layers.push(makeImageLayer({
    role: 'image', name, src: src || '',
    x, y: 0, w, h: THUMB_H,
    objectFit: 'cover', posX: 50, posY,
    radius: 0, frame: 'none', zIndex: z++,
  }) as Layer);
  return z;
}

/**
 * Selo do canal — 96px, sempre no mesmo canto. É o elemento que constrói
 * reconhecimento ao longo de dezenas de episódios, então a posição é do
 * SISTEMA, não do episódio.
 */
function pushSeal(
  layers: Layer[], z: number, src: string | null | undefined, low: boolean,
): number {
  layers.push(makeImageLayer({
    role: 'badge', name: 'Selo do canal', src: src || '',
    x: THUMB_W - 26 - 96, y: low ? THUMB_H - 24 - 96 : 24, w: 96, h: 96,
    objectFit: 'contain', radius: 0, frame: 'none', zIndex: z++,
  }) as Layer);
  return z;
}

/**
 * Etiqueta de canto. `boxed` = bloco vermelho com texto branco (E3): a COR
 * chega antes do texto, é a leitura mais rápida do sistema. Sem `boxed` é só
 * texto amarelo contornado (E7).
 *
 * A largura sai de uma estimativa por contagem de caracteres porque a camada
 * precisa de um box explícito — o modelo é de coordenadas absolutas, não de
 * fluxo. O fator 0,55em foi MEDIDO na etiqueta renderizada (16 caracteres a
 * 34px ocuparam ~285px = 0,52em) e leva folga: subestimar quebra a etiqueta em
 * duas linhas, que foi o defeito visto na primeira renderização do E7.
 * O contorno também soma largura, então a variante sem caixa ganha o dobro da
 * espessura. Quando a estimativa não servir, a etiqueta é redimensionável no
 * Studio como qualquer outra camada.
 */
function pushLabel(
  layers: Layer[], z: number, t: ReturnType<typeof thumbTokens>,
  text: string, boxed: boolean,
): number {
  const size = boxed ? 34 : 40;
  const outline = boxed ? 0 : 8;
  const w = Math.min(
    Math.round(THUMB_W * 0.46),
    Math.round(thumbLen(text) * size * 0.55) + (boxed ? 32 : outline * 2),
  );
  const h = boxed ? size + 16 : size;
  if (boxed) {
    layers.push(shp('badge', 'Etiqueta (caixa)', {
      x: 24, y: 22, w, h, kind: 'rect', fill: t.alerta, radius: 4, zIndex: z++,
    }));
  }
  layers.push(txt('badge', 'Etiqueta', thumbMarkup(text), {
    x: 24, y: 22, w, h,
    fontSize: size, fontWeight: 400, lineHeight: 1, letterSpacing: 0,
    fontFamily: THUMB_FONT,
    color: boxed ? '#FFFFFF' : t.amarelo,
    align: boxed ? 'center' : 'left', uppercase: true, italic: true,
    emphasisColor: boxed ? '#FFFFFF' : t.alerta,
    outlineWidth: boxed ? undefined : 8,
    outlineColor: boxed ? undefined : t.profundo,
    zIndex: z++,
  }));
  return z;
}

/**
 * Marcador X — SÓ para negação (suspenso, cortado, fora, barrado). São duas
 * barras vermelhas cruzadas, cada uma uma forma editável: dá para mover,
 * girar, recolorir, ou apagar uma e ficar com um risco só.
 */
function pushX(
  layers: Layer[], z: number, t: ReturnType<typeof thumbTokens>, cx: number, cy: number,
): number {
  const size = 230;
  const bar = 26;
  for (const rot of [45, -45]) {
    layers.push(shp('decor', `Marcador X (barra ${rot > 0 ? 1 : 2})`, {
      x: Math.round(cx - bar / 2), y: Math.round(cy - size / 2), w: bar, h: size,
      kind: 'rect', fill: t.alerta, radius: 5, rotation: rot, glow: true, zIndex: z++,
    }));
  }
  return z;
}

/** Base comum de todos os estilos: foto(s) + véu. Devolve o próximo zIndex. */
function pushBase(
  layers: Layer[], c: PresetContent, panels: boolean, t: ReturnType<typeof thumbTokens>,
): number {
  let z = 1;
  if (panels) {
    const half = THUMB_W / 2;
    z = pushPhoto(layers, z, 'Foto (esquerda)', c.image, 0, half, c.imagePosY ?? 42);
    z = pushPhoto(layers, z, 'Foto (direita)', c.imageB, half, half, c.imageBPosY ?? 42);
    layers.push(shp('divider', 'Divisória', {
      x: Math.round(half - 4), y: 0, w: 8, h: THUMB_H, kind: 'rect',
      fill: t.tinta, radius: 0, zIndex: z++,
    }));
  } else {
    z = pushPhoto(layers, z, 'Foto', c.image, 0, THUMB_W, c.imagePosY ?? 42);
  }
  layers.push(shp('decor', 'Véu da marca', {
    x: 0, y: 0, w: THUMB_W, h: THUMB_H, kind: 'rect', radius: 0,
    fill: 'transparent', fillGradient: THUMB_VEIL, zIndex: z++,
  }));
  return z;
}

/** Fundo do documento: verde-mãe do canal. A foto cobre, mas se ela falhar
 *  (URL quebrada), a peça ainda sai na cor do canal em vez de preta. */
function thumbResult(layers: Layer[], t: ReturnType<typeof thumbTokens>): PresetResult {
  return {
    format: 'youtube-thumb',
    background: { type: 'solid', color: t.fundo },
    layers,
  };
}

const DEFAULT_L1 = 'LINHA {PRINCIPAL}';

/** E3 — Etiqueta de canto + faixa. O padrão do dia a dia, serve a qualquer pauta. */
export function thumbE3(c: PresetContent, pal: PresetPalette): PresetResult {
  const t = thumbTokens(pal, c);
  const layers: Layer[] = [];
  let z = pushBase(layers, c, false, t);
  z = pushLabel(layers, z, t, c.label || 'POLÊMICA PESADA!', true);
  z = pushBand(layers, z, t, 'rodape', 'solida', c.headline || DEFAULT_L1, c.subHeadline || '');
  pushSeal(layers, z, c.sealImage, false);
  return thumbResult(layers, t);
}

/** E5 — X sobre a pessoa. Pauta de NEGAÇÃO; gasta rápido, não usar dois dias seguidos. */
export function thumbE5(c: PresetContent, pal: PresetPalette): PresetResult {
  const t = thumbTokens(pal, c);
  const layers: Layer[] = [];
  let z = pushBase(layers, c, false, t);
  // 18%/24% do quadro é a posição do catálogo — cai sobre o rosto, não sobre o texto.
  z = pushX(layers, z, t, Math.round(THUMB_W * 0.18) + 115, Math.round(THUMB_H * 0.24) + 115);
  z = pushBand(layers, z, t, 'rodape', 'solida', c.headline || DEFAULT_L1, c.subHeadline || '');
  pushSeal(layers, z, c.sealImage, false);
  return thumbResult(layers, t);
}

/** E7 — Dois painéis. Confronto entre dois lados, ou o antes e o depois. */
export function thumbE7(c: PresetContent, pal: PresetPalette): PresetResult {
  const t = thumbTokens(pal, c);
  const layers: Layer[] = [];
  let z = pushBase(layers, c, true, t);
  z = pushLabel(layers, z, t, c.label || 'O QUE MUDOU', false);
  z = pushBand(layers, z, t, 'rodape', 'solida', c.headline || DEFAULT_L1, c.subHeadline || '');
  pushSeal(layers, z, c.sealImage, false);
  return thumbResult(layers, t);
}

/**
 * E10 — Texto gigante no topo inteiro. É o que mais aproveita área e o que
 * mais depende da foto: só serve quando o alto do quadro tem céu ou fundo
 * limpo. Por isso a foto entra enquadrada mais para baixo (58%) e o selo desce
 * para o canto inferior, longe do texto.
 */
export function thumbE10(c: PresetContent, pal: PresetPalette): PresetResult {
  const t = thumbTokens(pal, c);
  const layers: Layer[] = [];
  let z = pushBase(layers, { ...c, imagePosY: c.imagePosY ?? 58 }, false, t);
  z = pushBand(layers, z, t, 'topo', 'escura', c.headline || DEFAULT_L1, c.subHeadline || '');
  pushSeal(layers, z, c.sealImage, true);
  return thumbResult(layers, t);
}

export const THUMB_BUILDERS: Record<
  string, (c: PresetContent, p: PresetPalette, m: PresetMeta) => PresetResult
> = {
  'thumb-e3': thumbE3,
  'thumb-e5': thumbE5,
  'thumb-e7': thumbE7,
  'thumb-e10': thumbE10,
};
