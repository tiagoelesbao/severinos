# Conduzir Entrevista com Cliente @torres-produto

**Task ID:** `torres-customer-interview`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Continuous Interviewing Habits)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Conduzir Entrevista de Discovery |
| **status** | `pending` |
| **responsible_executor** | @torres-produto |
| **execution_type** | `Human` |
| **input** | ["Perfil do cliente", "Objetivo da conversa", "Contexto de uso"] |
| **output** | ["Transcrição/Notas", "Lista de Dores", "Novas Oportunidades"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Human (ou Agent assistindo Humano) |
| **Pattern** | HO-EP-001 |
| **Executor** | Product Manager Humano (facilitado por @torres-produto) |
| **Rationale** | Requer empatia humana, leitura de linguagem não-verbal e capacidade de aprofundar em histórias em tempo real. |

## Overview

Executa a conversa semanal com um cliente real para extrair histórias de uso, frustrações latentes e necessidades não atendidas, servindo de base para alimentar a Opportunity Solution Tree.

## Input

- **Perfil do Usuário** (string)
  - Description: Ex: Novo usuário ou Usuário Power.
- **Objetivo** (string)
  - Description: O que queremos descobrir (ex: por que não usa a feature X).

## Output

- **Notas da Entrevista** (markdown)
  - Description: Pontos-chave e citações diretas (Verbatims).

## Action Items

### Step 1: Preparar o Roteiro

Definir 3-5 perguntas abertas focadas no passado recente ("Me conte sobre a última vez que...").

### Step 2: Gerar Rapport Inicial

Explicar que não estamos vendendo nada, apenas querendo aprender com a experiência dele.

### Step 3: Conduzir a Escuta Ativa

Deixar o cliente falar 80% do tempo. Evitar perguntas de "sim ou não" e não induzir respostas.

### Step 4: Cavar a Causa-Raiz

Sempre que o cliente trouxer uma solução (ex: "queria um botão"), perguntar: "O que você faria se tivesse esse botão?".

### Step 5: Documentar Insights Imediatos

Logo após a conversa, anotar as 3 maiores surpresas ou dores identificadas enquanto a memória está fresca.

## Acceptance Criteria

- [ ] **AC-1:** A entrevista durou pelo menos 30 minutos e focou em histórias reais, não em opiniões.
- [ ] **AC-2:** Pelo menos uma dor crítica (Pain Point) foi descrita com contexto completo.
- [ ] **AC-3:** As notas incluem o que o cliente tentou fazer como alternativa (Workaround).

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
