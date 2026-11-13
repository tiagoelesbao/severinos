# MKT-MC4-03: Agent protocol design_creative_protocol (6-step rewrite)

## Status
Done

## Story
**Como** dono do sistema
**Eu quero** que `*design-creative` faça 6 perguntas em ordem definida (cliente → rede do bench → tipo de bench → path → output → template) com a lista de templates carregada dinamicamente do `templates.yaml` do cliente
**Para que** a UX do comando reflita o domínio: cliente é a primeira decisão; bench-type e output-type são independentes; templates dependem do cliente + output

## Contexto
O `design_creative_protocol` antigo no `marketing-chief.md` tinha apenas 3 perguntas (cliente → template → path) com 4 opções globais hardcoded de template ("News", "Aspiracional", "Single", "Automático"). Para honrar o registry per-client e separar bench-type/output, foi necessário reescrever o protocol inteiro.

## Tarefas (Checklist)
- [x] Reescrever bloco `design_creative_protocol` no `.claude/commands/VIRALS/agents/marketing-chief.md`
- [x] `client_map` mantido + adicionado `bench_type_map`, `output_type_map`, `platform_map`
- [x] `templates_source` documenta que step 5 carrega templates dinamicamente de `data/clients/<slug>/templates.yaml`
- [x] Flow com 8 steps (0=cliente, 1=plataforma, 2=tipo de bench, 3=path, 4=output, 5=template, 6=executar, 7=reportar)
- [x] Step 5 instrui claramente como construir as opções: ler YAML, filtrar por outputType escolhido no step 4, montar `[label — description]` + adicionar "Automático (recomendado por scoring_match)"
- [x] Step 6 monta comando Bash com TODOS os flags (`--client`, `--bench-platform`, `--bench-type`, `--template`, `--image-mode`)
- [x] `no_friction_rule` atualizado para "após 6 inputs, sem perguntas adicionais"
- [x] `preview_status_note` indica estado atual dos placeholders Fase B2
- [x] Atualizar `dependencies.data` com `templates.yaml` dos 2 clientes
- [x] Atualizar "Comandos Rápidos" e "Guia" no markdown post-YAML com referência ao novo fluxo de 6 passos + comando `--list-templates`

## Critérios de Aceite
- [x] Invocar `/VIRALS:agents:marketing-chief` mostra `*design-creative` na lista
- [x] `*design-creative` faz exatamente 6 perguntas em ordem
- [x] Step 5 (template) tem opções que mudam conforme o cliente escolhido no step 0 (validação manual)
- [x] Step 5 inclui "Automático" como última opção
- [x] Comando Bash final tem todos os 5 flags principais
- [x] `--list-templates` mencionado no markdown como utility de discovery

## Out of Scope
- Implementação dos componentes React dedicados para os templates `fase_b2_pending` (→ EPIC-MKT-MC-6)

## Referências
- Agent file: `.claude/commands/VIRALS/agents/marketing-chief.md`
- Bloco YAML: `design_creative_protocol`
- Script disparado: `squads/virals-marketing-squad/scripts/design_creative.py`
