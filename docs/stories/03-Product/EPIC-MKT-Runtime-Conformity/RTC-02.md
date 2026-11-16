# RTC-02: Protocolo e Script de Sincronização de Agentes

**Status:** Done
**Epic:** EPIC-MKT-Runtime-Conformity
**Complexidade:** M (Standard — 5 pontos)

## Story
**Como** mantenedor dos agentes Virals
**Eu quero** um script que derive as cópias a partir da fonte canônica
**Para que** a sincronização deixe de ser manual e propensa a divergir.

## Contexto
Hoje as cópias (`squads/.../agents/`, `.antigravity/`, `.gemini/`) são mantidas à
mão e divergem. Precisa de um mecanismo de derivação automática.

## Decisão de arquitetura
- Script `sync-agents` que, a partir de `.claude/commands/VIRALS/agents/*.md`, gera:
  - cópias `.md` para `squads/virals-marketing-squad/agents/` e `.antigravity/agents/`;
  - rules `.md` para `.antigravity/rules/agents/` e `.gemini/rules/AIOX/agents/`;
  - shims `.toml` para `.gemini/commands/`.
- Mapeamento de nomes (ex.: `marketing-chief` → `virals-marketing-chief.toml`).

## Tarefas (Checklist)
- [x] Definir o protocolo de derivação (fonte → cada formato/locação).
- [x] Implementar o script `sync-agents` em `squads/virals-marketing-squad/scripts/sync-agents.js`.
- [x] Implementar modo `--check` (exit 1 em caso de divergência, sem escrever).
- [x] Implementar `--dry-run` e `--only=<name>`.
- [x] Documentar o uso no `_DIVERGENCE-MATRIX.md` e nesta story.

## Critérios de Aceite
- [x] **AC1:** O script gera as cópias dos 3 runtimes a partir do canônico (10 agentes × 5 destinos = 50 arquivos sincronizados).
- [x] **AC2:** Modo `--check` reporta divergências sem alterar arquivos (verificado: detecta ✓ OK e ⚠ DIVERGED/MISSING).
- [x] **AC3:** Naming correto por runtime — `.md` (L2/L3/L4/L6), `.toml` shim (L5), prefixos `marketing-` / `virals-marketing-` conforme convenção de cada runtime.

## Change Log
- 2026-05-19 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — `sync-agents.js` implementado e validado. Status: Draft → Done.

## Escopo
**IN:** protocolo + script `sync-agents`.
**OUT:** a execução da sincronização em cada runtime (RTC-03..05).

## Dependências
- RTC-01 (matriz define o que sincronizar).
