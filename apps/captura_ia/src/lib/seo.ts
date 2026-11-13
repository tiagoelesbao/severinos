/**
 * Metadados de SEO derivados da rota ativa.
 *
 * Este módulo é a única fonte de verdade para título, descrição, Open Graph e
 * JSON-LD. O hook `useDocumentMeta` apenas aplica no DOM o que é calculado aqui.
 *
 * ATENÇÃO — domínio: o valor padrão de `SITE_URL` abaixo precisa bater com o
 * domínio real de produção. Ele aparece em outros 3 arquivos que NÃO passam
 * pelo bundler e portanto precisam ser editados à mão se o domínio mudar:
 *   - index.html        (og:url, canonical de fallback)
 *   - public/robots.txt (linha Sitemap:)
 *   - public/sitemap.xml
 * Em runtime o canonical real é recalculado a partir de `window.location`,
 * então um domínio errado aqui nunca é publicado como canonical de uma página
 * já renderizada — mas os arquivos estáticos acima continuam errados.
 */

import type { Resource } from '../types';
import type { Route } from './router';
import { ROUTES } from './router';

export const SITE_NAME = 'ORACLUM TECH';

const RAW_SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://oraclumtech-cofre.vercel.app';

/** Origem pública do site, sempre sem barra final. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '');

/** Logotipo original (quadrado) — usado no JSON-LD da Organization. */
export const LOGO_URL =
  'https://res.cloudinary.com/dtw3f2py1/image/upload/v1786111368/ORACLUM_-_2_azzgzp.png';

/**
 * Imagem de compartilhamento 1200x630. É a mesma arte do logotipo, com padding
 * gerado pelo Cloudinary sobre o fundo do site (#08080C) — evita o corte que o
 * Facebook/WhatsApp fazem em imagens quadradas.
 */
export const OG_IMAGE =
  'https://res.cloudinary.com/dtw3f2py1/image/upload/c_pad,w_1200,h_630,b_rgb:08080C/v1786111368/ORACLUM_-_2_azzgzp.png';

export const OG_IMAGE_ALT = 'Cofre de Recursos de IA da ORACLUM TECH';

const DEFAULT_DESCRIPTION =
  'Desbloqueie 26 guias gratuitos de IA: prompts de Claude, automação de conteúdo, anúncios no Meta e no Google e integração com CRM. Acesso imediato.';

const VAULT_DESCRIPTION =
  'A biblioteca completa: 26 guias práticos de IA para conteúdo, anúncios, geração de leads e automação — com prompts prontos e passo a passo de configuração.';

/** Limite prático da SERP do Google para a meta description (~160 caracteres). */
const DESCRIPTION_MAX = 160;

export interface PageMeta {
  /** Já vem no formato `{título} — ORACLUM TECH`. */
  title: string;
  description: string;
  /** URL absoluta com o fragmento da rota — serve para `og:url`. */
  shareUrl: string;
  ogType: 'website' | 'article';
  jsonLd: Record<string, unknown>[];
}

/** Corta no limite da SERP sem partir palavra ao meio. */
export function truncate(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-—]$/, '')}…`;
}

function withBrand(title: string): string {
  return title.endsWith(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
}

const MONTHS: Record<string, string> = {
  janeiro: '01',
  fevereiro: '02',
  março: '03',
  marco: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
};

/**
 * `updatedDate` nos recursos é texto humano ("Agosto de 2026"). Converte para
 * ISO-8601 quando possível; retorna `undefined` em vez de inventar uma data.
 */
export function toIsoDate(label?: string): string | undefined {
  if (!label) return undefined;
  const match = label.toLowerCase().match(/([a-zç]+)\s+de\s+(\d{4})/);
  if (!match) return undefined;
  const month = MONTHS[match[1]];
  return month ? `${match[2]}-${month}-01` : undefined;
}

function organizationLd(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
    },
    description:
      'Instalação de sistemas de IA que automatizam conteúdo, anúncios (Meta e Google) e CRM, além de mentoria 1:1 para agências, criadores, coaches e infoprodutores.',
    areaServed: 'BR',
    knowsLanguage: 'pt-BR',
  };
}

function webSiteLd(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: `Cofre de Recursos de IA — ${SITE_NAME}`,
    url: `${SITE_URL}/`,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

function breadcrumbLd(resource: Resource): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Cofre de Recursos',
        item: `${SITE_URL}/${ROUTES.vault}`,
      },
      { '@type': 'ListItem', position: 3, name: resource.title },
    ],
  };
}

/**
 * Recursos com `steps` viram HowTo (o formato descreve exatamente o conteúdo:
 * uma sequência numerada de passos de configuração). Os demais viram Article.
 */
function articleOrHowToLd(resource: Resource, url: string): Record<string, unknown> {
  const dateModified = toIsoDate(resource.updatedDate);

  const base: Record<string, unknown> = {
    '@id': `${url}#content`,
    name: resource.title,
    description: truncate(resource.subtitle || resource.description, 300),
    inLanguage: 'pt-BR',
    url,
    image: OG_IMAGE,
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isAccessibleForFree: true,
    keywords: resource.tags.join(', '),
    ...(dateModified ? { dateModified, datePublished: dateModified } : {}),
  };

  if (resource.steps && resource.steps.length > 0) {
    return {
      ...base,
      '@type': 'HowTo',
      ...(resource.beforeYouStart && resource.beforeYouStart.length > 0
        ? {
            supply: resource.beforeYouStart.map((item) => ({
              '@type': 'HowToSupply',
              name: truncate(item, 110),
            })),
          }
        : {}),
      // Sem `url` por passo de propósito: a URL já carrega um fragmento
      // (#/recursos/slug) e um segundo "#passo-N" quebraria o parser da rota.
      // Os ids existem no DOM (ver ResourceArticleView) para quando o
      // roteamento migrar para History API.
      step: resource.steps.map((step) => ({
        '@type': 'HowToStep',
        position: step.stepNumber,
        name: step.title,
        text: truncate(step.description, 400),
      })),
    };
  }

  return {
    ...base,
    '@type': 'Article',
    headline: truncate(resource.title, 110),
    articleSection: resource.category,
  };
}

/** Monta título, descrição, OG e JSON-LD para a rota ativa. */
export function metaForRoute(route: Route, article: Resource | null): PageMeta {
  if (route.name === 'article' && article) {
    const shareUrl = `${SITE_URL}/${ROUTES.article(article.slug)}`;
    return {
      title: withBrand(article.title),
      description: truncate(article.description),
      shareUrl,
      ogType: 'article',
      jsonLd: [
        organizationLd(),
        webSiteLd(),
        breadcrumbLd(article),
        articleOrHowToLd(article, shareUrl),
      ],
    };
  }

  if (route.name === 'vault') {
    return {
      title: withBrand('Cofre de Recursos de IA'),
      description: VAULT_DESCRIPTION,
      shareUrl: `${SITE_URL}/${ROUTES.vault}`,
      ogType: 'website',
      jsonLd: [organizationLd(), webSiteLd()],
    };
  }

  return {
    title: withBrand('26 guias gratuitos de IA, prompts e automação'),
    description: DEFAULT_DESCRIPTION,
    shareUrl: `${SITE_URL}/`,
    ogType: 'website',
    jsonLd: [organizationLd(), webSiteLd()],
  };
}
