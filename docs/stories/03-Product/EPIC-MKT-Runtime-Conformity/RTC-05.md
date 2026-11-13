# RTC-05: Conformidade das Cópias do Squad

**Status:** Done
**Epic:** EPIC-MKT-Runtime-Conformity
**Complexidade:** S (Small — 3 pontos)

## Story
**Como** mantenedor do squad
**Eu quero** `squads/virals-marketing-squad/agents/` sincronizado com o canônico
**Para que** o Gemini (que lê essas cópias) use a definição correta.

## Contexto
`squads/virals-marketing-squad/agents/` tem os 10 agentes de marketing — mas é uma
cópia que pode ter divergido do canônico em conteúdo. O Gemini lê essas cópias
(o `.toml` aponta para `squads/.../agents/{agente}.md`).

## Tarefas (Checklist)
- [x] Comparar cada um dos 10 agentes do squad com o canônico (`sync-agents --check`).
- [x] Regerar (via `sync-agents`) as cópias divergentes — todos os 10 agora idênticos.
- [x] `marketing-chief.md` do squad inclui `*daily-monitor`, `*creative-benchmark`, `*design-creative`.
- [x] Naming preservado: `chief = marketing-chief.md`; demais agentes = `<slug>.md`.
  Shims `.toml` do Gemini foram regerados consistentes com esse mapping.

## Critérios de Aceite
- [x] **AC1:** Os 10 agentes do squad são idênticos ao canônico (validado por `sync-agents --check`).
- [x] **AC2:** O `marketing-chief.md` do squad contém os 3 protocolos atuais.
- [x] **AC3:** Naming consistente com as referências dos shims do Gemini (validado em L5 → squad).

## Change Log
- 2026-05-19 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Cópias do squad regeradas e validadas. Status: Draft → Done.

## Escopo
**IN:** `squads/virals-marketing-squad/agents/`.
**OUT:** runtimes externos (RTC-03/04).

## Dependências
- RTC-02 (script de sincronização).
