# Criar Plano de Lançamento @walker-launch

**Task ID:** `walker-launch-plan`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Jeff Walker Product Launch Formula)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Plano de Lançamento |
| **status** | `pending` |
| **responsible_executor** | @walker-launch |
| **execution_type** | `Agent` |
| **input** | ["Produto", "Meta de Receita", "Data de Abertura", "Tipo de Lançamento"] |
| **output** | ["Cronograma Reverso", "Sequência de PLCs", "Checklist de Go/No-Go"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @walker-launch |
| **Rationale** | Requer domínio de engenharia de sequências, timing operacional e coordenação multidepartamental. |

## Overview

Desenvolve o mapa mestre de um lançamento, definindo as fases de antecipação, aquecimento e venda, com foco em maximizar o impacto da janela de abertura de carrinho.

## Input

- **Produto** (string)
  - Description: O que está sendo lançado.
- **Tipo de Lançamento** (enum)
  - Description: Seed, Interno, JV ou Evergreen.

## Output

- **Cronograma de Lançamento** (markdown/table)
  - Description: Timeline com todos os marcos e donos de tarefas.
- **Checklist Go/No-Go** (list)
  - Description: Critérios técnicos e estratégicos para o sinal verde.

## Action Items

### Step 1: Definir Marcos Críticos

Mapear a data de abertura do carrinho e gerar o cronograma reverso (Backward Planning) de 4 semanas.

### Step 2: Estruturar a Sequência de Antecipação

Definir os temas do Pré-Pré-Lançamento e dos 3 Vídeos de Conteúdo (PLCs).

### Step 3: Coordenar Handoffs entre Squads

Briefar o Marketing (copy/criativos), Vendas (suporte/fechamento) e Produto (onboarding).

### Step 4: Estabelecer Gates de Qualidade

Criar os pontos de verificação (Gates 1, 2 e 3) para validar se tudo está pronto para o próximo passo.

### Step 5: Configurar Métricas de Acompanhamento

Definir os KPIs de leads gerados, CPL e ThruPlay que indicarão a saúde do lançamento em tempo real.

## Acceptance Criteria

- [ ] **AC-1:** O cronograma identifica um responsável único para cada entrega crítica.
- [ ] **AC-2:** Os critérios de Go/No-Go são objetivos e verificáveis (ex: "Link de checkout testado").
- [ ] **AC-3:** O plano contém um roteiro claro de bônus de ação rápida (Fast Action) para o dia 1.

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
