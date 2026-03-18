# Criar Procedimento Padrão (POP) @ops-chief

**Task ID:** `pop-create`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Standard Operating Procedures)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Procedimento Operacional Padrão |
| **status** | `pending` |
| **responsible_executor** | @ops-chief |
| **execution_type** | `Agent` |
| **input** | ["Processo a mapear", "Dono do processo", "Gatilho de início"] |
| **output** | ["Documento POP", "Diagrama de fluxo", "Checklist de execução"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ops-chief |
| **Rationale** | Requer habilidade em transformar fluxos complexos em instruções atômicas e inequívocas para qualquer executor. |

## Overview

Documenta um processo recorrente da empresa, garantindo que ele funcione de forma previsível independente de quem o execute, servindo como a "memória operacional" da Virals.

## Input

- **Nome do Processo** (string)
  - Description: O que está sendo mapeado.
- **Dono do Processo** (string)
  - Description: Pessoa que manterá o POP atualizado.

## Output

- **Documento POP** (markdown)
  - Description: Guia passo a passo com versão MAJOR.MINOR.PATCH.

## Action Items

### Step 1: Identificar o Gatilho

Definir exatamente o que inicia o processo (ex: um ticket no ClickUp, uma data específica).

### Step 2: Mapear os Insumos

Listar todas as ferramentas, acessos e dados necessários para iniciar a execução.

### Step 3: Desenhar o Passo a Passo

Escrever cada etapa de forma atômica, usando verbos de ação e evitando ambiguidades.

### Step 4: Definir Árvores de Decisão

Mapear o que fazer quando o caminho feliz falha (ex: "Se der erro X, então faça Y").

### Step 5: Estabelecer Critérios de Saída

Definir como o executor sabe que a tarefa foi concluída com sucesso.

### Step 6: Testar e Aprovar

Pedir para alguém que não conhece o processo executar o POP e validar sua clareza.

## Acceptance Criteria

- [ ] **AC-1:** Uma pessoa neutra consegue executar o processo completo sem pedir ajuda externa.
- [ ] **AC-2:** O POP contém o tempo estimado de execução por etapa.
- [ ] **AC-3:** O documento segue o versionamento semântico (MAJOR para mudanças de fluxo).

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
