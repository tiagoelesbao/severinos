# Definir OKRs de Produto @cagan-produto

**Task ID:** `cagan-okr-product`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Google/Cagan OKR Methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Definir OKRs de Produto |
| **status** | `pending` |
| **responsible_executor** | @cagan-produto |
| **execution_type** | `Agent` |
| **input** | ["Visão de Produto", "Objetivos de Negócio", "Benchmarks do mercado"] |
| **output** | ["Lista de Objetivos", "Key Results mensuráveis", "Iniciativas estratégicas"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @cagan-produto |
| **Rationale** | Requer capacidade de traduzir intenções qualitativas em métricas quantitativas de sucesso. |

## Overview

Estabelece as metas de curto prazo (trimestrais) que o time de produto deve perseguir, garantindo que o esforço de engenharia e design esteja alinhado com o crescimento financeiro e satisfação do cliente da Virals.

## Input

- **Objetivos de Negócio** (document)
  - Description: O que a empresa quer atingir (ex: dobrar faturamento).
- **Visão de Produto** (string)
  - Description: Onde o produto quer chegar em 2-3 anos.

## Output

- **OKRs de Produto** (markdown)
  - Description: Tabela com O, KR e Iniciativa.

## Action Items

### Step 1: Definir os Objetivos (Os)

Criar frases inspiradoras e qualitativas que descrevam o estado futuro desejado (ex: "Tornar o onboarding a melhor experiência do mercado").

### Step 2: Estabelecer Key Results (KRs)

Para cada objetivo, definir 2-3 métricas quantitativas que provam que o objetivo foi atingido (ex: "Aumentar ativação de 30% para 50%").

### Step 3: Mapear Iniciativas

Listar os projetos ou apostas que o time acredita que moverão os KRs (ex: "Redesenhar o fluxo de cadastro").

### Step 4: Validar Alinhamento

Garantir que os OKRs de produto contribuem diretamente para os OKRs globais da Virals.

### Step 5: Registrar no ClickUp

Publicar as metas para que todo o squad tenha visibilidade do progresso semanal.

## Acceptance Criteria

- [ ] **AC-1:** Os Key Results são puramente quantitativos (nada de "entregar projeto X").
- [ ] **AC-2:** Pelo menos um KR é focado em Retenção ou Sucesso do Cliente (@lincoln).
- [ ] **AC-3:** Cada objetivo tem no máximo 3 KRs para manter o foco.

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
