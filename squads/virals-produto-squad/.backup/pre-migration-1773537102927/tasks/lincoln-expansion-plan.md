# Planejar Expansão de Base @lincoln-produto

**Task ID:** `lincoln-expansion-plan`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Upsell & Expansion Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Plano de Expansão |
| **status** | `pending` |
| **responsible_executor** | @lincoln-produto |
| **execution_type** | `Agent` |
| **input** | ["Health Score Verde", "Milestones atingidos", "Catálogo de Upsells"] |
| **output** | ["Lista de Oportunidades", "Pitch de Valor", "Cronograma de Abordagem"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @lincoln-produto |
| **Rationale** | Requer sensibilidade para identificar o momento de 'sucesso excedente' onde o cliente está pronto para o próximo nível. |

## Overview

Identifica clientes na base que já atingiram seus resultados iniciais e possuem potencial financeiro e operacional para adquirir produtos de ticket maior ou serviços complementares (Expansão).

## Input

- **Métricas de Sucesso** (json/table)
  - Description: Clientes com Health Score > 80.
- **Portfólio Virals** (array)
  - Description: Lista de produtos disponíveis para Upsell/Cross-sell.

## Output

- **Plano de Expansão** (markdown)
  - Description: Segmentação de quem abordar e qual a oferta.

## Action Items

### Step 1: Filtrar a Base por Sucesso

Selecionar apenas clientes que atingiram pelo menos 2 marcos de sucesso (Milestones) importantes e estão ativos no produto.

### Step 2: Mapear o Próximo Problema

Identificar qual é a dor que surge após o sucesso atual do cliente (ex: quem já escala tráfego precisa de mais retenção).

### Step 3: Desenhar o Pitch de Continuidade

Criar uma narrativa onde o novo produto não é um "custo extra", mas o veículo necessário para manter ou acelerar o resultado atual.

### Step 4: Definir Gatilhos de Oferta

Estabelecer o momento exato da abordagem (ex: 15 dias antes da renovação ou após um NPS 10).

### Step 5: Handoff para Vendas

Preparar a lista de leads qualificados (PQLs - Product Qualified Leads) para que @sales-chief direcione aos closers.

## Acceptance Criteria

- [ ] **AC-1:** O plano foca apenas em clientes que já extraíram valor real do produto atual.
- [ ] **AC-2:** O pitch de expansão está baseado em dados de performance do próprio cliente.
- [ ] **AC-3:** O plano identifica uma meta de aumento de LTV por cohort.

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
