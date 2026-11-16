import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..', '..');
const OUTPUTS_DIR = path.resolve(path.join(REPO_ROOT, 'outputs'));

/** Deriva o slug do criativo a partir do id do brief (mesmo critério do DELETE). */
function deriveIdSlug(id: string): string {
  return id.replace(/^brief-v5-single-/, '').replace(/^brief-v5-/, '').trim();
}

interface Run {
  kind: string;
  creativeSlug: string;
  dir: string;
  mtime: number;
  slides: string[]; // caminhos relativos ao REPO_ROOT (para /api/renders/file?p=)
}

/**
 * GET /api/renders?client=<slug>&id=<briefId>
 * Lista os runs renderizados (carousels/posts) de um criativo, do mais novo
 * para o mais antigo, com os PNGs de cada run. Permite auditar/baixar no front.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const client = searchParams.get('client');
  const id = searchParams.get('id') || '';
  if (!client) return NextResponse.json({ runs: [] });

  const idSlug = deriveIdSlug(id);
  const runs: Run[] = [];

  for (const kind of ['carousels', 'posts']) {
    const base = path.join(OUTPUTS_DIR, client, kind);
    if (!fs.existsSync(base)) continue;
    let creatives: fs.Dirent[] = [];
    try { creatives = fs.readdirSync(base, { withFileTypes: true }); } catch { continue; }

    for (const c of creatives) {
      if (!c.isDirectory()) continue;
      // Sem id → lista todos; com id → casa por slug exato ou sufixo.
      if (idSlug && !(c.name === idSlug || c.name.endsWith(idSlug))) continue;
      const cdir = path.join(base, c.name);
      let runDirs: fs.Dirent[] = [];
      try { runDirs = fs.readdirSync(cdir, { withFileTypes: true }); } catch { continue; }

      for (const r of runDirs) {
        if (!r.isDirectory()) continue;
        const rdir = path.join(cdir, r.name);
        let files: string[] = [];
        try {
          files = fs.readdirSync(rdir)
            .filter((f) => /^slide_\d+\.png$/i.test(f))
            .sort();
        } catch { continue; }
        if (!files.length) continue;
        let mtime = 0;
        try { mtime = fs.statSync(rdir).mtimeMs; } catch { /* ignora */ }
        runs.push({
          kind,
          creativeSlug: c.name,
          dir: r.name,
          mtime,
          slides: files.map((f) =>
            path.relative(REPO_ROOT, path.join(rdir, f)).replace(/\\/g, '/')),
        });
      }
    }
  }

  runs.sort((a, b) => b.mtime - a.mtime);
  return NextResponse.json({ runs });
}
