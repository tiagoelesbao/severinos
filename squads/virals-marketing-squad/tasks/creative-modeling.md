# Modelar Benchmark VVS em Brief Versionado

**Task ID:** `creative-modeling`
**Pattern:** VM-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` — PHASE-1 (fatal)

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Modelar Benchmark VVS em Brief Versionado |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Worker` |
| **executor_script** | `squads/virals-marketing-squad/scripts/deep_modeler.py` |
| **input** | ["benchmark_dir (Transcrição.md + Análise.md + Screenshots/)", "ctype (single|carousel)"] |
| **output** | ["data/brief-v5-[single-]{slug}.yaml"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |
| **fatal** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Worker |
| **Pattern** | VM-EP-004 |
| **Executor** | `python squads/virals-marketing-squad/scripts/deep_modeler.py <benchmark_dir> <single\|carousel>` |
| **Rationale** | Extração determinística — sem julgamento criativo nesta fase |

## Princípio (NÃO-NEGOCIÁVEL)

**FAITHFUL EXTRACTION.** Sem fallback silencioso. Os 3 inputs do benchmark precisam existir e ser lidos integralmente. Se qualquer um faltar, a task aborta — não inventa, não mascara.

## Input

- **benchmark_dir** (path)
  - Description: Diretório do benchmark VVS (do `*creative-benchmark`)
  - Required: Yes
  - Sub-arquivos esperados: `Transcrição.md`, `Análise.md`, `Screenshots/`
- **ctype** (enum)
  - Description: Estrutura — `single` (1 slide) ou `carousel` (≥3)
  - Required: Yes

## Output

- **brief-v5-[single-]{slug}.yaml** (file)
  - Description: Brief versionado com `content_data` por slide, `archetype`, `text_metrics`

## Action Items

### Step 1: Validar os 3 inputs
Confirmar que `Transcrição.md`, `Análise.md` e `Screenshots/` existem em `benchmark_dir`. Abortar com erro descritivo se algum faltar.

### Step 2: Parsear conteúdo
Aplicar parser locale-agnostic (`parse_labeled_items` — Format A inline + Format B sub-bullet). Coletar headline, sub_headline, body_text por slide.

### Step 3: Heurística de arquétipo
Classificar `archetype` (news/quote/single) com base no formato (slide_count) + sinais textuais. Para `single`: ctype=single ⇒ archetype heurístico (single/quote).

### Step 4: Gravar brief
Serializar para `data/brief-v5-[single-]{slug}.yaml`. Incluir `text_metrics`, paths originais e `archetype`.

## Acceptance Criteria

- [ ] **AC-1:** Os 3 inputs foram lidos sem fallback silencioso.
- [ ] **AC-2:** `content_data` tem N entradas (N = ctype: 1 para single, ≥3 para carousel).
- [ ] **AC-3:** `archetype` foi classificado.
- [ ] **AC-4:** Brief gravado em `data/brief-v5-[single-]{slug}.yaml`.

---

_Compliant: Yes_
