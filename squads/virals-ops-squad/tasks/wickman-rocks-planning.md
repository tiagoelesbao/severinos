# Planejamento de Rocks Trimestrais @wickman

**Task ID:** `wickman-rocks-planning`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Gino Wickman EOS Traction)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Planejar Rocks Trimestrais |
| **status** | `pending` |
| **responsible_executor** | @wickman |
| **execution_type** | `Agent` |
| **input** | ["Trimestre alvo", "Metas anuais (V/TO)", "Revisão do trimestre anterior"] |
| **output** | ["Lista de 3-7 Rocks", "Donos definidos", "Critérios binários de conclusão"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @wickman |
| **Rationale** | Requer facilitação de priorização estratégica e garantia de accountability real no planejamento. |

## Overview

Facilita o ciclo de planejamento de 90 dias, definindo as prioridades absolutas da empresa (Rocks) que moverão o negócio em direção às metas anuais, com foco em simplicidade e execução.

## Input

- **Trimestre Alvo** (string)
  - Description: Ex: "Q2 2026".
- **V/TO** (document)
  - Description: Vision/Traction Organizer com as metas de longo prazo.

## Output

- **Lista de Rocks** (markdown/list)
  - Description: Metas prioritárias com dono e critério binário.

## Action Items

### Step 1: Revisar o Trimestre Anterior

Avaliar quais Rocks foram concluídos, quais falharam e por quê, extraindo os "Issues" para a lista de resolução.

### Step 2: Brainstorm de Prioridades

Listar todos os projetos e metas possíveis para os próximos 90 dias sem filtros iniciais.

### Step 3: Aplicar o Filtro de Foco

Reduzir a lista para apenas 3 a 7 Rocks. Se tudo é prioridade, nada é prioridade.

### Step 4: Definir Accountability (Donos)

Garantir que cada Rock tenha UM ÚNICO dono responsável por levar o projeto até o fim.

### Step 5: Estabelecer Critérios Binários

Escrever exatamente o que significa o Rock estar concluído (ex: "X implementado" e não "Melhorar X").

## Acceptance Criteria

- [ ] **AC-1:** Cada Rock possui um critério de conclusão binário (concluído ou não concluído).
- [ ] **AC-2:** Nenhum Rock possui mais de um dono.
- [ ] **AC-3:** O conjunto de Rocks está diretamente conectado a pelo menos uma meta anual do V/TO.

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
