# Construir Oferta Completa @hormozi-sales

**Task ID:** `hormozi-offer-build`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Alex Hormozi $100M Offers)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Construir Oferta Completa |
| **status** | `pending` |
| **responsible_executor** | @hormozi-sales |
| **execution_type** | `Agent` |
| **input** | ["Descrição do Produto", "Avatar/ICP", "Dados de CAC/LTV"] |
| **output** | ["Offer Document", "Value Stack", "Design de Garantia", "Cálculo de Preço"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @hormozi-sales |
| **Rationale** | Requer aplicação de frameworks de engenharia de valor e análise quantitativa de unit economics. |

## Overview

Constrói uma "Grand Slam Offer" completa seguindo a metodologia do Hormozi, focando em maximizar o valor percebido e remover o risco do comprador.

## Input

- **Descrição do Produto** (string)
  - Description: O que é o produto/serviço e quais problemas resolve.
- **Avatar/ICP** (string)
  - Description: Perfil detalhado de quem é o comprador ideal.

## Output

- **Offer Document** (markdown)
  - Description: Documento final consolidado com a oferta estruturada.
- **Value Stack** (list)
  - Description: Lista de bônus e entregáveis que aumentam o valor percebido.

## Action Items

### Step 1: Mapear a Transformação

Identificar o "Dream Outcome" do cliente: onde ele está agora e onde ele quer chegar.

### Step 2: Quantificar o Valor

Atribuir um valor financeiro ou emocional à transformação para basear o preço.

### Step 3: Construir o Stack de Valor

Criar bônus e complementos (core + templates + suporte + bônus de velocidade) que resolvam as objeções do cliente.

### Step 4: Definir a Precificação

Calcular o preço ideal, garantindo que o valor percebido seja pelo menos 10x o valor cobrado.

### Step 5: Criar a Garantia Insuportável

Desenhar uma garantia que elimine o medo do risco (ex: garantia de resultado ou devolução).

### Step 6: Validar Unit Economics

Calcular se a oferta é sustentável: LTV:CAC deve ser maior que 3.

## Acceptance Criteria

- [ ] **AC-1:** O valor percebido da oferta é claramente demonstrado como 10x o preço.
- [ ] **AC-2:** A oferta possui pelo menos 3 bônus de alto valor e baixo custo de entrega.
- [ ] **AC-3:** A garantia é específica e baseada em uma métrica clara de sucesso.

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
