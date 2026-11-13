# Quality Gate (Self-Healing) C1-C7

**Task ID:** `creative-quality-gate`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` — PHASE-5 (não-fatal)

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Avaliar Criativo Contra Checklist C1-C7 (Self-Healing) |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **executor_script** | `squads/virals-marketing-squad/scripts/quality_gate.py` |
| **checklist_source** | `checklists/creative-quality-checklist.md` |
| **input** | ["brief-v5-*.yaml (após recast)"] |
| **output** | ["quality.json", "content_data corrigido (se reprovou)"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 4 criteria |
| **max_iterations** | 3 |
| **fatal** | false |

## Princípio

**Self-healing objetivo.** Reprovar APENAS violações CLARAS e OBJETIVAS — evita loops sem convergência. Em até 3 iterações, converge ou emite `WARN_MAX_ITER`.

## Input

- **brief-v5-*.yaml** — após `creative-recast`.
- **checklists/creative-quality-checklist.md** — C1-C7.

## Output

- **quality.json** — verdict por critério, iterações, motivos.
- **content_data** — corrigido em loco se gate reprovou e LLM convergiu.

## Action Items

### Step 1: Carregar checklist
Ler `creative-quality-checklist.md`. Cada item C1..C7 vira regra avaliável.

### Step 2: Avaliar
LLM avalia content_data contra cada critério. Verdict por critério: PASS|FAIL com motivo.

### Step 3: Self-healing loop (max 3)
Se algum critério FAIL ⇒ gerar prompt corretivo direcionado e reescrever. Reavaliar. Repetir até PASS em todos ou atingir 3 iterações.

### Step 4: Persistir
Salvar `quality.json` (iterações, verdicts finais, warnings). Em caso de não-convergência, marcar `WARN_MAX_ITER` (pipeline segue para render).

## Acceptance Criteria

- [ ] **AC-1:** C1-C7 lidos de `creative-quality-checklist.md` (não hardcoded).
- [ ] **AC-2:** Self-healing loop converge ou emite `WARN_MAX_ITER` em ≤3 iterações.
- [ ] **AC-3:** `quality.json` registra cada iteração + verdicts.
- [ ] **AC-4:** Falha do LLM **não** derruba o pipeline.

---

_Compliant: Yes_
