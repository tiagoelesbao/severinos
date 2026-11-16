# WF-DESIGN-CREATIVE-001: Pipeline de Modelagem de Criativo (Single/Carousel) a partir de Benchmark VVS

> Workflow AIOX formal do comando `*design-creative` do `@marketing-chief`.
> Substitui o encadeamento implícito que vivia apenas em `design_creative.py`.
> Task-first: as 6 etapas abaixo são tasks formais em `tasks/creative-*.md` e o
> executor padrão de cada etapa é o script equivalente em `scripts/`.

```yaml
workflow:
  id: wf-design-creative
  name: "Design Creative (Single/Carousel) — Modelagem a partir de Benchmark VVS"
  version: "1.0"
  orchestrator: "marketing-chief"
  executor_agent: "casey-neistat-img"
  duration: "5-12 min por criativo"
  description: |
    Pipeline unificado de produção de criativo (Single/Carousel) a partir
    de um benchmark VVS (Transcrição.md + Análise.md + Screenshots). Encadeia
    6 etapas — 1 e 6 são fatais; 2-5 são não-fatais com degradação graciosa
    (recast pendente, plano ausente etc.).

    Anti-padrão IMPEDIDO: copiar literalmente o benchmark. O recast mantém o
    TEMA CENTRAL e a NOTÍCIA, mas adapta hooks/voz para a Virals.

    Output: outputs/carousels/{slug}/ (PNG + WebP + manifest) + brief versionado
    em squads/virals-marketing-squad/data/brief-v5-*.yaml.

  best_for:
    - "Modelagem de criativo a partir de um benchmark monitorado"
    - "Carrossel ou Post Único derivado de notícia/insight referenciado"
    - "Produção em escala mantendo o tom de voz Virals"

  preconditions:
    - "Benchmark VVS válido (Transcrição.md, Análise.md, Screenshots/)"
    - "Render service Next.js no ar em http://localhost:3001"
    - "Cliente alvo cadastrado em data/clients/_registry.yaml (default: virals)"
    - "brand-identity do cliente em data/clients/<slug>/brand-identity.yaml"
    - "brand-config do cliente em data/clients/<slug>/brand-config.yaml"

  inputs:
    benchmark_dir:
      type: path
      required: true
      description: "Diretório do benchmark VVS (ex.: workspaces/.../benchmark/01-handle-hash/)"
    ctype:
      type: enum[single, carousel]
      required: true
      description: "Formato estrutural (slide_count): 1 = single, ≥3 = carousel"
    image_mode:
      type: enum[pexels, brand, ai]
      default: pexels
      description: "Fonte das imagens contextuais dos slides"
    template:
      type: enum[carousel-slide, quote-slide, single-post, '']
      default: ''
      description: "Override de template. Vazio = classificador decide (heurística por arquétipo)"

  outputs:
    brief: "squads/virals-marketing-squad/data/brief-v5-[single-]{slug}.yaml"
    artifact: "outputs/carousels/{slug}/ (slide_*.png|.webp + manifest.json)"
    quality_log: "outputs/carousels/{slug}/quality.json"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1: Modelagem (extração faithful do benchmark)
# ═══════════════════════════════════════════════════════════════════════════════
phases:
  - id: PHASE-1-MODELING
    name: "Modelagem — Extração Faithful do Benchmark"
    tier: 1
    fatal: true
    description: |
      Lê os 3 inputs do benchmark (Transcrição.md, Análise.md, Screenshots/)
      e produz um brief versionado (brief-v5-*.yaml) com o conteúdo extraído
      por slide. Sem fallback silencioso — se a extração falhar, o pipeline
      aborta antes de gastar chamadas de IA.

    tasks:
      - task_file: creative-modeling.md
        agent: casey-neistat-img
        executor: squads/virals-marketing-squad/scripts/deep_modeler.py
        required: true
        step: 1
        description: "Extrair conteúdo por slide + arquétipo + métricas de texto"
        output: "data/brief-v5-[single-]{slug}.yaml"

    checkpoint:
      criteria:
        - "Todos os 3 inputs do benchmark foram lidos sem fallback?"
        - "content_data tem N slides preenchidos (N = ctype)?"
        - "archetype foi classificado (news/quote/single)?"
      human_review: false
      message: "Validar brief antes da análise."

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2: Análise Holística do Benchmark
# ═══════════════════════════════════════════════════════════════════════════════
  - id: PHASE-2-ANALYSIS
    name: "Análise Holística — Por que esse criativo funciona"
    tier: 1
    fatal: false
    description: |
      Avalia o benchmark inteiro (não slide a slide): hook, mecânica de
      retenção, identidade, redundâncias, gatilhos psicológicos. Output
      é injetado no brief para informar o planejamento.

    tasks:
      - task_file: creative-analysis.md
        agent: casey-neistat-img
        executor: squads/virals-marketing-squad/scripts/analyze_benchmark.py
        required: false
        step: 2
        description: "Análise holística do benchmark (não slide-a-slide)"
        output: "analysis no brief-v5-*.yaml"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 3: Planejamento do Post Virals (Plano de Conteúdo)
# ═══════════════════════════════════════════════════════════════════════════════
  - id: PHASE-3-PLANNING
    name: "Planejamento — Plano de Conteúdo do Post Virals"
    tier: 1
    fatal: false
    description: |
      Decide quais slides existem no post Virals (cortes/fusões/CTA), o
      arquétipo final e o template. Pode reduzir N (ex.: cortar slide
      redundante). NÃO pode reescrever o tema central.

    tasks:
      - task_file: creative-planning.md
        agent: casey-neistat-img
        executor: squads/virals-marketing-squad/scripts/plan_creative.py
        required: false
        step: 3
        description: "Plano de Conteúdo (slides finais + arquétipo + cortes)"
        output: "plan no brief-v5-*.yaml"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 4: Recast — Produção na Voz Virals
# ═══════════════════════════════════════════════════════════════════════════════
  - id: PHASE-4-RECAST
    name: "Recast — Voz Virals (mantém TEMA, adapta HOOKS)"
    tier: 1
    fatal: false
    description: |
      Reescreve headline/sub_headline/body_text em PT-BR no tom Virals.
      MANTÉM o tema central, a notícia, os fatos e o ângulo do benchmark —
      adapta hooks, voz e CTA. Modo plan-aware se houver plano (PHASE-3).

      Cascata de providers (free → premium): OpenRouter free models →
      Gemini → OpenAI. 401/403/429 pula provider.

    tasks:
      - task_file: creative-recast.md
        agent: casey-neistat-img
        executor: squads/virals-marketing-squad/scripts/recast_engine.py
        required: false
        step: 4
        description: "Recast plan-aware na voz Virals; mantém tema central"
        output: "content_data reescrito no brief-v5-*.yaml"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 5: Quality Gate (Self-Healing)
# ═══════════════════════════════════════════════════════════════════════════════
  - id: PHASE-5-QUALITY-GATE
    name: "Quality Gate — Checklist C1-C7 + Self-Healing (máx. 3 iterações)"
    tier: 1
    fatal: false
    description: |
      Avalia o conteúdo contra o checklist creative-quality-checklist.md
      (C1-C7). Quando reprova, gera prompt corretivo e re-executa até
      max_iterations=3. Converge ou emite WARN_MAX_ITER.

    tasks:
      - task_file: creative-quality-gate.md
        agent: casey-neistat-img
        executor: squads/virals-marketing-squad/scripts/quality_gate.py
        checklist: checklists/creative-quality-checklist.md
        required: false
        step: 5
        description: "C1-C7 + loop de auto-correção até 3 iterações"
        output: "quality.json + conteúdo aprovado/WARN no brief"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 6: Render (VVS + Pexels)
# ═══════════════════════════════════════════════════════════════════════════════
  - id: PHASE-6-RENDER
    name: "Render — VVS Playwright + Pexels (1080x1350, vertical 4:5)"
    tier: 1
    fatal: true
    description: |
      Renderiza os slides via Next.js (apps/creative-design) com Playwright,
      no formato vertical 4:5 alinhado à grade do Instagram. Faz curadoria
      de imagem Pexels por slide. Hide do dev indicator e fundo transparente.

    tasks:
      - task_file: creative-render.md
        agent: casey-neistat-img
        executor: squads/virals-marketing-squad/scripts/orchestrate_carousel.py
        required: true
        step: 6
        description: "Render Playwright dos N slides (1080x1350) + WebP + manifest"
        output: "outputs/carousels/{slug}/ + Editor URL"

    checkpoint:
      criteria:
        - "Todos os N slides renderizados em 1080x1350?"
        - "Manifest.json gerado com paths?"
        - "Editor disponível em /editor para ajuste fino?"
      human_review: true
      message: "Editor http://localhost:3001/editor — ajuste fino antes do upload."

# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETION SIGNALS
# ═══════════════════════════════════════════════════════════════════════════════
completion_signal: "<promise>COMPLETE:DESIGN-CREATIVE</promise>"
checkpoint_signal: "<promise>CHECKPOINT:PHASE-{{phase_id}}</promise>"
blocked_signal: "<promise>BLOCKED:DESIGN-CREATIVE-GARGALO</promise>"

failure_modes:
  PHASE-1-MODELING:
    on_failure: abort
    rationale: "Sem extração faithful, não há motor — não desperdiça LLM."
  PHASE-2-ANALYSIS:
    on_failure: continue
    rationale: "Análise é opcional; brief segue com extração da PHASE-1."
  PHASE-3-PLANNING:
    on_failure: continue
    rationale: "Sem plano, recast cai no modo legacy 1:1."
  PHASE-4-RECAST:
    on_failure: continue
    rationale: "Render usa o conteúdo de referência (sinaliza recast pendente)."
  PHASE-5-QUALITY-GATE:
    on_failure: continue
    rationale: "WARN_MAX_ITER ou erro de gate não derruba o render."
  PHASE-6-RENDER:
    on_failure: abort
    rationale: "Sem render, não há artefato — aborta para correção do app."

outputs:
  Per_Creative:
    - "brief-v5-[single-]{slug}.yaml — brief versionado com plan/quality"
    - "outputs/carousels/{slug}/slide_*.png — N slides 1080x1350"
    - "outputs/carousels/{slug}/slide_*.webp"
    - "outputs/carousels/{slug}/manifest.json"
    - "Editor: http://localhost:3001/editor?brief={slug}"

quality_checklist:
  Modelagem:
    - "[ ] 3 inputs lidos sem fallback silencioso"
    - "[ ] Conteúdo por slide preserva o tema central"
  Recast:
    - "[ ] PT-BR; sem watermark de terceiros"
    - "[ ] Mantém a notícia/insight do benchmark"
    - "[ ] Hooks otimizados; voz Virals"
  Gate:
    - "[ ] C1-C7 do checklist aprovados (ou WARN documentado)"
  Render:
    - "[ ] Formato 1080x1350 (4:5) em todos os slides"
    - "[ ] Sem vazamento de dev indicator Next.js"

metadata:
  version: "1.0"
  framework: "AIOX Workflow + VVS Render"
  created: "2026-05-19"
  primary_use_case: "Modelagem de criativo a partir de benchmark VVS"
  related_workflows:
    - "casey-carousel-production.yaml"
    - "benchmark-creative-analysis.yaml"
  related_checklists:
    - "creative-quality-checklist.md"
  related_tasks:
    - "creative-modeling.md"
    - "creative-analysis.md"
    - "creative-planning.md"
    - "creative-recast.md"
    - "creative-quality-gate.md"
    - "creative-render.md"
  related_templates:
    - "modeled-carousel-slide.md"
    - "quote-slide.md"
    - "single-post-slide.md"
```
