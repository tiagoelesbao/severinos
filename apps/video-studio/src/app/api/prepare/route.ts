import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { creativeDirFor, materialsDirFor } from "@/lib/ingest";

/**
 * Preparação automática do criativo (VEX-02): transcrição Whisper + geração do
 * assembly.json. POST dispara o worker em background; GET devolve o status.
 */
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const STALE_MS = 15 * 60 * 1000; // whisper pode levar minutos em material longo

export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "";
  const creative = req.nextUrl.searchParams.get("creative") || "";
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }
  try {
    const status = JSON.parse(
      fs.readFileSync(path.join(creativeDirFor(REPO, client, creative), "prepare-status.json"), "utf-8"),
    );
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ state: "idle" });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* body opcional */
  }
  const client = String(body.client || req.nextUrl.searchParams.get("client") || "");
  const creative = String(body.creative || req.nextUrl.searchParams.get("creative") || "");
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }
  const dir = creativeDirFor(REPO, client, creative);
  if (!fs.existsSync(materialsDirFor(REPO, client, creative))) {
    return NextResponse.json({ error: "criativo sem Materiais Brutos" }, { status: 404 });
  }

  // 1 preparação por vez por criativo.
  const statusPath = path.join(dir, "prepare-status.json");
  try {
    const cur = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    const age = Date.now() - Date.parse(String(cur.updatedAt ?? 0));
    if (["transcribing", "assembling"].includes(String(cur.state)) && age < STALE_MS) {
      return NextResponse.json({ error: "preparação já em andamento", status: cur }, { status: 409 });
    }
  } catch {
    /* sem status */
  }

  const now = new Date().toISOString();
  fs.writeFileSync(statusPath, JSON.stringify({ state: "queued", updatedAt: now }), "utf-8");

  const logFd = fs.openSync(path.join(dir, "prepare.log"), "a");
  const worker = path.join(process.cwd(), "scripts", "prepare-creative.ts");
  const args = [worker, client, creative];
  if (body.forceAssembly) args.push("--force-assembly");
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true, // sem janela de console piscando no Windows
  });
  child.unref();
  fs.closeSync(logFd);

  return NextResponse.json({ ok: true });
}
