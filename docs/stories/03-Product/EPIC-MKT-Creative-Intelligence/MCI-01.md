# MCI-01: Análise Holística do Benchmark

**Status:** Done
**Epic:** EPIC-MKT-Creative-Intelligence
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** Motor de Planejamento
**Eu quero** uma análise holística do benchmark (não slide-a-slide)
**Para que** o planejamento decida o post Virals com base no que o benchmark *é*, não na sua estrutura literal.

## Contexto
Primeira story do EPIC-MKT-Creative-Intelligence. O pipeline atual extrai slide-a-slide e não enxerga o benchmark como um todo. MCI-01 entrega o motor de análise holística.

## Decisão de arquitetura
- Novo `scripts/modeling/analyze_benchmark.py`.
- Lê o brief do `deep_modeler` (conteúdo já extraído) e faz 1 chamada LLM holística.
- Reusa o `call_llm` multi-provedor do `recast_engine`.
- Saída: grava `brief["benchmark_analysis"]` — tema, formato, arco, estrutura por slide (papel + essencial), redundâncias, fatores de performance, recomendação de nº de slides.

## Tarefas (Checklist)
- [x] `analyze_benchmark.py`: prompt de análise holística + chamada LLM.
- [x] Esquema da análise (tema, arco, estrutura, redundâncias, fatores, recomendação).
- [x] Grava `benchmark_analysis` no brief.
- [x] Teste real no #03 (deve detectar a redundância do slide 2).

## Critérios de Aceite
- [x] **AC1:** Produz análise holística estruturada e grava em `brief["benchmark_analysis"]`.
- [x] **AC2:** A análise tem estrutura por slide com flag `essencial`.
- [x] **AC3:** Detecta redundâncias (no #03, aponta o slide 2 redundante).
- [x] **AC4:** Recomenda nº de slides ideal (pode ser < benchmark).
- [x] **AC5:** Falha explícita se LLM indisponível ou brief inválido.

## Escopo
**IN:** `scripts/modeling/analyze_benchmark.py`.
**OUT:** Motor de planejamento (MCI-02); integração no pipeline (MCI-04).

## Dev Agent Record
### File List
- `scripts/modeling/analyze_benchmark.py` (novo)

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados via análise real do #03.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
