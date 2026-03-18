# Auditoria de Alavancagem Operacional @hormozi-sys

**Task ID:** `hormozi-sys-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Alex Hormozi Operational Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Realizar Auditoria de Alavancagem |
| **status** | `pending` |
| **responsible_executor** | @hormozi-sys |
| **execution_type** | `Agent` |
| **input** | ["Área de foco", "Tempo investido pelo gestor", "Lista de tarefas recorrentes"] |
| **output** | ["Blueprint de Escala", "Mapa de Gargalos", "ROI Operacional"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @hormozi-sys |
| **Rationale** | Requer análise quantitativa de tempo/custo e visão sistêmica para identificar pontos de maior alavancagem. |

## Overview

Identifica ineficiências operacionais onde o humano (especialmente o gestor) é o único caminho, propondo a transição para sistemas de código, conteúdo ou colaboração escalável.

## Input

- **Área de Foco** (string)
  - Description: Unidade de negócio ou processo específico.
- **Lista de Tarefas** (array)
  - Description: O que é feito manualmente hoje.

## Output

- **Blueprint de Escala** (markdown)
  - Description: Plano de ação para remover o gestor do fluxo crítico.
- **ROI Operacional** (number)
  - Description: Valor economizado projetado.

## Action Items

### Step 1: Mapear o Gargalo

Identificar em quais tarefas o fluxo para e espera por uma decisão ou ação manual do gestor.

### Step 2: Calcular o Custo da Ineficiência

Multiplicar as horas gastas pelo valor/hora do gestor para visualizar o desperdício financeiro.

### Step 3: Aplicar Filtro E.S.A.D.

Para cada tarefa: Eliminar (se inútil), Simplificar (se complexa), Automatizar (via software) ou Delegar (via POP).

### Step 4: Definir o Stack de Alavancagem

Escolher qual multiplicador será usado: Código (automação), Conteúdo (treinamento) ou Colaboração (equipe).

### Step 5: Priorizar Implementação

Criar um cronograma de automação baseado no maior ROI com o menor esforço de desenvolvimento.

## Acceptance Criteria

- [ ] **AC-1:** O blueprint propõe a redução de pelo menos 20% do tempo do gestor na área auditada.
- [ ] **AC-2:** Pelo menos uma automação de "baixo custo/alto impacto" é detalhada com ferramentas.
- [ ] **AC-3:** O plano identifica claramente a métrica de "Revenue per Employee" projetada.

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
