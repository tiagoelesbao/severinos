# Executar Sprint de Discovery @torres-produto

**Task ID:** `torres-discovery-sprint`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Teresa Torres Continuous Discovery)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Executar Sprint de Discovery |
| **status** | `pending` |
| **responsible_executor** | @torres-produto |
| **execution_type** | `Agent` |
| **input** | ["Segmento alvo", "Hipótese de problema", "Base de clientes"] |
| **output** | ["Relatório de Entrevistas", "Mapa de Oportunidades", "Hipótese validada/rejeitada"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @torres-produto |
| **Rationale** | Requer habilidade em conduzir entrevistas não tendenciosas e sintetizar padrões comportamentais qualitativos. |

## Overview

Ciclo rápido de 2 semanas para validar se um problema do cliente realmente existe antes de investir em design ou código, garantindo que o time foque em oportunidades reais de valor.

## Input

- **Segmento Alvo** (string)
  - Description: Perfil de usuário que será entrevistado.
- **Problema Hipotético** (string)
  - Description: O que acreditamos que dói no cliente hoje.

## Output

- **Relatório de Insights** (markdown)
  - Description: Padrões encontrados nas conversas.
- **Oportunidade Priorizada** (string)
  - Description: A dor real que deve ser resolvida agora.

## Action Items

### Step 1: Recrutar Usuários

Selecionar e agendar entrevistas com pelo menos 5 clientes que representem o segmento alvo.

### Step 2: Conduzir Entrevistas Estruturadas

Focar em comportamento passado ("Me conte a última vez que...") em vez de especulações futuras.

### Step 3: Sintetizar Insights Qualitativos

Identificar padrões, dores e desejos recorrentes nas falas dos usuários.

### Step 4: Mapear na Opportunity Tree

Alimentar a OST com as novas oportunidades descobertas e conectá-las ao outcome desejado.

### Step 5: Definir Próximo Passo (Go/No-Go)

Decidir se a hipótese foi validada (avançar para solução) ou rejeitada (pivotar discovery).

## Acceptance Criteria

- [ ] **AC-1:** Pelo menos 5 entrevistas com usuários reais foram concluídas e documentadas.
- [ ] **AC-2:** O relatório identifica pelo menos 3 "Opportunities" não mapeadas anteriormente.
- [ ] **AC-3:** Cada oportunidade está fundamentada em uma citação direta ou comportamento observado.

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
