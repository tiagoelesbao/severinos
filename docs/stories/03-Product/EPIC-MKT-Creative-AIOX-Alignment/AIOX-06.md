# AIOX-06: Atualização de Referências, squad.yaml e Boundary

**Status:** Done
**Epic:** EPIC-MKT-Creative-AIOX-Alignment
**Complexidade:** S (Small — 3 pontos)

## Story
**Como** squad virals-marketing
**Eu quero** todas as referências e o `squad.yaml` apontando para os paths AIOX
**Para que** o sistema fique consistente após a migração.

## Contexto
Última story do epic. Após migrar scripts/workflow/tasks/checklists/templates
(AIOX-01..05), as referências precisam ser atualizadas e o boundary revisado.

## Tarefas (Checklist)
- [x] Atualizar `.claude/commands/VIRALS/agents/marketing-chief.md` — `dependencies`
  e `design_creative_protocol` repontados (feito em AIOX-01).
- [x] Atualizar `squads/virals-marketing-squad/agents/marketing-chief.md` (cópia squad).
- [x] Atualizar `docs/stories/03-Product/EPIC-MKT-Creative-Intelligence/_PIPELINE.md`
  com os novos paths (feito em AIOX-01).
- [x] Atualizar `squad.yaml` — `creative_intelligence_pipeline` registra workflow,
  tasks, checklists, templates, tools, services, scripts e data.
- [x] `CLAUDE.md` revisado — não cita paths do motor; nenhuma alteração necessária.
- [x] Deny/allow rules de `.claude/settings.json` revisadas — não bloqueiam os novos
  paths (squad é L4 — mutable).
- [x] `README.md` atualizado com seção "Pipeline Creative Intelligence".
- [x] Teste de regressão estrutural — AST parse, ROOT, imports cruzados, registro YAML.
  *(execução end-to-end real depende do render service no ar — validação operacional
  fica para o próximo run do `@marketing-chief *design-creative`.)*

## Critérios de Aceite
- [x] **AC1:** Nenhuma referência ativa (fora de stories históricas) aponta para `scripts/modeling/` (raiz).
- [x] **AC2:** `squad.yaml` registra workflow/tasks/checklists/templates/tools/services do motor.
- [x] **AC3:** Deny/allow rules não bloqueiam o pipeline nos novos paths (`squads/.../` é L4).
- [x] **AC4:** Pipeline pronto estruturalmente — falta apenas a execução real para confirmar (render service necessário).

## Change Log
- 2026-05-17 — @sm — Story criada (planejada).
- 2026-05-19 — @dev — Referências consolidadas, `squad.yaml` registrado, README atualizado. Status: Draft → Done.

## Escopo
**IN:** referências, `squad.yaml`, `CLAUDE.md`, boundary rules, docs do squad.
**OUT:** —

## Dependências
- AIOX-01..05 (todas — esta é a story de fechamento).
