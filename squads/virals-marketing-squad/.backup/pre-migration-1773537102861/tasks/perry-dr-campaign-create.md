# Criar Campanha Direct Response @perry

**Task ID:** `perry-dr-campaign-create`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Perry Marshall Direct Response)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Campanha Direct Response |
| **status** | `pending` |
| **responsible_executor** | @perry-marshall |
| **execution_type** | `Agent` |
| **input** | ["Oferta", "CPA Máximo", "Criativos validados", "Landing Page"] |
| **output** | ["Campanha ativa", "Estrutura de adsets", "Configuração de tracking"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @perry-marshall |
| **Rationale** | Requer configuração técnica precisa em plataformas de anúncios e cálculo de lances baseados em metas de CPA. |

## Overview

Lança uma campanha de direct response (Meta/Google Search) baseada no princípio 80/20 para maximizar o ROAS imediato.

## Input

- **Oferta** (markdown)
  - Description: Detalhes do produto e preço.
- **CPA Máximo** (number)
  - Description: Limite de custo por aquisição permitido.

## Output

- **Campanha ativa** (status)
  - Description: Confirmação de que a campanha foi enviada para revisão/publicação.

## Action Items

### Step 1: Calcular CPA Sustentável

Verificar se o CPA máximo informado é realista para a oferta e o mercado atual.

### Step 2: Definir Audiências de Teste

Selecionar segmentações específicas (não amplas demais) para o período de validação inicial.

### Step 3: Configurar Anúncios

Subir os criativos produzidos por @mrbeast ou @ladeira, garantindo que o "clique é a porta".

### Step 4: Configurar Tracking

Garantir que Pixel, GTM e UTMs estão capturando todas as conversões corretamente.

### Step 5: Estabelecer Bids e Budgets

Definir o lance inicial e o orçamento diário de teste (R$ 30-100/dia por adset).

### Step 6: Ativar e Monitorar

Lançar a campanha e estabelecer alertas para as primeiras 24h de veiculação.

## Acceptance Criteria

- [ ] **AC-1:** A campanha está configurada com o objetivo correto de Conversão/Vendas.
- [ ] **AC-2:** O tracking de conversão está disparando corretamente (testado via assistente).
- [ ] **AC-3:** O budget diário não ultrapassa o limite aprovado para a fase de teste.

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
