# Tool: VVS Render Service (`vvs_render_service.py`)

**Tool ID:** `vvs-render-service`
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Used By:** `creative-render` (PHASE-6 do `design-creative.workflow.md`)
**Source:** `squads/virals-marketing-squad/tools/vvs_render_service.py`

## Responsibility

Renderiza um componente React via Next.js + Playwright, capturando PNG transparente do slide no viewport 1080×1350 (4:5 — formato vertical recomendado pela grade do Instagram).

## Inputs

- `component_id` (string) — id legado do Storybook (ignorado nesta versão; uso direto da rota `/render`).
- `props` (dict) — todos os campos do slide (templateId, slide_n, headline, body, etc.).
- `output_path` (path) — destino PNG do slide.
- `viewport` (tuple) — `(1080, 1350)` padrão (4:5). Pinar `(1080, 1080)` apenas em fluxos legados.

## Outputs

- `output_path` (PNG transparente).
- `output_path.replace('.png', '.webp')` (WebP qualidade 85).

## Dependências

- Render service Next.js em `http://localhost:3001`. Pre-check obrigatório em `orchestrate_carousel.py`.
- Playwright (chromium headless), `device_scale_factor=2` (retina).
- PIL para WebP.

## Failure Modes

| Cenário | Comportamento |
|---|---|
| Render service OFF | `creative-render` aborta (fatal) |
| Timeout `wait_until=networkidle` | 60s — propaga exception |
| Dev indicator do Next.js visível | Removido via CSS injetada antes do screenshot |

## Boundary

Fatal — sem render, sem artefato.
