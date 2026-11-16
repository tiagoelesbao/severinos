/**
 * Aplica no `<head>` os metadados da rota ativa.
 *
 * O site é uma SPA com roteamento por hash: o HTML entregue pelo servidor é
 * sempre o mesmo, então `<title>`, meta description, canonical, Open Graph e
 * JSON-LD precisam ser reescritos no cliente a cada troca de rota.
 *
 * Limitação conhecida: robôs que não executam JavaScript (os scrapers de link
 * do Facebook, WhatsApp, LinkedIn e X) só enxergam o que está estático em
 * index.html. Ver relatório de SEO / README.
 */

import { useEffect } from 'react';
import type { PageMeta } from '../lib/seo';

const JSON_LD_ID = 'ld-json-route';

type MetaKey = 'name' | 'property';

function upsertMeta(keyAttr: MetaKey, key: string, content: string): void {
  const selector = `meta[${keyAttr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(keyAttr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Canonical da página realmente servida pelo servidor.
 *
 * O fragmento (`#/recursos/...`) é deliberadamente omitido: buscadores
 * descartam o fragmento ao canonicalizar, e apontar um canonical para uma URL
 * que o servidor não distingue seria declarar páginas que não existem.
 * Usa `window.location` para nunca publicar um domínio de placeholder.
 */
function canonicalUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

export function useDocumentMeta(meta: PageMeta): void {
  const { title, description, shareUrl, ogType } = meta;
  // Serializa uma vez: o array de JSON-LD é recriado a cada render do App.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': meta.jsonLd,
  });

  useEffect(() => {
    document.title = title;

    const canonical = canonicalUrl();

    upsertMeta('name', 'description', description);
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', shareUrl);
    upsertMeta('property', 'og:type', ogType);

    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = JSON_LD_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = jsonLd;
  }, [title, description, shareUrl, ogType, jsonLd]);
}
