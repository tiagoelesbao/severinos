import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ingestCreative, creativeDirFor } from "@/lib/ingest";
import {
  loadTranscript,
  loadRoteiroScript,
  tokenizeScript,
  correctTranscript,
} from "@/lib/transcript";
import { revalidate, applyRoteiroToPlano } from "@/lib/revalidate";

// E1 — revalidação pós-gravação: GET devolve a análise; POST aplica o roteiro
// readequado ao Plano-de-Criativo.md.
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;

function load(client: string, creative: string) {
  const dir = creativeDirFor(REPO, client, creative);
  const timeline = ingestCreative(REPO, client, creative);
  const transcript = loadTranscript(dir);
  let roteiro = loadRoteiroScript(dir);
  if (!roteiro) {
    const briefPath = path.join(REPO, "squads/virals-marketing-squad/data", `video-brief-${creative}.yaml`);
    if (fs.existsSync(briefPath)) {
      const brief = (parse(fs.readFileSync(briefPath, "utf-8")) as Record<string, any>) || {};
      roteiro = brief.content_plan?.script || "";
    }
  }
  if (!transcript) return null;
  const corrected = correctTranscript(transcript, tokenizeScript(roteiro));
  return { dir, rev: revalidate(corrected, timeline, roteiro) };
}

function params(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "tiago-elesbao";
  const creative = req.nextUrl.searchParams.get("creative") || "13-realchasechappell-84d69e";
  return { client, creative, ok: SLUG.test(client) && SLUG.test(creative) };
}

export async function GET(req: NextRequest) {
  const { client, creative, ok } = params(req);
  if (!ok) return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  const r = load(client, creative);
  if (!r) return NextResponse.json({ error: "sem transcript" }, { status: 404 });
  return NextResponse.json(r.rev);
}

export async function POST(req: NextRequest) {
  const { client, creative, ok } = params(req);
  if (!ok) return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  const r = load(client, creative);
  if (!r) return NextResponse.json({ error: "sem transcript" }, { status: 404 });

  const planoPath = path.join(r.dir, "Plano-de-Criativo.md");
  if (!fs.existsSync(planoPath)) {
    return NextResponse.json({ error: "Plano-de-Criativo.md não encontrado" }, { status: 404 });
  }
  const updated = applyRoteiroToPlano(fs.readFileSync(planoPath, "utf-8"), r.rev.spokenScript);
  if (!updated) {
    return NextResponse.json({ error: "seção '## 📝 Roteiro' não encontrada" }, { status: 422 });
  }
  fs.writeFileSync(planoPath, updated, "utf-8");
  return NextResponse.json({ applied: true, congruencePct: r.rev.congruencePct });
}
