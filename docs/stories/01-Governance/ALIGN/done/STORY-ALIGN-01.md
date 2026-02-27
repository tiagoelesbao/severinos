---
title: "CLI-First Integrity Audit"
status: done
type: story
priority: high
complexity: standard
category: audit
agent: architect
epicId: "ALIGN"
createdAt: "2026-02-26T22:30:00.000Z"
---

# Story: STORY-ALIGN-01 - CLI-First Integrity Audit

## Status
**Status:** Done ✅
**Story ID:** STORY-ALIGN-01
**Epic ID:** ALIGN

## Acceptance Criteria
- [x] Auditoria de `apps/dashboard/src/app/api/` concluida.
- [x] Garantia de que a UI nao possui permissao para alterar o estado do sistema sem passar pelos gates.
- [x] Identificacao de vazamentos de logica para o Core.

## Auditoria Realizada
- **Vazamento 1:** Logica de Parsing de Markdown em `route.ts` (Deve ir para Core).
- **Vazamento 2:** Escrita direta no FS via API (Deve usar utilitarios do Core).
- **Vazamento 3:** Ordem da Kanban apenas no LocalStorage (Deve ser persistida em JSON no docs/).

## Dev Agent Record
- Agent: @dalio / @architect
- Model: Gemini 2.0 Flash
