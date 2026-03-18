# Projetar Arquitetura de Audiência @ezra

**Task ID:** `ezra-audience-architecture`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Audiences/Segments)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Projetar Arquitetura de Audiência |
| **status** | `pending` |
| **responsible_executor** | @ezra-firestone |
| **execution_type** | `Agent` |
| **input** | ["Dados de Clientes (CSV/API)", "Configuração de Pixel/GTM", "Metas de alcance"] |
| **output** | ["Lista de audiências Lookalike", "Segmentação Custom Audience", "Mapa de Cohorts"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ezra-firestone |
| **Rationale** | Requer conhecimento técnico de segmentação de plataformas e visão estratégica de retenção de dados de audiência. |

## Overview

Arquitetura avançada de audiências (Lookalike, Custom, Interest) para todas as fases do funil, garantindo que a mensagem certa chegue à pessoa certa.

## Input

- **Dados de Clientes** (data)
  - Description: Lista de e-mails ou eventos de compra passados.
- **Configuração de Pixel/GTM** (status)
  - Description: Verificação se o rastreamento está ativo.

## Output

- **Segmentação Custom Audience** (json/list)
  - Description: Lista de públicos prontos para uso em campanhas.

## Action Items

### Step 1: Configurar Audiências Frias

Criar públicos similares (Lookalike) a partir da lista de compradores e leads mais qualificados.

### Step 2: Configurar Audiências Mornas

Criar segmentações de retargeting baseadas em visualização de vídeo (75%+) e visitas recentes ao site.

### Step 3: Configurar Audiências Quentes

Isolar públicos de abandono de checkout e visitantes de páginas de vendas específicas.

### Step 4: Configurar Exclusões

Garantir que compradores atuais sejam excluídos de todas as campanhas de aquisição.

### Step 5: Mapear Cohorts por Tempo

Estruturar janelas de tempo (7, 14, 30, 90 dias) para ajustar a oferta conforme o tempo desde o último contato.

## Acceptance Criteria

- [ ] **AC-1:** As audiências de Lookalike são baseadas no evento de maior valor (Purchase).
- [ ] **AC-2:** Exclusões de compradores estão ativas em todas as campanhas de topo.
- [ ] **AC-3:** A arquitetura cobre toda a jornada (Cold → Warm → Hot).

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
