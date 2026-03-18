# Escalar Campanha Direct Response @perry

**Task ID:** `perry-dr-campaign-scale`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Perry Marshall 80/20)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Escalar Campanha Direct Response |
| **status** | `pending` |
| **responsible_executor** | @perry-marshall |
| **execution_type** | `Agent` |
| **input** | ["Dados de performance (CPA/ROAS)", "Budget atual", "Meta de CPA"] |
| **output** | ["Plano de aumento de budget", "Lista de adsets para pausa", "Briefing de novos criativos"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @perry-marshall |
| **Rationale** | Requer análise estatística de performance e aplicação da regra 80/20 para identificar onde o capital deve ser alocado. |

## Overview

Aumenta o budget de campanhas validadas mantendo o CPA sustentável, seguindo o protocolo de escala 80/20.

## Input

- **Dados de performance** (json/table)
  - Description: CPA e ROAS por adset dos últimos 7 dias.
- **Budget atual** (number)
  - Description: Gasto diário atual da campanha.

## Output

- **Plano de escala** (markdown)
  - Description: Cronograma de aumentos graduais.

## Action Items

### Step 1: Confirmar Estabilidade

Verificar se o CPA está estável dentro da meta com o volume atual antes de qualquer aumento.

### Step 2: Identificar os Top 20%

Localizar as audiências e criativos que geram 80% do resultado positivo.

### Step 3: Aplicar Escala Gradual

Aumentar o budget em 20-30% a cada 48-72h apenas nos top performers.

### Step 4: Eliminar o Bottom 50%

Pausar ou reduzir drasticamente o budget de adsets que estão puxando o ROAS para baixo.

### Step 5: Monitorar Saturação

Acompanhar a frequência (Social) e renovar criativos conforme a performance degrada com a escala.

## Acceptance Criteria

- [ ] **AC-1:** O CPA médio da campanha permanece dentro de ±20% da meta após o aumento.
- [ ] **AC-2:** O volume de conversões aumentou proporcionalmente ao budget.
- [ ] **AC-3:** Criativos saturados (Freq > 3) foram identificados e substituídos.

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
