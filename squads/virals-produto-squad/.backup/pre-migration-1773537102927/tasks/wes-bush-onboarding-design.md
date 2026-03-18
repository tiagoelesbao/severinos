# Projetar Onboarding @wes-bush-produto

**Task ID:** `wes-bush-onboarding-design`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Wes Bush PLG Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Projetar Jornada de Onboarding |
| **status** | `pending` |
| **responsible_executor** | @wes-bush-produto |
| **execution_type** | `Agent` |
| **input** | ["Definição do Aha! Moment", "Fluxo atual de produto", "Pontos de fricção conhecidos"] |
| **output** | ["Blueprint de Onboarding", "Sequência de Ativação (Email/In-app)", "Mapa de Time-to-Value"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @wes-bush-produto |
| **Rationale** | Requer foco em Product-Led Growth e habilidade em eliminar barreiras entre o usuário e o valor percebido. |

## Overview

Desenha a jornada inicial do usuário (D0-D30), focando em reduzir o tempo até o primeiro valor (Time-to-Value) e garantir que o usuário atinja o Aha! Moment o mais rápido possível sem intervenção humana.

## Input

- **Aha! Moment** (string)
  - Description: O evento exato onde o usuário entende o valor do produto.
- **Fluxo Atual** (screenshot/link)
  - Description: Como o onboarding funciona hoje.

## Output

- **Blueprint de Onboarding** (markdown/diagram)
  - Description: Sequência de telas e ações sugeridas.

## Action Items

### Step 1: Identificar o Caminho Mais Curto

Mapear a linha reta (Straight Line) entre o cadastro e o Aha! Moment, ignorando todas as features secundárias.

### Step 2: Remover a Fricção Cognitiva

Identificar campos de formulário, etapas de configuração ou explicações densas que podem ser adiadas para depois da ativação.

### Step 3: Desenhar o "Success Path"

Criar um guia visual (tour) ou checklist interativo que direcione o usuário para a primeira vitória em menos de 5 minutos.

### Step 4: Criar a Sequência de Ativação

Escrever os emails e notificações que "puxam" o usuário de volta para o produto caso ele pare no meio do onboarding.

### Step 5: Definir Métricas de Ativação

Estabelecer como o time medirá se o onboarding está funcionando (ex: % de usuários que atingem o marco X em 24h).

## Acceptance Criteria

- [ ] **AC-1:** O novo design reduz o número de passos até o valor em pelo menos 20%.
- [ ] **AC-2:** Existe uma definição clara de "Ativado" para cada tipo de usuário.
- [ ] **AC-3:** O onboarding proposto é 100% executável via self-service (sem ajuda de CS/Vendas).

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
