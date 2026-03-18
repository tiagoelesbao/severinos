# Criar Roadmap de Outcomes @cagan-produto

**Task ID:** `cagan-roadmap-quarterly`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Marty Cagan Inspired/Empowered)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Roadmap Trimestral |
| **status** | `pending` |
| **responsible_executor** | @cagan-produto |
| **execution_type** | `Agent` |
| **input** | ["OKRs da Empresa", "Feedback de Vendas/CS", "Insights de Discovery (@torres)"] |
| **output** | ["Roadmap de Outcomes", "Backlog Prioritário (ICE)", "Mapeamento de Riscos"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @cagan-produto |
| **Rationale** | Requer visão estratégica de produto e capacidade de traduzir objetivos de negócio em problemas a serem resolvidos. |

## Overview

Desenvolve o planejamento estratégico de 90 dias para o produto, focando nos resultados desejados (Outcomes) em vez de apenas uma lista de funcionalidades (Output).

## Input

- **OKRs da Empresa** (document)
  - Description: Objetivos macros da Virals para o ciclo.
- **Insights de Discovery** (array)
  - Description: Oportunidades validadas por @torres-produto.

## Output

- **Roadmap de Outcomes** (markdown/table)
  - Description: Visualização dos problemas que o time resolverá nos Horizontes 1, 2 e 3.

## Action Items

### Step 1: Alinhar com a Estratégia

Revisar a visão de longo prazo e garantir que o roadmap do trimestre nos aproxima desse objetivo.

### Step 2: Priorizar Problemas, não Soluções

Selecionar as 3-5 maiores oportunidades vindas do Discovery e do feedback de CS (@lincoln).

### Step 3: Aplicar Score ICE

Priorizar o backlog baseado em Impacto, Confiança (dados do discovery) e Esforço estimado.

### Step 4: Analisar Dependências Técnicas

Consultar a engenharia para garantir que o roadmap é tecnicamente viável no prazo de 90 dias.

### Step 5: Publicar e Comunicar

Registrar o roadmap no ClickUp e realizar o handoff para o time de marketing e vendas se preparar.

## Acceptance Criteria

- [ ] **AC-1:** O roadmap é focado em métricas de sucesso (ex: Churn, NPS) e não apenas datas de entrega.
- [ ] **AC-2:** Cada item do roadmap possui um "Por que" fundamentado em evidências de discovery.
- [ ] **AC-3:** Os 4 grandes riscos (Valor, Usabilidade, Viabilidade, Negócio) foram preliminarmente avaliados para os itens do Horizonte 1.

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
