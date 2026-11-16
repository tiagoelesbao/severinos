# MED-03: Imagens — Upload, Troca & Enquadramento

**Status:** Done
**Epic:** EPIC-MKT-Creative-Editor
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** Marketing Chief
**Eu quero** enviar/trocar a imagem de cada slide e reenquadrá-la no editor
**Para que** eu controle o visual do criativo no ajuste fino.

## Contexto
3ª story do EPIC-MKT-Creative-Editor. MED-02 entregou edição de texto/fonte. MED-03 traz o controle de imagem.

## Decisão de arquitetura
- `POST /api/upload` — recebe um arquivo, grava em `public/render-assets/`, devolve a URL.
- Templates ganham props de enquadramento: `imageZoom`, `imagePosX`, `imagePosY` aplicados ao `<img>` (`transform: scale` + `object-position`).
- `editor/page.tsx`: por slide — enviar imagem, remover, e sliders de zoom + posição X/Y; preview reativo.

## Tarefas (Checklist)
- [x] `api/upload/route.ts` — upload de imagem.
- [x] Props de enquadramento (`imageZoom`/`imagePosX`/`imagePosY`) nos 3 templates.
- [x] Editor: seção de imagem por slide (upload, remover, reenquadrar).
- [x] Preview reativo à imagem e ao enquadramento.
- [x] Teste: enviar imagem e ajustar o enquadramento.

## Critérios de Aceite
- [x] **AC1:** O usuário envia uma imagem do computador e ela aparece no slide.
- [x] **AC2:** A imagem pode ser removida.
- [x] **AC3:** Zoom e posição (X/Y) reenquadram a imagem.
- [x] **AC4:** O preview reflete imagem + enquadramento ao vivo.
- [x] **AC5:** Sem novos erros `tsc`.

## Escopo
**IN:** `api/upload/route.ts`, 3 templates (props de enquadramento), `editor/page.tsx`.
**OUT:** Export e salvar (MED-04); busca Pexels dentro do editor (extensão futura).

## Dev Agent Record
### File List
- `apps/creative-design/src/app/api/upload/route.ts` (novo)
- `apps/creative-design/src/components/design-system/templates/{ModeledCarouselSlide,QuoteSlide,SinglePostSlide}.tsx`
- `apps/creative-design/src/app/editor/page.tsx`

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
