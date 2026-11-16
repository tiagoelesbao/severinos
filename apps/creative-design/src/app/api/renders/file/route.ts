import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..', '..');
const OUTPUTS_DIR = path.resolve(path.join(REPO_ROOT, 'outputs'));

/**
 * GET /api/renders/file?p=<relpath>
 * Serve um arquivo de imagem renderizado de outputs/. Path-safe: só resolve
 * dentro de outputs/ e só formatos de imagem (evita path traversal).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get('p') || '';
  const abs = path.resolve(path.join(REPO_ROOT, rel));

  if (!abs.startsWith(OUTPUTS_DIR + path.sep) || !/\.(png|webp|jpe?g)$/i.test(abs)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(abs)) return new Response('Not found', { status: 404 });

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const type = ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': type, 'Cache-Control': 'no-store' },
  });
}
