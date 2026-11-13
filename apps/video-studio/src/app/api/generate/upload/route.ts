import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sessionDirFor } from "@/lib/generate";
import { probeMedia, probeRotation, probeIsVariableFrameRate, bakeRotation } from "@/lib/ingest";

/**
 * Passo 1 do fluxo "Gerar variações": upload do vídeo-fonte que vai virar
 * `takeFile` de todas as variações. Cria uma sessão nova (pasta própria,
 * fora do modelo de Timeline/criativo existente — ver nota em lib/generate.ts).
 */
export const runtime = "nodejs";

const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv"]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "form-data inválido" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!VIDEO_EXT.has(ext)) {
    return NextResponse.json({ error: `tipo não suportado: ${ext || "?"} (use mp4/mov/webm/mkv)` }, { status: 415 });
  }

  const sessionId = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const dir = sessionDirFor(sessionId);
  try {
    fs.mkdirSync(dir, { recursive: true });
    let sourceName = `source${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    let absPath = path.join(dir, sourceName);
    fs.writeFileSync(absPath, buf);

    // Corrige vídeos de celular com rotação só na Display Matrix (2026-10-19,
    // founder: vídeo real de campanha "esticou/distorceu" virando criativo —
    // achado: o extrator de frame do Remotion não lê essa matriz, só o
    // <video> do navegador lê) E/OU frame rate variável (2026-10-23, founder:
    // "vídeos ficaram com várias travadas" — fonte VFR extraída por timestamp
    // CFR produz frame duplicado/pulado, ver nota em bakeRotation).
    //
    // SEMPRE normaliza (não só quando `probeIsVariableFrameRate` acusa) —
    // achado testando os 4 vídeos reais do pedido: o desvio médio
    // r_frame_rate vs avg_frame_rate de celular/WhatsApp fica tipicamente
    // <0,2% (abaixo de qualquer limiar são confiável de "isso é VFR"), mas
    // ainda assim produz soluço perceptível porque a variação não é
    // uniforme — concentra em poucos pontos do clipe, não distribuída.
    // `probeIsVariableFrameRate` fica exportada pra diagnóstico/log, não
    // como gate: o custo do reencode (segundos) é desprezível perto do
    // custo do render (~100s) e MUITO menor que o custo de um criativo
    // travando no feed.
    const rotation = probeRotation(absPath);
    const isVfr = probeIsVariableFrameRate(absPath);
    const fixedName = "source.mp4";
    const fixedPath = path.join(dir, fixedName);
    const tmpPath = path.join(dir, `_normfix${Date.now()}.mp4`);
    bakeRotation(absPath, tmpPath);
    if (fs.existsSync(fixedPath)) fs.unlinkSync(fixedPath); // Windows: rename não sobrescreve com segurança
    if (absPath !== fixedPath) fs.unlinkSync(absPath); // remove o original girado/VFR
    fs.renameSync(tmpPath, fixedPath);
    sourceName = fixedName;
    absPath = fixedPath;

    const probe = probeMedia(absPath);
    return NextResponse.json({
      ok: true,
      sessionId,
      sourceFile: sourceName,
      url: `/api/generate/media/${sessionId}/${sourceName}`,
      durationSeconds: probe.durationSeconds,
      width: probe.width,
      height: probe.height,
      rotationFixed: rotation !== 0,
      frameRateFixed: isVfr,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
