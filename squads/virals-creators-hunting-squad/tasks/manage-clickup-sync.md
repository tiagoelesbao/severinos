# Task: ClickUp Sync

**ID:** VH-TASK-402
**Phase:** 4 — Gerenciamento
**Agent:** @hunter-manager (Jason)
**Execution Type:** Worker (clickup-pipeline-sync.js)
**Status:** template

---

## Objetivo

Sincronizar dados do pipeline com ClickUp (bidirecional).

## Input

- Dados do pipeline (discoveries, scorecards, status changes)
- Config: config/clickup-ids.yaml

## Output

- ClickUp atualizado com dados correntes
- Pipeline local atualizado com dados do ClickUp

## Action Items

1. Sync novos prospects → ClickUp Prospecção (List 901325463808)
2. Update status changes (discovered → scored → qualified → contacted)
3. Sync creators contratadas → ClickUp CRM Hunter (List 901325463813)
4. Pull dados atualizados do ClickUp → pipeline local
5. Validate: nenhuma creator "lost" entre sistemas

## Acceptance Criteria

- [ ] Todos os prospects no ClickUp
- [ ] Status corretos em ambos os sistemas
- [ ] Creators contratadas no CRM Hunter
- [ ] Zero creators perdidas
