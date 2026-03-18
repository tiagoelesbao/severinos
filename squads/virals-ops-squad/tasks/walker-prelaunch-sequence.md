# Detalhar Sequência de Pré-Lançamento @walker-launch

**Task ID:** `walker-prelaunch-sequence`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Product Launch Formula Sequences)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Detalhar Sequência de PLCs |
| **status** | `pending` |
| **responsible_executor** | @walker-launch |
| **execution_type** | `Agent` |
| **input** | ["Produto", "Desejo do Avatar", "Inimigo Comum", "Duração da sequência"] |
| **output** | ["Roteiro de temas (PLC 1-4)", "Gatilhos mentais por fase", "Calendário de Emails"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @walker-launch |
| **Rationale** | Requer domínio da psicologia de antecipação e estruturação de narrativas que movem o lead do estado de "problema" para "comprador". |

## Overview

Define o conteúdo estratégico de cada peça de pré-lançamento, garantindo que a audiência receba o valor necessário e ative os gatilhos corretos antes da abertura oficial do carrinho.

## Input

- **Produto** (string)
  - Description: O que será vendido ao final.
- **Inimigo Comum** (string)
  - Description: O obstáculo que impede o lead de atingir o resultado.

## Output

- **Plano de PLC** (markdown)
  - Description: O que falar e o que pedir em cada conteúdo de aquecimento.

## Action Items

### Step 1: Estruturar o PLC 1 (A Oportunidade)

Mostrar que o "Dream Outcome" é possível e por que a oportunidade atual é única e urgente.

### Step 2: Estruturar o PLC 2 (A Jornada)

Narrar a transformação, mostrar por que as outras opções falham e apresentar o seu veículo (o produto).

### Step 3: Estruturar o PLC 3 (A Experiência)

Trazer prova social massiva, mostrar como é a vida após o produto e tirar as últimas dúvidas teóricas.

### Step 4: Estruturar o PLC 4 (O Script de Venda)

Preparar a transição para a abertura, focando no FAQ, bônus e na escassez real de tempo/vagas.

### Step 5: Mapear a Cadência de Consumo

Definir o intervalo de dias entre cada PLC e os emails de lembrete que devem ser disparados.

## Acceptance Criteria

- [ ] **AC-1:** Cada PLC possui um "Hook" (gancho) de entrada e uma "Call to Action" (chamada) de saída.
- [ ] **AC-2:** A sequência ativa pelo menos 4 gatilhos: Reciprocidade, Autoridade, Prova Social e Antecipação.
- [ ] **AC-3:** O plano identifica claramente qual é a "Big Idea" que une todos os conteúdos.

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
