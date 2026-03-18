# Revisão Integrada de Tráfego @perry @ezra

**Task ID:** `traffic-performance-review`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (MER/Funnel Health)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Revisar Performance de Tráfego Integrada |
| **status** | `pending` |
| **responsible_executor** | @marketing-chief |
| **execution_type** | `Hybrid` |
| **input** | ["Relatório DR (@perry)", "Relatório Brand (@ezra)", "Dados de Faturamento/ROI"] |
| **output** | ["Relatório consolidado (MER)", "Plano de realocação de budget", "Health-check do funil"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | HO-EP-003 |
| **Executor** | @marketing-chief (AI) + CMO (Human Review) |
| **Rationale** | Requer análise de correlação entre investimento em brand (awareness) e eficiência de conversão (DR), com aprovação estratégica humana. |

## Overview

Revisão bi-semanal de performance integrada (DR + Brand), analisando o ROI consolidado (MER) e a alocação estratégica de budget.

## Input

- **Relatórios parciais** (array)
  - Description: Entregas de performance de @perry e @ezra.
- **Dados de Faturamento** (data)
  - Description: Valor total vendido no período.

## Output

- **Relatório consolidado MER** (markdown/table)
  - Description: Marketing Efficiency Ratio e saúde do funil.

## Action Items

### Step 1: Gerar Relatório de Gasto Consolidado

Somar investimentos de todas as plataformas e comparar com o budget planejado.

### Step 2: Analisar ROAS de Direct Response

Verificar o desempenho individual de cada produto em relação às metas de CPA.

### Step 3: Avaliar Qualidade do Funil Brand

Analisar se o topo do funil está alimentando as audiências de retargeting de forma eficiente.

### Step 4: Calcular ROI Integrado (MER)

Calcular a relação entre investimento total e faturamento total (MER = Faturamento / Gasto).

### Step 5: Recomendar Realocação de Budget

Sugerir ajustes de verba entre DR e Brand para maximizar o crescimento no próximo período.

### Step 6: Registrar no ClickUp

Publicar o relatório integrado e as decisões tomadas para visibilidade do squad.

## Acceptance Criteria

- [ ] **AC-1:** O relatório mostra a correlação entre investimento em brand e queda/estabilidade do CPA do DR.
- [ ] **AC-2:** As recomendações de realocação respeitam os limites de budget trimestral.
- [ ] **AC-3:** O health-check identifica gargalos claros em cada fase do funil (Cold/Warm/Hot).

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
