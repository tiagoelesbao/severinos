# RTC-03: Conformidade do Runtime Antigravity

**Status:** Done
**Epic:** EPIC-MKT-Runtime-Conformity
**Complexidade:** M (Standard — 5 pontos)

## Story
**Como** usuário do Antigravity
**Eu quero** os agentes de marketing Virals completos e atualizados no `.antigravity`
**Para que** o fluxo `*daily-monitor` → `*creative-benchmark` → `*design-creative` rode lá.

## Contexto
`.antigravity/agents/` e `.antigravity/rules/agents/` têm só 7 dos 10 agentes de
marketing — **faltam `marketing-chief`, `casey-neistat-img` e `sam-kolder-vid`**.
Os 7 existentes podem estar com conteúdo defasado, e o naming é inconsistente.

## Tarefas (Checklist)
- [x] Gerar (via `sync-agents`) `marketing-chief.md`, `marketing-casey-neistat-img.md`
  e `marketing-sam-kolder-vid.md` em `.antigravity/agents/` e `.antigravity/rules/agents/`.
- [x] Regerar os 7 agentes de marketing existentes a partir do canônico.
- [x] `marketing-chief.md` carrega `*daily-monitor`, `*creative-benchmark`, `*design-creative` (canônico atualizado).
- [x] Naming alinhado: `.antigravity/{agents,rules/agents}/marketing-{slug}.md`.
- [x] Verificação final: `node squads/.../scripts/sync-agents.js --check` retorna ✓ OK em todos os 10 × L3 + L4.

## Critérios de Aceite
- [x] **AC1:** Os 10 agentes de marketing existem em `.antigravity/agents/` e `.antigravity/rules/agents/`.
- [x] **AC2:** O `marketing-chief.md` do Antigravity contém os 3 pipelines atuais (`*daily-monitor`, `*creative-benchmark`, `*design-creative`).
- [x] **AC3:** Conteúdo idêntico ao canônico (validado por `sync-agents --check`).

## Change Log
- 2026-05-19 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — `sync-agents` aplicado; 10 agentes em L3+L4. Status: Draft → Done.

## Escopo
**IN:** `.antigravity/agents/` e `.antigravity/rules/agents/` (marketing).
**OUT:** demais squads; outros runtimes.

## Dependências
- RTC-02 (script de sincronização).
