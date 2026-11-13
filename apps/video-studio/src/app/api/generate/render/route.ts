import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getTemplate,
  isValidSessionId,
  readSessionStatus,
  sessionDirFor,
  sessionStatusPathFor,
} from "@/lib/generate";
import { submitBatchJob } from "@/lib/renderServerClient";
import { probeMedia, transcribeVideo } from "@/lib/ingest";

/**
 * Passo 2 do fluxo "Gerar variações": dado sessionId (já tem o vídeo-fonte,
 * ver /api/generate/upload) + templateId, monta 1 variação por hook_pack do
 * template e dispara o render no servidor persistente (ver
 * lib/renderServerClient.ts + scripts/render-server.mjs — 2026-10-18,
 * substitui o spawn-por-job antigo que rebundlava o Remotion e reabria o
 * Chrome a cada render). status.json continua sendo quem informa progresso,
 * o frontend faz polling como sempre — só quem gera o status.json mudou.
 */
export const runtime = "nodejs";

const ACTIVE = new Set(["queued", "rendering"]);
const STALE_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") || "";
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
  }
  const status = readSessionStatus(sessionId);
  return NextResponse.json(status ?? { state: "idle", progress: 0 });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const sessionId = String(body.sessionId || "");
  const templateId = String(body.templateId || "");
  // Overrides da tela "Configurar copy" (opcional — pular mantém os defaults
  // do template, ver generate.ts). headlineByHook é POR variação; phoneScreenFile
  // e tags são compartilhados entre as 3 (descrevem o produto, não o hook).
  const headlineByHook = (body.headlineByHook ?? {}) as Record<string, Record<string, unknown>>;
  const phoneScreenFile = typeof body.phoneScreenFile === "string" ? body.phoneScreenFile : undefined;
  const tags = Array.isArray(body.tags) ? (body.tags as { title: string; sub: string }[]) : undefined;
  const rankingItems = Array.isArray(body.rankingItems) ? (body.rankingItems as { position: string; value: string }[]) : undefined;
  const rankingHeadlineText = typeof body.rankingHeadlineText === "string" ? body.rankingHeadlineText : undefined;
  const blendType = body.blendType === "suave" || body.blendType === "dura" ? body.blendType : undefined;
  const contentMode = body.contentMode === "video" || body.contentMode === "imagem" ? body.contentMode : undefined;
  const centerHeadlineEnabled = typeof body.centerHeadlineEnabled === "boolean" ? body.centerHeadlineEnabled : undefined;
  const splitCopyText = typeof body.splitCopyText === "string" ? body.splitCopyText : undefined;
  const splitButtonLabel = typeof body.splitButtonLabel === "string" ? body.splitButtonLabel : undefined;
  const rankingPosition = body.rankingPosition === "top" || body.rankingPosition === "bottom" ? body.rankingPosition : undefined;
  // Legenda automática (2026-10-19, founder: "o motor de legendar vídeo
  // automático pronto") — `captionsEnabled` liga a transcrição REAL
  // (Whisper, ver computeCaptions abaixo); os demais só chegam na
  // composição quando ligada.
  const captionsEnabled = typeof body.captionsEnabled === "boolean" ? body.captionsEnabled : undefined;
  const CAPTION_RENDERER_IDS = new Set(["word-pop", "mono-bold", "underline", "clean", "gradient"]);
  const captionRenderer =
    typeof body.captionRenderer === "string" && CAPTION_RENDERER_IDS.has(body.captionRenderer)
      ? (body.captionRenderer as "word-pop" | "mono-bold" | "underline" | "clean" | "gradient")
      : undefined;
  const captionLines = body.captionLines === 1 || body.captionLines === 2 ? body.captionLines : undefined;
  const captionWordByWord = typeof body.captionWordByWord === "boolean" ? body.captionWordByWord : undefined;
  const captionHighlight = typeof body.captionHighlight === "boolean" ? body.captionHighlight : undefined;
  const captionFontFamily = typeof body.captionFontFamily === "string" ? body.captionFontFamily : undefined;
  // Personalização POR VARIAÇÃO de ranking/legenda (2026-10-19, founder:
  // "aplicar parâmetros em todas... ou configurar já direto em cada uma") —
  // só as variações que o usuário customizou aparecem aqui; as demais usam
  // os campos globais acima. Aplicado por cima do global na hora de montar
  // cada variante (ver `variants` abaixo) — mesmo princípio de
  // `headlineByHook`, só que pros campos novos.
  const perVariantOverrides = (body.perVariantOverrides ?? {}) as Record<string, Record<string, unknown>>;
  // Quais hook_packs entram nessa geração (2026-10-18, founder: "travado em
  // 3, quero escolher menos ou mais") — ausente/vazio = todos (comportamento
  // anterior), senão filtra pro subconjunto escolhido na tela de copy.
  const selectedHookIds = Array.isArray(body.selectedHookIds) ? (body.selectedHookIds as string[]) : null;
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
  }
  const dir = sessionDirFor(sessionId);
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "sessão não encontrada — faça upload primeiro" }, { status: 404 });
  }
  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `template "${templateId}" não encontrado` }, { status: 404 });
  }
  const sourceFile = fs.readdirSync(dir).find((f) => f.startsWith("source."));
  if (!sourceFile) {
    return NextResponse.json({ error: "vídeo-fonte não encontrado na sessão" }, { status: 400 });
  }
  // Duração real do vídeo-fonte (2026-10-19, founder: "upei 7s, saiu 6s") —
  // Ranking/Tela Dividida (noEnding) usam isto pra durar o vídeo ESCOLHIDO
  // inteiro, não uma constante fixa herdada do template com transição.
  let sourceDurationFrames: number | undefined;
  try {
    const probe = probeMedia(path.join(dir, sourceFile));
    sourceDurationFrames = Math.round(probe.durationSeconds * template.fps);
  } catch {
    sourceDurationFrames = undefined;
  }

  // Legenda automática (2026-10-19) — transcreve o ÁUDIO DE VERDADE (Whisper,
  // scripts/transcribe.py) 1x por SESSÃO (cacheado em transcript.json, não
  // 1x por variação — o áudio é o mesmo nas N variações). Roda sobre o
  // vídeo JÁ CORTADO (session/source.<ext> — a etapa "3. Corte" já fixou o
  // trecho final antes de chegar aqui), então os timestamps batem direto com
  // o take sem precisar de offset. ~2,5x a duração do clipe em CPU — status
  // "transcribing" avisa o frontend que o polling não travou, só está nessa
  // etapa antes do render em si começar.
  let captions: { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null }[] | undefined;
  if (captionsEnabled) {
    const transcriptPath = path.join(dir, "transcript.json");
    if (fs.existsSync(transcriptPath)) {
      try {
        captions = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
      } catch {
        captions = undefined;
      }
    }
    if (!captions) {
      fs.writeFileSync(
        sessionStatusPathFor(sessionId),
        JSON.stringify({ state: "transcribing", progress: 0, updatedAt: new Date().toISOString() }),
        "utf-8",
      );
      try {
        captions = transcribeVideo(path.join(dir, sourceFile));
        fs.writeFileSync(transcriptPath, JSON.stringify(captions), "utf-8");
      } catch (err) {
        // Falha na transcrição não deve travar a geração inteira — segue sem
        // legenda (degradação graciosa, mesmo princípio de code-intel).
        console.error(`[generate/render] transcrição falhou pra sessão ${sessionId}:`, err);
        captions = undefined;
      }
    }
  }

  const cur = readSessionStatus(sessionId);
  if (cur && ACTIVE.has(cur.state)) {
    const age = Date.now() - Date.parse(String(cur.updatedAt ?? 0));
    if (Number.isFinite(age) && age < STALE_MS) {
      return NextResponse.json({ error: "já existe uma geração em andamento", status: cur }, { status: 409 });
    }
  }

  if (template.hookPacks.length === 0) {
    return NextResponse.json({ error: "template sem hook_packs em video-templates.yaml" }, { status: 500 });
  }

  const hookPacks =
    selectedHookIds && selectedHookIds.length > 0
      ? template.hookPacks.filter((h) => selectedHookIds.includes(h.id))
      : template.hookPacks;
  if (hookPacks.length === 0) {
    return NextResponse.json({ error: "nenhum hook válido selecionado" }, { status: 400 });
  }

  const variants = hookPacks.map((hook) => ({
    outName: `${hook.id}.mp4`,
    label: hook.label,
    compositionId: template.compositionId,
    inputProps: template.buildInputProps(hook.camera, sourceFile, {
      ...(headlineByHook[hook.id] ?? {}),
      phoneScreenFile,
      tags,
      rankingItems,
      rankingHeadlineText,
      blendType,
      contentMode,
      centerHeadlineEnabled,
      splitCopyText,
      splitButtonLabel,
      sourceDurationFrames,
      rankingPosition,
      captionsEnabled,
      captionRenderer,
      captionLines,
      captionWordByWord,
      captionHighlight,
      captionFontFamily,
      captions,
      // Customização POR VARIAÇÃO sobrepõe o global acima pra ESTA variação
      // específica — só entra quando o usuário marcou "personalizar" pra
      // este hook na tela de copy (ausente = continua no global).
      ...(perVariantOverrides[hook.id] ?? {}),
    }),
  }));

  // job.json continua sendo escrito — generateEditorBridge.ts (botão
  // "Editar") lê sourceFile/variants[].inputProps dele depois, sem precisar
  // do render-server pra isso (é só cópia de arquivo + leitura de JSON).
  const job = {
    sessionId,
    templateId,
    client: template.client,
    sourceFile,
    extraAssetsDir: template.extraAssetsDir,
    extraAssetFiles: template.extraAssetFiles,
    variants,
  };
  const jobFile = path.join(dir, "job.json");
  fs.writeFileSync(jobFile, JSON.stringify(job), "utf-8");
  const now = new Date().toISOString();
  fs.writeFileSync(
    sessionStatusPathFor(sessionId),
    JSON.stringify({ state: "queued", progress: 0, total: variants.length, done: 0, templateId, updatedAt: now }),
    "utf-8",
  );

  try {
    await submitBatchJob({
      sessionId,
      sessionDir: dir,
      sourceFile,
      extraAssetsDir: template.extraAssetsDir,
      extraAssetFiles: template.extraAssetFiles,
      variants,
    });
  } catch (err) {
    fs.writeFileSync(
      sessionStatusPathFor(sessionId),
      JSON.stringify({ state: "error", progress: 0, error: String(err instanceof Error ? err.message : err), updatedAt: new Date().toISOString() }),
      "utf-8",
    );
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totalVariants: variants.length });
}
