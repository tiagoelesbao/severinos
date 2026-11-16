import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidSessionId, sessionDirFor } from "@/lib/generate";
import { probeMedia } from "@/lib/ingest";

/**
 * Passo "corte/reenquadramento" do upload (pedido do founder 2026-10-18):
 * aparece logo depois do upload, antes da escolha de template. Corta a
 * duração (trecho ou vídeo inteiro) e reenquadra dentro do quadro vertical
 * 1080×1920 — TODOS os templates hoje (Império/Garantido) são 1080×1920, daí
 * o valor fixo; se algum dia existir template horizontal/quadrado isso passa
 * a depender do cliente/template escolhido (que nesse ponto do fluxo ainda
 * não foi escolhido — corte vem antes).
 *
 * Sobrescreve o PRÓPRIO `source.<ext>` da sessão (não cria um arquivo novo) —
 * assim o resto do pipeline (render do lote em /api/generate/render, cópia
 * do clipe 1 em lib/generateEditorBridge.ts) não precisa saber que um corte
 * aconteceu, ele só lê "source.*" como sempre leu.
 */
export const runtime = "nodejs";

const TARGET_W = 1080;
const TARGET_H = 1920;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const sessionId = String(body.sessionId || "");
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
  }
  const dir = sessionDirFor(sessionId);
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "sessão não encontrada — faça upload primeiro" }, { status: 404 });
  }
  const sourceFile = fs.readdirSync(dir).find((f) => f.startsWith("source."));
  if (!sourceFile) {
    return NextResponse.json({ error: "vídeo-fonte não encontrado na sessão" }, { status: 400 });
  }
  const srcPath = path.join(dir, sourceFile);
  const probe = probeMedia(srcPath);

  const startSec = Math.max(0, Number(body.startSec ?? 0));
  const endSec = Math.min(probe.durationSeconds, Number(body.endSec ?? probe.durationSeconds));
  const durSec = endSec - startSec;
  if (!Number.isFinite(durSec) || durSec < 0.2) {
    return NextResponse.json({ error: "intervalo de corte inválido (mínimo 0.2s)" }, { status: 400 });
  }
  const panX = Math.min(100, Math.max(0, Number(body.panX ?? 50)));
  const panY = Math.min(100, Math.max(0, Number(body.panY ?? 50)));
  const zoom = Math.min(300, Math.max(100, Number(body.zoom ?? 100))) / 100;

  const noTrim = startSec <= 0.01 && endSec >= probe.durationSeconds - 0.01;
  const noReframe = probe.width === TARGET_W && probe.height === TARGET_H && zoom <= 1.001;
  if (noTrim && noReframe) {
    return NextResponse.json({ ok: true, skipped: true, durationSeconds: probe.durationSeconds });
  }

  // "cover" (como CSS object-fit:cover) + zoom extra + pan — tudo calculado
  // em pixels aqui (não em expressão ffmpeg) pra não depender de parsing de
  // fórmula dentro do filtro.
  const coverScale = Math.max(TARGET_W / probe.width, TARGET_H / probe.height);
  const scale = coverScale * zoom;
  const scaledW = Math.max(TARGET_W, Math.round(probe.width * scale));
  const scaledH = Math.max(TARGET_H, Math.round(probe.height * scale));
  const maxOffX = scaledW - TARGET_W;
  const maxOffY = scaledH - TARGET_H;
  const offX = Math.round((maxOffX * panX) / 100);
  const offY = Math.round((maxOffY * panY) / 100);

  const ext = path.extname(sourceFile);
  const tmpPath = path.join(dir, `source-trim-tmp${ext}`);
  const args = [
    "-y",
    "-ss", startSec.toFixed(3),
    "-i", srcPath,
    "-t", durSec.toFixed(3),
    "-vf", `scale=${scaledW}:${scaledH},crop=${TARGET_W}:${TARGET_H}:${offX}:${offY}`,
    // -r + -fps_mode cfr: o fonte (ex.: vídeo de celular) pode vir VFR —
    // sem isso o Remotion (que faz seek por posição de frame, não só por
    // tempo) às vezes falha com "No frame found at position X" no render
    // em lote. CFR exato nos mesmos 30fps do template elimina a ambiguidade.
    "-r", "30",
    "-fps_mode", "cfr",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "aac",
    "-movflags", "+faststart",
    tmpPath,
  ];
  const run = spawnSync("ffmpeg", args, { windowsHide: true });
  if (run.status !== 0 || !fs.existsSync(tmpPath)) {
    fs.rmSync(tmpPath, { force: true });
    return NextResponse.json(
      { error: `ffmpeg falhou ao cortar/reenquadrar: ${run.stderr?.toString().slice(-500) ?? "sem log"}` },
      { status: 500 },
    );
  }
  fs.rmSync(srcPath, { force: true });
  fs.renameSync(tmpPath, srcPath);

  const newProbe = probeMedia(srcPath);
  return NextResponse.json({
    ok: true,
    durationSeconds: newProbe.durationSeconds,
    width: newProbe.width,
    height: newProbe.height,
    url: `/api/generate/media/${sessionId}/${sourceFile}?v=${Date.now()}`,
  });
}
