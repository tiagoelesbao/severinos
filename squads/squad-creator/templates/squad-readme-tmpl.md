# {{squad_name}}

> {{short_description}}

**Pattern:** SC-DP-003 (Squad README)

---

## Visão Geral

{{description}}

### Propósito

{{proposito}}

### Domínio

{{dominio}}

---

## Agents

| Agent | Ícone | Papel | Comandos Principais |
|-------|-------|-------|---------------------|
| @{{agent_1_id}} | {{agent_1_icon}} | {{agent_1_papel}} | `*{{agent_1_cmd_1}}`, `*{{agent_1_cmd_2}}` |
| @{{agent_2_id}} | {{agent_2_icon}} | {{agent_2_papel}} | `*{{agent_2_cmd_1}}`, `*{{agent_2_cmd_2}}` |

---

## Estrutura

```
squads/{{squad_slug}}/
├── agents/                 # Definições de agents
│   ├── {{agent_1_id}}.md
│   └── {{agent_2_id}}.md
├── tasks/                  # Tasks executáveis
│   ├── {{task_1}}.md
│   └── {{task_2}}.md
├── checklists/             # Validações
│   └── {{checklist_1}}.md
├── workflows/              # Orquestrações
│   └── {{workflow_1}}.yaml
├── sops/                   # Procedimentos
│   └── {{sop_1}}.md
├── templates/              # Templates reutilizáveis
│   └── {{template_1}}.md
├── data/                   # Dados e knowledge bases
│   └── {{data_1}}.yaml
├── docs/                   # Documentação do squad
│   └── {{doc_1}}.md
├── squad.yaml             # Configuração do squad
└── README.md               # Este arquivo
```

---

## Quick Start

```bash
# 1. Ativar agent principal
@{{main_agent}}

# 2. Ver comandos disponíveis
*help

# 3. Executar comando mais comum
*{{main_command}} {argumentos}
```

### Exemplo de Uso

```
User: @{{main_agent}}
Agent: {{greeting}}

User: *{{example_command}}
Agent: {{example_output}}
```

---

## Workflows Disponíveis

| Workflow | Arquivo | Trigger | Descrição |
|----------|---------|---------|-----------|
| {{workflow_1_name}} | `workflows/{{workflow_1}}.yaml` | `*{{workflow_1_trigger}}` | {{workflow_1_desc}} |
| {{workflow_2_name}} | `workflows/{{workflow_2}}.yaml` | `*{{workflow_2_trigger}}` | {{workflow_2_desc}} |

---

## Comandos por Agent

### @{{agent_1_id}}

| Comando | Descrição |
|---------|-----------|
| `*{{cmd_1}}` | {{cmd_1_desc}} |
| `*{{cmd_2}}` | {{cmd_2_desc}} |
| `*help` | Lista todos os comandos |

### @{{agent_2_id}}

| Comando | Descrição |
|---------|-----------|
| `*{{cmd_3}}` | {{cmd_3_desc}} |
| `*{{cmd_4}}` | {{cmd_4_desc}} |

---

## Veto Conditions

| Trigger | Ação | Agent |
|---------|------|-------|
| {{veto_1_trigger}} | {{veto_1_action}} | @{{veto_1_agent}} |
| {{veto_2_trigger}} | {{veto_2_action}} | @{{veto_2_agent}} |

---

## Documentação Completa

| Documento | Descrição | Caminho |
|-----------|-----------|---------|
| Agent Flows | Como cada agent funciona | `docs/` |
| Workflow Docs | Documentação de workflows | `docs/` |
| Concepts | Conceitos fundamentais | `docs/CONCEPTS.md` |
| FAQ | Perguntas frequentes | `docs/FAQ.md` |

---

## Integrações

### Com Outros Squads

| Squad | Tipo | Descrição |
|-------|------|-----------|
| {{integration_squad_1}} | {{integration_type_1}} | {{integration_desc_1}} |

### Com Ferramentas

| Ferramenta | Uso |
|------------|-----|
| {{tool_1}} | {{tool_1_uso}} |
| {{tool_2}} | {{tool_2_uso}} |

---

## Changelog

| Data | Versão | Mudanças |
|------|--------|----------|
| {{date}} | 1.0.0 | Release inicial |

---

## Contribuição

Para contribuir com este squad:

1. Seguir estrutura de arquivos padrão
2. Documentar novos agents/tasks
3. Atualizar este README
4. Validar com checklist do squad

---

*Squad criado seguindo SC-DP-003 (Squad README)*
*"{{squad_motto}}"*
