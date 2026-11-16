# MKT-MC-04: Step 0 de seleção de cliente no `@marketing-chief`

## Status
Done

## Story
**Como** usuário do `@marketing-chief`
**Eu quero** que o comando `*design-creative` me pergunte primeiro qual cliente (Virals, Tiago Elesbão, ...) antes de pedir template e benchmark
**Para que** o pipeline use automaticamente os YAMLs corretos sem que eu precise lembrar do flag `--client`.

## Contexto
O `design_creative_protocol` no `marketing-chief.md` hoje tem 4 steps (template → path → executar → reportar). Precisamos adicionar um **step 0** que pergunta o cliente, lendo as opções dinamicamente do `_registry.yaml`.

## Tarefas (Checklist)
- [ ] Atualizar `.claude/commands/VIRALS/agents/marketing-chief.md` (fonte canonical):
  - Adicionar `step 0` no `design_creative_protocol.flow` com `AskUserQuestion` (header "Cliente", multiSelect=false, opções lidas do registry — começando com Virals e Tiago Elesbão).
  - Renumerar steps subsequentes (1→2, 2→3, 3→4).
  - Atualizar o comando Bash final para incluir `--client={slug}`.
  - Atualizar `no_friction_rule` para refletir os 3 inputs (cliente, template, path).
  - Atualizar o `description` do protocolo e qualquer referência aos paths antigos.
- [ ] Sincronizar a cópia em `squads/virals-marketing-squad/agents/marketing-chief.md` (cópia secundária).
- [ ] Atualizar `.antigravity/agents/*.md` e `.aiox-core/development/agents/*.md` se houver cópias.

## Critérios de Aceite
- [ ] Rodar `*design-creative` apresenta 3 inputs em sequência: cliente → template → path do benchmark.
- [ ] A escolha de cliente é propagada via `--client=<slug>` para o `design_creative.py`.
- [ ] Lista de clientes no checkbox é coerente com `_registry.yaml` (Virals e Tiago Elesbão).
- [ ] Documentação (Comandos Rápidos, Guia) reflete o novo fluxo de 3 inputs.

## Dependências
- **MKT-MC-02** (scripts aceitam `--client`).
- **MKT-MC-01** (registry existe).

## Out of Scope
- Auto-descoberta dinâmica do registry (futuro). Hoje listamos manualmente Virals + Tiago no checkbox.

## Referências
- `.claude/commands/VIRALS/agents/marketing-chief.md`
- `squads/virals-marketing-squad/agents/marketing-chief.md`
