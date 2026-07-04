import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { materialsDirFor, studioAssetsDirFor } from "@/lib/ingest";

// VEX-08: gera uma miniatura (1 frame) de um clipe de vídeo via ffmpeg, com
// cache em disco (.thumbs/ na pasta do criativo, gitignored). Usado pelo
// filmstrip da timeline. O Player não acessa o filesystem — a UI pede aqui.
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv"]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const client = sp.get("client") || "";
  const creative = sp.get("creative") || "";
  const file = path.basename(sp.get("file") || ""); // só o basename — sem traversal
  const t = Math.max(0, Number(sp.get("t") || "0"));
  const h = Math.min(180, Math.max(32, Number(sp.get("h") || "72")));
  const fromUploads = sp.get("assets") === "1";

  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return new Response("bad request", { status: 400 });
  }
  if (!file || !VIDEO.has(path.extname(file).toLowerCase()) || !Number.isFinite(t)) {
    return new Response("bad request", { status: 400 });
  }

  const dir = fromUploads
    ? studioAssetsDirFor(REPO, client, creative)
    : materialsDirFor(REPO, client, creative);
  const input = path.join(dir, file);
  // Segurança: o arquivo tem que estar dentro da pasta resolvida.
  if (!path.resolve(input).startsWith(path.resolve(dir) + path.sep)) {
    return new Response("forbidden", { status: 403 });
  }
  if (!fs.existsSync(input)) return new Response("not found", { status: 404 });

  const cacheDir = path.join(dir, ".thumbs");
  const key = `${file.replace(/[^a-z0-9._-]/gi, "_")}__t${t.toFixed(2)}__h${h}.jpg`;
  const out = path.join(cacheDir, key);

  if (!fs.existsSync(out)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      /* segue — ffmpeg falha e retornamos 500 */
    }
    // -ss antes de -i = seek rápido (por keyframe, suficiente para thumbnail).
    // scale=-2:h mantém o aspect com largura par. windowsHide: sem console piscando.
    const r = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-ss", String(t), "-i", input,
       "-frames:v", "1", "-vf", `scale=-2:${h}`, "-q:v", "6", "-y", out],
      { windowsHide: true, timeout: 20000 },
    );
    if (r.status !== 0 || !fs.existsSync(out)) {
      return new Response("thumb failed", { status: 500 });
    }
  }

  return new Response(fs.readFileSync(out), {
    headers: {
      "Content-Type": "image/jpeg",
      // imutável: a chave inclui file+t+h; mudou o corte → nova URL.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
