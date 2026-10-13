import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { materialsDirFor, studioAssetsDirFor } from "@/lib/ingest";

// Lista assets inseríveis no media bin (N2): biblioteca (public/library: SFX,
// trilhas, overlays), materiais do próprio criativo e uploads (Studio Assets).
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const AUDIO = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac"]);
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv"]);
const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

type Kind = "audio" | "video" | "image";
interface Asset {
  name: string;
  url: string;
  kind: Kind;
}

const kindOf = (file: string): Kind | null => {
  const ext = path.extname(file).toLowerCase();
  if (AUDIO.has(ext)) return "audio";
  if (VIDEO.has(ext)) return "video";
  if (IMAGE.has(ext)) return "image";
  return null;
};

/** Lista recursivamente uma pasta da biblioteca pública (public/library/...). */
function listLibrary(dir: string, rel = ""): Asset[] {
  const out: Asset[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listLibrary(path.join(dir, e.name), r));
    else {
      const kind = kindOf(e.name);
      if (kind) out.push({ name: r, url: `/library/${r}`, kind });
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client") || "tiago-elesbao";
  const creative = req.nextUrl.searchParams.get("creative") || "13-realchasechappell-84d69e";
  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return NextResponse.json({ error: "client/creative inválido" }, { status: 400 });
  }

  const library = listLibrary(path.join(process.cwd(), "public", "library"));

  const materials: Asset[] = [];
  try {
    const dir = materialsDirFor(REPO, client, creative);
    for (const f of fs.readdirSync(dir)) {
      const kind = kindOf(f);
      if (kind) {
        materials.push({ name: f, url: `/api/media/${client}/${creative}/${encodeURIComponent(f)}`, kind });
      }
    }
  } catch {
    /* sem materiais */
  }

  // Uploads do usuário (Studio Assets) — servidos via sentinela __assets__.
  const uploads: Asset[] = [];
  try {
    const dir = studioAssetsDirFor(REPO, client, creative);
    for (const f of fs.readdirSync(dir)) {
      const kind = kindOf(f);
      if (kind) {
        uploads.push({ name: f, url: `/api/media/${client}/${creative}/__assets__/${encodeURIComponent(f)}`, kind });
      }
    }
  } catch {
    /* sem uploads */
  }

  return NextResponse.json({ library, materials, uploads });
}
