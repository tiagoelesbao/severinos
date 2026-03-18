# Construir Opportunity Tree @torres-produto

**Task ID:** `torres-opportunity-tree`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Opportunity Solution Tree Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Construir Opportunity Solution Tree |
| **status** | `pending` |
| **responsible_executor** | @torres-produto |
| **execution_type** | `Agent` |
| **input** | ["Outcome desejado", "Insights de entrevistas", "Dados de uso"] |
| **output** | ["Mapa da OST", "Hipóteses de Solução", "Lista de Experimentos"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @torres-produto |
| **Rationale** | Requer capacidade de estruturação lógica de problemas e desdobramento de metas em hipóteses testáveis. |

## Overview

Cria uma visualização clara de como os problemas dos clientes (Oportunidades) se conectam aos objetivos de negócio (Outcomes) e quais soluções estamos testando para resolvê-los.

## Input

- **Outcome Desejado** (string)
  - Description: A métrica que queremos mover (ex: reduzir churn).
- **Evidências** (array)
  - Description: O que os clientes disseram ou fizeram que aponta para um problema.

## Output

- **Mapa da OST** (markdown/diagram)
  - Description: Estrutura hierárquica Outcome → Opportunity → Solution → Experiment.

## Action Items

### Step 1: Definir a Raiz (Outcome)

Garantir que o objetivo de negócio é claro, mensurável e temporal.

### Step 2: Desdobrar em Oportunidades

Listar os problemas, desejos e dores do cliente que, se resolvidos, atingiriam o outcome.

### Step 3: Gerar Hipóteses de Solução

Para cada oportunidade prioritária, listar as possíveis features ou mudanças que poderiam resolvê-la.

### Step 4: Desenhar Experimentos

Definir como validaremos a solução mais promissora com o menor esforço possível (MVP).

### Step 5: Priorizar a Árvore

Identificar o caminho mais curto e de menor risco para atingir o resultado esperado.

## Acceptance Criteria

- [ ] **AC-1:** A árvore possui pelo menos 3 níveis de profundidade (Outcome → Opportunity → Solution).
- [ ] **AC-2:** Todas as soluções propostas estão conectadas a pelo menos uma oportunidade baseada em evidência.
- [ ] **AC-3:** O mapa identifica claramente qual é a "Aposta" atual do time.

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
