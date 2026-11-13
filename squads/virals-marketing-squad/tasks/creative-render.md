# Render do Criativo (VVS Playwright + Pexels) — 1080x1350

**Task ID:** `creative-render`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` — PHASE-6 (fatal)

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Renderizar Slides (VVS) e Empacotar Output |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Worker` |
| **executor_script** | `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` |
| **input** | ["brief-v5-*.yaml (aprovado)", "render service em http://localhost:3001", "PEXELS_API_KEY"] |
| **output** | ["outputs/carousels/{slug}/slide_*.png|.webp", "manifest.json"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 5 criteria |
| **viewport** | `(1080, 1350)` — 4:5 vertical (grade do Instagram) |
| **fatal** | true |

## Princípio

**Render é o artefato final** — fatal por definição. Formato vertical 4:5 (1080×1350) alinhado à grade 3:4 do Instagram (a grade recorta levemente o topo/base; o conteúdo principal permanece centrado em zona segura).

## Input

- **brief-v5-*.yaml** — pós `creative-quality-gate`.
- **Render service** — Next.js em http://localhost:3001 (pre-check ANTES de gastar chamadas).
- **PEXELS_API_KEY** — no `.env` (gitignored).

## Output

- **outputs/carousels/{slug}/** — slide_NN.png, slide_NN.webp, manifest.json.
- **Editor URL** — http://localhost:3001/editor?brief={slug}.

## Action Items

### Step 1: Pre-check render service
GET http://localhost:3001 com timeout=3s. Se OFF ⇒ abortar com instrução "rodar `npm run dev -- -p 3001`".

### Step 2: Resolver template
Honrar `--template` se passado. Caso contrário, ler `archetype` do brief.

### Step 3: Curar imagem (Pexels default)
Por slide, gerar/escolher `pexels_query`, baixar foto orientation-aware (HOOK ⇒ portrait; demais ⇒ landscape). `image_mode=brand` pula. `image_mode=ai` usa `casey_ai_image_service`.

### Step 4: Render via VVSRenderService
Para cada slide, montar props (templateId, slide_n, totalSlides, headline, sub_headline, body_text, mainObjectImage, accent_color, overrides do Editor). `render_component(viewport=(1080,1350))`. Esconder `nextjs-portal` e dev indicator.

### Step 5: Empacotar
WebP via PIL. Manifest com paths + texto + tema central + brief path. Limpar slides antigos (`slide_NN`+) acima do N atual.

## Acceptance Criteria

- [ ] **AC-1:** Pre-check do render service antes de gastar chamadas externas.
- [ ] **AC-2:** Todos os N slides renderizados em 1080×1350.
- [ ] **AC-3:** Sem vazamento do dev indicator Next.js nas capturas.
- [ ] **AC-4:** Manifest com paths, headline, body e link para Editor.
- [ ] **AC-5:** Falha do orchestrator aborta a pipeline (fatal=true).

---

_Compliant: Yes_
