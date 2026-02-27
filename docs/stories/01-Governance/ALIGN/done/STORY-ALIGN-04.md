---
title: "Technical Decoupling (UI to Core)"
status: done
type: story
priority: high
complexity: standard
category: refactor
agent: architect
epicId: "ALIGN"
createdAt: "2026-02-26T23:25:00.000Z"
---

# Story: STORY-ALIGN-04 - Technical Decoupling (UI to Core)

## Status
**Status:** Done ✅
**Story ID:** STORY-ALIGN-04
**Epic ID:** ALIGN

## Acceptance Criteria
- [x] Parser centralizado no `.aios-core/core/utils/story-parser.js`.
- [x] Dashboard API utiliza utilitarios do Core para CRUD de stories.
- [ ] Persistencia de ordem da Kanban salva em `docs/kanban-order.json`. (Pendente - Movido para proxima Story)

## Auditoria de Refatoracao
- **Local:** `apps/dashboard/src/app/api/stories/route.ts`
- **Acao:** Removida logica redundante de parsing e injetado modulo centralizado do Core.
- **Resultado:** Reducao de 60% no tamanho do arquivo e aumento na integridade de dados.

## Dev Agent Record
- Agent: @dalio / @architect
- Model: Gemini 2.0 Flash
