# Retrospectiva Pós-Lançamento @product-chief

**Task ID:** `post-launch-retrospective`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Post-Launch Audit Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Realizar Retrospectiva de Lançamento |
| **status** | `pending` |
| **responsible_executor** | @product-chief |
| **execution_type** | `Agent` |
| **input** | ["Métricas dos primeiros 30 dias", "Feedbacks de pioneiros", "Metas originais"] |
| **output** | ["Relatório de Aprendizados", "Backlog de Iteração V2", "Ações Corretivas Onboarding"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @product-chief |
| **Rationale** | Requer síntese de resultados de múltiplos squads (Marketing, Vendas, Ops) sob a ótica de experiência do produto. |

## Overview

Análise profunda realizada 30 dias após um lançamento para comparar a promessa da oferta com a entrega real do produto, identificando atritos no onboarding e gerando o backlog de melhoria contínua.

## Input

- **Métricas de Uso** (json/table)
  - Description: Ativação, retenção e uso de features dos novos clientes.
- **Feedbacks Qualitativos** (array)
  - Description: Entrevistas iniciais conduzidas por @torres-produto.

## Output

- **Relatório de Retrospectiva** (markdown)
  - Description: Documento What Worked/What Didn't/What to Change.

## Action Items

### Step 1: Confrontar Meta vs. Realidade

Comparar o número de ativações e o Time-to-Value (TTV) real com o que foi planejado por @walker-launch.

### Step 2: Identificar a "Primeira Barreira"

Localizar onde a maioria dos novos clientes parou ou pediu suporte técnico nos primeiros 7 dias.

### Step 3: Avaliar a Satisfação Inicial

Analisar os primeiros feedbacks de valor: o cliente sentiu que o produto cumpre o que a copy do @ladeira prometeu?

### Step 4: Gerar Backlog de Iteração

Transformar as falhas identificadas em tarefas prioritárias para a próxima versão (V2) ou hotfixes.

### Step 5: Documentar Aprendizados Sistêmicos

Registrar erros operacionais ou de comunicação para que @ops-chief atualize os POPs de lançamento futuros.

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica pelo menos 3 melhorias de baixa complexidade que podem ser feitas no onboarding.
- [ ] **AC-2:** As metas da V2 estão baseadas em dados reais de uso da V1.
- [ ] **AC-3:** O backlog de iteração está priorizado por impacto no Churn Precoce.

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
