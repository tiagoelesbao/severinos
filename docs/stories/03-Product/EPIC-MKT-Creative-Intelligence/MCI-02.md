# MCI-02: Motor de Planejamento (Plano de Conteúdo)

**Status:** Done
**Epic:** EPIC-MKT-Creative-Intelligence
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** pipeline `*design-creative`
**Eu quero** que o motor decida a estrutura do post Virals (não copie a do benchmark)
**Para que** o criativo final tenha nexo — corta redundância, kicker contextual, arco próprio.

## Contexto
2ª story do EPIC-MKT-Creative-Intelligence. A MCI-01 entregou a análise holística. A MCI-02 transforma essa análise + a identidade Virals num **Plano de Conteúdo**.

## Decisão de arquitetura
- Novo `scripts/modeling/plan_creative.py`.
- Lê `brief["benchmark_analysis"]` (MCI-01) + `virals-brand-identity.yaml` + o conteúdo de referência.
- 1 chamada LLM → projeta o Plano de Conteúdo.
- Saída: grava `brief["content_plan"]` — `slide_count` decidido, `archetype`, e por slide: `role`, `kicker` contextual, `copy_direction`, `image_direction`, `source_slides`.
- A identidade Virals informa estilo/voz — o tema vem do benchmark (modelagem, não reinvenção).

## Tarefas (Checklist)
- [x] `plan_creative.py`: prompt de planejamento + chamada LLM.
- [x] Esquema do Plano de Conteúdo.
- [x] Aplica a recomendação de nº de slides da análise (corta redundância).
- [x] Kicker contextual por slide (fim do "ABERTURA" genérico).
- [x] Grava `content_plan` no brief.
- [x] Teste real no #03 (deve planejar 1 slide).

## Critérios de Aceite
- [x] **AC1:** Gera `brief["content_plan"]` estruturado.
- [x] **AC2:** `slide_count` reflete a recomendação da análise — no #03, 1 slide.
- [x] **AC3:** Cada slide tem `kicker` contextual (não "ABERTURA").
- [x] **AC4:** Cada slide tem `copy_direction` e `image_direction`.
- [x] **AC5:** Falha explícita se faltar `benchmark_analysis` ou LLM indisponível.

## Escopo
**IN:** `scripts/modeling/plan_creative.py`.
**OUT:** Produção guiada pelo plano (MCI-03/04).

## Dev Agent Record
### File List
- `scripts/modeling/plan_creative.py` (novo)

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados via planejamento real do #03.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
