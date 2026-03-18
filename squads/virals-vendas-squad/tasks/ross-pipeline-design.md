# Estruturar Pipeline de Vendas @ross-sales

**Task ID:** `ross-pipeline-design`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Aaron Ross Predictable Revenue)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Estruturar Pipeline de Vendas |
| **status** | `pending` |
| **responsible_executor** | @ross-sales |
| **execution_type** | `Agent` |
| **input** | ["Meta de faturamento", "Ticket médio", "Processo atual"] |
| **output** | ["Arquitetura de estágios", "Critérios de passagem", "SLAs de atendimento"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ross-sales |
| **Rationale** | Requer conhecimento em engenharia de processos comerciais e especialização de papéis (SDR/Closer). |

## Overview

Estrutura o funil de vendas completo, definindo as etapas lógicas, os gatilhos de mudança de fase e as metas de volume para atingir a previsibilidade de receita.

## Input

- **Meta de faturamento** (number)
  - Description: Objetivo mensal em Reais.
- **Processo atual** (text)
  - Description: Como as vendas são feitas hoje (mesmo que informal).

## Output

- **Arquitetura de estágios** (markdown/table)
  - Description: Lista de fases do lead até o fechamento.
- **SLAs de atendimento** (list)
  - Description: Tempo máximo de resposta permitido em cada fase.

## Action Items

### Step 1: Definir Especialização de Papéis

Isolar quem faz a prospecção (SDR) de quem faz o fechamento (Closer) para maximizar a eficiência.

### Step 2: Mapear Estágios do Pipeline

Criar a sequência: Lead → Qualificado (BANT) → Reunião → Proposta → Negociação → Fechado.

### Step 3: Estabelecer Critérios de Passagem

Definir exatamente o que deve acontecer para um lead mudar de fase (ex: "BANT confirmado" para virar Qualificado).

### Step 4: Calcular Volume Necessário

Usar a meta e o ticket médio para definir quantos leads precisam entrar no topo do funil diariamente.

### Step 5: Configurar no ClickUp

Desenhar a visualização de colunas e campos customizados e rodar o script de setup via `node services/clickup/tasks.js create --name "Setup Pipeline [NOME]" --department "Comercial / Vendas" --area "CRM" --process "Gestão de Clientes"`.

### Step 6: Definir Métricas de Velocidade

Estabelecer como o ciclo médio de venda e a taxa de conversão por estágio serão medidos.

## Acceptance Criteria

- [ ] **AC-1:** O pipeline possui critérios de saída objetivos (sim/não) para cada estágio.
- [ ] **AC-2:** O SLA de resposta para novos leads inbound é inferior a 5 minutos.
- [ ] **AC-3:** O script CLI `tasks.js` foi executado para gerar a task de configuração base no CRM.

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

- [ ] `task_name` follows "Verb + Object" format
- [ ] `status` is one of: pending | in_progress | completed
- [ ] `responsible_executor` is clearly specified
- [ ] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [ ] `input` array has at least 1 item
- [ ] `output` array has at least 1 item
- [ ] `action_items` has clear, actionable steps
- [ ] `acceptance_criteria` has measurable criteria

---

_Task Version: 1.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-12_
_Compliant: Yes_
