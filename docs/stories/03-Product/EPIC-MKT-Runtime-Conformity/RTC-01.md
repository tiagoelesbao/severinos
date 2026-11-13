# RTC-01: Matriz de Divergência & Fonte Canônica

**Status:** Done
**Epic:** EPIC-MKT-Runtime-Conformity
**Complexidade:** S (Small — 3 pontos)

## Story
**Como** mantenedor dos agentes Virals
**Eu quero** um mapa completo de onde cada agente vive e o que diverge
**Para que** a sincronização posterior tenha um alvo claro.

## Contexto
Os agentes de marketing existem em 6 locações com divergências (arquivos ausentes
e conteúdo possivelmente defasado). Primeira story do epic — inventário.

## Tarefas (Checklist)
- [x] Catalogar os 10 agentes de marketing em todas as 6 locações.
- [x] Para cada arquivo existente, **flag de presença/ausência** + checks pontuais
  de protocolos (`*design-creative`, `*creative-benchmark` ausentes em todas
  as cópias fora do Claude — verificado via `grep`).
- [x] Produzir a matriz: agente × runtime × {ausente | defasado | OK}.
- [x] Formalizar fonte canônica — `.claude/CLAUDE.md` → seção "Fontes de
  Definição (Sincronização)" já documenta isso. Matriz estende para incluir
  `.gemini` e `.antigravity/rules` como derivadas.
- [x] Registrar a matriz como artefato do epic em `_DIVERGENCE-MATRIX.md`.

## Critérios de Aceite
- [x] **AC1:** Matriz completa agente × runtime publicada em `_DIVERGENCE-MATRIX.md`.
- [x] **AC2:** Cada divergência classificada (✅ / ⚠️ / ❌); gaps críticos enumerados.
- [x] **AC3:** Fonte canônica formalizada no `CLAUDE.md` e referenciada na matriz.

## Change Log
- 2026-05-19 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Inventário realizado, matriz publicada em `_DIVERGENCE-MATRIX.md`. Status: Draft → Done.

## Escopo
**IN:** inventário, matriz, formalização da fonte.
**OUT:** correção das divergências (RTC-03..05).

## Dependências
- Nenhuma (primeira story).
