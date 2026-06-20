# MED-04: Export & Persistência

**Status:** Done
**Epic:** EPIC-MKT-Creative-Editor
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** Marketing Chief
**Eu quero** salvar as edições e exportar o criativo final em alta qualidade
**Para que** a peça ajustada vire entrega publicável.

## Contexto
Última story do EPIC-MKT-Creative-Editor. MED-01..03 entregaram o editor. MED-04 fecha o ciclo: salvar + exportar.

## Decisão de arquitetura
- **Salvar:** `POST /api/briefs/[id]` grava as edições de volta no brief YAML (sobrescreve — decisão do dono).
- **Exportar:** `POST /api/export` dispara o `orchestrate_carousel.py` (re-render Playwright, alta qualidade — decisão do dono) sobre o brief salvo.
- **Orquestrador** passa a respeitar os overrides do Editor: imagem (`image_url`), fonte (`headline_font_size`/`body_font_size`) e enquadramento (`image_zoom`/`image_pos_x`/`image_pos_y`). A imagem do Editor tem prioridade sobre a geração automática.
- Botão "Salvar e Exportar" no editor encadeia salvar → renderizar.

## Tarefas (Checklist)
- [x] `POST /api/briefs/[id]` — persiste as edições no brief.
- [x] `POST /api/export` — dispara o render do orquestrador.
- [x] `orchestrate_carousel`: lê os overrides do Editor por slide.
- [x] Editor: botão "Salvar e Exportar" + status.
- [x] Teste: editar → salvar → exportar.

## Critérios de Aceite
- [x] **AC1:** As edições do editor são gravadas no brief YAML.
- [x] **AC2:** O export re-renderiza o criativo via Playwright (alta qualidade).
- [x] **AC3:** Overrides de imagem/fonte/enquadramento do Editor refletem no render final.
- [x] **AC4:** Imagem enviada no Editor tem prioridade sobre a geração automática.
- [x] **AC5:** Sem novos erros `tsc`.

## Escopo
**IN:** `api/briefs/[id]` (POST), `api/export/route.ts`, `orchestrate_carousel.py`, `editor/page.tsx`.
**OUT:** —

## Dev Agent Record
### File List
- `apps/creative-design/src/app/api/briefs/[id]/route.ts`
- `apps/creative-design/src/app/api/export/route.ts` (novo)
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py`
- `apps/creative-design/src/app/editor/page.tsx`

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada. **Fecha o EPIC-MKT-Creative-Editor.**
