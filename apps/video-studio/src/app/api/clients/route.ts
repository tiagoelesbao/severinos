import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Lista os clientes que possuem criativos de vídeo (outputs/<client>/video-plans).
// Base da página inicial de seleção de cliente (N3 — navegação multi-criativo).
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;

// Nomes de exibição conhecidos; fallback = title-case do slug.
const DISPLAY: Record<string, string> = {
  virals: "Virals",
  "tiago-elesbao": "Tiago Elesbão",
};
const displayName = (slug: string): string =>
  DISPLAY[slug] ?? slug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");

/** Conta criativos (subpastas) sob outputs/<client>/video-plans. */
function countCreatives(client: string): number {
  const dir = path.join(REPO, "outputs", client, "video-plans");
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  const outputs = path.join(REPO, "outputs");
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(outputs, { withFileTypes: true });
  } catch {
    return NextResponse.json({ clients: [], total: 0 });
  }

  const clients = entries
    .filter((e) => e.isDirectory() && SLUG.test(e.name))
    .map((e) => ({ slug: e.name, display: displayName(e.name), count: countCreatives(e.name) }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));

  const total = clients.reduce((n, c) => n + c.count, 0);
  return NextResponse.json({ clients, total });
}
