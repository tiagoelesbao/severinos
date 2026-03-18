# Auditar Precificação e Stack @hormozi-sales

**Task ID:** `hormozi-pricing-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Hormozi Pricing Models)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Auditar Precificação e Stack |
| **status** | `pending` |
| **responsible_executor** | @hormozi-sales |
| **execution_type** | `Agent` |
| **input** | ["Preços atuais", "Lista do stack de valor", "Dados de conversão"] |
| **output** | ["Diagnóstico de Valor", "Recomendações de Ajuste", "Novos Tiers"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @hormozi-sales |
| **Rationale** | Requer análise de custo de entrega vs. valor percebido para identificar ineficiências na oferta atual. |

## Overview

Realiza uma auditoria profunda na estrutura de preços e no stack de entregáveis para garantir que a oferta continua sendo irresistível e sustentável financeiramente.

## Input

- **Preços atuais** (number/list)
  - Description: Quanto é cobrado hoje e como é o parcelamento.
- **Conversão de Vendas** (number)
  - Description: % de fechamento atual para basear o diagnóstico.

## Output

- **Diagnóstico de Valor** (markdown)
  - Description: Análise se o preço está condizente com a transformação.

## Action Items

### Step 1: Analisar Unit Economics

Verificar se a margem de lucro por venda permite a escala via tráfego pago (LTV:CAC).

### Step 2: Avaliar o Stack de Valor Atual

Identificar itens que os clientes não valorizam mas que custam caro para entregar.

### Step 3: Testar Elasticidade de Preço

Simular cenários de aumento de preço com adição de bônus de alto valor percebido.

### Step 4: Revisar a Força da Garantia

Checar se a garantia atual é apenas burocrática ou se realmente remove o medo do comprador.

### Step 5: Propor Ajustes na Oferta

Gerar uma lista de mudanças imediatas (ex: remover bônus inútil, adicionar consultoria em grupo, subir preço).

## Acceptance Criteria

- [ ] **AC-1:** O diagnóstico identifica pelo menos 2 pontos de "vazamento de valor" na oferta.
- [ ] **AC-2:** As recomendações incluem uma estimativa de impacto no LTV.
- [ ] **AC-3:** A nova estrutura de preço proposta mantém o unit economics saudável.

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
