/**
 * Tipos do timeline auto-montado (MVC-08). O timeline JSON é a ponte entre a
 * Fase A (o plano + material bruto) e a composição Remotion da Fase B.
 */

/**
 * Papel do clipe no arco. Os literais conhecidos ganham cor/ordem canônica;
 * VEX-06: papéis NOVOS vindos do plano (assembly.clips) são aceitos — a UI
 * degrada com cor derivada e o enquadramento cai no default de insert.
 */
export type ClipRole =
  | "hook"
  | "skill"
  | "reference"
  | "generation"
  | "result"
  | "cta"
  | "unknown"
  | (string & {});

export interface TimelineClip {
  /** Nome do arquivo (servido via publicDir = pasta de materiais). */
  file: string;
  /** Caminho absoluto no disco (debug / resolução). */
  absPath: string;
  role: ClipRole;
  /** Duração que o clip OCUPA na timeline (= janela narração-driven no miolo). */
  durationSeconds: number;
  durationInFrames: number;
  /** Duração NATIVA do arquivo (antes de esticar/comprimir para a janela). */
  nativeDurationInFrames: number;
  /**
   * Velocidade de reprodução para encaixar o nativo na janela
   * (`native/window`). <1 = câmera lenta (screen captures longos);
   * >1 = acelera; 1 = talking-heads (hook/cta), sem alterar a fala.
   */
  playbackRate: number;
  width: number;
  height: number;
  /** Frame inicial na faixa de vídeo. */
  startFrame: number;
  /**
   * In-point: frame de ORIGEM onde o clipe começa a tocar (corte/split pela
   * esquerda). Default 0 (toca do início). Em SOURCE frames do arquivo.
   */
  trimStartFrames?: number;
  /**
   * Se o clip toca o PRÓPRIO áudio (talking-heads: hook/cta) ou fica mudo
   * (screen captures, cobertos pela narração). Modelo de áudio híbrido.
   */
  audioEnabled: boolean;
  /** Clip não encontrado no disco → placeholder visível (não quebra o render). */
  gap?: boolean;
  /** Volume 0..1 do áudio PRÓPRIO do clipe (talking-heads). Default 1. */
  volume?: number;
  /** Transição de ENTRADA (do clipe anterior para este). idx 0 não usa. */
  transitionIn?: { type: TransitionType; durationInFrames: number };
  /** Enquadramento (override): auto = por papel; cover; panel (tela cheia no aspect). */
  frameMode?: "auto" | "cover" | "panel";
  /** Zoom lento (Ken Burns): 0 = nenhum; ~0.06 = sutil. */
  kenBurns?: number;
}

export type TransitionType = "none" | "dissolve" | "slide" | "zoom";

/**
 * Trecho de fala mantido da narração (auto-cut de respiros). Tocado
 * consecutivamente: `srcFromFrame` é o offset no ARQUIVO; cada segmento dura
 * `durationInFrames`. A soma dos segmentos = janela efetiva da narração. Os
 * segmentos são a fonte única do mapeamento tempo-de-fonte → tempo-de-saída
 * (usado para janelas dos inserts E legendas).
 */
export interface AudioSegment {
  srcFromFrame: number;
  durationInFrames: number;
  /**
   * Posição do segmento na timeline, RELATIVA ao `audioTrack.startFrame`.
   * Default = consecutivo (cumulativo). Cada corte é um clipe independente e
   * pode ser arrastado isoladamente (gaps/sobreposições permitidos).
   */
  startFrame?: number;
}

export interface TimelineAudio {
  file: string;
  absPath: string;
  durationSeconds: number;
  durationInFrames: number;
  /** Frame onde a narração começa na timeline (= início do miolo, após o hook). */
  startFrame: number;
  /**
   * Quantos frames a narração cobre. No modelo narração-driven a narração toca
   * INTEGRAL e o miolo dura exatamente isto; portanto windowFrames ≈ soma dos
   * segmentos (ou duração do arquivo, sem auto-cut).
   */
  windowFrames: number;
  /**
   * Segmentos de fala (auto-cut de respiros). Ausente = toca integral do 0.
   * Presente = toca só estes trechos, consecutivos (silêncios removidos).
   */
  segments?: AudioSegment[];
  // ── VEX-08: mixagem da faixa de narração ──
  /** Silencia a narração no preview E no export. */
  muted?: boolean;
  /** Solo: quando algum track está em solo, só os solados soam. */
  solo?: boolean;
  /** Bloqueia qualquer edição desta faixa na timeline. */
  locked?: boolean;
}

/**
 * Tipo do elemento numa camada extra (modelo NLE). Cada tipo tem seus próprios
 * parâmetros editáveis no painel direito e seu próprio render.
 *   media-audio  → SFX/trilha (Audio)
 *   media-video  → overlay/b-roll de vídeo (Video)
 *   image        → imagem de sobreposição (Img)
 *   text         → bloco de texto livre
 */
export type ElementType = "media-audio" | "media-video" | "image" | "text";

/** Animação de entrada/saída de um elemento. */
export type AnimType = "none" | "fade" | "slide" | "zoom";
export interface ElementAnim {
  type: AnimType;
  durationInFrames: number;
}

/**
 * Elemento de uma camada extra (NLE): objeto tipado, arrastável, com transform
 * (posição/escala) e animações de entrada/saída. `type` ausente = legado:
 * resolve por `layer.kind` (audio → media-audio; video → media-video).
 */
export interface ExtraClip {
  id: string;
  type?: ElementType;
  /** Nome do arquivo (servido via /api/media do criativo). */
  file?: string;
  /** OU URL absoluta (biblioteca em /library/...). */
  src?: string;
  label: string;
  startFrame: number;
  durationInFrames: number;
  /** In-point de origem (corte pela esquerda). */
  srcFromFrame?: number;
  /** Volume 0..1 (elementos de áudio). */
  volume?: number;
  /** Ducking: abaixa automaticamente sob a fala (trilhas de fundo). VEX-05. */
  ducking?: boolean;
  /** Opacidade 0..1 (elementos visuais). */
  opacity?: number;
  // ── Parâmetros de texto ──
  text?: string;
  fontSize?: number;
  color?: string;
  // ── Transform visual (x/y em %, 50/50 = centro; scale: 1 = nativo) ──
  x?: number;
  y?: number;
  scale?: number;
  // ── Animações de entrada/saída ──
  animateIn?: ElementAnim;
  animateOut?: ElementAnim;
}

/** Camada extra inserível: áudio (trilha/SFX), overlay (vídeo/imagem) ou texto. */
export interface ExtraLayer {
  id: string;
  kind: "audio" | "video";
  name: string;
  clips: ExtraClip[];
  // ── VEX-08: mixagem/estado da camada (track headers) ──
  /** Silencia a camada (áudio próprio) no preview E no export. */
  muted?: boolean;
  /** Solo: quando algum track está em solo, só os solados soam. */
  solo?: boolean;
  /** Bloqueia qualquer edição desta camada na timeline. */
  locked?: boolean;
}

export interface Timeline {
  fps: number;
  width: number;
  height: number;
  /** Duração total = faixa de vídeo (max entre vídeo e áudio). */
  durationInFrames: number;
  videoTrack: TimelineClip[];
  // ── VEX-08: mixagem/estado da faixa de vídeo (áudio dos talking-heads) ──
  /** Silencia o áudio próprio dos clipes de vídeo (hook/CTA) no preview E export. */
  videoMuted?: boolean;
  /** Solo da faixa de vídeo. */
  videoSolo?: boolean;
  /** Bloqueia edição na faixa de vídeo. */
  videoLocked?: boolean;
  /** Narração (audio_narrado) — uma faixa paralela. */
  audioTrack: TimelineAudio | null;
  /** Faixa de legenda — placeholder nesta story (estilização é a MVC-09). */
  captionTrack: [];
  /** Camadas extras inseríveis pelo usuário (SFX, trilha, overlays). */
  extraLayers?: ExtraLayer[];
  meta: {
    client: string;
    creative: string;
    videoSeconds: number;
    audioSeconds: number;
    /** Descompasso narração×visual (nota de ritmo do plano). null se alinhado. */
    rhythmGapSeconds: number | null;
    gaps: string[];
  };
}
