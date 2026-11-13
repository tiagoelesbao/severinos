import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/generate";

export const runtime = "nodejs";

export async function GET() {
  const templates = listTemplates().map((t) => ({
    id: t.id,
    client: t.client,
    clientLabel: t.clientLabel,
    label: t.label,
    hookPacks: t.hookPacks.map((h) => ({ id: h.id, label: h.label })),
    headline: t.headline,
    configurableAssets: t.configurableAssets ?? null,
  }));
  return NextResponse.json({ templates });
}
