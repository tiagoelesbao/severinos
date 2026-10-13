# MED-02: Edição de Texto & Tipografia

**Status:** Done
**Epic:** EPIC-MKT-Creative-Editor
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** Marketing Chief
**Eu quero** editar os textos e o tamanho da fonte de cada slide no editor
**Para que** eu faça o ajuste fino do criativo com preview reativo.

## Contexto
2ª story do EPIC-MKT-Creative-Editor. MED-01 entregou o preview read-only. MED-02 torna-o editável.

## Decisão de arquitetura
- Templates (`ModeledCarouselSlide`, `QuoteSlide`, `SinglePostSlide`) ganham props opcionais `headlineFontSize` / `bodyFontSize` (px) que sobrepõem o auto-scale.
- `editor/page.tsx`: estado editável por slide (headline, body, kicker, overrides de fonte); painel de edição + preview reativo.
- Persistência (salvar) fica para a MED-04.

## Tarefas (Checklist)
- [x] Props de override de fonte nos 3 templates.
- [x] Editor: estado editável por slide.
- [x] Campos editáveis (headline, kicker, body) + sliders de fonte.
- [x] Preview reativo às edições.
- [x] Botão de reset da edição.
- [x] Teste: editar e ver o preview atualizar.

## Critérios de Aceite
- [x] **AC1:** Headline, kicker e body de cada slide são editáveis no editor.
- [x] **AC2:** Sliders ajustam o tamanho de fonte de headline e body por slide.
- [x] **AC3:** O preview atualiza ao vivo conforme a edição.
- [x] **AC4:** Override de fonte sobrepõe o auto-scale dos templates.
- [x] **AC5:** Sem novos erros `tsc`.

## Escopo
**IN:** 3 templates (props de fonte), `editor/page.tsx`.
**OUT:** Imagens (MED-03); export e salvar (MED-04).

## Dev Agent Record
### File List
- `apps/creative-design/src/components/design-system/templates/ModeledCarouselSlide.tsx`
- `apps/creative-design/src/components/design-system/templates/QuoteSlide.tsx`
- `apps/creative-design/src/components/design-system/templates/SinglePostSlide.tsx`
- `apps/creative-design/src/app/editor/page.tsx`

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
