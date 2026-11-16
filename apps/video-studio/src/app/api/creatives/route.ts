import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { creativeDirFor, materialsDirFor } from "@/lib/ingest";

// Lista (GET) e remove (DELETE) os criativos de vídeo de um cliente.
// outputs/<client>/video-plans/<creative>/ (com "Materiais Brutos" = ingestável).
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv"]);

/** Há ao menos um vídeo na pasta de Materiais Brutos? (criativo ingestável) */
function hasMaterials(client: string, creative: string): boolean {
  try {
    return fs
      .readdirSync(materialsDirFor(REPO, client, creative))
      .some((f) => VIDEO.has(path.extname(f).toLowerCase()));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "";
  if (!SLUG.test(client)) {
    return NextResponse.json({ error: "client inválido" }, { status: 400 });
  }
  const dir = path.join(REPO, "outputs", client, "video-plans");
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return NextResponse.json({ creatives: [] });
  }
  const creatives = entries
    .filter((e) => e.isDirectory() && SLUG.test(e.name))
    .map((e) => ({ id: e.name, label: e.name, hasMaterials: hasMaterials(client, e.name) }))
    // ingestáveis primeiro, depois alfabético
    .sort((a, b) => Number(b.hasMaterials) - Number(a.hasMaterials) || a.id.localeCompare(b.id));
  return NextResponse.json({ creatives });
}

/**
 * Remove a pasta de um criativo. DESTRUTIVO: apaga inclusive os Materiais
 * Brutos gravados. Validação rígida de slug + confinamento em outputs/.
 */
export async function DELETE(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "";
  const creative = req.nextUrl.searchParams.get("creative") || "";
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }
  const dir = creativeDirFor(REPO, client, creative);
  const outputsRoot = path.join(REPO, "outputs") + path.sep;
  const resolved = path.resolve(dir);
  // Defesa em profundidade: o alvo precisa estar DENTRO de outputs/.
  if (!resolved.startsWith(outputsRoot)) {
    return NextResponse.json({ error: "caminho fora de outputs" }, { status: 400 });
  }
  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "criativo não encontrado" }, { status: 404 });
  }
  try {
    fs.rmSync(resolved, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
