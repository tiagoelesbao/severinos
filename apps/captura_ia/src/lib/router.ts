/**
 * Router mínimo baseado em hash — sem dependência externa.
 *
 * Rotas:
 *   #/                      → landing (captura de lead)
 *   #/recursos              → cofre (grade de recursos)
 *   #/recursos/{slug}       → artigo completo de um recurso
 */

export type Route =
  | { name: 'landing' }
  | { name: 'vault' }
  | { name: 'article'; slug: string };

export const ROUTES = {
  landing: '#/',
  vault: '#/recursos',
  article: (slug: string) => `#/recursos/${slug}`,
} as const;

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');

  if (path === '' || path === 'inicio') return { name: 'landing' };

  const segments = path.split('/');
  if (segments[0] === 'recursos') {
    if (segments[1]) return { name: 'article', slug: decodeURIComponent(segments[1]) };
    return { name: 'vault' };
  }

  return { name: 'landing' };
}

export function navigate(hash: string) {
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

/** Troca a rota sem criar entrada no histórico (usado em redirecionamentos de guarda). */
export function replaceRoute(hash: string) {
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
