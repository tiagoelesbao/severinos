import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidSessionId, sessionDirFor } from "@/lib/generate";

/**
 * Upload de asset configurável do template (2026-10-18, pedido do founder:
 * "eu upar qual tela que quero pro celular") — além do vídeo-fonte. Salva
 * DENTRO da sessão (mesmo publicDir que o render em lote já usa pro take),
 * então vira staticFile(<file>) sem copiar nada a mais.
 */
export const runtime = "nodejs";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "form-data inválido" }, { status: 400 });
  }
  const sessionId = String(form.get("sessionId") || "");
  const kind = String(form.get("kind") || "phone-screen");
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
  }
  const dir = sessionDirFor(sessionId);
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "sessão não encontrada — faça upload do vídeo primeiro" }, { status: 404 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXT.has(ext)) {
    return NextResponse.json({ error: `tipo não suportado: ${ext || "?"} (use png/jpg/webp)` }, { status: 415 });
  }

  try {
    const fileName = `${kind}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, fileName), buf);
    return NextResponse.json({
      ok: true,
      file: fileName,
      url: `/api/generate/media/${sessionId}/${fileName}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
