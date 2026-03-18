# Revisar Procedimento Padrão (POP) @ops-chief

**Task ID:** `pop-review`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Operational Auditing)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Revisar Procedimento Operacional Padrão |
| **status** | `pending` |
| **responsible_executor** | @ops-chief |
| **execution_type** | `Agent` |
| **input** | ["ID do POP", "Motivo da revisão", "Feedback do executor"] |
| **output** | ["POP Atualizado", "Log de mudanças", "Notificação ao time"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ops-chief |
| **Rationale** | Requer capacidade de identificar obsolescência em processos e integrar feedbacks de campo em instruções técnicas. |

## Overview

Revisão periódica ou por demanda de um POP existente para garantir que ele continua refletindo a realidade prática da operação e eliminando novas ambiguidades identificadas.

## Input

- **ID do POP** (string)
  - Description: Nome ou código do documento a ser revisado.
- **Motivo** (enum)
  - Description: Revisão semestral, mudança de software ou falha de execução.

## Output

- **POP Atualizado** (markdown)
  - Description: Nova versão com as correções aplicadas.

## Action Items

### Step 1: Simular a Execução Atual

Tentar executar o processo usando o POP antigo para identificar onde a instrução falha ou confunde.

### Step 2: Coletar Feedback Prático

Entrevistar quem usa o POP diariamente para mapear os "pulos do gato" ou hacks que não estão documentados.

### Step 3: Remover Etapas Obsoletas

Identificar passos que não agregam mais valor ou ferramentas que foram substituídas.

### Step 4: Atualizar Instruções e Capturas

Corrigir o texto e atualizar referências a links, pastas do ClickUp ou campos customizados.

### Step 5: Incrementar Versão e Publicar

Aplicar o versionamento semântico e notificar todos os interessados sobre a atualização.

## Acceptance Criteria

- [ ] **AC-1:** O POP revisado elimina pelo menos uma causa identificada de erro ou lentidão.
- [ ] **AC-2:** O log de mudanças descreve claramente o que foi alterado e por quê.
- [ ] **AC-3:** O novo documento foi testado e validado pelo dono do processo.

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

- [ ] `task_name` follows "Verb + Object" format
- [ ] `status` is one of: pending | in_progress | completed
- [ ] `responsible_executor` is clearly specified
- [ ] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [ ] `input` array has at least 1 item
- [ ] `output` array has at least 1 item
- [ ] `action_items` has clear, actionable_steps
- [ ] `acceptance_criteria` has measurable criteria

---

_Task Version: 1.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-12_
_Compliant: Yes_
