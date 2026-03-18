# Projetar Loop de Engajamento @eyal-produto

**Task ID:** `eyal-engagement-loop`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Nir Eyal Hook Model)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Projetar Loop de Engajamento |
| **status** | `pending` |
| **responsible_executor** | @eyal-produto |
| **execution_type** | `Agent` |
| **input** | ["Ação desejada do usuário", "Gatilhos internos (emoções)", "Perfil de uso"] |
| **output** | ["Design do Ciclo Hook", "Lista de Triggers Externos", "Matriz de Recompensa Variável"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @eyal-produto |
| **Rationale** | Requer conhecimento em psicologia comportamental e design de gatilhos para criar hábitos recorrentes de uso. |

## Overview

Cria o ciclo de habituação do usuário no produto (Trigger → Action → Variable Reward → Investment), garantindo que o retorno ao app/plataforma aconteça de forma orgânica e frequente.

## Input

- **Ação Desejada** (string)
  - Description: O que queremos que o usuário faça (ex: postar conteúdo, ler relatório).
- **Gatilho Interno** (string)
  - Description: Qual emoção ou necessidade o usuário sente antes de agir.

## Output

- **Design do Loop** (markdown/diagram)
  - Description: Mapeamento das 4 fases do modelo Hook.

## Action Items

### Step 1: Definir os Triggers (Gatilhos)

Mapear o gatilho externo (notificação, email) e como ele se conectará ao gatilho interno (tédio, medo de perder, busca por prazer).

### Step 2: Simplificar a Ação

Reduzir a barreira para o usuário realizar o comportamento desejado. Quanto menor o esforço, maior a chance de ação.

### Step 3: Projetar a Recompensa Variável

Definir como o produto entregará valor de forma inesperada (ex: um insight novo, um like, um conteúdo aleatório mas útil).

### Step 4: Estruturar o Investimento

Mapear o que o usuário faz dentro do produto que torna o uso futuro mais valioso (ex: preencher perfil, convidar amigos, salvar dados).

### Step 5: Auditar a Ética do Loop

Usar a Manipulation Matrix para garantir que o loop ajuda o usuário a melhorar sua própria vida.

## Acceptance Criteria

- [ ] **AC-1:** O loop identifica claramente a emoção negativa que dispara o gatilho interno.
- [ ] **AC-2:** A recompensa variável possui pelo menos 2 variantes para evitar previsibilidade.
- [ ] **AC-3:** O passo de investimento resulta em um "armazenamento de valor" real para o usuário.

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
