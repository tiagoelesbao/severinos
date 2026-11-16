import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { rankingTotalFrames, rankingDurationFrames, splitScreenDurationFrames } from "./rankingMath";

export { rankingTotalFrames, rankingDurationFrames, splitScreenDurationFrames };

/**
 * Registro + helpers do fluxo "Gerar variações" (upload → template → N
 * variações → galeria) — pedido do founder 2026-10-18, foco em ter a MECÂNICA
 * do app funcionando, não em variedade de template (isso fica pra depois).
 *
 * Catálogo de templates hoje = as 2 composições bespoke que já existem
 * (Império/Garantido), cada uma lendo o `hook_packs` do seu
 * `video-templates.yaml` real (squads/virals-marketing-squad/data/clients/
 * <slug>/video-templates.yaml) pra montar as variações — mesmo dado que já
 * alimenta `scripts/render-imperio-recipe.mjs`/`render-garantido-recipe.mjs`,
 * não uma cópia paralela.
 */

export const REPO = path.resolve(process.cwd(), "../..");

export interface HookPack {
  id: string;
  label: string;
  camera: string; // CameraId do fxCatalog ("zoom-in" | "zoom-out" | "parada" | ...)
}

export interface HeadlineDefault {
  text: string;
  highlightWord?: string;
}

/**
 * Formato de headline do template — cada cliente tem o próprio shape visual
 * (Império: 1 linha + palavra destacada; Garantido: linha fixa + linha 2 em
 * palavras com 1 destacada) e o frontend precisa saber qual campo desenhar
 * na tela "Configurar copy". `default*` alimenta tanto o valor pré-preenchido
 * do campo quanto o fallback real do render quando o usuário pula a tela.
 */
export type HeadlineShape =
  | { kind: "simple"; defaultText: string; defaultHighlight: string }
  | { kind: "two-line"; defaultLine1: string; defaultLine2Words: string[]; defaultHighlightWord: string };

/**
 * Overrides que o usuário preenche na tela "Configurar copy" (pedido do
 * founder 2026-10-18: "inserir campos pra eu mesmo selecionar a copy...
 * upar qual tela quero pro celular... copys dos gadgets"). `headline*` é por
 * VARIAÇÃO (hook) — cada uma pode ter copy diferente; `phoneScreenFile`/
 * `tags` são compartilhados entre as variações do mesmo template (descrevem
 * o produto, não o hook). Tudo opcional — ausente usa o default do template.
 */
export interface VariantOverrides {
  headlineText?: string;
  headlineHighlight?: string;
  headlineLine1?: string;
  headlineLine2Words?: string[];
  headlineHighlightWord?: string;
  phoneScreenFile?: string;
  tags?: { title: string; sub: string }[];
  /** Posições do ranking de prêmios (template "Ranking de Prêmios" — 2026-10-18). */
  rankingItems?: { position: string; value: string }[];
  /** Headline acima do ranking (2026-10-18 — antes era "Prêmios de hoje" fixo). */
  rankingHeadlineText?: string;
  /** Mesclagem na emenda take/painel da Tela Dividida — "suave" ou "dura" (2026-10-18). */
  blendType?: "suave" | "dura";
  /** Painel da Tela Dividida animado ("video") ou estático ("imagem") — 2026-10-18. */
  contentMode?: "video" | "imagem";
  /** Headline centralizada com fundo sólido na emenda, substituindo a do painel — 2026-10-18. */
  centerHeadlineEnabled?: boolean;
  /** Copy do painel da Tela Dividida (sem celular) — 2026-10-18. */
  splitCopyText?: string;
  /** Texto do botão/elemento complementar do painel da Tela Dividida — 2026-10-18. */
  splitButtonLabel?: string;
  /** Duração (frames) do vídeo-fonte probado — 2026-10-19, correção do bug
   * "upei 7s, saiu 6s": Ranking/Tela Dividida usam isso pra durar o vídeo
   * INTEIRO escolhido, não uma constante pensada pro template anterior. */
  sourceDurationFrames?: number;
  /** Topo ou base do quadro (Ranking) — 2026-10-19, founder: "como vai ter
   * legenda, o ranking tem que ir pra cima ou abaixo da legenda". */
  rankingPosition?: "top" | "bottom";
  /** Legenda automática (2026-10-19, founder: "o motor de legendar vídeo
   * automático pronto... posicionamento otimizado pra redes sociais") — liga/
   * desliga + estilo. `captions` é a transcrição REAL (Whisper via
   * scripts/transcribe.py), populada em route.ts — NUNCA vem do cliente, o
   * texto é desconhecido até a transcrição rodar. */
  captionsEnabled?: boolean;
  captionRenderer?: "word-pop" | "mono-bold" | "underline" | "clean" | "gradient";
  /** 1 ou 2 linhas por bloco de legenda. */
  captionLines?: 1 | 2;
  /** true = 1 palavra por cue (karaokê puro), false = blocos de frase. */
  captionWordByWord?: boolean;
  /** Realce da palavra falada (karaokê de cor) — default por estilo quando ausente. */
  captionHighlight?: boolean;
  /** Id de FONT_CHOICES (fontChoices.ts) — sobrepõe a fonte default do estilo. */
  captionFontFamily?: string;
  captions?: { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null }[];
}

/** Assets/copy configuráveis pelo usuário além da headline — presença aqui é
 * o que faz a tela "Configurar copy" mostrar o campo (templates sem isso,
 * ex. Império, não ganham campo de tela/pílula). */
export interface ConfigurableAssets {
  phoneScreen?: { label: string; defaultFile: string };
  tags?: { label: string; defaults: { title: string; sub: string }[] };
  rankingItems?: { label: string; defaults: { position: string; value: string }[] };
  /** Headline acima do ranking — texto livre (2026-10-18). */
  rankingHeadline?: { label: string; defaultText: string };
  /** Select — mesclagem na emenda da Tela Dividida (2026-10-18). */
  blendType?: { label: string; options: { value: "suave" | "dura"; label: string }[]; defaultValue: "suave" | "dura" };
  /** Select — painel animado ou estático (2026-10-18). */
  contentMode?: { label: string; options: { value: "video" | "imagem"; label: string }[]; defaultValue: "video" | "imagem" };
  /** Toggle — headline central com fundo sólido (2026-10-18). */
  centerHeadline?: { label: string; defaultValue: boolean };
  /** Texto livre — copy do painel da Tela Dividida (2026-10-18). */
  splitCopyText?: { label: string; defaultText: string };
  /** Texto livre — label do botão/elemento complementar (2026-10-18). */
  splitButtonLabel?: { label: string; defaultText: string };
  /** Select — topo ou base do quadro do Ranking (2026-10-19). */
  rankingPosition?: { label: string; options: { value: "top" | "bottom"; label: string }[]; defaultValue: "top" | "bottom" };
  /** Legenda automática (2026-10-19) — presença aqui é o que faz a tela
   * "Configurar copy" mostrar o bloco de legenda pra este template. */
  captions?: {
    label: string;
    defaultEnabled: boolean;
    rendererOptions: { value: string; label: string }[];
    defaultRenderer: string;
  };
}

export interface OpeningCaption {
  text: string;
  startFrame: number;
  durationInFrames: number;
  /** marginTop em px na comp 1080×1920 — convertido pra % na ponte do editor. */
  yPx: number;
}

export interface TemplateConfig {
  id: string; // usado na URL/seleção
  client: string; // slug do cliente (pasta em data/clients/<slug>)
  clientLabel: string; // nome de exibição do cliente (tela de seleção de cliente)
  label: string;
  compositionId: string; // id registrado em src/remotion/index.ts
  /** Diretório (absoluto) com o(s) asset(s) estático(s) extra que a composição
   * precisa além do take enviado pelo usuário (ex.: print da tela do app do
   * Garantido) — copiado pra dentro da sessão antes do bundle. Vazio = nenhum. */
  extraAssetsDir: string | null;
  extraAssetFiles: string[]; // paths relativos (dentro de extraAssetsDir) a copiar
  headline: HeadlineShape;
  /** Tela/pílulas configuráveis — ausente = template não tem esses campos. */
  configurableAssets?: ConfigurableAssets;
  /** Monta o inputProps de 1 variação a partir do hook escolhido, do nome do
   * take já salvo na sessão (sempre "source<ext>") e dos overrides que o
   * usuário preencheu (ou {} se pulou a tela — cada composição usa seu
   * próprio default nesse caso). */
  buildInputProps: (hookCamera: string, takeFileName: string, overrides: VariantOverrides) => Record<string, unknown>;
  // ── Ponte pro editor (/studio) — ver lib/generateEditorBridge.ts ──
  fps: number;
  width: number;
  height: number;
  /** Frame onde a transição (take → encerramento de marca) COMEÇA — é também
   * a duração do clipe 1 (take) na ponte pro editor: cortar aqui preserva
   * continuidade exata de frame com o clipe 2 (que já inclui a transição
   * cravada, extraída do render pronto). */
  splitAtFrame: number;
  /** Duração total da composição (frames) — clipe 2 = totalFrames - splitAtFrame. */
  totalFrames: number;
  /** Legendas de abertura (sobre o take) — mesmos textos/timings cravados na
   * composição, viram elementos de texto DE VERDADE (editáveis) na ponte. */
  openingCaptions: OpeningCaption[];
  /**
   * Quando true, a ponte "Editar" NÃO extrai o encerramento do .mp4 já
   * renderizado (ffmpeg, clipe único "queimado") — em vez disso renderiza
   * de novo as composições de CAMADA (`EndingLayers.tsx`): fundo (clipe 2,
   * com movimento) + telefone/CTA como imagens PNG transparentes
   * removíveis/editáveis individualmente. Ver generateEditorBridge.ts.
   * Fora disso (false/ausente) mantém o comportamento anterior (clipe único).
   */
  decomposedEnding?: {
    bgCompositionId: string;
    headlineCompositionId: string;
    phoneCompositionId: string;
    ctaCompositionId: string;
    ctaSubtitleCompositionId: string;
    endingFrames: number; // duração do fundo/camadas (= totalFrames - splitAtFrame)
  };
  /**
   * Quando true, o template NÃO TEM fase de encerramento separada — a peça
   * inteira é "clipe 1" (2026-10-18, founder sobre Ranking/Tela Dividida: "a
   * transição final... pode remover do template, isso pertence ao template
   * 01 apenas"). A ponte do editor (generateEditorBridge.ts) não tenta
   * extrair/decompor nada depois de `totalFrames` — `splitAtFrame` deve ser
   * igual a `totalFrames` neste caso (não há "antes"/"depois" pra cortar).
   */
  noEnding?: boolean;
}

function readHookPacks(videoTemplatesYamlPath: string): HookPack[] {
  const raw = parse(fs.readFileSync(videoTemplatesYamlPath, "utf-8")) as {
    hook_packs?: { id: string; label: string; camera: string }[];
  };
  return (raw.hook_packs ?? []).map((h) => ({ id: h.id, label: h.label, camera: h.camera }));
}

const CLIENTS_DATA_DIR = path.join(REPO, "squads/virals-marketing-squad/data/clients");

/**
 * Legenda automática (2026-10-19, founder: "o motor de legendar vídeo
 * automático pronto, inclusive com posicionamento otimizado pra redes
 * sociais") — mesmo bloco de config em TODOS os templates novos (Garantido/
 * Império × Tela Dividida/Ranking), por isso compartilhado em vez de
 * repetido 4x. `rendererOptions` espelha `CaptionRenderer` de fxRegistry.ts.
 */
const CAPTION_RENDERER_OPTIONS = [
  { value: "clean", label: "Clean (sem destaque, discreta)" },
  { value: "word-pop", label: "Word Pop (pulso na palavra falada)" },
  { value: "mono-bold", label: "Mono Bold (bloco só, sem karaokê)" },
  { value: "underline", label: "Underline (sublinha a palavra ativa)" },
  { value: "gradient", label: "Gradient (efeito togi, wipe de cor)" },
];
const CAPTIONS_CONFIG = {
  label: "Legenda automática (transcrição real do áudio — Whisper)",
  defaultEnabled: false,
  rendererOptions: CAPTION_RENDERER_OPTIONS,
  defaultRenderer: "clean",
};

/** Campos de legenda que TODO template novo repassa igual pro inputProps —
 * extraído pra não duplicar 4x dentro de cada `buildInputProps`. `captions`
 * só é anexado quando `captionsEnabled` (a transcrição em si já foi
 * calculada em route.ts e injetada em `overrides.captions` antes daqui). */
function captionInputProps(overrides: VariantOverrides) {
  return {
    captions: overrides.captionsEnabled ? overrides.captions : undefined,
    captionRenderer: overrides.captionRenderer,
    captionLines: overrides.captionLines,
    captionWordByWord: overrides.captionWordByWord,
    captionHighlight: overrides.captionHighlight,
    captionFontFamily: overrides.captionFontFamily,
  };
}

const TEMPLATE_DEFS: TemplateConfig[] = [
  {
    id: "imperio-ignicao-punho",
    client: "imperio-premios",
    clientLabel: "Império Prêmios",
    label: "Império Prêmios — Ignição do Punho",
    compositionId: "ImperioIgnicaoPunho",
    extraAssetsDir: null,
    extraAssetFiles: [],
    headline: { kind: "simple", defaultText: "ESSA PODE SER A SUA VITÓRIA.", defaultHighlight: "VITÓRIA." },
    buildInputProps: (hookCamera, takeFileName, overrides) => ({
      takeFile: takeFileName,
      hookCamera,
      headlineCopy: {
        text: overrides.headlineText ?? "ESSA PODE SER A SUA VITÓRIA.",
        highlightWord: overrides.headlineHighlight ?? "VITÓRIA.",
      },
    }),
    // Constantes espelhadas de ImperioIgnicaoPunho.tsx (TAKE1_FRAMES/BRIDGE/
    // TOTAL_FRAMES) — se a composição mudar esses números, atualizar aqui
    // junto (não há import cross-runtime prático entre o worker Remotion e
    // as rotas Next neste ponto).
    fps: 30,
    width: 1080,
    height: 1920,
    splitAtFrame: 121, // TAKE1_FRAMES(141) - BRIDGE(20)
    totalFrames: 256,
    openingCaptions: [
      { text: "A CHANCE JÁ TÁ ABERTA.", startFrame: 12, durationInFrames: 46, yPx: 500 },
      { text: "100 NÚMEROS. VÁRIAS RODADAS POR DIA.", startFrame: 64, durationInFrames: 50, yPx: 500 },
    ],
  },
  {
    id: "garantido-take2-ad",
    client: "garantido-premios",
    clientLabel: "Garantido Prêmios",
    label: "Garantido Prêmios — Take 2 Ad",
    compositionId: "GarantidoTake2Ad",
    // `rel` precisa manter o MESMO subcaminho que `staticFile("garantido/...")`
    // espera dentro do publicDir — por isso extraAssetsDir é a raiz `public/`
    // (não `public/garantido/`) e o arquivo carrega o prefixo "garantido/".
    extraAssetsDir: path.join(path.resolve(process.cwd()), "public"),
    extraAssetFiles: ["garantido/tela-app-garantido.png"],
    // Copy real aprovada (GARANTIDO_HEADLINES.take2 em GarantidoAds.tsx) —
    // vira o valor pré-preenchido do campo na tela "Configurar copy" E o
    // fallback real do render quando o usuário não mexe nele.
    headline: {
      kind: "two-line",
      defaultLine1: "A ESPERA ACABA RÁPIDO.",
      defaultLine2Words: ["O PAGAMENTO", "TAMBÉM."],
      defaultHighlightWord: "TAMBÉM.",
    },
    // 2026-10-18 (founder): "eu upar qual tela que quero pro celular...
    // copys dos gadgets que aparecem ao redor" — ver PhoneMockup.tsx pros
    // defaults (DEFAULT_PHONE_TAGS) espelhados abaixo.
    configurableAssets: {
      phoneScreen: { label: "Tela do celular (print do app)", defaultFile: "garantido/tela-app-garantido.png" },
      tags: {
        label: "Pílulas flutuantes ao redor do celular",
        defaults: [
          { title: "100 números", sub: "rápido de acompanhar" },
          { title: "Pagamento imediato", sub: "após a confirmação" },
        ],
      },
    },
    // BUG (2026-10-18, achado pelo founder): essa função recebia `headline`
    // e IGNORAVA (prefixo `_`) — toda variação saía com a mesma copy
    // cravada, por isso as 3 variações do último teste vieram idênticas.
    // Agora usa overrides de verdade, com fallback pro mesmo texto de antes.
    buildInputProps: (hookCamera, takeFileName, overrides) => ({
      takeFile: takeFileName,
      hookCamera,
      headlineCopy: {
        line1: overrides.headlineLine1 ?? "A ESPERA ACABA RÁPIDO.",
        line2Words: overrides.headlineLine2Words ?? ["O PAGAMENTO", "TAMBÉM."],
        highlightWord: overrides.headlineHighlightWord ?? "TAMBÉM.",
      },
      // undefined = a composição usa o próprio default interno.
      phoneScreenFile: overrides.phoneScreenFile,
      tags: overrides.tags,
    }),
    // Constantes espelhadas de GarantidoAds.tsx (TAKE2_FRAMES/BRIDGE/PHONE_FRAMES).
    fps: 30,
    width: 1080,
    height: 1920,
    splitAtFrame: 191, // TAKE2_FRAMES(213) - BRIDGE(22)
    totalFrames: 383, // TAKE2_FRAMES(213) + PHONE_FRAMES(170)
    openingCaptions: [
      { text: "O prêmio chegou de verdade.", startFrame: 50, durationInFrames: 120, yPx: 820 },
    ],
    // 2026-10-18 (founder): "esse template a ÚNICA coisa que ele vai fazer
    // é acrescentar o motion final... quero cada camada editável" — ver
    // src/remotion/clients/garantido/EndingLayers.tsx.
    decomposedEnding: {
      bgCompositionId: "GarantidoEndingBg",
      headlineCompositionId: "GarantidoEndingHeadline",
      phoneCompositionId: "GarantidoEndingPhone",
      ctaCompositionId: "GarantidoEndingCta",
      ctaSubtitleCompositionId: "GarantidoEndingCtaSubtitle",
      endingFrames: 170, // PHONE_FRAMES
    },
  },
  {
    // 2026-10-18 (founder: "duas novas opções de template... estude algum
    // formato interessante", confirmado via AskUserQuestion: "Tela dividida
    // + Ranking de prêmios"). REESCRITO no mesmo dia: a v1 reaproveitava o
    // encerramento (celular+transição) do Take2Ad — o founder definiu que
    // isso "pertence ao template 01 apenas". Agora é peça de 1 fase só, sem
    // celular: painel de baixo é copy estilizada (headline/central + texto +
    // botão + balões), com mesclagem e modo estático/animado configuráveis.
    id: "garantido-split-screen",
    client: "garantido-premios",
    clientLabel: "Garantido Prêmios",
    label: "Garantido Prêmios — Tela Dividida",
    compositionId: "GarantidoSplitScreenAd",
    extraAssetsDir: null,
    extraAssetFiles: [],
    headline: {
      kind: "two-line",
      defaultLine1: "A ESPERA ACABA RÁPIDO.",
      defaultLine2Words: ["O PAGAMENTO", "TAMBÉM."],
      defaultHighlightWord: "TAMBÉM.",
    },
    // Sem `tags` de propósito (2026-10-19, founder: "pode remover os
    // elementos gadgets que surgem, não estão harmônicos") — a Tela
    // Dividida não tem mais balões de notificação.
    configurableAssets: {
      blendType: {
        label: "Mesclagem entre o take (cima) e o painel (baixo)",
        options: [
          { value: "suave", label: "Suave (gradiente)" },
          { value: "dura", label: "Dura (corte limpo)" },
        ],
        defaultValue: "dura",
      },
      contentMode: {
        label: "Painel de baixo",
        options: [
          { value: "video", label: "Vídeo (animado)" },
          { value: "imagem", label: "Imagem (estático)" },
        ],
        defaultValue: "video",
      },
      centerHeadline: {
        label: "Headline central com fundo sólido (em vez de dentro do painel)",
        defaultValue: false,
      },
      splitCopyText: {
        label: "Copy do painel",
        defaultText: "Participe agora e acompanhe tudo em tempo real, direto no app.",
      },
      splitButtonLabel: {
        label: "Texto do botão do painel",
        defaultText: "Ver oferta agora",
      },
      captions: CAPTIONS_CONFIG,
    },
    buildInputProps: (hookCamera, takeFileName, overrides) => ({
      takeFile: takeFileName,
      hookCamera,
      headlineCopy: {
        line1: overrides.headlineLine1 ?? "A ESPERA ACABA RÁPIDO.",
        line2Words: overrides.headlineLine2Words ?? ["O PAGAMENTO", "TAMBÉM."],
        highlightWord: overrides.headlineHighlightWord ?? "TAMBÉM.",
      },
      blendType: overrides.blendType,
      contentMode: overrides.contentMode,
      centerHeadlineEnabled: overrides.centerHeadlineEnabled,
      splitCopyText: overrides.splitCopyText,
      splitButtonLabel: overrides.splitButtonLabel,
      sourceDurationFrames: overrides.sourceDurationFrames,
      ...captionInputProps(overrides),
    }),
    // Peça de 1 fase só, sem encerramento: splitAtFrame = totalFrames (nada a
    // cortar "depois", ver `noEnding` em generateEditorBridge.ts). A duração
    // REAL é a do vídeo-fonte (sourceDurationFrames, probado em route.ts) —
    // o valor fixo aqui é só o default de exibição no catálogo antes do
    // upload (ver `splitScreenDurationFrames` em rankingMath.ts).
    fps: 30,
    width: 1080,
    height: 1920,
    splitAtFrame: splitScreenDurationFrames(undefined, 200),
    totalFrames: splitScreenDurationFrames(undefined, 200),
    openingCaptions: [], // sem legenda de abertura própria — o painel do produto já carrega a copy
    noEnding: true,
  },
  {
    // REESCRITO 2026-10-18 (mesmo motivo do split-screen acima): sem
    // celular/transição final; overlay escuro fixo destaca o prêmio;
    // quantidade de ganhadores e headline acima do ranking são variáveis.
    id: "garantido-ranking",
    client: "garantido-premios",
    clientLabel: "Garantido Prêmios",
    label: "Garantido Prêmios — Ranking de Prêmios",
    compositionId: "GarantidoRankingAd",
    extraAssetsDir: null,
    extraAssetFiles: [],
    headline: {
      kind: "two-line",
      defaultLine1: "A ESPERA ACABA RÁPIDO.",
      defaultLine2Words: ["O PAGAMENTO", "TAMBÉM."],
      defaultHighlightWord: "TAMBÉM.",
    },
    configurableAssets: {
      rankingHeadline: {
        label: "Headline acima do ranking",
        defaultText: "Prêmios de hoje",
      },
      rankingItems: {
        label: "Posições do ranking de prêmios (quantidade de ganhadores)",
        defaults: [
          { position: "1º lugar", value: "R$ 800" },
          { position: "2º lugar", value: "R$ 250" },
          { position: "3º lugar", value: "R$ 150" },
        ],
      },
      rankingPosition: {
        label: "Posição do ranking no quadro",
        options: [
          { value: "bottom", label: "Base do vídeo" },
          { value: "top", label: "Topo do vídeo (evita colisão com legenda)" },
        ],
        defaultValue: "bottom",
      },
      captions: CAPTIONS_CONFIG,
    },
    buildInputProps: (hookCamera, takeFileName, overrides) => ({
      takeFile: takeFileName,
      hookCamera,
      rankingHeadlineText: overrides.rankingHeadlineText,
      rankingItems: overrides.rankingItems,
      rankingPosition: overrides.rankingPosition,
      sourceDurationFrames: overrides.sourceDurationFrames,
      ...captionInputProps(overrides),
    }),
    // Duração REAL é a do vídeo-fonte (com piso pra sempre dar tempo de
    // revelar a quantidade de ganhadores escolhida) — ver
    // `rankingDurationFrames` em rankingMath.ts + `calculateMetadata` na
    // composição. O valor aqui é só o default (3 itens, sem vídeo ainda).
    fps: 30,
    width: 1080,
    height: 1920,
    splitAtFrame: rankingDurationFrames(3, undefined),
    totalFrames: rankingDurationFrames(3, undefined),
    openingCaptions: [],
    noEnding: true,
  },
  {
    // Império — MESMAS 2 variações de template da Garantido (Tela Dividida
    // + Ranking), pele visual própria (2026-10-19, founder: "modifique o
    // estilo visual e paleta de cores, pra não ficar uma edição igual em
    // dois clientes do mesmo nicho") — ver ImperioNewFormats.tsx: dourado/
    // coroação em vez de verde institucional, headline com glow em vez de
    // pílula, ranking com badge de medalha em vez de pílula de texto.
    id: "imperio-split-screen",
    client: "imperio-premios",
    clientLabel: "Império Prêmios",
    label: "Império Prêmios — Tela Dividida",
    compositionId: "ImperioSplitScreenAd",
    extraAssetsDir: null,
    extraAssetFiles: [],
    headline: {
      kind: "simple",
      defaultText: "ESSA PODE SER A SUA VITÓRIA.",
      defaultHighlight: "VITÓRIA.",
    },
    configurableAssets: {
      blendType: {
        label: "Mesclagem entre o take (cima) e o painel (baixo)",
        options: [
          { value: "suave", label: "Suave (gradiente)" },
          { value: "dura", label: "Dura (corte limpo)" },
        ],
        defaultValue: "dura",
      },
      contentMode: {
        label: "Painel de baixo",
        options: [
          { value: "video", label: "Vídeo (animado)" },
          { value: "imagem", label: "Imagem (estático)" },
        ],
        defaultValue: "video",
      },
      centerHeadline: {
        label: "Headline central com fundo sólido (em vez de dentro do painel)",
        defaultValue: false,
      },
      splitCopyText: {
        label: "Copy do painel",
        defaultText: "O próximo sorteio pode ser o seu. Acompanhe tudo em tempo real.",
      },
      splitButtonLabel: {
        label: "Texto do botão do painel",
        defaultText: "Ver o que está disponível",
      },
      captions: CAPTIONS_CONFIG,
    },
    buildInputProps: (hookCamera, takeFileName, overrides) => ({
      takeFile: takeFileName,
      hookCamera,
      headlineText: overrides.headlineText ?? "ESSA PODE SER A SUA VITÓRIA.",
      headlineHighlight: overrides.headlineHighlight ?? "VITÓRIA.",
      blendType: overrides.blendType,
      contentMode: overrides.contentMode,
      centerHeadlineEnabled: overrides.centerHeadlineEnabled,
      splitCopyText: overrides.splitCopyText,
      splitButtonLabel: overrides.splitButtonLabel,
      sourceDurationFrames: overrides.sourceDurationFrames,
      ...captionInputProps(overrides),
    }),
    fps: 30,
    width: 1080,
    height: 1920,
    splitAtFrame: splitScreenDurationFrames(undefined, 200),
    totalFrames: splitScreenDurationFrames(undefined, 200),
    openingCaptions: [],
    noEnding: true,
  },
  {
    id: "imperio-ranking",
    client: "imperio-premios",
    clientLabel: "Império Prêmios",
    label: "Império Prêmios — Ranking de Prêmios",
    compositionId: "ImperioRankingAd",
    extraAssetsDir: null,
    extraAssetFiles: [],
    headline: {
      kind: "simple",
      defaultText: "ESSA PODE SER A SUA VITÓRIA.",
      defaultHighlight: "VITÓRIA.",
    },
    configurableAssets: {
      rankingHeadline: {
        label: "Headline acima do ranking",
        defaultText: "Prêmios em jogo hoje",
      },
      rankingItems: {
        label: "Posições do ranking de prêmios (quantidade de ganhadores)",
        defaults: [
          { position: "1º lugar", value: "R$ 800" },
          { position: "2º lugar", value: "R$ 250" },
          { position: "3º lugar", value: "R$ 150" },
        ],
      },
      rankingPosition: {
        label: "Posição do ranking no quadro",
        options: [
          { value: "bottom", label: "Base do vídeo" },
          { value: "top", label: "Topo do vídeo (evita colisão com legenda)" },
        ],
        defaultValue: "bottom",
      },
      captions: CAPTIONS_CONFIG,
    },
    buildInputProps: (hookCamera, takeFileName, overrides) => ({
      takeFile: takeFileName,
      hookCamera,
      rankingHeadlineText: overrides.rankingHeadlineText,
      rankingItems: overrides.rankingItems,
      rankingPosition: overrides.rankingPosition,
      sourceDurationFrames: overrides.sourceDurationFrames,
      ...captionInputProps(overrides),
    }),
    fps: 30,
    width: 1080,
    height: 1920,
    splitAtFrame: rankingDurationFrames(3, undefined),
    totalFrames: rankingDurationFrames(3, undefined),
    openingCaptions: [],
    noEnding: true,
  },
];

export function listTemplates(): (TemplateConfig & { hookPacks: HookPack[] })[] {
  return TEMPLATE_DEFS.map((t) => {
    const yamlPath = path.join(CLIENTS_DATA_DIR, t.client, "video-templates.yaml");
    let hookPacks: HookPack[] = [];
    try {
      hookPacks = readHookPacks(yamlPath);
    } catch {
      hookPacks = [];
    }
    return { ...t, hookPacks };
  });
}

export function getTemplate(id: string): (TemplateConfig & { hookPacks: HookPack[] }) | null {
  return listTemplates().find((t) => t.id === id) ?? null;
}

// ─────────────────────────── Sessões de geração ────────────────────────────

const SESSIONS_ROOT = path.join(REPO, "outputs", "_generate-sessions");
const SESSION_ID_RE = /^[a-z0-9-]+$/i;

export function isValidSessionId(id: string): boolean {
  return SESSION_ID_RE.test(id) && id.length <= 64;
}

export function sessionDirFor(sessionId: string): string {
  return path.join(SESSIONS_ROOT, sessionId);
}

export function sessionVariantsDirFor(sessionId: string): string {
  return path.join(sessionDirFor(sessionId), "variants");
}

export function sessionStatusPathFor(sessionId: string): string {
  return path.join(sessionDirFor(sessionId), "status.json");
}

export interface GenerateStatus {
  /** "transcribing" (2026-10-19) — legenda automática rodando (Whisper, ~2,5x
   * a duração do clipe) ANTES do render em si começar, 1x por sessão. */
  state: "idle" | "transcribing" | "queued" | "rendering" | "done" | "error";
  progress: number; // 0..1
  total?: number;
  done?: number;
  templateId?: string;
  outputs?: { label: string; file: string }[];
  error?: string;
  updatedAt?: string;
}

export function readSessionStatus(sessionId: string): GenerateStatus | null {
  try {
    return JSON.parse(fs.readFileSync(sessionStatusPathFor(sessionId), "utf-8")) as GenerateStatus;
  } catch {
    return null;
  }
}
