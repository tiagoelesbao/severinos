# MKT-MC3-04: Comando *audit-benchmark no agente Marketing Chief

## Status
Done

## Story
**Como** dono do sistema
**Eu quero** invocar a auditoria via `*audit-benchmark` no `@marketing-chief` com fluxo de 3 perguntas (cliente → redes → painel)
**Para que** o pipeline seja descobertível e usável sem precisar lembrar dos args CLI do script Python

## Contexto
O script `run_audit_benchmark.py` já tem CLI completa, mas o agente precisa orquestrar o fluxo conversacional: perguntar cliente, mapear opções para slug, perguntar redes, perguntar painel (Core / Core+Designers / Full Panel), montar o comando e disparar. Sem isso, o dono teria que digitar `python ... --client=... --date=... --platforms=... --agents=mrbeast-mk,garyvee-mk,ladeira,casey-neistat-img,sam-kolder-vid` manualmente.

## Tarefas (Checklist)
- [x] Adicionar `audit-benchmark` na lista de `commands` do `marketing-chief.md` (visibility: [full, quick, key])
- [x] Adicionar bloco `audit_benchmark_protocol` com:
  - Trigger `*audit-benchmark`
  - Pre-requisite: `*creative-benchmark` já executado para data/cliente
  - `client_registry` + `client_map` + `audit_config_convention`
  - `panel_default` (core + designers_by_type + strategic_optional)
  - 8 steps (cliente → redes → painel → date → validate dir → map agents → bash → report)
  - `output_structure` ASCII showing benchmark/ layout
  - `personalization_layer` explicando o papel do audit-config.yaml
  - `no_friction_rule` (após 3 inputs, sem perguntas adicionais)
- [x] Atualizar seção `dependencies.scripts` com `run_audit_benchmark.py`
- [x] Atualizar `dependencies.data` com os 2 `audit-config.yaml`
- [x] Atualizar "Comandos Rápidos" no markdown post-YAML com `*audit-benchmark`
- [x] Atualizar "Guia" com pré-requisitos do `*audit-benchmark` (item 5 da lista)
- [x] Atualizar "Erros comuns" com cenários de falha (sem `*creative-benchmark` prévio; sem audit-config.yaml no cliente)

## Critérios de Aceite
- [x] Invocar `/VIRALS:agents:marketing-chief` mostra `*audit-benchmark` na lista numerada de comandos `key`
- [x] `*audit-benchmark` pergunta os 3 inputs definidos (cliente, redes, painel) — sem perguntas extras
- [x] Comando Bash final montado segue o template: `python run_audit_benchmark.py --client={slug} --date={date} --platforms={csv} --agents={csv}`
- [x] Smoke test rodado em tiago-elesbao 2026-05-23 com painel Core+Designers (5 agentes): 10/10 OK

## Out of Scope
- Suporte a `--synthesis-only` no AGENT (já existe na CLI; pode ser exposto em iteração futura)

## Referências
- Agent file: `.claude/commands/VIRALS/agents/marketing-chief.md`
- Protocol block: `audit_benchmark_protocol`
- Output exemplo: `workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-05-23/benchmark/_audit-summary-2026-05-23.md`
