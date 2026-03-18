# Projetar Dashboard Acionável @kaushik

**Task ID:** `kaushik-dashboard-design`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Dashboard Design Best Practices)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Projetar Dashboard Acionável |
| **status** | `pending` |
| **responsible_executor** | @kaushik |
| **execution_type** | `Agent` |
| **input** | ["Objetivo do Dashboard", "Público-alvo", "Lista de métricas disponíveis"] |
| **output** | ["Blueprint de Dashboard", "Fórmulas de KPI", "Layout de Widgets"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @kaushik |
| **Rationale** | Requer habilidade em visualização de dados e curadoria de métricas para evitar sobrecarga de informação. |

## Overview

Cria a arquitetura visual e lógica de um dashboard operacional, garantindo que cada gráfico gere uma decisão clara e que métricas de vaidade sejam eliminadas do campo de visão.

## Input

- **Objetivo** (string)
  - Description: O que este dashboard monitora (ex: Funil de Vendas).
- **Público** (string)
  - Description: Quem vai ler (ex: CMO, Gestor de Tráfego).

## Output

- **Blueprint de Dashboard** (markdown/mockup)
  - Description: Desenho dos indicadores e seus filtros.

## Action Items

### Step 1: Identificar a OMTM

Definir qual é o indicador principal que deve brilhar no topo do dashboard (a métrica norte).

### Step 2: Selecionar Métricas de Diagnóstico

Escolher indicadores secundários que explicam as variações da OMTM (causa-efeito).

### Step 3: Definir Comparativos Históricos

Estabelecer as réguas de comparação: Semana contra Semana (WoW) ou Mês contra Mês (MoM).

### Step 4: Aplicar o Filtro de Ação

Para cada métrica, responder: "Se este número cair 20%, qual a primeira ação que tomaremos?". Se não houver resposta, remover a métrica.

### Step 5: Desenhar o Layout Visual

Organizar os widgets por hierarquia de importância, garantindo a leitura rápida em menos de 1 minuto.

## Acceptance Criteria

- [ ] **AC-1:** O dashboard contém no máximo 7 indicadores principais.
- [ ] **AC-2:** Todas as métricas apresentadas possuem um comparativo histórico visível.
- [ ] **AC-3:** Zero métricas de vaidade (ex: total acumulado de visitas sem contexto) incluídas.

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
