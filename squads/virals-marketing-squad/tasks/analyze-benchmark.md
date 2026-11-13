# Orquestrar Análise de Benchmark Criativo

**Task ID:** `analyze-benchmark`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 2.0.0
**Last Updated:** 2026-03-24
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (ETL Pipeline + Agent Audits)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Orquestrar Análise de Benchmark Criativo |
| **status** | `pending` |
| **responsible_executor** | @marketing-chief |
| **execution_type** | `Hybrid` |
| **input** | ["dossier_path", "content_index", "content_url"] |
| **output** | ["Pasta completa em services/ETL/outputs/Conteudo{N}-{titulo}/"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 5 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | HO-EP-003 |
| **Executor** | @marketing-chief |
| **Rationale** | Orquestra sub-tasks de múltiplos agentes especializados. Requer coordenação entre ETL (Worker), auditorias (Agent) e síntese final (Hybrid). |

## Overview

Task orquestradora que coordena o fluxo completo de análise de um único conteúdo de benchmark. Chama sequencialmente: extração ETL → auditoria MrBeast (retenção) → auditoria GaryVee (contexto) → auditoria Ladeira (copy) → síntese no Blueprint de Modulação. O output final é uma pasta completa em `services/ETL/outputs/`.

## Input

- **dossier_path** (string)
  - Description: Caminho do JSON de handoff em `.aiox/handoffs/` (gerado pelo ETL ou fornecido manualmente).
  - Required: Conditional (obrigatório se ETL já rodou; senão usa `content_url`)
- **content_url** (string)
  - Description: URL do conteúdo original (Instagram Reel, TikTok, YouTube, LinkedIn).
  - Required: Conditional (obrigatório se dossier não existe ainda)
- **content_index** (number)
  - Description: Número sequencial do conteúdo no batch (ex: 1, 2, 3...).
  - Required: Yes

## Output

- **Pasta de output** (directory)
  - Path: `services/ETL/outputs/Conteudo{content_index}-{titulo_sanitizado}/`
  - Contents:
    - `Transcrição.md` — Transcrição completa do conteúdo
    - `Benchmark.json` — Dados brutos do handoff ETL
    - `Screenshots/` — Frames capturados do vídeo
    - `Análise.md` — Relatório completo seguindo `viral-deep-analysis-tmpl.md`

## Action Items

### Step 1: Verificar ou Executar Extração ETL

Se `dossier_path` foi fornecido, ler o JSON e verificar assets.
Se apenas `content_url` foi fornecido, executar a task `benchmark-etl-extract.md` para gerar o dossier.

**Sub-task:** `benchmark-etl-extract.md` (condicionalmente)

### Step 2: Executar Auditoria MrBeast (Retenção)

Chamar `benchmark-mrbeast-audit.md` passando o dossier, transcrição e frames.
Coletar output: seção MrBeast do relatório com scores.

**Sub-task:** `benchmark-mrbeast-audit.md` → @mrbeast-mk

### Step 3: Executar Auditoria GaryVee (Contexto)

Chamar `benchmark-garyvee-audit.md` passando o dossier, transcrição e frames.
Coletar output: seção GaryVee do relatório com scores.

**Sub-task:** `benchmark-garyvee-audit.md` → @garyvee-mk

### Step 4: Executar Auditoria Ladeira (Copy & Persuasão)

Chamar `benchmark-ladeira-audit.md` passando o dossier e transcrição.
Coletar output: seção Copy & Persuasion do relatório com scores.

**Sub-task:** `benchmark-ladeira-audit.md` → @ladeira

### Step 5: Gerar Blueprint de Modulação (Síntese)

Chamar `benchmark-modulation-blueprint.md` passando outputs dos 3 auditores.
Gera o `Análise.md` final usando `viral-deep-analysis-tmpl.md`.

**Sub-task:** `benchmark-modulation-blueprint.md` → @marketing-chief

### Step 6: Organizar Output e Cleanup

- Verificar que pasta `Conteudo{N}-{titulo}/` contém todos os 4 artefatos
- Marcar handoff como `consumed: true`
- Deletar vídeo e áudio brutos de `.aiox/tmp/`
- Validar contra `benchmark-analysis-checklist.md`

## Acceptance Criteria

- [ ] **AC-1:** Pasta de output contém exatamente: `Transcrição.md`, `Benchmark.json`, `Screenshots/`, `Análise.md`.
- [ ] **AC-2:** `Análise.md` segue 100% das seções do template `viral-deep-analysis-tmpl.md`.
- [ ] **AC-3:** Cada auditoria (MrBeast, GaryVee, Ladeira) gerou score numérico (1-10).
- [ ] **AC-4:** Handoff JSON marcado como `consumed: true`.
- [ ] **AC-5:** Vídeo/áudio brutos deletados do temp após processamento.

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

_Task Version: 2.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-24_
_Compliant: Yes_
