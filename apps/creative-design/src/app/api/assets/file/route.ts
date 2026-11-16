import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..', '..');

/**
 * Raízes de leitura permitidas.
 *
 * POR QUE UMA ROTA E NÃO CÓPIA PARA public/
 *   Os assets de um canal (selo, logo) e os takes de um episódio já existem no
 *   repositório, versionados, e são a fonte que o resto do pipeline consome.
 *   Copiá-los para `public/` criaria uma segunda cópia que envelhece sozinha —
 *   o editor abriria um selo velho depois de a arte ser trocada. A rota lê
 *   sempre o arquivo real.
 *
 * É leitura pura, com allowlist de raiz e de extensão, e resolve o caminho
 * absoluto ANTES de comparar (bloqueia `..` / path traversal).
 */
const ALLOWED_ROOTS = [
  'workspaces/businesses/virals/creative-studio/canais',
  'squads/virals-marketing-squad/data/clients',
  'apps/canal-futebol',
].map((rel) => path.resolve(path.join(REPO_ROOT, rel)));

const ALLOWED_EXT = /\.(png|jpe?g|webp|svg|gif)$/i;

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
};

/**
 * GET /api/assets/file?p=<caminho relativo à raiz do repo>
 * Serve uma imagem de asset de canal/cliente para o editor e para o /render.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get('p') || '';
  if (!rel) return new Response('Missing p', { status: 400 });

  const abs = path.resolve(path.join(REPO_ROOT, rel));

  const insideAllowedRoot = ALLOWED_ROOTS.some(
    (root) => abs === root || abs.startsWith(root + path.sep),
  );
  if (!insideAllowedRoot || !ALLOWED_EXT.test(abs)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return new Response('Not found', { status: 404 });
  }

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // Assets de marca mudam raramente, mas quando mudam o editor tem de ver
      // na hora — o custo de revalidar é irrelevante numa ferramenta local.
      'Cache-Control': 'no-cache',
    },
  });
}
