# Revisão de Performance de Vendas @sales-chief

**Task ID:** `sales-performance-review`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Sales Metrics/KPIs)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Revisar Performance de Vendas Integrada |
| **status** | `pending` |
| **responsible_executor** | @sales-chief |
| **execution_type** | `Hybrid` |
| **input** | ["Dados do CRM", "Relatório de Atividade", "Metas Trimestrais"] |
| **output** | ["Dashboard Semanal", "Plano de Ação de Vendas", "Diagnóstico de Conversão"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | HO-EP-003 |
| **Executor** | @sales-chief (AI) + CSO (Human Review) |
| **Rationale** | Requer análise de tendências de dados comerciais e tomada de decisão estratégica sobre alocação de equipe e ajuste de oferta. |

## Overview

Revisão integrada de todos os indicadores comerciais do squad (leads, conversão, velocidade, ticket médio e objeções), consolidando o aprendizado da semana.

## Input

- **Métricas do CRM** (json/table)
  - Description: Deals abertos, fechados, perdidos e parados.
- **Feedbacks dos Closers** (array)
  - Description: Relatos sobre resistência do mercado ou falhas no script.

## Output

- **Plano de Ação** (markdown)
  - Description: Top 3 prioridades para a próxima semana.

## Action Items

### Step 1: Consolidar Números de Vendas

Verificar volume de faturamento semanal em relação à meta do mês e do trimestre.

### Step 2: Analisar Pipeline Velocity

Calcular quanto tempo um lead está levando para percorrer todo o funil até o fechamento.

### Step 3: Avaliar Taxa de Conversão por Estágio

Identificar em qual etapa do pipeline (ex: Reunião → Proposta) estamos perdendo mais leads.

### Step 4: Revisar Motivos de Perda e Objeções

Consolidar as principais razões pelas quais os leads não compraram e ajustar o mapa de objeções se necessário.

### Step 5: Diagnosticar Performance da Oferta

Verificar se o ticket médio está mantido e se os upsells estão sendo convertidos.

### Step 6: Definir Top 3 Ações de Melhoria

Estabelecer mudanças imediatas em scripts, processos ou treinamento para corrigir desvios.

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica a causa raiz de qualquer queda na taxa de conversão superior a 10%.
- [ ] **AC-2:** As ações de melhoria possuem um responsável e um prazo de execução definidos.
- [ ] **AC-3:** O relatório contém uma previsão (forecast) atualizada para o fechamento do mês.

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
