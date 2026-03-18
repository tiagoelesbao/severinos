# Auditoria de Saúde Operacional @ops-chief

**Task ID:** `ops-health-check`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (EOS Health Check / Scaling Up)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Realizar Health-check Operacional |
| **status** | `pending` |
| **responsible_executor** | @ops-chief |
| **execution_type** | `Hybrid` |
| **input** | ["Status dos Rocks", "Scorecard Semanal", "Feedback da Equipe", "Issues List"] |
| **output** | ["Relatório de Saúde 0-100", "Top 3 Prioridades de Melhoria", "Diagnóstico por Componente"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | HO-EP-003 |
| **Executor** | @ops-chief (AI) + COO (Human Review) |
| **Rationale** | Requer análise de conformidade de processos documentados vs. execução real e avaliação qualitativa de cultura. |

## Overview

Diagnóstico trimestral profundo que avalia os 6 componentes vitais da empresa (Visão, Pessoas, Dados, Issues, Processos e Tração), identificando onde o sistema está falhando e onde está escalando.

## Input

- **Métricas do Trimestre** (json/table)
  - Description: Status final de Rocks e Scorecard.
- **Lista de Issues** (array)
  - Description: Problemas recorrentes não resolvidos.

## Output

- **Relatório de Saúde** (markdown)
  - Description: Nota de 0 a 100 para cada um dos 6 componentes.

## Action Items

### Step 1: Avaliar Componente Visão

Verificar se todos na empresa sabem para onde a Virals está indo e se o V/TO está atualizado.

### Step 2: Avaliar Componente Pessoas

Executar o teste GWC (Gets it, Wants it, Capacity) para cargos críticos e revisar o Accountability Chart.

### Step 3: Avaliar Componente Dados

Checar se o Scorecard semanal é confiável e se as métricas são realmente acionáveis.

### Step 4: Avaliar Componente Issues

Analisar se a "Issues List" é honesta e se o framework IDS está resolvendo problemas na causa-raiz.

### Step 5: Avaliar Componente Processos

Verificar se os POPs fundamentais estão documentados, atualizados e, mais importante, sendo seguidos.

### Step 6: Avaliar Componente Tração

Medir a disciplina de reuniões L10 e a taxa de conclusão de Rocks (meta: ≥ 80%).

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica pelo menos um componente crítico que está abaixo da nota 70.
- [ ] **AC-2:** Cada componente avaliado possui um parágrafo de "evidência real" (por que da nota).
- [ ] **AC-3:** O plano de ação foca apenas nas 3 maiores alavancas para o próximo trimestre.

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
