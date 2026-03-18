# Sprint de Business Intelligence @kaushik

**Task ID:** `kaushik-bi-sprint`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Avinash Kaushik Analytics Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Executar Sprint de BI |
| **status** | `pending` |
| **responsible_executor** | @kaushik |
| **execution_type** | `Agent` |
| **input** | ["Período de análise", "Área de foco", "Acessos às ferramentas de dados"] |
| **output** | ["Relatório de Insights", "OMTM definida", "3 Recomendações Priorizadas"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @kaushik |
| **Rationale** | Requer análise estatística, segmentação de dados e capacidade de extrair "o porquê" por trás dos números. |

## Overview

Sprint de 2 semanas focada em transformar dados brutos em inteligência competitiva, identificando falhas de funil e definindo a métrica única que guiará o próximo ciclo de crescimento.

## Input

- **Período de Análise** (string)
  - Description: Ex: "Últimos 90 dias" ou "Q1 2026".
- **Ferramentas** (array)
  - Description: GA4, ClickUp, CRM, Planilhas Financeiras.

## Output

- **Relatório de BI** (markdown)
  - Description: Documento com análise What/So What/Now What.
- **OMTM** (string)
  - Description: One Metric That Matters para o próximo ciclo.

## Action Items

### Step 1: Coletar e Limpar Dados

Extrair métricas de todos os níveis (Empresa, Produto, Marketing, Vendas) e validar a integridade da coleta.

### Step 2: Segmentar por Padrões

Diferenciar a performance por dispositivo, canal, cohort de cliente ou região para evitar o erro das médias.

### Step 3: Gerar Insights "E daí?"

Para cada variação de dados, explicar o impacto no negócio e o que aconteceria se não agíssemos.

### Step 4: Definir a OMTM do Ciclo

Identificar qual métrica, se otimizada, removerá o maior limitador do crescimento atual.

### Step 5: Produzir Plano de Ação

Transformar os insights em pelo menos 3 tarefas concretas com dono e prazo.

## Acceptance Criteria

- [ ] **AC-1:** O relatório separa claramente métricas de vaidade de métricas acionáveis.
- [ ] **AC-2:** A OMTM definida possui um método de medição semanal e uma meta clara.
- [ ] **AC-3:** Cada recomendação é acompanhada por uma projeção de impacto financeiro ou operacional.

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
