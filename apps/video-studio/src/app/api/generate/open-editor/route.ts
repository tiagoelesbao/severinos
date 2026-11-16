import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidSessionId } from "@/lib/generate";
import { openEditorFor } from "@/lib/generateEditorBridge";

/**
 * Botão "Editar" da galeria (passo 4 de /studio/generate) — monta um
 * criativo real (Materiais Brutos + studio-edit.json) a partir de uma
 * variação já renderizada, pra abrir no editor principal do Studio. Ver
 * lib/generateEditorBridge.ts pro que é/não é editável nesse resultado.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const sessionId = String(body.sessionId || "");
  const hookId = String(body.hookId || "");
  if (!isValidSessionId(sessionId) || !hookId) {
    return NextResponse.json({ error: "sessionId/hookId inválido" }, { status: 400 });
  }
  try {
    const result = await openEditorFor(sessionId, hookId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
