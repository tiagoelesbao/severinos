import { next } from '@vercel/functions';

// Gate de acesso pro BI — mesmo padrão do apps/BI/imperio-premios/middleware.js
// (painel de login próprio, não Vercel SSO Protection). Cookie 'bi_auth'
// precisa bater com o hash SHA-256 da senha (env var GARANTIDO_BI_PASSWORD —
// nome próprio, nunca reusar BI_PASSWORD do Império, são contas diferentes).
export const config = {
  matcher: ['/((?!login.html|api/login|favicon.ico).*)'],
};

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  return out;
}

async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function middleware(request) {
  const cookies = parseCookies(request.headers.get('cookie'));
  const expected = await hashPassword(process.env.GARANTIDO_BI_PASSWORD || '');
  if (expected && cookies.bi_auth === expected) {
    return next();
  }
  const loginUrl = new URL('/login.html', request.url);
  return Response.redirect(loginUrl, 302);
}
