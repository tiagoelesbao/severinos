# Planejar Post Virals (Plano de Conteúdo)

**Task ID:** `creative-planning`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` — PHASE-3 (não-fatal)

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Planejar Post Virals a partir do Brief Analisado |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **executor_script** | `squads/virals-marketing-squad/scripts/plan_creative.py` |
| **input** | ["brief-v5-*.yaml (com analysis)"] |
| **output** | ["plan no brief-v5-*.yaml"] |
| **action_items** | 3 steps |
| **acceptance_criteria** | 4 criteria |
| **fatal** | false |

## Princípio

**Plano, não cópia.** Pode cortar slide redundante, fundir, reposicionar CTA. NÃO pode trocar a notícia/tema central.

## Input

- **brief-v5-*.yaml** — após `creative-analysis`.

## Output

- **plan** (campo no brief): final_slides[] (com role: hook/value/cta), cuts[], archetype_final, template_id.

## Action Items

### Step 1: LLM plan-aware
Prompt ancorado em "manter tema central + cortar redundância". Output JSON estrito.

### Step 2: Decidir template
Para arquétipo `quote` ⇒ `quote-slide`. Caso contrário, classificador estrutural (slide_count == 1 ⇒ single-post; ≥3 ⇒ carousel-slide).

### Step 3: Anexar ao brief
Persistir `plan` no brief. Falha do LLM ⇒ brief segue sem plano (recast cai no modo legacy 1:1).

## Acceptance Criteria

- [ ] **AC-1:** `plan` no brief (ou flag `plan_skipped: true`).
- [ ] **AC-2:** `final_slides` mantém o tema central da Análise.md.
- [ ] **AC-3:** `template_id` resolvido respeitando override do usuário.
- [ ] **AC-4:** Falha não derruba pipeline.

---

_Compliant: Yes_
