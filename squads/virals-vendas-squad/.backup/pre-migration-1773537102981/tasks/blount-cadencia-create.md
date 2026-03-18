# Criar Cadência de Follow-up @blount-sales

**Task ID:** `blount-cadencia-create`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Fanatical Prospecting)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Cadência de Follow-up |
| **status** | `pending` |
| **responsible_executor** | @blount-sales |
| **execution_type** | `Agent` |
| **input** | ["Perfil do Lead", "Produto/Oferta", "Canais disponíveis"] |
| **output** | ["Fluxo de contatos", "Mensagens por dia", "Critérios de saída"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @blount-sales |
| **Rationale** | Requer conhecimento em disciplina de vendas e estruturação de sequências multicanal que mantenham o lead engajado. |

## Overview

Cria uma sequência sistemática de contatos (WhatsApp, Email, LinkedIn, Ligação) projetada para maximizar a taxa de resposta e evitar que o lead esfrie.

## Input

- **Perfil do Lead** (string)
  - Description: Inbound (conhece a marca) ou Outbound (frio).
- **Canais** (array)
  - Description: Quais meios de contato temos autorização para usar.

## Output

- **Fluxo de contatos** (markdown/diagram)
  - Description: Mapeamento de qual canal usar em cada dia.

## Action Items

### Step 1: Definir o Objetivo da Cadência

Identificar se é para primeiro contato, reativação de lead perdido ou pós-reunião.

### Step 2: Calcular a Densidade de Toques

Estabelecer quantos contatos serão feitos em um período de 14 a 21 dias (meta: 7 a 12 toques).

### Step 3: Escrever as Mensagens (Ângulos Diferentes)

Criar textos que agreguem valor em cada interação, evitando o erro de "você viu minha mensagem?".

### Step 4: Alternar Canais (Variedade)

Garantir que a cadência mude de canal (ex: WhatsApp → LinkedIn → Email) para não saturar um único meio.

### Step 5: Definir Critérios de Saída

Estabelecer os gatilhos para parar a cadência (Resposta positiva, negativa ou fim do fluxo).

## Acceptance Criteria

- [ ] **AC-1:** A cadência possui pelo menos 7 toques distribuídos em 15 dias.
- [ ] **AC-2:** Pelo menos 3 canais diferentes são utilizados no fluxo.
- [ ] **AC-3:** Cada mensagem possui um CTA (Call to Action) único e claro.

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
