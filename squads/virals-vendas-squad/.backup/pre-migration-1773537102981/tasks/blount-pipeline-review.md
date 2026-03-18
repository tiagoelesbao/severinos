# Revisão Semanal de Pipeline @blount-sales

**Task ID:** `blount-pipeline-review`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Sales Operations Standards)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Revisar Saúde do Pipeline |
| **status** | `pending` |
| **responsible_executor** | @blount-sales |
| **execution_type** | `Agent` |
| **input** | ["Dados do CRM (ClickUp)", "Histórico da semana", "Metas do mês"] |
| **output** | ["Relatório de Higiene", "Lista de deals em risco", "Métricas de Conversão"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @blount-sales |
| **Rationale** | Requer análise de atividade de vendas e aplicação de filtros de disciplina para identificar leads abandonados. |

## Overview

Revisão sistemática de todos os deals em aberto para garantir que o pipeline reflete a realidade e que nenhum dinheiro está sendo deixado na mesa por falta de follow-up.

## Input

- **Status do CRM** (json/table)
  - Description: Lista de todos os leads e seu último contato.
- **Metas do mês** (number)
  - Description: Valor necessário para bater o objetivo.

## Output

- **Relatório de Higiene** (markdown)
  - Description: Diagnóstico de saúde do pipeline.

## Action Items

### Step 1: Auditar Deals Inativos

Identificar todos os leads sem atividade (comentários ou mudança de status) nos últimos 7 dias.

### Step 2: Confirmar Próximas Ações

Verificar se 100% dos deals em aberto possuem uma "Next Task" agendada com data e responsável.

### Step 3: Limpar o Pipeline (Trash Removal)

Mover para "Perdido" ou "Arquivo" leads com mais de 60 dias de silêncio absoluto.

### Step 4: Analisar Motivos de Perda

Consolidar por que as vendas não aconteceram na semana (Preço, Concorrência, Timing, etc.).

### Step 5: Calcular Conversão Semanal

Comparar a taxa de avanço entre estágios com a semana anterior para detectar gargalos.

## Acceptance Criteria

- [ ] **AC-1:** Todos os deals mantidos no pipeline possuem uma atividade registrada nos últimos 7 dias.
- [ ] **AC-2:** Não existem leads no estágio "Qualificado" ou superior sem data de próximo contato.
- [ ] **AC-3:** O relatório identifica claramente a lacuna (Gap) para a meta do mês.

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
