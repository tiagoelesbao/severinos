# Criar Calendário de Conteúdo Nativo GaryVee

**Task ID:** `garyvee-content-calendar`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (GaryVee methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Calendário de Conteúdo Nativo |
| **status** | `pending` |
| **responsible_executor** | @garyvee-mk |
| **execution_type** | `Agent` |
| **input** | ["Pillar Content (Vídeo/Podcast)", "Plataformas Alvo", "Público-alvo"] |
| **output** | ["Calendário de Postagem", "Micro-conteúdos segmentados", "Legendas Nativas"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @garyvee-mk |
| **Rationale** | Requer conhecimento de nuances de plataforma (Instagram vs TikTok vs LinkedIn) e adaptação criativa de mensagens. |

## Overview

Transforma pillar content em micro-conteúdo distribuído por múltiplas plataformas de forma nativa e estratégica (Jab, Jab, Jab, Right Hook).

## Input

- **Pillar Content** (file/link)
  - Description: O conteúdo longo original que será fatiado.
  - Required: Yes
- **Plataformas Alvo** (array)
  - Description: Lista de redes sociais onde o conteúdo será postado.
  - Required: Yes

## Output

- **Calendário de Postagem** (markdown/table)
  - Description: Cronograma de quando e onde cada peça será publicada.
- **Micro-conteúdos segmentados** (array)
  - Description: Lista de temas e formatos extraídos do pillar content.

## Action Items

### Step 1: Mapear Pillar Content

Identificar os momentos de maior valor, "gold nuggets" e insights no vídeo ou podcast longo.

### Step 2: Segmentar em Micro-conteúdo

Definir quais partes viram Reels, quais viram Threads no LinkedIn e quais viram quotes estáticos.

### Step 3: Adaptar a mensagem de forma nativa

Reescrever legendas e ganchos para que o conteúdo pareça ter sido criado originalmente para aquela plataforma.

### Step 4: Definir calendário de postagens

Estabelecer uma frequência alta (Jab, Jab, Jab) antes de qualquer post de venda (Right Hook).

## Acceptance Criteria

- [ ] **AC-1:** Pelo menos 15 peças de micro-conteúdo geradas a partir de 1 pillar content.
- [ ] **AC-2:** As legendas respeitam a linguagem nativa de cada plataforma escolhida.
- [ ] **AC-3:** O calendário segue a proporção de 3:1 de valor vs venda.

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
