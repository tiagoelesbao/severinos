import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { creativeDirFor } from "@/lib/ingest";

/**
 * Export final (VEX-01). POST dispara o worker de render em background com o
 * estado ATUAL do editor (timeline+fxPlan do body; fallback: studio-edit.json);
 * GET devolve o status/progresso (exports/render-status.json).
 */
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
// Job ativo sem update há mais deste tempo = considerado morto (worker caiu).
const STALE_MS = 5 * 60 * 1000;

const ACTIVE = new Set(["queued", "staging", "bundling", "rendering"]);

function statusPathFor(client: string, creative: string): string {
  return path.join(creativeDirFor(REPO, client, creative), "exports", "render-status.json");
}

function readStatus(client: string, creative: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(statusPathFor(client, creative), "utf-8"));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "";
  const creative = req.nextUrl.searchParams.get("creative") || "";
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }
  const status = readStatus(client, creative);
  return NextResponse.json(status ?? { state: "idle" });
}

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
  const creativeDir = creativeDirFor(REPO, client, creative);
  if (!fs.existsSync(creativeDir)) {
    return NextResponse.json({ error: "criativo não encontrado" }, { status: 404 });
  }

  // 1 job por criativo: recusa se há um ativo e não-morto.
  const cur = readStatus(client, creative);
  if (cur && ACTIVE.has(String(cur.state))) {
    const age = Date.now() - Date.parse(String(cur.updatedAt ?? 0));
    if (Number.isFinite(age) && age < STALE_MS) {
      return NextResponse.json({ error: "já existe um export em andamento", status: cur }, { status: 409 });
    }
  }

  // VEX-11: batch de variantes de hook (cada uma com sua timeline/fxPlan).
  const variants = Array.isArray(body.variants) && body.variants.length ? body.variants : null;

  // Estado a renderizar: body (o que está na tela) OU o save do Studio.
  let timeline = body.timeline;
  let fxPlan = body.fxPlan;
  if (!variants && (!timeline || !fxPlan)) {
    try {
      const saved = JSON.parse(
        fs.readFileSync(path.join(creativeDir, "studio-edit.json"), "utf-8"),
      );
      timeline = timeline ?? saved.timeline;
      fxPlan = fxPlan ?? saved.fxPlan;
    } catch {
      /* sem save */
    }
  }
  if (!variants && (!timeline || !fxPlan)) {
    return NextResponse.json(
      { error: "timeline/fxPlan ausentes (envie no body ou salve no Studio antes)" },
      { status: 400 },
    );
  }

  const jobId = `${Date.now().toString(36)}`;
  const exportsDir = path.join(creativeDir, "exports");
  fs.mkdirSync(exportsDir, { recursive: true });

  const job = {
    jobId,
    client,
    creative,
    timeline,
    fxPlan,
    captionStyle: body.captionStyle,
    ...(Array.isArray(body.frameRange) ? { frameRange: body.frameRange } : {}),
    ...(variants ? { variants } : {}), // VEX-11: export batch
  };
  const jobFile = path.join(exportsDir, `render-job-${jobId}.json`);
  fs.writeFileSync(jobFile, JSON.stringify(job), "utf-8");
  const now = new Date().toISOString();
  fs.writeFileSync(
    statusPathFor(client, creative),
    JSON.stringify({ jobId, state: "queued", progress: 0, startedAt: now, updatedAt: now }),
    "utf-8",
  );

  // Worker destacado (sobrevive ao request); log por job para diagnóstico.
  const logFd = fs.openSync(path.join(exportsDir, `render-${jobId}.log`), "a");
  const worker = path.join(process.cwd(), "scripts", "render-export.ts");
  const child = spawn(process.execPath, [worker, jobFile], {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true, // sem janela de console piscando no Windows
  });
  child.unref();
  fs.closeSync(logFd);

  return NextResponse.json({ ok: true, jobId });
}
