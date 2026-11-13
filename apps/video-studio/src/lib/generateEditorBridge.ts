import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Timeline, TimelineClip, ExtraLayer, ExtraClip } from "./timeline";
import type { FxPlan } from "./fxPlan";
import type { CameraMove, CameraId } from "./fxCatalog";
import { probeMedia, creativeDirFor, materialsDirFor } from "./ingest";
import {
  getTemplate,
  sessionDirFor,
  REPO,
  rankingDurationFrames,
  splitScreenDurationFrames,
  type TemplateConfig,
  type HookPack,
} from "./generate";
import { submitEndingLayersJob, submitLayersJob } from "./renderServerClient";

/**
 * Ponte "variação gerada" → criativo editável no /studio (pedido do founder
 * 2026-10-18: botão "Editar" sob cada variação). As composições bespoke
 * (ImperioIgnicaoPunho/GarantidoTake2Ad) NÃO são Timeline/FxPlan — não dá pra
 * simplesmente "abrir" a variação no editor genérico.
 *
 *   clip 1 = o vídeo-fonte ORIGINAL (não o render) até `splitAtFrame` —
 *            100% editável: trim, câmera (Ken Burns), volume, etc.
 *   clip 2 = o ENCERRAMENTO DE MARCA. Duas estratégias, por template:
 *
 *   (a) `template.decomposedEnding` presente (Garantido, 2026-10-18 — "a
 *       ÚNICA coisa que esse template faz é o motion final, quero cada
 *       camada editável"): renderiza de novo as composições ISOLADAS de
 *       `EndingLayers.tsx` — fundo (clipe 2, com movimento próprio) +
 *       telefone/CTA como PNG transparente, cada um uma camada de IMAGEM
 *       de verdade (move/escala/remove independente — é isso que deixa
 *       "remover o celular manualmente" e "mudar fundo" genuinamente
 *       possíveis, não só prometidos).
 *   (b) ausente (Império, por ora): mantém o comportamento anterior —
 *       ffmpeg extrai o trecho final do .mp4 JÁ renderizado como clipe
 *       único "queimado" (editável como bloco, não por camada interna).
 *
 *   extraLayers = as legendas de abertura (texto sobre o take) viram
 *       elementos de texto DE VERDADE — moveable, retimable, com a
 *       mesma fonte/cor/contorno da composição original.
 *
 * O corte em `splitAtFrame` (não em `TAKE_FRAMES` puro) é o que garante
 * continuidade de frame exata entre take e encerramento — ver TemplateConfig.
 */

export interface OpenEditorResult {
  client: string;
  creative: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "gen";
}

/**
 * (a) Encerramento decomposto — renderiza as camadas isoladas de novo.
 *
 * IMPORTANTE: não importa `@remotion/bundler`/`@remotion/renderer` aqui
 * (neste módulo, importado pela API route) — Turbopack tenta bundlar o
 * esbuild interno do Remotion e quebra ("Unknown module type" num
 * README.md do @esbuild/win32-x64). Mesmo motivo documentado em
 * next.config.ts pro resto do app: Remotion roda DESACOPLADO. Desde
 * 2026-10-18 isso passa pelo servidor de render persistente
 * (lib/renderServerClient.ts + scripts/render-server.mjs) em vez de um
 * spawnSync por chamada — bundle e browser já ficam abertos, só pede o
 * render via HTTP local.
 */
async function buildDecomposedEnding(
  template: TemplateConfig & { decomposedEnding: NonNullable<TemplateConfig["decomposedEnding"]> },
  variantInputProps: Record<string, unknown>,
  sessionDir: string,
  materialsDir: string,
  startFrame: number,
): Promise<{ clip2: TimelineClip; extraClips: ExtraClip[] }> {
  const { bgCompositionId, headlineCompositionId, phoneCompositionId, ctaCompositionId, ctaSubtitleCompositionId, endingFrames } =
    template.decomposedEnding;
  const headlineCopy = variantInputProps.headlineCopy as Record<string, unknown> | undefined;
  const tags = variantInputProps.tags as { title: string; sub: string }[] | undefined;
  const phoneScreenFile = variantInputProps.phoneScreenFile as string | undefined;

  // Tela do celular customizada (2026-10-18, "eu upar qual tela que quero
  // pro celular") nasceu no publicDir da SESSÃO (sessionDir) — o bundle
  // cacheado do encerramento usa publicDir=public/ real, que não a vê. Copia
  // pra materialsDir e pede ao render-server pra rebundlar com esse
  // publicDir só desta vez (sem customização, usa o bundle fixo, rápido).
  let customPublicDir: string | undefined;
  if (phoneScreenFile) {
    const src = path.join(sessionDir, phoneScreenFile);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(materialsDir, phoneScreenFile));
      customPublicDir = materialsDir;
    }
  }

  const bgFile = "ending-bg.mp4";
  const headlineFile = "ending-headline.png";
  const phoneFile = "ending-phone.png";
  const ctaFile = "ending-cta.png";
  const ctaSubtitleFile = "ending-cta-subtitle.png";
  const bgAbsPath = path.join(materialsDir, bgFile);
  const outPaths = {
    bg: bgAbsPath,
    headline: path.join(materialsDir, headlineFile),
    phone: path.join(materialsDir, phoneFile),
    cta: path.join(materialsDir, ctaFile),
    ctaSubtitle: path.join(materialsDir, ctaSubtitleFile),
  };

  await submitEndingLayersJob({
    bgCompositionId,
    headlineCompositionId,
    phoneCompositionId,
    ctaCompositionId,
    ctaSubtitleCompositionId,
    headlineCopy,
    tags,
    phoneScreenFile,
    customPublicDir,
    outPaths,
  });
  if (
    !fs.existsSync(outPaths.bg) ||
    !fs.existsSync(outPaths.headline) ||
    !fs.existsSync(outPaths.phone) ||
    !fs.existsSync(outPaths.cta) ||
    !fs.existsSync(outPaths.ctaSubtitle)
  ) {
    throw new Error("render do encerramento decomposto falhou: arquivo de saída ausente após o render-server responder ok");
  }

  const clip2: TimelineClip = {
    file: bgFile,
    absPath: bgAbsPath,
    role: "cta",
    durationSeconds: endingFrames / template.fps,
    durationInFrames: endingFrames,
    nativeDurationInFrames: endingFrames,
    playbackRate: 1,
    width: template.width,
    height: template.height,
    startFrame,
    trimStartFrames: 0,
    audioEnabled: false,
    // Transição pré-aplicada hook→encerramento (pedido do founder
    // 2026-10-18) — editável/trocável no Inspector depois, não precisa
    // adicionar manualmente pra já sair com alguma.
    transitionIn: { type: "dissolve", durationInFrames: 12, peso: "medio" },
  };

  // x:50/y:50/escala:1 (nativo) = cobre o quadro inteiro — os PNGs já nascem
  // com cada elemento na posição exata (mesmo container flex da peça
  // original), então não tem matemática de posição pra acertar aqui.
  const extraClips: ExtraClip[] = [
    {
      id: "ending-headline",
      type: "image",
      file: headlineFile,
      label: "Headline (copy superior)",
      startFrame,
      durationInFrames: endingFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
    },
    {
      id: "ending-phone",
      type: "image",
      file: phoneFile,
      label: "Telefone (mockup)",
      startFrame,
      durationInFrames: endingFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
    },
    {
      id: "ending-cta",
      type: "image",
      file: ctaFile,
      label: "CTA (botão)",
      startFrame,
      durationInFrames: endingFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
    },
    {
      id: "ending-cta-subtitle",
      type: "image",
      file: ctaSubtitleFile,
      label: "CTA (subtítulo)",
      startFrame,
      durationInFrames: endingFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
    },
  ];

  return { clip2, extraClips };
}

/** (b) Encerramento "queimado" — ffmpeg extrai do .mp4 já renderizado (comportamento original). */
function buildBakedEnding(
  template: TemplateConfig,
  renderedPath: string,
  materialsDir: string,
  startFrame: number,
): { clip2: TimelineClip; extraClips: ExtraClip[] } {
  const ctaFile = "cta.mp4";
  const startSec = (template.splitAtFrame / template.fps).toFixed(3);
  const durSec = ((template.totalFrames - template.splitAtFrame) / template.fps).toFixed(3);
  const ctaAbsPath = path.join(materialsDir, ctaFile);
  const ff = spawnSync(
    "ffmpeg",
    ["-y", "-ss", startSec, "-i", renderedPath, "-t", durSec, "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", ctaAbsPath],
    { windowsHide: true },
  );
  if (ff.status !== 0 || !fs.existsSync(ctaAbsPath)) {
    throw new Error(`ffmpeg falhou ao extrair o encerramento: ${ff.stderr?.toString().slice(-500) ?? "sem log"}`);
  }
  const clip2Frames = template.totalFrames - template.splitAtFrame;
  const clip2: TimelineClip = {
    file: ctaFile,
    absPath: ctaAbsPath,
    role: "cta",
    durationSeconds: clip2Frames / template.fps,
    durationInFrames: clip2Frames,
    nativeDurationInFrames: clip2Frames,
    playbackRate: 1,
    width: template.width,
    height: template.height,
    startFrame,
    trimStartFrames: 0,
    audioEnabled: false,
  };
  return { clip2, extraClips: [] };
}

/**
 * (c) Tela Dividida decomposta — renderiza as 4 camadas isoladas (ver
 * `SplitRankingLayers.tsx`/`ImperioSplitRankingLayers.tsx` — 2026-10-19,
 * founder: "cada elemento venha editável... copys sendo um bloco"). Cada
 * camada é um PNG "tudo assentado" — a animação de ENTRADA é reconstruída
 * aqui via `animateIn` (mesmo tipo visual da peça real: sobe/fade). O BOTÃO
 * chega SEM `animateIn`/`tracks` de propósito (founder: "a animação do
 * botão está quebrada... deixe sem animação, eu coloco no refino do
 * editor") — estático, pronto pra receber a animação que o founder decidir
 * no editor. Balões de notificação foram REMOVIDOS do template inteiro
 * (founder: "não estão harmônicos, pode remover") — não há mais camada
 * pra eles.
 *
 * `compositionPrefix` ("Garantido" | "Imperio") escolhe o CONJUNTO de
 * composições isoladas certo (2026-10-19, founder: "mesmas variações de
 * template na Império, porém modifique o estilo visual... não pode ficar
 * uma edição igual em dois clientes do mesmo nicho") — cada cliente tem seu
 * próprio arquivo de camadas com pele visual própria, mas a MECÂNICA de
 * montar os ExtraClip (delays, animateIn, posição) é idêntica, daí uma
 * função só em vez de duplicar. `headlineCopy` (Garantido, 2 linhas) e
 * `headlineText`/`headlineHighlight` (Império, 1 linha) viajam os dois —
 * cada composição-alvo só lê o shape que é dela, o outro é ignorado.
 */
async function buildSplitScreenLayers(
  compositionPrefix: "Garantido" | "Imperio",
  variantInputProps: Record<string, unknown>,
  materialsDir: string,
  startFrame: number,
  durationInFrames: number,
): Promise<ExtraClip[]> {
  const headlineCopy = variantInputProps.headlineCopy;
  const headlineText = variantInputProps.headlineText;
  const headlineHighlight = variantInputProps.headlineHighlight;
  const blendType = variantInputProps.blendType;
  const centerHeadlineEnabled = Boolean(variantInputProps.centerHeadlineEnabled);
  const splitCopyText = variantInputProps.splitCopyText;
  const splitButtonLabel = variantInputProps.splitButtonLabel;

  const files = {
    bg: "split-bg.png",
    headline: "split-headline.png",
    copy: "split-copy.png",
    button: "split-button.png",
  };
  const items = [
    { compositionId: `${compositionPrefix}SplitBgLayer`, inputProps: { blendType }, outPath: path.join(materialsDir, files.bg) },
    {
      compositionId: `${compositionPrefix}SplitHeadlineLayer`,
      inputProps: { headlineCopy, headlineText, headlineHighlight, centerHeadlineEnabled },
      outPath: path.join(materialsDir, files.headline),
    },
    { compositionId: `${compositionPrefix}SplitCopyLayer`, inputProps: { splitCopyText, centerHeadlineEnabled }, outPath: path.join(materialsDir, files.copy) },
    { compositionId: `${compositionPrefix}SplitButtonLayer`, inputProps: { splitButtonLabel, centerHeadlineEnabled }, outPath: path.join(materialsDir, files.button) },
  ];
  await submitLayersJob(items);
  for (const it of items) {
    if (!fs.existsSync(it.outPath)) throw new Error(`render de camada falhou: ${path.basename(it.outPath)} ausente`);
  }

  // Delays espelhados de GarantidoNewFormats.tsx (SplitPanelContent) —
  // showHeadlineInPanel = !centerHeadlineEnabled desloca quando cada
  // elemento entra, mesma lógica da peça real.
  const showHeadlineInPanel = !centerHeadlineEnabled;
  const copyDelay = showHeadlineInPanel ? 34 : 14;
  const span = (delay: number) => Math.max(1, durationInFrames - delay);

  return [
    {
      id: "split-bg",
      type: "image",
      file: files.bg,
      label: "Fundo do painel",
      startFrame,
      durationInFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
      animateIn: { type: "fade", durationInFrames: 16 },
    },
    {
      id: "split-headline",
      type: "image",
      file: files.headline,
      label: centerHeadlineEnabled ? "Headline (central)" : "Headline (painel)",
      startFrame,
      durationInFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
      animateIn: { type: "sobe", durationInFrames: 24 },
    },
    {
      id: "split-copy",
      type: "image",
      file: files.copy,
      label: "Copy do painel",
      startFrame: startFrame + copyDelay,
      durationInFrames: span(copyDelay),
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
      animateIn: { type: "sobe", durationInFrames: 14 },
    },
    {
      id: "split-button",
      type: "image",
      file: files.button,
      label: "Botão do painel",
      // Sem delay/animateIn/tracks — estático desde o início (founder:
      // "deixe sem animação, eu coloco no refino do editor").
      startFrame,
      durationInFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
    },
  ];
}

/**
 * (d) Ranking decomposto — 3 camadas isoladas (overlay escuro, headline,
 * lista de posições como UM bloco — "copys sendo um bloco", não 1 camada
 * por linha). `compositionPrefix` escolhe o conjunto certo (ver nota em
 * `buildSplitScreenLayers` acima).
 */
async function buildRankingLayers(
  compositionPrefix: "Garantido" | "Imperio",
  variantInputProps: Record<string, unknown>,
  materialsDir: string,
  startFrame: number,
  durationInFrames: number,
): Promise<ExtraClip[]> {
  const rankingHeadlineText = variantInputProps.rankingHeadlineText;
  const rankingItems = variantInputProps.rankingItems;
  const rankingPosition = variantInputProps.rankingPosition;
  const itemCount = Array.isArray(rankingItems) && rankingItems.length > 0 ? (rankingItems as unknown[]).length : 3;

  const files = { overlay: "ranking-overlay.png", headline: "ranking-headline.png", list: "ranking-list.png" };
  const items = [
    { compositionId: `${compositionPrefix}RankingOverlayLayer`, inputProps: {}, outPath: path.join(materialsDir, files.overlay) },
    {
      compositionId: `${compositionPrefix}RankingHeadlineLayer`,
      // rankingItems entra aqui TAMBÉM (só pra reservar a MESMA altura do
      // bloco de linhas que *RankingListLayer usa — ver nota na composição)
      // — não é exibido, a lista fica escondida nesta camada.
      inputProps: { rankingHeadlineText, rankingItems, rankingPosition },
      outPath: path.join(materialsDir, files.headline),
    },
    {
      compositionId: `${compositionPrefix}RankingListLayer`,
      inputProps: { rankingItems, rankingPosition },
      outPath: path.join(materialsDir, files.list),
    },
  ];
  await submitLayersJob(items);
  for (const it of items) {
    if (!fs.existsSync(it.outPath)) throw new Error(`render de camada falhou: ${path.basename(it.outPath)} ausente`);
  }

  // Delays espelhados de GarantidoNewFormats.tsx (RankingOverlayContent).
  const headlineDelay = 8;
  const listDelay = 24; // 1ª posição começa a entrar aqui
  void itemCount; // mantido só pra clareza de que a lista depende da contagem (já refletida no PNG)

  return [
    {
      id: "ranking-overlay",
      type: "image",
      file: files.overlay,
      label: "Overlay escuro",
      startFrame,
      durationInFrames,
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
    },
    {
      id: "ranking-headline",
      type: "image",
      file: files.headline,
      label: "Headline do ranking",
      startFrame: startFrame + headlineDelay,
      durationInFrames: Math.max(1, durationInFrames - headlineDelay),
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
      animateIn: { type: "fade", durationInFrames: 14 },
    },
    {
      id: "ranking-list",
      type: "image",
      file: files.list,
      label: "Lista de posições",
      startFrame: startFrame + listDelay,
      durationInFrames: Math.max(1, durationInFrames - listDelay),
      x: 50,
      y: 50,
      scale: 1,
      fit: "contain",
      animateIn: { type: "sobe", durationInFrames: 16 },
    },
  ];
}

export async function openEditorFor(sessionId: string, hookId: string): Promise<OpenEditorResult> {
  const sessionDir = sessionDirFor(sessionId);
  const status = JSON.parse(fs.readFileSync(path.join(sessionDir, "status.json"), "utf-8")) as {
    templateId?: string;
    outputs?: { label: string; file: string }[];
  };
  const job = JSON.parse(fs.readFileSync(path.join(sessionDir, "job.json"), "utf-8")) as {
    sourceFile: string;
    variants: { outName: string; label: string; inputProps: Record<string, unknown> }[];
  };
  const template = getTemplate(status.templateId ?? "");
  if (!template) throw new Error(`template "${status.templateId}" não encontrado`);

  const variantFileName = `${hookId}.mp4`;
  const variant = job.variants.find((v) => v.outName === variantFileName);
  const output = (status.outputs ?? []).find((o) => o.file === `variants/${variantFileName}`);
  if (!variant || !output) throw new Error(`variação "${hookId}" não encontrada ou não renderizada`);

  const renderedPath = path.join(sessionDir, output.file);
  if (!fs.existsSync(renderedPath)) throw new Error("arquivo renderizado não encontrado no disco");

  const sourcePath = path.join(sessionDir, job.sourceFile);
  const sourceExt = path.extname(job.sourceFile) || ".mp4";

  const creative = `gen-${sessionId}-${slugify(hookId)}`;
  const client = template.client;
  const materialsDir = materialsDirFor(REPO, client, creative);
  fs.mkdirSync(materialsDir, { recursive: true });

  // clip 1 — vídeo-fonte original, sem recodificar (cópia direta).
  const hookFile = `hook${sourceExt}`;
  fs.copyFileSync(sourcePath, path.join(materialsDir, hookFile));
  const hookProbe = probeMedia(path.join(materialsDir, hookFile));
  const hookNativeFrames = Math.round(hookProbe.durationSeconds * template.fps);

  // Ranking/Tela Dividida têm duração REAL dependente do vídeo-fonte
  // escolhido (2026-10-19, correção de bug "upei 7s, saiu 6s") e, no caso do
  // Ranking, também da quantidade de ganhadores — mesmas fórmulas que
  // `calculateMetadata` usa na composição (rankingMath.ts). `template.
  // totalFrames` aqui é só o default estático; recalcula com os overrides
  // de verdade salvos no job.json pra essa variação, senão a ponte do editor
  // cortaria o clipe 1 no tamanho errado.
  const variantProps = variant.inputProps as Record<string, unknown>;
  const sourceDurationOverride =
    typeof variantProps.sourceDurationFrames === "number" ? variantProps.sourceDurationFrames : hookNativeFrames;
  let effectiveTotalFrames = template.totalFrames;
  if (template.id === "garantido-ranking" || template.id === "imperio-ranking") {
    const itemCount = Array.isArray(variantProps.rankingItems) ? (variantProps.rankingItems as unknown[]).length : 3;
    effectiveTotalFrames = rankingDurationFrames(itemCount, sourceDurationOverride);
  } else if (template.id === "garantido-split-screen" || template.id === "imperio-split-screen") {
    effectiveTotalFrames = splitScreenDurationFrames(sourceDurationOverride, template.totalFrames);
  }
  const clip1Frames = Math.min(hookNativeFrames || effectiveTotalFrames, effectiveTotalFrames);

  // Câmera do hook escolhido — mesma usada no render, agora editável de verdade
  // no clipe 1 (Ken Burns real, não cosmético).
  const hookPack: HookPack | undefined = template.hookPacks.find((h) => h.id === hookId);
  const camera: CameraMove | undefined =
    hookPack && hookPack.camera !== "parada"
      ? { tipo: hookPack.camera as CameraId, peso: "agressivo" }
      : undefined;

  const clip1: TimelineClip = {
    file: hookFile,
    absPath: path.join(materialsDir, hookFile),
    role: "hook",
    durationSeconds: clip1Frames / template.fps,
    durationInFrames: clip1Frames,
    nativeDurationInFrames: hookNativeFrames || clip1Frames,
    playbackRate: 1,
    width: hookProbe.width || template.width,
    height: hookProbe.height || template.height,
    startFrame: 0,
    trimStartFrames: 0,
    audioEnabled: true,
    camera,
  };

  // Ranking/Tela Dividida v2 (2026-10-18, founder: a transição+celular
  // "pertence ao template 01 apenas") não têm fase de encerramento — clipe 1
  // cobre a peça INTEIRA, sem clipe 2. Em vez disso (2026-10-19, founder:
  // "cada elemento venha editável") o CORPO vira camadas decompostas — ver
  // buildSplitScreenLayers/buildRankingLayers.
  let clip2: TimelineClip | null = null;
  let endingClips: ExtraClip[] = [];
  let decomposedBodyClips: ExtraClip[] = [];
  if (!template.noEnding) {
    const built = template.decomposedEnding
      ? await buildDecomposedEnding(
          template as TemplateConfig & { decomposedEnding: NonNullable<TemplateConfig["decomposedEnding"]> },
          variant.inputProps,
          sessionDir,
          materialsDir,
          clip1Frames,
        )
      : buildBakedEnding(template, renderedPath, materialsDir, clip1Frames);
    clip2 = built.clip2;
    endingClips = built.extraClips;
  } else if (template.id === "garantido-split-screen") {
    decomposedBodyClips = await buildSplitScreenLayers("Garantido", variant.inputProps, materialsDir, 0, clip1Frames);
  } else if (template.id === "garantido-ranking") {
    decomposedBodyClips = await buildRankingLayers("Garantido", variant.inputProps, materialsDir, 0, clip1Frames);
  } else if (template.id === "imperio-split-screen") {
    decomposedBodyClips = await buildSplitScreenLayers("Imperio", variant.inputProps, materialsDir, 0, clip1Frames);
  } else if (template.id === "imperio-ranking") {
    decomposedBodyClips = await buildRankingLayers("Imperio", variant.inputProps, materialsDir, 0, clip1Frames);
  }

  // Legendas de abertura → elementos de texto reais (editáveis), mesma fonte/
  // cor/contorno/sombra da composição original (OverlayBar/CaptionLeve).
  const captionClips: ExtraClip[] = template.openingCaptions.map((c, i) => ({
    id: `opening-caption-${i}`,
    type: "text",
    label: c.text.slice(0, 24),
    startFrame: c.startFrame,
    durationInFrames: c.durationInFrames,
    text: c.text,
    fontSize: 58,
    color: "#ffffff",
    fontWeight: 800,
    strokeWidth: 1,
    strokeColor: "rgba(0,0,0,0.35)",
    shadowOffset: 3,
    x: 50,
    y: Math.round((c.yPx / template.height) * 100),
    animateIn: { type: "sobe", durationInFrames: 10 },
    animateOut: { type: "fade", durationInFrames: 10 },
  }));

  // Uma camada POR elemento do encerramento (não uma única camada com os 2
  // juntos) — telefone e CTA ocupam o MESMO intervalo de tempo, e numa
  // camada só o bloco da timeline fica sobreposto (só o de cima é clicável).
  // Faixas separadas é o que deixa "remover o celular manualmente" possível
  // de verdade na UI, não só no JSON.
  const extraLayers: ExtraLayer[] = [];
  if (captionClips.length) {
    extraLayers.push({ id: "legendas-abertura", kind: "video", name: "Legendas de abertura", clips: captionClips });
  }
  for (const clip of endingClips) {
    extraLayers.push({ id: `camada-${clip.id}`, kind: "video", name: clip.label, clips: [clip] });
  }
  for (const clip of decomposedBodyClips) {
    extraLayers.push({ id: `camada-${clip.id}`, kind: "video", name: clip.label, clips: [clip] });
  }

  const clip2Frames = clip2?.durationInFrames ?? 0;
  const timeline: Timeline = {
    fps: template.fps,
    width: template.width,
    height: template.height,
    durationInFrames: clip1Frames + clip2Frames,
    videoTrack: clip2 ? [clip1, clip2] : [clip1],
    audioTrack: null,
    captionTrack: [],
    extraLayers,
    meta: {
      client,
      creative,
      videoSeconds: (clip1Frames + clip2Frames) / template.fps,
      audioSeconds: 0,
      rhythmGapSeconds: null,
      gaps: [],
    },
  };

  const fxPlan: FxPlan = {
    brand: { accent: "#e3a73e", primary: "#0a0a0f", displayName: template.label, fontFamily: "Montserrat" },
    hookRenderer: "hard-cut",
    captionRenderer: "clean",
    motionRenderers: [],
    captions: [],
  };

  fs.writeFileSync(
    path.join(creativeDirFor(REPO, client, creative), "studio-edit.json"),
    JSON.stringify({ timeline, fxPlan }),
    "utf-8",
  );

  return { client, creative };
}
