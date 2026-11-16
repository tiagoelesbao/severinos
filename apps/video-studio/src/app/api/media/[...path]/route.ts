import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { materialsDirFor, studioAssetsDirFor } from "@/lib/ingest";

// Serve os clips de Materiais Brutos para o @remotion/player no browser
// (que não acessa o filesystem). Suporta Range — necessário para seek de vídeo.
export const runtime = "nodejs";

// O Next roda a partir de apps/video-studio → repo root é 2 níveis acima.
const REPO = path.resolve(process.cwd(), "../..");

const CTYPE: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const segs = (await ctx.params).path;
  if (segs.length < 3) return new Response("bad request", { status: 400 });
  const [client, creative, ...rest] = segs;
  // Sentinela __assets__ → serve da pasta Studio Assets (uploads); senão, brutos.
  const fromUploads = rest[0] === "__assets__";
  const fileSegs = fromUploads ? rest.slice(1) : rest;
  const file = decodeURIComponent(fileSegs.join("/"));

  const dir = fromUploads
    ? studioAssetsDirFor(REPO, client, creative)
    : materialsDirFor(REPO, client, creative);
  const filePath = path.join(dir, file);
  // Segurança: impede path traversal para fora da pasta de materiais.
  if (!path.resolve(filePath).startsWith(path.resolve(dir) + path.sep)) {
    return new Response("forbidden", { status: 403 });
  }
  if (!fs.existsSync(filePath)) return new Response("not found", { status: 404 });

  const stat = fs.statSync(filePath);
  const ctype = CTYPE[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");

  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : stat.size - 1;
      const stream = fs.createReadStream(filePath, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          "Content-Type": ctype,
        },
      });
    }
  }

  return new Response(Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream, {
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": ctype,
      "Accept-Ranges": "bytes",
    },
  });
}
