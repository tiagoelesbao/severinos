---
title: "Kanban Order Persistence (LocalStorage to JSON)"
status: done
type: story
priority: medium
complexity: standard
category: refactor
agent: architect
epicId: "ALIGN"
createdAt: "2026-02-26T23:50:00.000Z"
---

# Story: STORY-ALIGN-05 - Kanban Order Persistence

## Status
**Status:** Done ✅
**Story ID:** STORY-ALIGN-05
**Epic ID:** ALIGN

## Acceptance Criteria
- [x] Ordem das colunas salva em `docs/kanban-order.json`.
- [x] Dashboard carrega a ordem inicial do servidor ao abrir.
- [x] Mudancas de reorder no Kanban disparam um POST para atualizar o JSON.

## Auditoria de Implementacao
- **Backend:** Rota `/api/kanban` criada para CRUD de ordem.
- **Frontend:** `StoryStore` refatorado para eliminar dependência do LocalStorage e usar verdade sistêmica.
- **Arquivo:** `docs/kanban-order.json` agora faz parte do rastro de governança.

## Dev Agent Record
- Agent: @dalio / @architect
- Model: Gemini 2.0 Flash
