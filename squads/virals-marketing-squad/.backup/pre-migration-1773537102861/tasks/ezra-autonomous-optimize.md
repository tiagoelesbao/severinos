# Otimização Autônoma de Campanha Brand @ezra

**Task ID:** `ezra-autonomous-optimize`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Brand Rules)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Otimizar Campanha Brand Autonomamente |
| **status** | `pending` |
| **responsible_executor** | @ezra-firestone |
| **execution_type** | `Worker` |
| **input** | ["API de Plataformas", "Thresholds de ThruPlay/CPM", "Meta de Audiência de Retargeting"] |
| **output** | ["Log de boosting", "Status das audiências (ClickUp)", "Relatório semanal de saúde do funil"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Worker |
| **Pattern** | HO-EP-004 |
| **Executor** | @ezra-firestone (Automation Logic) |
| **Rationale** | Requer monitoramento contínuo e execução de regras de boosting de conteúdo orgânico e expansão de audiência. |

## Overview

Gestão autônoma do ecossistema de brand e funil — monitoramento diário até a expansão estratégica de audiências, sem intervenção humana, com logs detalhados.

## Input

- **API de Plataformas** (connect)
  - Description: Dados de ThruPlay%, Alcance e Engajamento.
- **Thresholds de ThruPlay** (yaml)
  - Description: Limites mínimos de performance para manter anúncios ativos.

## Output

- **Relatório de saúde do funil** (markdown)
  - Description: Estado atual das camadas de retargeting.

## Action Items

### Step 1: Verificar Tamanho do Funil

Analisar se as audiências de retargeting estão crescendo na taxa esperada.

### Step 2: Verificar Saturação

Monitorar a frequência (Frequency) de cada audiência para evitar fadiga de marca.

### Step 3: Identificar Conteúdo Orgânico

Localizar posts orgânicos com CTR > 3% ou engajamento > 5% nas últimas 24h.

### Step 4: Aplicar Boosting Estratégico

Criar campanhas de alcance para os posts orgânicos vencedores automaticamente.

### Step 5: Gerar Relatório Semanal

Publicar a evolução do tamanho e custo das audiências no ClickUp.

## Acceptance Criteria

- [ ] **AC-1:** Todos os posts orgânicos "vencedores" foram impulsionados dentro dos parâmetros.
- [ ] **AC-2:** Audiências com frequência > 5 foram notificadas ou pausadas automaticamente.
- [ ] **AC-3:** O crescimento da base de retargeting está de acordo com a projeção mensal.

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
