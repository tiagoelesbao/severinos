# AIOX-03: Tasks Formais das 6 Etapas

**Status:** Done
**Epic:** EPIC-MKT-Creative-AIOX-Alignment
**Complexidade:** M (Standard — 5 pontos)

## Story
**Como** squad virals-marketing
**Eu quero** cada etapa do pipeline descrita como uma task AIOX
**Para que** o workflow seja composto de tasks governáveis (task-first).

## Contexto
O pipeline tem 6 etapas em script. O AIOX define que workflows são compostos de
tasks — cada task com inputs, outputs, pré/pós-condições e executor.

## Tarefas (Checklist)
- [x] Criar em `tasks/` uma task por etapa:
  - `creative-modeling.md` (deep_modeler — extração)
  - `creative-analysis.md` (analyze_benchmark — análise holística)
  - `creative-planning.md` (plan_creative — Plano de Conteúdo)
  - `creative-recast.md` (recast_engine — produção na voz Virals)
  - `creative-quality-gate.md` (quality_gate — checklist + self-healing)
  - `creative-render.md` (orchestrate_carousel — render VVS)
- [x] Cada task: inputs, outputs, pré/pós-condições, executor (script), fatal/não-fatal.
- [x] Registrar as tasks em `squad.yaml` (`creative_intelligence_pipeline.tasks`).

## Critérios de Aceite
- [x] **AC1:** 6 tasks formais em `tasks/`, no padrão AIOX (VM-TP-001).
- [x] **AC2:** Cada task aponta para o `executor_script` correspondente.
- [x] **AC3:** O workflow (AIOX-02) referencia estas tasks via `task_file`.

## Change Log
- 2026-05-17 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — 6 tasks criadas em `squads/virals-marketing-squad/tasks/creative-*.md`. Status: Draft → Done.

## Escopo
**IN:** `tasks/creative-*.md`.
**OUT:** workflow (AIOX-02); checklist (AIOX-04).

## Dependências
- AIOX-01 (scripts já no squad, para referência de path correta).
