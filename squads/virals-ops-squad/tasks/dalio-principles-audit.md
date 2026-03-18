# Auditoria de Princípios Operacionais @dalio

**Task ID:** `dalio-principles-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Ray Dalio Principles)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Realizar Auditoria de Princípios |
| **status** | `pending` |
| **responsible_executor** | @dalio |
| **execution_type** | `Agent` |
| **input** | ["Área da auditoria", "Incidentes recentes", "Princípios documentados"] |
| **output** | ["Relatório de Alinhamento Cultural", "Ações Corretivas", "Ajustes de Princípios"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @dalio |
| **Rationale** | Requer análise imparcial, confronto de realidade e aplicação de frameworks de causa-efeito para diagnósticos culturais. |

## Overview

Auditoria sistemática para verificar se as decisões e processos da Virals estão alinhados com a cultura de transparência radical e meritocracia de ideias, identificando onde a realidade foi ignorada.

## Input

- **Área da Auditoria** (string)
  - Description: Ex: Contratação, Feedback, Lançamentos.
- **Incidentes Recentes** (array)
  - Description: Problemas ou decisões críticas do último período.

## Output

- **Relatório de Auditoria** (markdown)
  - Description: Diagnóstico honesto do estado atual da cultura operacional.

## Action Items

### Step 1: Coleta de Realidade

Coletar dados brutos, logs e depoimentos sobre os incidentes sem filtros ou opiniões subjetivas.

### Step 2: Confronto com Princípios

Identificar qual princípio deveria ter governado cada decisão e verificar se ele foi seguido ou ignorado.

### Step 3: Identificação de Causa-Raiz

Determinar se a falha foi de execução individual ou se o sistema/princípio está quebrado.

### Step 4: Reflexão Sistemática (Post-Mortem)

Aplicar a fórmula "Dor + Reflexão = Progresso" para extrair aprendizados de cada erro.

### Step 5: Propor Ajustes

Criar ou revisar princípios para evitar que o mesmo erro ocorra pela segunda vez.

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica pelo menos uma "verdade brutal" que não estava sendo dita.
- [ ] **AC-2:** Cada falha mapeada possui uma ação corretiva sistêmica vinculada.
- [ ] **AC-3:** O relatório contém uma nota de 1-10 para o nível de transparência radical da área.

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
