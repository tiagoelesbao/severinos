# Diagnosticar Churn @lincoln-produto

**Task ID:** `lincoln-churn-diagnosis`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Churn Analysis Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Realizar Diagnóstico de Churn |
| **status** | `pending` |
| **responsible_executor** | @lincoln-produto |
| **execution_type** | `Agent` |
| **input** | ["Dados de clientes cancelados", "Histórico de Health Score", "Pesquisas de saída"] |
| **output** | ["Relatório de Causa-Raiz", "Protocolo de Resgate", "Plano de Prevenção"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @lincoln-produto |
| **Rationale** | Requer análise de dados comportamentais e interpretação de feedbacks qualitativos para identificar padrões de desistência. |

## Overview

Investiga as razões pelas quais os clientes estão cancelando o produto (Churn), separando motivos evitáveis de inevitáveis, e propõe intervenções sistêmicas para aumentar o LTV.

## Input

- **Dados de Churn** (json/table)
  - Description: Lista de quem saiu e quando saiu.
- **Feedbacks de Saída** (array)
  - Description: Respostas da pergunta "Por que você está nos deixando?".

## Output

- **Diagnóstico de Churn** (markdown)
  - Description: Classificação dos cancelamentos e plano de ação.

## Action Items

### Step 1: Categorizar os Motivos

Agrupar os cancelamentos em baldes: Falha no Onboarding, Preço/Financeiro, Perda de Interesse, Concorrência ou Falta de Resultado.

### Step 2: Analisar o Health Score Pré-Morte

Verificar qual era o comportamento do usuário nos 30 dias antes do cancelamento para identificar sinais de alerta (Red Flags).

### Step 3: Identificar a Lacuna de Valor

Determinar em qual ponto o cliente parou de atingir o seu Desired Outcome.

### Step 4: Definir Protocolo de Resgate

Criar ofertas ou fluxos de comunicação específicos para tentar reverter cancelamentos de clientes com alto potencial.

### Step 5: Propor Melhorias Sistêmicas

Sugerir mudanças no produto ou no processo de vendas para evitar que novos clientes caiam nas mesmas armadilhas.

## Acceptance Criteria

- [ ] **AC-1:** O diagnóstico identifica a principal causa-raiz (80/20) do churn atual.
- [ ] **AC-2:** O plano propõe pelo menos uma automação de alerta precoce no CRM.
- [ ] **AC-3:** Existe uma distinção clara entre "Churn Voluntário" e "Churn Involuntário" (pagamento falhou).

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
