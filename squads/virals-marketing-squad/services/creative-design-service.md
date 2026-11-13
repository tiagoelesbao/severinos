# Service: Creative Design App (`apps/creative-design`)

**Service ID:** `creative-design-service`
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Used By:** `creative-render` (PHASE-6) · Editor de fine-tuning

## Responsibility

App Next.js 16 (App Router) que cumpre dois papéis no pipeline `*design-creative`:

1. **Render service** — rota `/render?data=<b64>` renderiza um slide (React) consumido por `vvs_render_service.py` via Playwright para captura PNG transparente.
2. **Editor** — rota `/editor?brief={slug}` permite ajuste fino dos slides (texto, fonte, imagem) antes do upload, com export PNG/WebP/ZIP.

## Source

- `apps/creative-design/` — repositório do app.
- Componentes principais:
  - `src/app/render/page.tsx` — rota técnica do render service.
  - `src/app/editor/page.tsx` — UI do Editor (preview 1080×1350).
  - `src/components/design-system/templates/{ModeledCarouselSlide, QuoteSlide, SinglePostSlide}.tsx`

## Endpoints

| Path | Método | Uso |
|---|---|---|
| `/` | GET | Health check (`check_render_service`) |
| `/render?data=<b64>` | GET | Renderização de um slide (Playwright/headless) |
| `/editor` / `/editor?brief={slug}` | GET | Editor de fine-tuning |
| `/api/briefs` · `/api/briefs/[id]` | GET/POST | Persistência de overrides do Editor |
| `/api/upload` | POST | Upload de imagem para `public/render-assets/` |
| `/api/export` | POST | Export PNG/WebP/ZIP do criativo finalizado |

## Como subir

```bash
cd apps/creative-design
npm install
npm run dev -- -p 3001
```

## Boundary

- O orquestrador `creative-render` faz **pre-check** do health antes de gastar chamadas de IA/Pexels.
- Sem o service no ar, `*design-creative` aborta na PHASE-6 (fatal).
- Dev indicator do Next.js é desligado via `devIndicators: false` (`next.config.ts`) + CSS injetada pelo render service.
