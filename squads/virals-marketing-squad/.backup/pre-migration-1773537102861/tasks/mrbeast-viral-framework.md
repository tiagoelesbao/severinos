# Aplicar Framework Viral MrBeast

**Task ID:** `mrbeast-viral-framework`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (MrBeast methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Aplicar Framework Viral MrBeast |
| **status** | `pending` |
| **responsible_executor** | @mrbeast-mk |
| **execution_type** | `Agent` |
| **input** | ["Conceito inicial", "Tema", "Objetivo", "Público-alvo"] |
| **output** | ["Estrutura de retenção", "Brief de Thumbnail", "Sugestões de Título", "Hook dos 30s"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @mrbeast-mk |
| **Rationale** | Requer análise de padrões de retenção e geração de ganchos criativos baseados em heurísticas virais. |

## Overview

Aplica o framework de engenharia de atenção do MrBeast para criar ou auditar um conceito de conteúdo, garantindo alto CTR e máxima retenção.

## Input

- **Conceito inicial** (string)
  - Description: A ideia bruta do vídeo ou post.
  - Required: Yes
- **Tema** (string)
  - Description: Assunto principal do conteúdo.
  - Required: Yes
- **Objetivo** (string)
  - Description: O que se espera com o conteúdo (venda, alcance, autoridade).
  - Required: Yes

## Output

- **Estrutura de retenção** (markdown)
  - Description: Mapeamento de momentos de interesse ao longo do conteúdo.
- **Brief de Thumbnail** (text)
  - Description: Descrição visual da imagem para atrair o clique.
- **Hook dos 30s** (text)
  - Description: Roteiro exato para os primeiros 30 segundos.

## Action Items

### Step 1: Definir Thumbnail e Título

O thumbnail e o título são 50% do esforço. Devem criar uma lacuna de curiosidade impossível de ignorar.

### Step 2: Estruturar o Hook dos primeiros 3-30 segundos

Promessa clara, prova de que vai cumprir e uma razão para o espectador ficar.

### Step 3: Mapear Micro-recompensas e Open Loops

Garantir que cada 30-60 segundos o espectador receba um novo estímulo ou insight.

### Step 4: Configurar o Gatilho de Compartilhamento

Criar um momento de identidade ou utilidade que force o compartilhamento.

## Acceptance Criteria

- [ ] **AC-1:** O conceito pode ser explicado e gerar interesse em uma única frase.
- [ ] **AC-2:** O hook dos primeiros 30s contém uma promessa clara conectada ao título.
- [ ] **AC-3:** O brief de thumbnail utiliza contraste e emoção clara.

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
