# AIOX-04: Checklists Formais (Quality Gate)

**Status:** Done
**Epic:** EPIC-MKT-Creative-AIOX-Alignment
**Complexidade:** S (Small — 3 pontos)

## Story
**Como** squad virals-marketing
**Eu quero** o Quality Gate descrito como um checklist AIOX
**Para que** os critérios C1-C7 sejam um artefato versionável, não só código.

## Contexto
O `quality_gate.py` carrega os critérios C1-C7 numa lista em código. O AIOX prevê
`checklists/` formais — o gate deveria consumir o checklist como fonte.

## Tarefas (Checklist)
- [x] Criar `checklists/creative-quality-checklist.md` — os critérios C1-C7 no padrão AIOX.
- [x] `quality_gate.py` passa a ler o checklist `.md` como fonte (`_load_checklist`) com fallback in-code.
- [x] Registrar o checklist em `squad.yaml` (`creative_intelligence_pipeline.checklists`).

## Critérios de Aceite
- [x] **AC1:** Existe `checklists/creative-quality-checklist.md` com C1-C7.
- [x] **AC2:** O `quality_gate.py` lê o checklist `.md` (verificado: parser retorna 7 itens).
- [x] **AC3:** Alterar/comentar um item C{n} no `.md` reflete no comportamento do gate na próxima execução.

## Change Log
- 2026-05-17 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Checklist criado e `quality_gate.py` passa a lê-lo como fonte canônica. Status: Draft → Done.

## Escopo
**IN:** `checklists/creative-quality-checklist.md`, leitura no `quality_gate.py`.
**OUT:** —

## Dependências
- AIOX-01 (quality_gate já no squad).
