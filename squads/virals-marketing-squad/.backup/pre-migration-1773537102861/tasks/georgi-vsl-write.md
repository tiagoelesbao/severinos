# Criar Script de VSL @georgi

**Task ID:** `georgi-vsl-write`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Brunson/Kennedy methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Script de VSL |
| **status** | `pending` |
| **responsible_executor** | @georgi |
| **execution_type** | `Agent` |
| **input** | ["Avatar", "Oferta", "Mecanismo Único", "Provas Sociais"] |
| **output** | ["Script de VSL completo", "Slides da apresentação", "Briefing de edição"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 4 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @georgi |
| **Rationale** | Requer domínio de estruturas dramáticas de vendas e gatilhos mentais para roteirização de longa duração. |

## Overview

Estrutura scripts de Video Sales Letters (VSL) e Webinars baseados nos frameworks de Russell Brunson e Dan Kennedy.

## Input

- **Avatar** (string)
  - Description: Perfil detalhado de quem vai assistir.
- **Oferta** (markdown)
  - Description: Detalhes do produto, bônus, preço e garantia.

## Output

- **Script de VSL** (markdown)
  - Description: Roteiro palavra por palavra com indicações visuais.

## Action Items

### Step 1: Criar Hook de 30-90 segundos

Parar o scroll e prometer um resultado impossível de ignorar nos primeiros segundos.

### Step 2: Desenvolver a Story

Narrar a jornada de transformação e construir a "Epiphany Bridge" (o momento em que o lead entende a solução).

### Step 3: Estruturar a Pré-venda

Explicar por que as outras soluções falharam e por que o seu Mecanismo Único funciona.

### Step 4: Apresentar a Prova

Inserir estudos de caso, depoimentos e números que validem a promessa.

### Step 5: Lançar a Oferta Irresistível

Apresentar o Stack de Valor, bônus e a garantia que remove o risco.

### Step 6: Fechar com CTA

Chamada para ação clara, repetida e com urgência real.

## Acceptance Criteria

- [ ] **AC-1:** O script segue a ordem Hook → Story → Epiphany → Proof → Offer.
- [ ] **AC-2:** O "vilão" (problema) está claramente identificado e personificado.
- [ ] **AC-3:** O Stack de Valor mostra claramente que o valor é 10x maior que o preço.
- [ ] **AC-4:** Existem pelo menos 3 CTAs ao longo do script.

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
