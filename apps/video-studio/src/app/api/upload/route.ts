import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { studioAssetsDirFor } from "@/lib/ingest";

// Upload de asset do computador para o media bin do Studio (N2). Grava em
// outputs/<client>/video-plans/<creative>/Studio Assets/ (fora dos brutos).
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const AUDIO = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac"]);
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv"]);
const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

type Kind = "audio" | "video" | "image";
const kindOf = (ext: string): Kind | null =>
  AUDIO.has(ext) ? "audio" : VIDEO.has(ext) ? "video" : IMAGE.has(ext) ? "image" : null;

// Nome de arquivo seguro: base sem diretórios, só [a-z0-9._-], colisão evitada.
function safeName(original: string): string {
  const base = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "upload";
}

export async function POST(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "";
  const creative = req.nextUrl.searchParams.get("creative") || "";
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }

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
  const kind = kindOf(ext);
  if (!kind) {
    return NextResponse.json({ error: `tipo não suportado: ${ext || "?"}` }, { status: 415 });
  }

  const dir = studioAssetsDirFor(REPO, client, creative);
  try {
    fs.mkdirSync(dir, { recursive: true });
    // Evita sobrescrever: prefixa com timestamp curto se já existir.
    let name = safeName(file.name);
    if (fs.existsSync(path.join(dir, name))) {
      name = `${Date.now().toString(36)}-${name}`;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, name), buf);
    return NextResponse.json({
      ok: true,
      name,
      kind,
      url: `/api/media/${client}/${creative}/__assets__/${encodeURIComponent(name)}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
