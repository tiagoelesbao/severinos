# Revisão de Saúde do Produto @product-chief

**Task ID:** `product-health-review`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Product Health Metrics)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Revisar Saúde do Produto |
| **status** | `pending` |
| **responsible_executor** | @product-chief |
| **execution_type** | `Hybrid` |
| **input** | ["Métricas de BI (@kaushik)", "Health Score da Base", "NPS Semanal"] |
| **output** | ["Relatório de Saúde Semanal", "Ações de CS prioritárias", "KPIs para Operações"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | HO-EP-003 |
| **Executor** | @product-chief (AI) + CPO (Human Review) |
| **Rationale** | Requer síntese de dados quantitativos de uso com feedbacks qualitativos de satisfação para diagnosticar a saúde real do ecossistema. |

## Overview

Revisão sistemática semanal para garantir que o produto está entregando valor, que os novos usuários estão sendo ativados e que a base atual está saudável e longe do churn.

## Input

- **Dashboard de BI** (json/table)
  - Description: Taxas de ativação, DAU/MAU e retenção D7.
- **Feedbacks NPS** (array)
  - Description: Comentários de promotores e detratores da semana.

## Output

- **Relatório de Saúde** (markdown)
  - Description: Diagnóstico visual (Verde/Amarelo/Vermelho) por segmento.

## Action Items

### Step 1: Analisar Taxa de Ativação D7

Verificar qual % de novos usuários atingiu o Aha! Moment nos primeiros 7 dias vs. meta.

### Step 2: Revisar Clientes em Alerta Vermelho

Identificar contas com queda brusca de uso ou health score abaixo de 50.

### Step 3: Consolidar NPS e CSAT

Analisar a satisfação média e ler os 5 feedbacks mais críticos da semana.

### Step 4: Identificar Gargalos de Feature

Mapear se alguma funcionalidade nova está causando erro ou confusão (através de tickets de suporte).

### Step 5: Definir Prioridades de CS

Listar quais clientes @lincoln-produto deve abordar proativamente para resgate.

### Step 6: Exportar KPIs para Operações

Enviar os números consolidados para o Scorecard semanal de @wickman.

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica claramente se a saúde do produto melhorou ou piorou vs. semana anterior.
- [ ] **AC-2:** Existe um plano de ação para cada cliente em "Alerta Vermelho".
- [ ] **AC-3:** O relatório separa métricas de uso (ativação) de métricas de satisfação (NPS).

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
