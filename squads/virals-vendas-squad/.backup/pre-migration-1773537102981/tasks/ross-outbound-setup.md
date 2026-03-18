# Configurar Prospecção Outbound @ross-sales

**Task ID:** `ross-outbound-setup`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Predictable Revenue)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Configurar Prospecção Outbound |
| **status** | `pending` |
| **responsible_executor** | @ross-sales |
| **execution_type** | `Agent` |
| **input** | ["ICP (Ideal Customer Profile)", "Lista de Prospects", "Oferta B2B"] |
| **output** | ["Sequência de 14 dias", "Templates personalizados", "Tracking de Resposta"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ross-sales |
| **Rationale** | Requer conhecimento em prospecção fria sistemática e redação de cold emails de alta conversão. |

## Overview

Cria uma operação de prospecção ativa cirúrgica, focada em abordar decisores do ICP com mensagens altamente personalizadas e relevantes.

## Input

- **ICP** (string)
  - Description: Indústria, porte e cargo dos decisores.
- **Lista de Prospects** (csv/table)
  - Description: Nomes, cargos e contatos validados.

## Output

- **Sequência Outbound** (markdown)
  - Description: Cronograma de contatos para 14 dias.

## Action Items

### Step 1: Validar o ICP

Garantir que a lista de prospects bate exatamente com o perfil de cliente que tem a dor que resolvemos.

### Step 2: Criar a Sequência de 5 Toques

Mapear os dias 1, 3, 6, 10 e 14 com mensagens intercalando Email, LinkedIn e Ligação.

### Step 3: Redigir Templates Personalizáveis

Criar o corpo das mensagens com espaços reservados para a personalização do primeiro parágrafo (foco no prospect).

### Step 4: Definir CTAs de Baixa Fricção

Garantir que o pedido final não seja uma venda, mas uma conversa de 10 minutos ou um feedback sobre um conteúdo.

### Step 5: Configurar Métricas de Resposta

Estabelecer como será medido o sucesso da cadência (meta: ≥ 5% de taxa de resposta positiva).

## Acceptance Criteria

- [ ] **AC-1:** A sequência foca na dor/resultado do prospect, não nas funcionalidades do produto.
- [ ] **AC-2:** Os templates permitem personalização profunda em menos de 2 minutos por lead.
- [ ] **AC-3:** O fluxo termina com uma mensagem de "break-up" profissional e elegante.

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
