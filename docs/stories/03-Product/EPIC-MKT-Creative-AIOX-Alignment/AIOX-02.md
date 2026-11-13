# AIOX-02: Workflow Formal `design-creative`

**Status:** Done
**Epic:** EPIC-MKT-Creative-AIOX-Alignment
**Complexidade:** S (Small — 3 pontos)

## Story
**Como** squad virals-marketing
**Eu quero** o fluxo `*design-creative` descrito como um workflow AIOX formal
**Para que** o pipeline seja um artefato governável, não só um script.

## Contexto
O `design_creative.py` encadeia 6 etapas em código. Falta o workflow AIOX em
`workflows/` que descreva o fluxo (task-first: workflows são compostos de tasks).

## Tarefas (Checklist)
- [x] Criar `squads/virals-marketing-squad/workflows/design-creative.workflow.md`.
- [x] Descrever as 6 etapas como sequência de task-refs (ver AIOX-03).
- [x] Documentar pré/pós-condições, modos de falha (fatal/não-fatal) e degradação graciosa.
- [x] Registrar o workflow em `squad.yaml` (bloco `creative_intelligence_pipeline`).

## Critérios de Aceite
- [x] **AC1:** Existe `workflows/design-creative.workflow.md` no padrão AIOX.
- [x] **AC2:** O workflow referencia as 6 tasks (AIOX-03) na ordem correta.
- [x] **AC3:** Modos de falha e fatalidade (`failure_modes`) documentados.

## Change Log
- 2026-05-17 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Workflow `design-creative.workflow.md` criado + registrado em `squad.yaml`. Status: Draft → Done.

## Escopo
**IN:** `workflows/design-creative.workflow.md`.
**OUT:** definição das tasks (AIOX-03).

## Dependências
- AIOX-03 (as task-refs do workflow apontam para as tasks).
