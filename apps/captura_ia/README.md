# ORACLUM TECH — Cofre de Recursos de IA

Landing de captura de leads: oferece 26 guias gratuitos sobre Claude, automação de
conteúdo, anúncios (Meta/Google) e CRM em troca do cadastro.

SPA estática — Vite 6 + React 19 + Tailwind v4, sem SSR, com roteamento por hash
(`#/`, `#/recursos`, `#/recursos/{slug}`) em `src/lib/router.ts`.

## Rodar localmente

**Pré-requisitos:** Node.js 18+

```bash
npm install
npm run dev      # http://localhost:3100
npm run build    # gera dist/
npm run lint     # tsc --noEmit
```

## SEO

| Onde | O que |
|------|-------|
| `index.html` | Metadados estáticos — é o único que os scrapers de link (WhatsApp, Facebook, LinkedIn, X) enxergam, porque eles não executam JavaScript. |
| `src/lib/seo.ts` | Fonte única de título, descrição, Open Graph e JSON-LD por rota. |
| `src/hooks/useDocumentMeta.ts` | Aplica esses metadados no `<head>` a cada troca de rota. |
| `public/robots.txt`, `public/sitemap.xml` | Estáticos, servidos na raiz. |

### Trocar o domínio de produção

O domínio aparece em **quatro** lugares (três deles não passam pelo bundler):

1. `src/lib/seo.ts` → `RAW_SITE_URL` (ou defina `VITE_SITE_URL` no ambiente de build)
2. `index.html` → `canonical` e `og:url`
3. `public/robots.txt` → linha `Sitemap:`
4. `public/sitemap.xml` → `<loc>`

### Limitação conhecida: roteamento por hash

`#/recursos/{slug}` é um **fragmento**, não uma URL. Buscadores descartam o
fragmento ao normalizar, então os 26 guias não existem como páginas indexáveis —
tudo colapsa em `/`. O sitemap tem uma entrada só por esse motivo.

Para que os guias rankeiem é preciso migrar o roteamento para History API
(`/recursos/{slug}`) com fallback do servidor para `index.html`, e só então
expandir o sitemap.
