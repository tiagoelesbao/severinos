import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { isValidSessionId, sessionDirFor } from "@/lib/generate";

// Serve o vídeo-fonte e as variações renderizadas de uma sessão de geração
// pro <video>/@remotion/player no navegador — mesmo padrão (Range/seek) de
// src/app/api/media/[...path]/route.ts, mas enraizado em
// outputs/_generate-sessions/<sessionId>/ em vez do modelo de criativo
// existente (sessões de geração não são "criativos" de Timeline).
export const runtime = "nodejs";

const CTYPE: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const segs = (await ctx.params).path;
  if (segs.length < 2) return new Response("bad request", { status: 400 });
  const [sessionId, ...rest] = segs;
  if (!isValidSessionId(sessionId)) return new Response("sessionId inválido", { status: 400 });

  const dir = sessionDirFor(sessionId);
  const file = decodeURIComponent(rest.join("/"));
  const filePath = path.join(dir, file);
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
