# MCI-04: Integração — Produção Guiada pelo Plano

**Status:** Done
**Epic:** EPIC-MKT-Creative-Intelligence
**Complexidade:** L (Large — 8 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** pipeline `*design-creative`
**Eu quero** que a produção execute o `content_plan` (não a estrutura do benchmark)
**Para que** o criativo final reflita o que o motor planejou — slides cortados, kickers contextuais — mantendo o TEMA CENTRAL do benchmark.

## Contexto
3ª story executada do epic (antes da MCI-03, por decisão do dono). MCI-01/02 produzem análise + plano no brief, mas a produção ainda os ignora. MCI-04 faz a produção consumir o plano.

## Decisão de arquitetura
- `design_creative.py` encadeia 5 etapas: deep_modeler → analyze_benchmark → plan_creative → recast_engine → orchestrate. Análise e planejamento são não-fatais (se o LLM cair, recast usa o modo legado).
- `recast_engine.py` ganha **modo plan-aware**: se `brief["content_plan"]` existe, RECONSTRÓI o `content_data` conforme o plano (nº de slides do plano, kicker contextual, copy por `copy_direction`). Sem plano → modo legado 1:1.
- **Garantia de tema central:** o prompt de execução ancora explicitamente no tema central do benchmark como escopo obrigatório; o brief grava `central_theme`; o report exibe.

## Tarefas (Checklist)
- [x] `recast_engine`: `build_plan_execution_prompt` ancorado no tema central.
- [x] `recast_engine`: `apply_plan_execution` — reconstrói `content_data` pelo plano.
- [x] `recast_brief`: branch plan-aware vs legado.
- [x] `design_creative`: encadeia análise + planejamento.
- [x] Teste real no #03 (deve produzir 1 slide, conforme o plano).

## Critérios de Aceite
- [x] **AC1:** Com `content_plan`, a produção gera exatamente os slides do plano.
- [x] **AC2:** O #03 sai com 1 slide (plano cortou a redundância) — não 2.
- [x] **AC3:** Kicker de cada slide vem do plano (contextual).
- [x] **AC4:** O tema central do benchmark é preservado e gravado em `brief["central_theme"]`.
- [x] **AC5:** Sem `content_plan`, o recast legado 1:1 continua funcionando.
- [x] **AC6:** Pipeline unificado roda as 5 etapas; análise/planejamento não-fatais.

## Escopo
**IN:** `recast_engine.py`, `design_creative.py`.
**OUT:** Checklists + self-healing (MCI-03).

## Dev Agent Record
### File List
- `scripts/modeling/recast_engine.py`
- `scripts/modeling/design_creative.py`

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC6 verificados via pipeline real do #03.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
