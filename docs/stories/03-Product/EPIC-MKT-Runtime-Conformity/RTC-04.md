# RTC-04: Conformidade do Runtime Gemini

**Status:** Done
**Epic:** EPIC-MKT-Runtime-Conformity
**Complexidade:** M (Standard — 5 pontos)

## Story
**Como** usuário do Gemini
**Eu quero** os agentes de marketing Virals completos e atualizados no `.gemini`
**Para que** o fluxo completo de criativos rode via Gemini.

## Contexto
`.gemini/commands/*.toml` e `.gemini/rules/AIOX/agents/` têm 8 agentes de marketing
(chief + 7) — **faltam `casey-neistat-img` e `sam-kolder-vid`**. Os toml/rules
existentes podem estar com protocolos defasados.

## Contexto técnico
O `.gemini/commands/*.toml` é um shim: o `prompt` manda ler a definição da matriz
em `squads/virals-marketing-squad/agents/{agente}.md` e a rule operacional em
`.gemini/rules/AIOX/agents/{agente}.md`. Logo, RTC-04 depende de RTC-05 (cópias do squad).

## Tarefas (Checklist)
- [x] Gerar `.gemini/commands/virals-marketing-casey-neistat-img.toml` e
  `virals-marketing-sam-kolder-vid.toml` (via `sync-agents`).
- [x] Gerar as rules `.gemini/rules/AIOX/agents/` correspondentes (chief, casey, sam).
- [x] Regerar os toml + rules dos 7 existentes a partir do canônico.
- [x] A rule do `marketing-chief` no Gemini traz os 3 protocolos atuais (canônico
  contém `*daily-monitor`, `*creative-benchmark`, `*design-creative`).

## Critérios de Aceite
- [x] **AC1:** Os 10 agentes de marketing existem em `.gemini/commands/` (10 `.toml`) e `.gemini/rules/AIOX/agents/` (10 `.md`).
- [x] **AC2:** A rule do `marketing-chief.md` no Gemini contém os 3 pipelines atuais.
- [x] **AC3:** Os shims `.toml` apontam para `squads/virals-marketing-squad/agents/<file>` correto (mapping `chief = marketing-chief.md`, demais = `<slug>.md`).

## Change Log
- 2026-05-19 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — `sync-agents` aplicado; 10 agentes em L5+L6. Status: Draft → Done.

## Escopo
**IN:** `.gemini/commands/` e `.gemini/rules/AIOX/agents/` (marketing).
**OUT:** demais squads; outros runtimes.

## Dependências
- RTC-02 (script); RTC-05 (cópias do squad que os toml referenciam).
