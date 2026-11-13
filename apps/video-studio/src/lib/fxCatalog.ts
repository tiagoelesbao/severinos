/**
 * Catálogo de FX — os QUATRO grupos, separados por o que cada um faz.
 *
 * A separação não é cosmética. Até aqui "transição", "animação de entrada" e
 * "overlay" estavam no mesmo saco, e por isso nenhum dos três tinha vocabulário
 * próprio: `TransitionType` tinha quatro valores, `AnimType` tinha os mesmos
 * quatro, e movimento de câmera era um único número (`kenBurns`) que nem
 * chegava a ter direção na UI.
 *
 *   TRANSIÇÃO  pega DOIS takes — o fim de um e o começo do outro. É a única
 *              categoria que existe entre clipes, e não dentro de um.
 *   ANIMAÇÃO   entrada ou saída de UM elemento. Não conhece o vizinho.
 *   EFEITO     camada sobreposta (partícula, VHS, névoa). Não altera o clipe;
 *              compõe por cima dele com um modo de mesclagem.
 *   CÂMERA     movimento nativo do próprio quadro — zoom, pan, tilt, deriva.
 *              É o que a referência do canal dark faz o tempo todo.
 *
 * O PESO é o parâmetro que faltava. Um zoom pode ser o mesmo movimento em
 * "calmo" e em "agressivo" — o que muda é amplitude e curva. Sem isso, cada
 * ajuste virava um número mágico digitado à mão em cada clipe.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Peso — compartilhado por câmera e transição
// ─────────────────────────────────────────────────────────────────────────────

export type Peso = "calmo" | "medio" | "agressivo";

export const PESOS: readonly Peso[] = ["calmo", "medio", "agressivo"] as const;

/**
 * Multiplicador de amplitude por peso. Os valores saem da medição da
 * referência: o movimento dominante do gênero é de 3% a 8% de escala ao longo
 * de ~20 s. "Calmo" fica abaixo do que o olho identifica como zoom, e é
 * exatamente esse o efeito desejado — a imagem respira sem se anunciar.
 */
export const AMPLITUDE_POR_PESO: Record<Peso, number> = {
  calmo: 0.6,
  medio: 1,
  agressivo: 1.9,
};

/**
 * Fator de DURAÇÃO por peso, aplicado às transições. Agressivo é mais curto,
 * não só mais forte: um whip de 20 frames não é agressivo, é lento e feio.
 */
export const DURACAO_POR_PESO: Record<Peso, number> = {
  calmo: 1.6,
  medio: 1,
  agressivo: 0.55,
};

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 1 — TRANSIÇÕES (dois takes)
// ─────────────────────────────────────────────────────────────────────────────

export type TransicaoId =
  | "corte"
  | "dissolve"
  | "fade-preto"
  | "fade-branco"
  | "push-esq"
  | "push-dir"
  | "push-cima"
  | "push-baixo"
  | "whip-esq"
  | "whip-dir"
  | "wipe-esq"
  | "wipe-dir"
  | "zoom-punch"
  | "zoom-afasta"
  | "blur-dissolve"
  | "glitch";

export interface DefTransicao {
  id: TransicaoId;
  nome: string;
  /** O que ela faz, em uma linha — vira o title do controle na UI. */
  descricao: string;
  /** Duração de referência em frames a 30 fps, antes do fator de peso. */
  framesPadrao: number;
  /** Grupo visual na UI, para a lista não virar um paredão de 16 itens. */
  familia: "corte" | "dissolvencia" | "movimento" | "otica";
}

export const TRANSICOES: readonly DefTransicao[] = [
  { id: "corte", nome: "Corte seco", descricao: "Sem transição — o take seguinte entra inteiro no primeiro frame.", framesPadrao: 0, familia: "corte" },
  { id: "dissolve", nome: "Dissolve", descricao: "Cruzamento de opacidade. É o padrão medido na referência do canal dark.", framesPadrao: 12, familia: "dissolvencia" },
  { id: "fade-preto", nome: "Fade pelo preto", descricao: "O primeiro take some no preto e o segundo nasce dele. Separa capítulos.", framesPadrao: 20, familia: "dissolvencia" },
  { id: "fade-branco", nome: "Fade pelo branco", descricao: "Mesma ideia, estouro claro no meio. Usar com parcimônia — cansa o olho.", framesPadrao: 16, familia: "dissolvencia" },
  { id: "push-esq", nome: "Empurra ← ", descricao: "O take novo empurra o anterior para a esquerda. Os dois se movem juntos.", framesPadrao: 12, familia: "movimento" },
  { id: "push-dir", nome: "Empurra →", descricao: "Idem, para a direita.", framesPadrao: 12, familia: "movimento" },
  { id: "push-cima", nome: "Empurra ↑", descricao: "Empurrão vertical, de baixo para cima.", framesPadrao: 12, familia: "movimento" },
  { id: "push-baixo", nome: "Empurra ↓", descricao: "Empurrão vertical, de cima para baixo.", framesPadrao: 12, familia: "movimento" },
  { id: "whip-esq", nome: "Whip pan ←", descricao: "Empurrão rápido com borrão de movimento. É o corte de energia do formato curto.", framesPadrao: 8, familia: "movimento" },
  { id: "whip-dir", nome: "Whip pan →", descricao: "Idem, para a direita.", framesPadrao: 8, familia: "movimento" },
  { id: "wipe-esq", nome: "Cortina ←", descricao: "O take novo revela-se por uma borda que atravessa o quadro. O anterior fica parado.", framesPadrao: 14, familia: "movimento" },
  { id: "wipe-dir", nome: "Cortina →", descricao: "Idem, no sentido oposto.", framesPadrao: 14, familia: "movimento" },
  { id: "zoom-punch", nome: "Zoom soco", descricao: "O take novo entra grande e assenta. Marca virada de assunto.", framesPadrao: 10, familia: "otica" },
  { id: "zoom-afasta", nome: "Zoom afasta", descricao: "O anterior cresce e sai; o novo entra assentado. Sensação de recuo.", framesPadrao: 12, familia: "otica" },
  { id: "blur-dissolve", nome: "Dissolve desfocado", descricao: "Cruzamento com desfoque no meio. Suaviza troca entre imagens muito diferentes.", framesPadrao: 16, familia: "otica" },
  { id: "glitch", nome: "Glitch", descricao: "Falha de sinal na emenda: deslocamento lateral e separação de canal.", framesPadrao: 8, familia: "otica" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 2 — ANIMAÇÕES (entrada/saída de um elemento)
// ─────────────────────────────────────────────────────────────────────────────

export type AnimacaoId =
  | "nenhuma"
  | "fade"
  | "sobe"
  | "desce"
  | "entra-esq"
  | "entra-dir"
  | "cresce"
  | "encolhe"
  | "pop"
  | "desfoca";

export interface DefAnimacao {
  id: AnimacaoId;
  nome: string;
  descricao: string;
  framesPadrao: number;
}

export const ANIMACOES: readonly DefAnimacao[] = [
  { id: "nenhuma", nome: "Nenhuma", descricao: "Aparece e some sem animação.", framesPadrao: 0 },
  { id: "fade", nome: "Fade", descricao: "Só opacidade. O mais neutro — não compete com o conteúdo.", framesPadrao: 10 },
  { id: "sobe", nome: "Sobe", descricao: "Desliza de baixo para cima com fade. Padrão de legenda e crédito.", framesPadrao: 12 },
  { id: "desce", nome: "Desce", descricao: "Desliza de cima para baixo com fade.", framesPadrao: 12 },
  { id: "entra-esq", nome: "Entra da esquerda", descricao: "Deslize lateral com fade.", framesPadrao: 12 },
  { id: "entra-dir", nome: "Entra da direita", descricao: "Deslize lateral com fade.", framesPadrao: 12 },
  { id: "cresce", nome: "Cresce", descricao: "Escala de menor para o tamanho final, com fade.", framesPadrao: 12 },
  { id: "encolhe", nome: "Encolhe", descricao: "Escala de maior para o tamanho final. Chega com peso.", framesPadrao: 12 },
  { id: "pop", nome: "Pop", descricao: "Cresce passando do alvo e volta. Dá vida a número e selo.", framesPadrao: 14 },
  { id: "desfoca", nome: "Desfoca", descricao: "Entra desfocado e ganha foco. Bom para imagem, ruim para texto pequeno.", framesPadrao: 14 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 3 — EFEITOS (overlays sobrepostos)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Os ids sao os NOMES DE ARQUIVO em `public/library/overlays/`, sem extensao.
 * Nao inventar um id "bonito" e mapear para o arquivo: o mapa seria mais uma
 * coisa para sair de sincronia, e a lista ja e gerada por
 * `assets/comfyui/gera_overlays.py`, que e quem manda no nome.
 */
export type EfeitoId =
  | "particulas-lentas"
  | "particulas-densas"
  | "grao-de-pelicula"
  | "riscos-de-pelicula"
  | "vazamento-quente-esq"
  | "vazamento-frio-dir"
  | "textura-de-papel"
  | "vhs"
  | "linhas-de-tv"
  | "nevoa"
  | "bolhas";

export type BlendMode = "normal" | "screen" | "plus-lighter" | "overlay" | "soft-light" | "multiply";

export interface DefEfeito {
  id: EfeitoId;
  nome: string;
  descricao: string;
  /**
   * Modo de mesclagem. Sem ele o preto do overlay apenas escurece a imagem em
   * vez de sumir — é a diferença entre "não aparece nada" e o efeito funcionar.
   */
  blend: BlendMode;
  /** Opacidade inicial sugerida. */
  opacidade: number;
  familia: "atmosfera" | "pelicula" | "analogico";
}

export const EFEITOS: readonly DefEfeito[] = [
  { id: "particulas-lentas", nome: "Partículas lentas", descricao: "Poeira suspensa, quase parada. É a assinatura do canal dark.", blend: "screen", opacidade: 0.55, familia: "atmosfera" },
  { id: "particulas-densas", nome: "Partículas densas", descricao: "Mais material no ar e mais rápido. Para virada de bloco.", blend: "screen", opacidade: 0.45, familia: "atmosfera" },
  { id: "nevoa", nome: "Névoa", descricao: "Bruma lenta que empurra o fundo para trás.", blend: "screen", opacidade: 0.2, familia: "atmosfera" },
  { id: "bolhas", nome: "Bolhas", descricao: "Esferas subindo devagar. Fora do vocabulário do dark — outros nichos.", blend: "screen", opacidade: 0.4, familia: "atmosfera" },
  { id: "grao-de-pelicula", nome: "Grão de filme", descricao: "Ruído orgânico contínuo. Tira o aspecto liso demais do gerado por IA.", blend: "overlay", opacidade: 0.3, familia: "pelicula" },
  { id: "riscos-de-pelicula", nome: "Riscos de película", descricao: "Arranhões verticais que nascem e somem.", blend: "screen", opacidade: 0.4, familia: "pelicula" },
  { id: "vazamento-quente-esq", nome: "Vazamento quente ←", descricao: "Entrada de luz âmbar pela esquerda, pulsando. Aquece a virada de bloco.", blend: "screen", opacidade: 0.5, familia: "pelicula" },
  { id: "vazamento-frio-dir", nome: "Vazamento frio →", descricao: "Idem em azul, pela direita. Combina com a paleta teal da referência.", blend: "screen", opacidade: 0.5, familia: "pelicula" },
  { id: "textura-de-papel", nome: "Textura de papel", descricao: "Fibra de papel em cinza médio. Precisa de soft-light — em screen só clareia.", blend: "soft-light", opacidade: 0.35, familia: "pelicula" },
  { id: "vhs", nome: "VHS", descricao: "Fita gasta: sangramento de cor e banda rolando.", blend: "screen", opacidade: 0.4, familia: "analogico" },
  { id: "linhas-de-tv", nome: "Linhas de TV", descricao: "Varredura de tubo. Em screen clareia a imagem inteira; aqui é overlay.", blend: "overlay", opacidade: 0.35, familia: "analogico" },
] as const;

/** Caminho servido pelo Next para o arquivo do efeito. */
export const srcDoEfeito = (id: EfeitoId): string => `/library/overlays/${id}.mp4`;

/**
 * Duração do arquivo de overlay, em segundos. Todos são gerados com a mesma
 * duração e em LOOP PERFEITO (o movimento é periódico e o último quadro encosta
 * no primeiro), então cobrir uma janela longa é repetir o clipe.
 */
export const DURACAO_OVERLAY_S = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 4 — CÂMERA (movimento nativo do quadro)
// ─────────────────────────────────────────────────────────────────────────────

export type CameraId =
  | "parada"
  | "zoom-in"
  | "zoom-out"
  | "pan-esq"
  | "pan-dir"
  | "tilt-cima"
  | "tilt-baixo"
  | "push-diagonal"
  | "deriva"
  | "handheld";

export type CameraCurva = "linear" | "suave" | "acelera" | "desacelera";

export interface DefCamera {
  id: CameraId;
  nome: string;
  descricao: string;
  /** Escala extra no fim do movimento (fração). 0 = sem zoom. */
  escala: number;
  /** Deslocamento em % do quadro, ao longo de todo o clipe. */
  panX: number;
  panY: number;
  /**
   * Um pan sem folga de escala mostra a borda do quadro. Todo movimento
   * lateral exige zoom mínimo — este é o piso, antes do peso.
   */
  escalaMinima: number;
  curvaPadrao: CameraCurva;
}

export const CAMERAS: readonly DefCamera[] = [
  { id: "parada", nome: "Parada", descricao: "Quadro fixo. Vale mais do que parece: uma peça inteira em movimento cansa.", escala: 0, panX: 0, panY: 0, escalaMinima: 0, curvaPadrao: "linear" },
  { id: "zoom-in", nome: "Zoom in", descricao: "Aproxima devagar ao longo do clipe. O movimento padrão do gênero.", escala: 0.05, panX: 0, panY: 0, escalaMinima: 0, curvaPadrao: "suave" },
  { id: "zoom-out", nome: "Zoom out", descricao: "Afasta. Use quando a imagem se repete — o mesmo still não se denuncia.", escala: -0.05, panX: 0, panY: 0, escalaMinima: 0.05, curvaPadrao: "suave" },
  { id: "pan-esq", nome: "Pan ←", descricao: "Varre para a esquerda. Exige folga de escala para não mostrar a borda.", escala: 0, panX: -6, panY: 0, escalaMinima: 0.09, curvaPadrao: "suave" },
  { id: "pan-dir", nome: "Pan →", descricao: "Varre para a direita.", escala: 0, panX: 6, panY: 0, escalaMinima: 0.09, curvaPadrao: "suave" },
  { id: "tilt-cima", nome: "Tilt ↑", descricao: "Sobe pelo quadro. Bom em coluna e estátua de corpo inteiro.", escala: 0, panX: 0, panY: -6, escalaMinima: 0.09, curvaPadrao: "suave" },
  { id: "tilt-baixo", nome: "Tilt ↓", descricao: "Desce pelo quadro.", escala: 0, panX: 0, panY: 6, escalaMinima: 0.09, curvaPadrao: "suave" },
  { id: "push-diagonal", nome: "Push diagonal", descricao: "Aproxima varrendo. Mais cinematográfico que o zoom reto.", escala: 0.06, panX: 3, panY: -2, escalaMinima: 0.06, curvaPadrao: "desacelera" },
  { id: "deriva", nome: "Deriva", descricao: "Movimento lento e sem destino, quase imperceptível. Dá vida a still parado.", escala: 0.02, panX: 2, panY: 1, escalaMinima: 0.04, curvaPadrao: "linear" },
  { id: "handheld", nome: "Câmera na mão", descricao: "Tremor sutil e contínuo, sem deslocamento líquido. Quebra a frieza do gerado.", escala: 0, panX: 0, panY: 0, escalaMinima: 0.03, curvaPadrao: "linear" },
] as const;

/** Movimento de câmera de um clipe. Peso e curva são o que se ajusta no dia a dia. */
export interface CameraMove {
  tipo: CameraId;
  peso?: Peso;
  curva?: CameraCurva;
  /**
   * Override fino de amplitude (multiplicador sobre o peso). Existe para o caso
   * em que a tabela não serve, e não para ser o caminho normal — se você está
   * digitando isto em todo clipe, o peso está calibrado errado.
   */
  intensidade?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolução
// ─────────────────────────────────────────────────────────────────────────────

export const defCameraUI = (id: CameraId): DefCamera => CAMERAS.find((c) => c.id === id) ?? CAMERAS[0];
export const defTransicao = (id: TransicaoId): DefTransicao =>
  TRANSICOES.find((t) => t.id === id) ?? TRANSICOES[1];
export const defAnimacao = (id: AnimacaoId): DefAnimacao =>
  ANIMACOES.find((a) => a.id === id) ?? ANIMACOES[0];
export const defEfeito = (id: EfeitoId): DefEfeito | undefined => EFEITOS.find((e) => e.id === id);

/** Progresso 0..1 já com a curva aplicada. */
export function aplicarCurva(p: number, curva: CameraCurva): number {
  const t = Math.max(0, Math.min(1, p));
  switch (curva) {
    case "acelera":
      return t * t;
    case "desacelera":
      return 1 - (1 - t) * (1 - t);
    case "suave":
      return t * t * (3 - 2 * t); // smoothstep
    default:
      return t;
  }
}

export interface CameraTransform {
  scale: number;
  /** Deslocamento em % do quadro (translate). */
  x: number;
  y: number;
}

/**
 * O transform da câmera no frame `f` de um clipe de `dur` frames.
 *
 * A escala nunca fica abaixo de 1: sob 1, o quadro encolhe e aparece o fundo.
 * Por isso `zoom-out` é modelado como "começa ampliado e volta ao natural", e
 * não como "encolhe" — o resultado na tela é o mesmo e a borda fica coberta.
 */
export function cameraTransform(mv: CameraMove | undefined, f: number, dur: number): CameraTransform {
  const parado: CameraTransform = { scale: 1, x: 0, y: 0 };
  if (!mv || mv.tipo === "parada") return parado;

  const d = defCameraUI(mv.tipo);
  const k = AMPLITUDE_POR_PESO[mv.peso ?? "medio"] * (mv.intensidade ?? 1);
  const total = Math.max(1, dur);
  const p = aplicarCurva(f / total, mv.curva ?? d.curvaPadrao);

  // Tremor da câmera na mão: duas senoides de período incomensurável, para o
  // padrão não se repetir de forma audível ao olho dentro do clipe.
  if (mv.tipo === "handheld") {
    const a = 0.45 * k;
    return {
      scale: 1 + d.escalaMinima * k,
      x: a * Math.sin(f / 7.3),
      y: a * Math.sin(f / 11.7 + 1.1),
    };
  }

  const folga = d.escalaMinima * k;
  const amp = d.escala * k;
  // Amplitude negativa = afasta: começa ampliado e assenta.
  const escala = amp >= 0 ? 1 + folga + amp * p : 1 + folga + Math.abs(amp) * (1 - p);

  return {
    scale: escala,
    x: (d.panX * k) * p,
    y: (d.panY * k) * p,
  };
}

/** Duração efetiva de uma transição, em frames, já com o peso aplicado. */
export function framesDaTransicao(id: TransicaoId, peso: Peso = "medio", override?: number): number {
  if (id === "corte") return 0;
  if (override !== undefined && override > 0) return Math.round(override);
  return Math.max(1, Math.round(defTransicao(id).framesPadrao * DURACAO_POR_PESO[peso]));
}

/**
 * Converte o `kenBurns` legado (um número, positivo aproxima) num movimento de
 * câmera. As timelines já geradas continuam abrindo — e passam a ser editáveis
 * pelos mesmos controles das novas.
 */
export function cameraDoKenBurns(kb: number | undefined): CameraMove | undefined {
  if (!kb) return undefined;
  const mag = Math.abs(kb);
  const peso: Peso = mag <= 0.035 ? "calmo" : mag >= 0.09 ? "agressivo" : "medio";
  const base = defCameraUI(kb > 0 ? "zoom-in" : "zoom-out").escala;
  return {
    tipo: kb > 0 ? "zoom-in" : "zoom-out",
    peso,
    // preserva a amplitude EXATA do valor antigo, para o preview não mudar
    intensidade: mag / (Math.abs(base) * AMPLITUDE_POR_PESO[peso]),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidade com o vocabulário antigo
//
// `TransitionType` tinha quatro valores e `AnimType` tinha os mesmos quatro.
// Timelines já salvas usam esses nomes, e não vale reescrevê-las: o mapa
// abaixo traduz na leitura. Ele é a ÚNICA porta de entrada do valor antigo —
// nenhum renderer deve conhecer "slide" ou "zoom".
// ─────────────────────────────────────────────────────────────────────────────

const LEGADO_TRANSICAO: Record<string, TransicaoId> = {
  none: "corte",
  cut: "corte",
  dissolve: "dissolve",
  fade: "dissolve",
  slide: "push-esq",
  zoom: "zoom-punch",
};

const LEGADO_ANIMACAO: Record<string, AnimacaoId> = {
  none: "nenhuma",
  fade: "fade",
  slide: "sobe",
  zoom: "cresce",
};

const ehTransicao = (v: string): v is TransicaoId => TRANSICOES.some((t) => t.id === v);
const ehAnimacao = (v: string): v is AnimacaoId => ANIMACOES.some((a) => a.id === v);

/** Aceita id novo OU nome antigo; devolve sempre um id do catálogo. */
export function normalizaTransicao(v: string | undefined): TransicaoId {
  if (!v) return "dissolve";
  if (ehTransicao(v)) return v;
  return LEGADO_TRANSICAO[v] ?? "dissolve";
}

export function normalizaAnimacao(v: string | undefined): AnimacaoId {
  if (!v) return "nenhuma";
  if (ehAnimacao(v)) return v;
  return LEGADO_ANIMACAO[v] ?? "nenhuma";
}
