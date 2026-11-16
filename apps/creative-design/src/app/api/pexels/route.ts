import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..', '..');
const ASSETS_DIR = path.join(process.cwd(), 'public', 'render-assets');

/** Lê PEXELS_API_KEY do ambiente ou do .env da raiz do monorepo. */
function pexelsKey(): string {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY.trim();
  try {
    const env = fs.readFileSync(path.join(REPO_ROOT, '.env'), 'utf8');
    const m = env.match(/^PEXELS_API_KEY=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* sem .env legível */ }
  return '';
}

/**
 * GET /api/pexels?q=<query>&orientation=portrait|landscape
 * Busca uma foto no Pexels, baixa para public/render-assets/ e devolve { url }.
 * Espelha o tools/pexels_service usado pelo pipeline automático → o Studio passa
 * a ter as mesmas imagens reais (MED-06/G1). Degrada sem chave (200 + url:null).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const orientation = searchParams.get('orientation') === 'landscape' ? 'landscape' : 'portrait';
  if (!q) return NextResponse.json({ url: null, error: 'query vazia' }, { status: 400 });

  const key = pexelsKey();
  if (!key) return NextResponse.json({ url: null, error: 'PEXELS_API_KEY ausente' });

  try {
    const api = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=10&orientation=${orientation}`;
    const r = await fetch(api, { headers: { Authorization: key } });
    if (!r.ok) return NextResponse.json({ url: null, error: `pexels ${r.status}` });
    const data = await r.json();
    const photos: Array<Record<string, Record<string, string>>> = data.photos || [];
    if (!photos.length) return NextResponse.json({ url: null });

    const src = photos[0].src || {};
    const imgUrl = (orientation === 'portrait' && src.portrait) || src.large2x || src.large || src.original;
    if (!imgUrl) return NextResponse.json({ url: null });

    const imgResp = await fetch(imgUrl);
    if (!imgResp.ok) return NextResponse.json({ url: null, error: `download ${imgResp.status}` });
    const buf = Buffer.from(await imgResp.arrayBuffer());

    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    const stem = q.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
    const filename = `px_studio_${stem}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(ASSETS_DIR, filename), buf);
    return NextResponse.json({ url: `/render-assets/${filename}` });
  } catch (e) {
    return NextResponse.json({ url: null, error: String(e) });
  }
}
