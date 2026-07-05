import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ingestCreative,
  creativeDirFor,
  materialsDirFor,
  applyTalkingHeadAutocut,
} from "@/lib/ingest";
import { loadBrandKeywords, loadBrandTokens } from "@/lib/brand";
import { buildFxPlan } from "@/lib/fxPlan";
import {
  loadTranscript,
  buildRealCaptions,
  wordsToCaptions,
  detectSilences,
  silenceSeconds,
  tokenizeScript,
  correctTranscript,
  loadRoteiroScript,
} from "@/lib/transcript";
import { buildAudit } from "@/lib/audit";
import { buildSoundLayers, deriveSfxFromTimeline, type LibraryAsset, type SoundDesign } from "@/lib/soundPlan";
import { applyEditSpec, makeSpeechFinder, type EditSpecInput, type SpeechWord } from "@/lib/editSpec";
import { mapViaSegments } from "@/lib/transcript";

// Monta o timeline (MVC-08) + FxPlan (MVC-09) de um criativo para o editor.
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
// Slug seguro (anti path traversal): só [a-z0-9-], começando por alfanumérico.
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac"]);

/** Lista (recursivo) os áudios de public/library para a ponte de sound design (F4.3). */
function listLibraryAudio(): LibraryAsset[] {
  const out: LibraryAsset[] = [];
  const root = path.join(process.cwd(), "public", "library");
  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (AUDIO_EXTS.has(path.extname(e.name).toLowerCase())) {
        out.push({ name: r, url: `/library/${r}`, kind: "audio" });
      }
    }
  };
  walk(root, "");
  return out;
}

export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "tiago-elesbao";
  const creative =
    req.nextUrl.searchParams.get("creative") || "13-realchasechappell-84d69e";
  const autocutFlag = req.nextUrl.searchParams.get("autocut") === "1";
  // Agressividade do auto-cut: corta pausas acima de `maxGapSec` (s).
  const maxGapSec = Math.min(
    1.5,
    Math.max(0.12, Number(req.nextUrl.searchParams.get("maxgap")) || 0.4),
  );

  // FIX 1 (QA · segurança): valida slugs ANTES de qualquer I/O — client/creative
  // viram path de filesystem; sem isso, `../` permite ler arquivos arbitrários.
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }

  // FIX 2 (QA · API): criativo inexistente é 404 (não 500/erro interno).
  if (!fs.existsSync(materialsDirFor(REPO, client, creative))) {
    return NextResponse.json(
      { error: `criativo não encontrado: ${client}/${creative}` },
      { status: 404 },
    );
  }

  try {
    let timeline = ingestCreative(REPO, client, creative, {
      tightenNarration: autocutFlag,
      maxGapSec,
    });
    const transcript = loadTranscript(creativeDirFor(REPO, client, creative));

    // Auto-cut (opcional): apara o silêncio final dos talking-heads ANTES de
    // gerar legendas/áudio, para tudo recomputar já sincronizado.
    if (autocutFlag && transcript) {
      const trailFramesByFile: Record<string, number> = {};
      for (const role of ["hook", "cta"] as const) {
        const clip = timeline.videoTrack.find((c) => c.role === role);
        const entry = clip ? transcript[clip.file] : undefined;
        if (clip && entry?.duration) {
          const trail = detectSilences(entry, { minGapSec: maxGapSec }).find(
            (s) => Math.abs(s.endSec - entry.duration!) < 0.2,
          );
          if (trail) {
            trailFramesByFile[clip.file] = Math.round(
              (trail.endSec - trail.startSec) * timeline.fps,
            );
          }
        }
      }
      timeline = applyTalkingHeadAutocut(timeline, trailFramesByFile);
    }

    // video-brief: roteiro (legendas) + template_refs (presets de FX).
    // VEX-02: co-localizado com o plano (outputs/.../video-brief.yaml) tem
    // precedência; fallback retrocompatível para data/video-brief-<slug>.yaml.
    const briefPath =
      [
        path.join(creativeDirFor(REPO, client, creative), "video-brief.yaml"),
        path.join(REPO, "squads/virals-marketing-squad/data", `video-brief-${creative}.yaml`),
      ].find((p) => fs.existsSync(p)) ?? "";
    let script = "";
    let templateRefs = null;
    let soundDesign: SoundDesign | null = null;
    let editSpec: EditSpecInput | null = null;
    if (briefPath && fs.existsSync(briefPath)) {
      const brief = (parse(fs.readFileSync(briefPath, "utf-8")) as Record<string, any>) || {};
      const cp = brief.content_plan || {};
      script = cp.script || "";
      templateRefs = (cp.edit_spec || {}).template_refs || null;
      soundDesign = cp.sound_design || null;
      editSpec = cp.edit_spec || null; // VEX-06: zooms/inserts/transições/motion
    }

    const bt = loadBrandTokens(REPO, client);
    const brand = {
      accent: bt.accent,
      primary: bt.primary,
      displayName: bt.displayName,
      fontFamily: bt.fontFamily,
      // VEX-05: keywords das legendas vêm do léxico do cliente.
      keywords: loadBrandKeywords(REPO, client),
    };
    const audioMs =
      (timeline.audioTrack?.durationSeconds ?? timeline.meta.videoSeconds) * 1000;
    let fxPlan = buildFxPlan({ brand, templateRefs, script, audioMs });

    // Roteiro de referência (Plano do dono > brief) — base da correção e da auditoria.
    const correctionScript =
      loadRoteiroScript(creativeDirFor(REPO, client, creative)) || script;

    // Legendas REAIS (transcrição das gravações) substituem as estimadas pelo
    // roteiro, quando o transcript.json existe. Também resume os silêncios
    // (auto-cut) por arquivo falado.
    let captionSource: "transcript" | "script" = "script";
    let autocut: Array<{
      file: string;
      role: string;
      silenceSeconds: number;
      leadSec: number;
      trailSec: number;
    }> = [];
    if (transcript) {
      // B4: corrige as PALAVRAS contra o roteiro (timing do Whisper preservado).
      const correctedTranscript = correctTranscript(transcript, tokenizeScript(correctionScript));
      const real = buildRealCaptions(timeline, correctedTranscript);
      if (real.length) {
        fxPlan.captions = real;
        captionSource = "transcript";
      }
      // VEX-11: legendas próprias de cada variante de hook (offset 0).
      if (timeline.hookVariants?.length) {
        timeline = {
          ...timeline,
          hookVariants: timeline.hookVariants.map((v) => ({
            ...v,
            captions: wordsToCaptions(correctedTranscript[v.file], 0),
          })),
        };
      }
      const spoken: Array<{ file: string; role: string }> = [];
      const hook = timeline.videoTrack.find((c) => c.role === "hook");
      const cta = timeline.videoTrack.find((c) => c.role === "cta");
      if (hook) spoken.push({ file: hook.file, role: "hook" });
      if (timeline.audioTrack) spoken.push({ file: timeline.audioTrack.file, role: "narração" });
      if (cta) spoken.push({ file: cta.file, role: "cta" });
      autocut = spoken.map(({ file, role }) => {
        const entry = transcript[file];
        const spans = detectSilences(entry);
        const dur = entry?.duration ?? 0;
        const lead = spans.find((s) => s.startSec <= 0.01);
        const trail = spans.find((s) => dur && Math.abs(s.endSec - dur) < 0.2);
        return {
          file,
          role,
          silenceSeconds: silenceSeconds(spans),
          leadSec: lead ? Number((lead.endSec - lead.startSec).toFixed(2)) : 0,
          trailSec: trail ? Number((trail.endSec - trail.startSec).toFixed(2)) : 0,
        };
      });
    }

    // MVC-11: se há uma edição SALVA (clique em Salvar), ela é autoritativa —
    // sobrescreve o ingest fresco e pula a pré-montagem (não duplica camadas).
    let persisted = false;
    let savedStyleId: string | undefined;
    let savedAutocut: { on?: boolean; maxGap?: number } | undefined;
    const editPath = path.join(creativeDirFor(REPO, client, creative), "studio-edit.json");
    if (fs.existsSync(editPath)) {
      try {
        const saved = JSON.parse(fs.readFileSync(editPath, "utf-8"));
        if (saved?.timeline && saved?.fxPlan) {
          timeline = saved.timeline;
          fxPlan = saved.fxPlan;
          if (saved.captionSource === "transcript" || saved.captionSource === "script") {
            captionSource = saved.captionSource;
          }
          if (typeof saved.styleId === "string") savedStyleId = saved.styleId;
          if (saved.autocut && typeof saved.autocut === "object") savedAutocut = saved.autocut;
          persisted = true;
        }
      } catch {
        /* save corrompido → ignora e segue com o ingest fresco */
      }
    }

    // VEX-06: pré-plota o edit_spec do plano (zooms/transições/inserts/motion)
    // — só no estado fresco; momentos não-resolvidos viram aviso E1 abaixo.
    let editSpecWarnings: string[] = [];
    if (!persisted && editSpec) {
      const narr = timeline.audioTrack;
      const entry = transcript && narr ? transcript[narr.file] : undefined;
      const speechWords: SpeechWord[] = (entry?.words ?? []).map((w) => ({
        w: w.w,
        absFrame: narr!.startFrame + Math.round(
          mapViaSegments(w.start, narr!.segments, timeline.fps) * timeline.fps,
        ),
      }));
      const res = applyEditSpec(timeline, editSpec, makeSpeechFinder(speechWords), timeline.fps);
      timeline = res.timeline;
      editSpecWarnings = res.warnings;
    }

    // F4.3: pré-monta SFX/trilha — só no estado fresco. Se o plano não trouxe
    // SFX, deriva dos cortes reais (todo criativo abre com SFX nos momentos).
    if (!persisted) {
      const planned = soundDesign && soundDesign.sfx && soundDesign.sfx.length > 0;
      const sd: SoundDesign = planned
        ? soundDesign!
        : { ...(soundDesign ?? {}), sfx: deriveSfxFromTimeline(timeline) };
      // Sem plano de som → inclui uma trilha de fundo default (mellow, ducked).
      if (!soundDesign) {
        sd.music = { recommended: true, mood: "lo-fi", energy: "low", ducking: true };
      }
      const soundLayers = buildSoundLayers(
        sd, timeline, listLibraryAudio(), planned ? "SFX (plano)" : "SFX (auto)",
      );
      if (soundLayers.length) {
        timeline = { ...timeline, extraLayers: [...(timeline.extraLayers ?? []), ...soundLayers] };
      }
    }

    // E1: auditoria de revalidação (congruência + legendas + edição + som).
    const audit = buildAudit(timeline, fxPlan.captions, transcript, correctionScript, soundDesign ?? undefined);

    // VEX-02: âncoras GERADAS com baixa confiança viram aviso de congruência
    // (o dono revisa a janela do insert no Studio em vez de confiar cego).
    try {
      const asm = JSON.parse(
        fs.readFileSync(path.join(creativeDirFor(REPO, client, creative), "assembly.json"), "utf-8"),
      ) as { _generated?: { anchors?: Array<{ clip: string; anchor: string; confidence: number }> } };
      const low = (asm._generated?.anchors ?? []).filter((a) => a.confidence < 0.4);
      for (const a of low) {
        audit.findings.push({
          id: `anchor-${a.clip}`,
          category: "congruencia",
          severity: "aviso",
          message: `Âncora gerada com baixa confiança (${a.confidence}) para ${a.clip}: "${a.anchor}"`,
          suggestion: "Conferir se o insert cobre o trecho certo da fala; ajuste arrastando o clipe na timeline.",
        });
        audit.stats.aviso += 1;
      }
    } catch {
      /* sem assembly gerado — nada a auditar */
    }

    // VEX-06: momentos do edit_spec não-resolvidos + papéis por fallback de
    // filename (sem assembly.clips) viram avisos de congruência.
    for (let i = 0; i < editSpecWarnings.length; i++) {
      audit.findings.push({
        id: `editspec-${i}`,
        category: "congruencia",
        severity: "aviso",
        message: editSpecWarnings[i],
        suggestion: "Posicionar manualmente na timeline (o momento do plano não foi localizado).",
      });
      audit.stats.aviso += 1;
    }
    for (const c of timeline.videoTrack) {
      if (c.role === "unknown") {
        audit.findings.push({
          id: `role-${c.file}`,
          category: "congruencia",
          severity: "aviso",
          message: `Clipe sem papel reconhecido: ${c.file} (nome fora do padrão e sem assembly.clips)`,
          suggestion: "Rodar ⚙ Preparar criativo (gera papéis pelo plano) ou renomear o arquivo.",
        });
        audit.stats.aviso += 1;
      }
    }

    return NextResponse.json({
      timeline,
      fxPlan,
      client,
      creative,
      captionSource,
      autocut,
      audit,
      persisted,
      // VEX-03: preferências persistidas (restauradas pela UI no load).
      ...(savedStyleId ? { styleId: savedStyleId } : {}),
      ...(savedAutocut ? { autocutSaved: savedAutocut } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}

/**
 * MVC-11: persiste a edição atual do Studio (clique em Salvar). Grava o snapshot
 * {timeline, fxPlan, captionSource} em studio-edit.json no diretório do criativo.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const client = String(body.client || "");
  const creative = String(body.creative || "");
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }
  if (!body.timeline || !body.fxPlan) {
    return NextResponse.json({ error: "timeline/fxPlan ausente" }, { status: 400 });
  }
  const dir = creativeDirFor(REPO, client, creative);
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "criativo não encontrado" }, { status: 404 });
  }
  try {
    const payload = {
      timeline: body.timeline,
      fxPlan: body.fxPlan,
      captionSource: body.captionSource,
      // VEX-03: preferências de sessão sobrevivem ao reload.
      styleId: typeof body.styleId === "string" ? body.styleId : undefined,
      autocut: body.autocut && typeof body.autocut === "object" ? body.autocut : undefined,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, "studio-edit.json"), JSON.stringify(payload), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}

/** MVC-11: descarta a edição salva (Resetar p/ o plano). */
export async function DELETE(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "";
  const creative = req.nextUrl.searchParams.get("creative") || "";
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }
  const editPath = path.join(creativeDirFor(REPO, client, creative), "studio-edit.json");
  try {
    if (fs.existsSync(editPath)) fs.rmSync(editPath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
