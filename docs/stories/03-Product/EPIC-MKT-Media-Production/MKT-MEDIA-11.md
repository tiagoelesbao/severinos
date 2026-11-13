# MKT-MEDIA-11: Templates por Arquétipo de Conteúdo

**Status:** Done
**Epic:** EPIC-MKT-Media-Production
**Complexidade:** L (Large — 13 pontos)
**Criada por:** @sm (River) · 2026-05-16

## Story
**Como** Marketing Chief
**Eu quero** que cada criativo use o template visual do arquétipo do conteúdo
**Para que** uma frase motivacional não saia num layout de card de notícia.

## Contexto
Validação mostrou que o template único (`ModeledCarouselSlide`, estilo news) não serve a todo conteúdo: o benchmark #03 (frase motivacional GaryVee) ficou errado num layout de card; o #10 (post único de insight) idem. Cada arquétipo pede um template.

## Decisão de arquitetura
- **Classificador de arquétipo:** o `recast_engine` (LLM) classifica o benchmark em `quote` | `news` | `single`. `deep_modeler` define um default heurístico (`single` se 1 slide).
- **3 templates React:**
  - `ModeledCarouselSlide` (news/digest — existente).
  - `QuoteSlide` (frase motivacional, fundo aspiracional — novo).
  - `SinglePostSlide` (post único de insight — novo).
- **Roteamento:** o brief carrega `archetype`; o orquestrador passa `templateId`; a `render/page.tsx` escolhe o componente.

## Tarefas (Checklist)
- [x] `deep_modeler`: campo `archetype` (heurístico).
- [x] `recast_engine`: classificação de `archetype` via LLM.
- [x] `QuoteSlide.tsx` — frase motivacional + fundo aspiracional.
- [x] `SinglePostSlide.tsx` — post único de insight.
- [x] `render/page.tsx` — roteamento por `templateId`.
- [x] `orchestrate_carousel`: mapeia `archetype` → `templateId`.
- [x] Teste real nos 3 arquétipos (#02 news, #03 quote, #10 single).

## Critérios de Aceite
- [x] **AC1:** O brief carrega `archetype`; recast o classifica, deep_modeler tem default.
- [x] **AC2:** `render/page.tsx` roteia para o template certo via `templateId`.
- [x] **AC3:** #03 renderiza no `QuoteSlide`; #10 no `SinglePostSlide`; #02 no `ModeledCarouselSlide`.
- [x] **AC4:** Sem novos erros `tsc` nos componentes criados.

## Escopo
**IN:** `deep_modeler.py`, `recast_engine.py`, `orchestrate_carousel.py`, `render/page.tsx`, 2 templates novos.
**OUT:** Templates para outros arquétipos (educational-list etc.).

## Dev Agent Record
### File List
- `scripts/modeling/deep_modeler.py`
- `scripts/modeling/recast_engine.py`
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py`
- `apps/creative-design/src/app/render/page.tsx`
- `apps/creative-design/src/components/design-system/templates/QuoteSlide.tsx` (novo)
- `apps/creative-design/src/components/design-system/templates/SinglePostSlide.tsx` (novo)

## QA Results
**Gate:** PASS · @qa · 2026-05-16 — AC1–AC4 verificados via render real dos 3 arquétipos.

## Change Log
- 2026-05-16 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
- 2026-05-17 — @dev — Ajuste pós-teste: o LLM classificava post de 1 slide como `news`. Corrigido — `single` vs `carousel` agora é decidido pela ESTRUTURA (nº de slides) no orquestrador; o LLM só decide o estilo `quote`. Bug do parser (Formato B com valor em linha-parágrafo, caso #10) também corrigido no `deep_modeler`.
