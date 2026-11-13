# Gerar Blueprint de Modulação (Síntese Final)

**Task ID:** `benchmark-modulation-blueprint`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-24
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Multi-agent audit outputs)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Gerar Blueprint de Modulação |
| **status** | `pending` |
| **responsible_executor** | @marketing-chief |
| **execution_type** | `Hybrid` |
| **input** | ["mrbeast_audit", "garyvee_audit", "ladeira_audit", "transcription", "dossier_json"] |
| **output** | ["Análise.md (relatório completo)", "scoring_matrix"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | HO-EP-003 |
| **Executor** | @marketing-chief |
| **Rationale** | Requer síntese de múltiplas análises especializadas em um relatório coeso, priorização de insights e geração de blueprint actionable. |

## Overview

Consolida as auditorias de MrBeast (retenção), GaryVee (contexto) e Ladeira (copy) em um relatório final unificado seguindo o template `viral-deep-analysis-tmpl.md`. Gera a Scoring Matrix agregada, o Script de Modulação e o Visual Style Guide.

## Input

- **mrbeast_audit** (markdown)
  - Description: Output da task `benchmark-mrbeast-audit.md` (seção + retention_score).
  - Required: Yes
- **garyvee_audit** (markdown)
  - Description: Output da task `benchmark-garyvee-audit.md` (seção + context_score).
  - Required: Yes
- **ladeira_audit** (markdown)
  - Description: Output da task `benchmark-ladeira-audit.md` (seção + copy_score).
  - Required: Yes
- **transcription** (string)
  - Description: Transcrição completa do conteúdo.
  - Required: Yes
- **dossier_json** (object)
  - Description: Dados do benchmark (URL, plataforma, metadata).
  - Required: Yes

## Output

- **Análise.md** (markdown)
  - Description: Relatório completo seguindo 100% do template `viral-deep-analysis-tmpl.md`, salvo em `services/ETL/outputs/Conteudo{N}-{titulo}/Análise.md`.
  - Content: Todas as 10 seções do template preenchidas com dados reais.

## Action Items

### Step 1: Compilar Metadata e Executive Summary

Preencher seções de metadata e executive summary do template:
- URL, plataforma, autor, data, duração, hashtags
- Resumo executivo com highlights dos 3 auditores (Retenção, Contexto, Copy)
- Scores agregados e Score Final Ponderado
- **Nota Multi-Modal**: Diferenciar se é análise de Vídeo ou de Carrossel/Post.

### Step 2: Montar Seção de Deconstrução Multimodal

Consolidar dados visuais e técnicos:
- **Se Post**: Integrar OCR e Design Audit do `Conteudo.md`.
- **Se Video**: Integrar Visual Framing (de frames) e Audio Landscape (de transcrição).
- Text Overlays (de Ladeira audit)
- Pacing data (de MrBeast audit)

### Step 3: Inserir Seções dos Auditores

Copiar e formatar as seções de:
- MrBeast Retention Audit (Step 2 do input)
- GaryVee Context Audit (Step 3 do input)
- Ladeira Copy & Persuasion Audit (Step 4 do input)

### Step 4: Gerar Blueprint de Modulação

Sintetizar insights dos 3 auditores em:
- **Script de Modulação** — Template fill-in-the-blanks para recriar o conteúdo
- **Visual Style Guide** — Fontes, cores, ritmo de corte, elementos visuais
- **Psychological Triggers Map** — Mapa consolidado de botões mentais

### Step 5: Compilar Scoring Matrix e Salvar

Gerar tabela consolidada:

| Dimensão | Score | Peso | Weighted |
|----------|-------|------|----------|
| Retention (MrBeast) | X/10 | 35% | X.X |
| Context (GaryVee) | X/10 | 30% | X.X |
| Copy (Ladeira) | X/10 | 35% | X.X |
| **TOTAL** | | | **X.X/10** |

Salvar como `Análise.md` na pasta do conteúdo.
Incluir transcrição completa na seção final.

## Acceptance Criteria

- [ ] **AC-1:** `Análise.md` gerado com todas as 10 seções do template `viral-deep-analysis-tmpl.md`.
- [ ] **AC-2:** Scoring Matrix com scores de todos os 3 auditores e score total ponderado.
- [ ] **AC-3:** Blueprint de Modulação contém Script Template + Visual Style Guide + Triggers Map.
- [ ] **AC-4:** Transcrição completa incluída na seção final do relatório.

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

- [x] `task_name` follows "Verb + Object" format
- [x] `status` is one of: pending | in_progress | completed
- [x] `responsible_executor` is clearly specified
- [x] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [x] `input` array has at least 1 item
- [x] `output` array has at least 1 item
- [x] `action_items` has clear, actionable steps
- [x] `acceptance_criteria` has measurable criteria

---

_Task Version: 1.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-24_
_Compliant: Yes_
