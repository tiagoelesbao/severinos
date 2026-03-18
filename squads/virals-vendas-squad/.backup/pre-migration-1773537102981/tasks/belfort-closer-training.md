# Criar Treinamento de Closers @belfort-sales

**Task ID:** `belfort-closer-training`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Sales Training Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Treinamento de Closers |
| **status** | `pending` |
| **responsible_executor** | @belfort-sales |
| **execution_type** | `Agent` |
| **input** | ["Scripts de Venda", "Mapa de Objeções", "Offer Document"] |
| **output** | ["Módulo de Roleplay", "Guia de Tonalidade Prático", "Quiz de Certificação"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @belfort-sales |
| **Rationale** | Requer conhecimento em pedagogia de vendas e simulação de cenários críticos para capacitação de closers. |

## Overview

Cria um módulo de treinamento completo para novos closers, focando na aplicação prática dos scripts e na calibração da tonalidade vocal.

## Input

- **Material de Referência** (array)
  - Description: Scripts, objeções e detalhes da oferta.

## Output

- **Módulo de Roleplay** (markdown)
  - Description: Cenários para simulação de vendas (fácil, médio, difícil).
- **Quiz de Certificação** (list)
  - Description: Perguntas para validar o conhecimento do closer.

## Action Items

### Step 1: Compilar Materiais

Reunir toda a documentação da oferta e scripts criados anteriormente.

### Step 2: Criar o Guia de Tonalidade

Definir exemplos em áudio ou texto de como projetar Certeza, Curiosidade e Escassez.

### Step 3: Desenvolver Cenários de Roleplay

Criar 3 scripts de simulação onde um "cliente difícil" traz as objeções mapeadas.

### Step 4: Definir Grade de Avaliação

Estabelecer critérios de nota (1-10) para Rapport, Diagnóstico e Fechamento.

### Step 5: Criar Quiz de Conhecimento

Elaborar perguntas sobre o produto, garantias e processos de CRM.

### Step 6: Montar o Playbook Final

Consolidar tudo em um único documento de fácil consulta para a equipe.

## Acceptance Criteria

- [ ] **AC-1:** O treinamento inclui pelo menos 3 simulações de roleplay com níveis de dificuldade crescentes.
- [ ] **AC-2:** O quiz de certificação possui questões de "situação real" além de teóricas.
- [ ] **AC-3:** O guia de tonalidade fornece exemplos claros de quando usar cada tom na linha reta.

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
