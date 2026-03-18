# Criar Campanha Brand/Awareness @ezra

**Task ID:** `ezra-brand-campaign-create`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Ezra Brand Methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Campanha de Brand Awareness |
| **status** | `pending` |
| **responsible_executor** | @ezra-firestone |
| **execution_type** | `Agent` |
| **input** | ["Objetivo de Marca", "Público-alvo Lookalike", "Vídeos/Imagens de Brand"] |
| **output** | ["Campanha de topo ativa", "Configuração de ThruPlay", "Tracking de audiência"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ezra-firestone |
| **Rationale** | Requer conhecimento em construção de marca e otimização de campanhas de topo de funil para alcance qualificado. |

## Overview

Cria campanhas de brand awareness para construção de marca em escala, focando em alcance qualificado e ThruPlay% para alimentar o retargeting.

## Input

- **Objetivo de Marca** (enum)
  - Description: Alcance, Vídeo Views ou Engajamento.
- **Público-alvo Lookalike** (string)
  - Description: Público frio para expansão de marca.

## Output

- **Campanha de topo ativa** (status)
  - Description: Campanha publicada com foco em topo de funil.

## Action Items

### Step 1: Definir Objetivo de Brand

Selecionar o objetivo de campanha que maximize o reconhecimento (CPM baixo e ThruPlay alto).

### Step 2: Mapear Audiências Frias

Configurar segmentações de Lookalike e Interesses que representem o avatar ideal.

### Step 3: Adaptar Conteúdo Nativo

Garantir que os criativos respeitam a linguagem da plataforma (Meta/YouTube/TikTok).

### Step 4: Configurar Campanha de Topo

Publicar a estrutura com o budget aprovado para a fase de awareness.

### Step 5: Definir KPIs de Reconhecimento

Estabelecer os limiares de CPM e ThruPlay% que indicarão o sucesso da fase.

## Acceptance Criteria

- [ ] **AC-1:** A campanha está configurada para otimizar por visualização de vídeo ou alcance.
- [ ] **AC-2:** Exclusões de públicos mornos e quentes foram aplicadas.
- [ ] **AC-3:** O tracking de "Video View Audience" foi criado para alimentar o retargeting.

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
