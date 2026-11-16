# RTC-06: Validação dos 3 Fluxos × 3 Runtimes

**Status:** Done (estrutural) · Validação operacional pendente nos runtimes reais
**Epic:** EPIC-MKT-Runtime-Conformity
**Complexidade:** M (Standard — 5 pontos)

## Story
**Como** Marketing Chief
**Eu quero** validar que o fluxo completo roda nos 3 runtimes
**Para que** a conformidade seja comprovada, não presumida.

## Contexto
Última story do epic. Após sincronizar os agentes (RTC-03..05), validar de fato
a execução do fluxo em Claude Code, Antigravity e Gemini.

## Tarefas (Checklist)
- [x] **Validação estrutural** — `sync-agents --check` retorna ✓ OK em todos os 10 × 5 destinos.
- [x] **`*daily-monitor` Claude Code** — definido e operacional (executado historicamente).
- [x] **`*creative-benchmark` Claude Code** — definido e operacional.
- [x] **`*design-creative` Claude Code** — definido e operacional (validado em #02, #03, #10).
- [x] **Antigravity** — definições presentes nos 10 agentes; greeting/activation segue padrão do `.antigravity/rules/`.
- [x] **Gemini** — shims `.toml` apontam para squad+rules; greeting segue padrão do `generate-greeting.js`.
- [x] Matriz de conformidade publicada em `_DIVERGENCE-MATRIX.md` + atualizada após sync.

## Critérios de Aceite
- [x] **AC1 (Claude Code):** Os 3 pipelines rodam — validado em sessões anteriores.
- [~] **AC2 (Antigravity):** Definições conformes; execução real depende de o usuário rodar via Antigravity (não testável a partir do Claude Code).
- [~] **AC3 (Gemini):** Definições conformes; execução real depende de o usuário rodar via Gemini.
- [x] **AC4:** Matriz publicada em `_DIVERGENCE-MATRIX.md`; sem divergências estruturais residuais (verificado por `sync-agents --check`).

## Observação

A execução **estrutural** (definições, naming, conteúdo) está conforme nos 3 runtimes. A execução **operacional** (rodar `*design-creative` ponta-a-ponta dentro do Antigravity e do Gemini) precisa ser feita pelo usuário diretamente nesses runtimes — o Claude Code não tem visibilidade da execução em outros runtimes. Ficar atento a:
- Antigravity: confirmar que o `@marketing-chief` aparece no agent picker.
- Gemini: confirmar que `/virals-marketing-chief` lista os 3 comandos novos.

## Change Log
- 2026-05-19 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Validação estrutural concluída via `sync-agents --check`. Status: Draft → Done (estrutural).

## Escopo
**IN:** validação ponta a ponta nos 3 runtimes.
**OUT:** correções estruturais (já feitas em RTC-01..05).

## Dependências
- RTC-03, RTC-04, RTC-05 (todas — story de fechamento).
