# Reescrever na Voz Virals (Recast — mantém tema, adapta hooks)

**Task ID:** `creative-recast`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` — PHASE-4 (não-fatal)

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Reescrever Conteúdo na Voz Virals (Recast) |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **executor_script** | `squads/virals-marketing-squad/scripts/recast_engine.py` |
| **input** | ["brief-v5-*.yaml (com plan)", "data/clients/<slug>/brand-identity.yaml"] |
| **output** | ["content_data reescrito no brief"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 5 criteria |
| **fatal** | false |

## Princípio (NÃO-NEGOCIÁVEL)

**Modelar, não copiar.** Mantém:
- ✅ Tema central, notícia, fatos, ângulo
- ✅ Estrutura por slide (1:1 ou plan-aware)

Adapta:
- ✅ Hooks, sub_headlines, body_text (PT-BR, voz Virals)
- ✅ CTA do criativo

PROIBIDO:
- ❌ Inglês ou outro idioma
- ❌ Watermark de terceiros (`@GARYVEE`, etc.)
- ❌ Substituir a notícia por insight genérico Virals

## Input

- **brief-v5-*.yaml** — após `creative-planning`.
- **data/clients/<slug>/brand-identity.yaml** — Oferta, Avatar, Voz, Restrições.

## Output

- **content_data** reescrito no brief, mantendo o tema do benchmark e a voz Virals.

## Action Items

### Step 1: Identidade do cliente
Resolver o cliente via `--client` (ou `client_slug` do brief) e carregar `clients/<slug>/brand-identity.yaml`. Compor section "voz/restrições" do prompt a partir dessa identidade. Default = `virals`.

### Step 2: Modo (plan-aware vs legacy)
Se `plan` no brief ⇒ `build_plan_execution_prompt` (final_slides). Senão ⇒ recast 1:1 slide-a-slide.

### Step 3: Provider cascade
OpenRouter free models (`openai/gpt-oss-120b:free`, `deepseek/deepseek-v4-flash:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `z-ai/glm-4.5-air:free`) → Gemini → OpenAI. 401/403/429 ⇒ pular para o próximo.

### Step 4: Aplicar e validar
`apply_plan_execution` (ou apply 1:1). Validar PT-BR + ausência de watermark. Em caso de violação, marcar `recast_pending` no brief.

## Acceptance Criteria

- [ ] **AC-1:** Tema central preservado em todos os slides reescritos.
- [ ] **AC-2:** PT-BR; sem watermark de terceiros.
- [ ] **AC-3:** Hooks/sub_headlines adaptados à voz Virals.
- [ ] **AC-4:** Cascata de providers respeitada; primeiro 200 OK ganha.
- [ ] **AC-5:** Falha total ⇒ `recast_pending=true` (pipeline segue).

---

_Compliant: Yes_
