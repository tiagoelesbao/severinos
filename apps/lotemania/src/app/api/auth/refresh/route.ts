import { NextResponse } from "next/server";
import { rotateSession } from "@/lib/auth/session";

export async function POST() {
  const ok = await rotateSession();
  if (!ok) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
