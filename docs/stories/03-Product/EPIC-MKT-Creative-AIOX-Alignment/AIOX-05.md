# AIOX-05: Templates, Tools & Services no Padrão do Squad

**Status:** Done
**Epic:** EPIC-MKT-Creative-AIOX-Alignment
**Complexidade:** M (Standard — 5 pontos)

## Story
**Como** squad virals-marketing
**Eu quero** templates, tools e services registrados no padrão AIOX do squad
**Para que** todos os artefatos do motor sejam descobríveis e governáveis.

## Contexto
- Os **templates** de render são componentes React em `apps/creative-design` — não há
  registro em `templates/` do squad.
- As **tools** (`pexels_service`, `vvs_render_service`, `casey_*`) já estão em `tools/`
  — falta normalizar/documentar.
- O app `apps/creative-design` (Editor + render service) é um **service externo** sem
  registro formal.

## Tarefas (Checklist)
- [x] Registrar em `templates/` os 3 templates de criativo (`modeled-carousel-slide.md`,
  `quote-slide.md`, `single-post-slide.md`) — manifestos; o código React permanece no app.
- [x] Documentar as tools do motor em `tools/` (`pexels-service.md`, `vvs-render-service.md`;
  `casey-ai-image-service.md` já existia).
- [x] Registrar o app `creative-design` como service em `services/creative-design-service.md`
  + bloco `creative_intelligence_pipeline.services` no `squad.yaml`.
- [x] `data/virals-brand-identity.yaml` e `data/casey-brand-config.yaml` listados no
  bloco de dados do `creative_intelligence_pipeline`.

## Critérios de Aceite
- [x] **AC1:** Os 3 templates de criativo registrados em `squads/virals-marketing-squad/templates/`.
- [x] **AC2:** As tools do motor têm doc `.md` em `squads/virals-marketing-squad/tools/`.
- [x] **AC3:** O app `creative-design` está registrado como service no `squad.yaml`.

## Change Log
- 2026-05-17 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Templates/tools/services registrados + bloco `creative_intelligence_pipeline` no `squad.yaml`. Status: Draft → Done.

## Escopo
**IN:** `templates/`, `tools/` (docs), registro de service.
**OUT:** mover o app Next.js (permanece em `apps/`).

## Dependências
- AIOX-01.
