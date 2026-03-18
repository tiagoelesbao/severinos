# Auditoria de SEO @fishkin

**Task ID:** `fishkin-seo-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (SparkToro/Moz methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Realizar Auditoria de SEO |
| **status** | `pending` |
| **responsible_executor** | @fishkin-mk |
| **execution_type** | `Agent` |
| **input** | ["URL do site", "Top 5 competidores", "Keywords alvo iniciais"] |
| **output** | ["Relatório de SEO técnico", "Mapa de Keywords", "Gap Analysis vs Competidores"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @fishkin-mk |
| **Rationale** | Requer análise de dados de busca, interpretação de intenção de audiência e auditoria técnica de web standards. |

## Overview

Realiza auditoria de SEO técnica e de conteúdo, focando na autoridade, intenção de busca e performance de keywords.

## Input

- **URL do site** (string)
  - Description: Domínio principal para análise.
- **Top 5 competidores** (array)
  - Description: Lista de domínios que disputam as mesmas keywords.

## Output

- **Mapa de Keywords** (markdown/table)
  - Description: Lista de keywords priorizadas por intenção e volume.
- **Gap Analysis** (text)
  - Description: O que os competidores têm que nós não temos.

## Action Items

### Step 1: Auditar Core Web Vitals

Analisar performance técnica: velocidade mobile, indexação e erros de rastreio.

### Step 2: Mapear Keywords por Intenção

Classificar palavras-chave em Topo, Meio e Fundo de Funil (Pillar + Cluster).

### Step 3: Analisar Autoridade

Verificar perfil de backlinks e autoridade de domínio usando SparkToro/Semrush.

### Step 4: Avaliar Competidores

Comparar o posicionamento orgânico com os top 5 competidores definidos no input.

### Step 5: Definir Plano de Ação

Criar cronograma de conteúdo para os próximos 3-6 meses focado em gaps de autoridade.

## Acceptance Criteria

- [ ] **AC-1:** O relatório identifica pelo menos 3 erros técnicos bloqueadores.
- [ ] **AC-2:** A análise de keywords inclui métrica de "Dificuldade" e "Intenção".
- [ ] **AC-3:** O plano de ação prioriza keywords de fundo de funil (alta intenção).

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
