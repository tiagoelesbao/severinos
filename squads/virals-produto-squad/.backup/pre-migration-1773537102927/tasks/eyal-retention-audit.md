# Auditar Força do Hábito @eyal-produto

**Task ID:** `eyal-retention-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Retention & Habit Metrics)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Auditar Força do Hábito |
| **status** | `pending` |
| **responsible_executor** | @eyal-produto |
| **execution_type** | `Agent` |
| **input** | ["Frequência de acesso dos usuários", "Churn após 30 dias", "Log de uso de features"] |
| **output** | ["Nota de Habituação", "Diagnóstico de Triggers", "Novos Rituais Sugeridos"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @eyal-produto |
| **Rationale** | Requer análise de frequência de uso e identificação de quebras no ciclo de retorno do usuário. |

## Overview

Avalia se o produto está conseguindo criar um hábito sustentável nos usuários, identificando onde o modelo Hook está falhando e propondo melhorias nos gatilhos e recompensas para aumentar a retenção de longo prazo.

## Input

- **Métricas de Recorrência** (data)
  - Description: Quantas vezes por semana o usuário abre o produto.
- **Uso de Features** (array)
  - Description: Quais partes do produto são as mais e as menos acessadas.

## Output

- **Auditoria de Hábito** (markdown)
  - Description: Análise profunda da retenção baseada em psicologia.

## Action Items

### Step 1: Calcular a Cohort de Retenção

Analisar quantos usuários que entraram no mês X continuam ativos no mês X+1, X+2, etc.

### Step 2: Identificar Triggers que Falharam

Verificar se os usuários estão ignorando os gatilhos externos (push/email) ou se o produto não está conectado a um gatilho interno.

### Step 3: Avaliar a "Recompensa Variável"

Checar se a experiência do usuário é sempre a mesma (previsível) ou se existe novidade e valor inesperado no uso recorrente.

### Step 4: Medir o Investimento Real

Analisar se os usuários estão adicionando dados, configurando preferências ou criando histórico que dificulte a saída para um concorrente.

### Step 5: Propor Rituais de Retorno

Desenhar ações ou eventos semanais/mensais que incentivem o usuário a voltar (ex: relatórios de resumo, desafios, conquistas).

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica o "Hook Deficiente" (qual das 4 fases está mais fraca).
- [ ] **AC-2:** A auditoria propõe pelo menos 2 melhorias específicas em gatilhos internos.
- [ ] **AC-3:** O diagnóstico inclui uma análise de "Retention Curve" por segmento de usuário.

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
