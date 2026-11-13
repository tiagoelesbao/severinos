# Analisar Holisticamente o Benchmark

**Task ID:** `creative-analysis`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` — PHASE-2 (não-fatal)

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Analisar Holisticamente o Benchmark |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **executor_script** | `squads/virals-marketing-squad/scripts/analyze_benchmark.py` |
| **input** | ["brief-v5-*.yaml (PHASE-1)"] |
| **output** | ["analysis no brief-v5-*.yaml"] |
| **action_items** | 3 steps |
| **acceptance_criteria** | 3 criteria |
| **fatal** | false |

## Princípio

**Análise holística**, não slide-a-slide. Olha o criativo como um todo: hook, mecânica de retenção, identidade, gatilhos, redundâncias.

## Input

- **brief-v5-*.yaml** — saída da `creative-modeling`.

## Output

- **analysis** (campo no brief) — JSON com: hook_strength, retention_mechanic, brand_identity, psych_triggers[], redundancies[], key_insights[].

## Action Items

### Step 1: Carregar brief + Análise.md
Ler `analysis_source` + brief-v5-*.yaml. Não consultar Transcrição.md de novo — análise é sobre o que o brief já modelou.

### Step 2: Chamar LLM
Provider cascade (OpenRouter free → Gemini → OpenAI). Prompt holístico — proibir análise por slide.

### Step 3: Salvar
Anexar `analysis` ao brief. Se LLM falhar: não-fatal, brief segue sem `analysis`.

## Acceptance Criteria

- [ ] **AC-1:** `analysis` no brief (ou flag `analysis_skipped: true` com motivo).
- [ ] **AC-2:** Falha de LLM **não** derruba o pipeline.
- [ ] **AC-3:** Output respeita schema (hook, retention, triggers, redundancies).

---

_Compliant: Yes_
