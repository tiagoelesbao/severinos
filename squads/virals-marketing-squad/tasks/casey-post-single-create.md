# Criar Post Único de Alto Impacto Visual

**Task ID:** `casey-post-single-create`
**Pattern:** VM-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Post Único de Alto Impacto Visual |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Hybrid` |
| **input** | ["post_brief", "brand_config", "ai_prompt (opcional)"] |
| **output** | ["post_image (PNG/WebP)", "export_manifest (JSON)"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 5 criteria |
| **elicit** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | VM-EP-003 |
| **Executor** | @casey-neistat-img |
| **Rationale** | Requer decisão criativa humana no briefing + execução automatizada via Pillow/IA |

## Input

- **post_brief** (object)
  - Description: Briefing do post (tema, headline, CTA, público-alvo, referências visuais)
  - Required: Yes
- **brand_config** (path)
  - Description: Caminho para `data/clients/<slug>/brand-config.yaml` (resolvido via --client) com paleta, fontes e proporções
  - Required: Yes
- **ai_prompt** (string)
  - Description: Prompt para geração de imagem base com FLUX.2/Diffusers (opcional — usar se não houver imagem fornecida)
  - Required: No

## Output

- **post_image** (file)
  - Description: Imagem final do post em PNG e WebP, nos formatos configurados (1:1, 4:5, 9:16)
- **export_manifest** (JSON)
  - Description: Manifesto com paths de output, dimensões, brand tokens aplicados e timestamp

```json
{
  "task": "casey-post-single-create",
  "output_dir": "outputs/{client_slug}/posts/{slug}/",
  "formats": {
    "1:1": "post_1080x1080.png",
    "4:5": "post_1080x1350.png",
    "9:16": "post_1080x1920.png"
  },
  "brand_tokens_applied": ["primary_color", "font_headline", "logo_position"],
  "ai_generated": false,
  "timestamp": "ISO8601"
}
```

## Action Items

### Step 1: Ingerir Briefing e Validar Brand Config

Ler o `post_brief` e confirmar os campos obrigatórios: tema, headline, CTA.
Carregar o brand-config do cliente (`clients/<slug>/brand-config.yaml`) e validar: paleta de cores, fonte headline, fonte body, tamanhos de formato ativados.
Se brand_config ausente: solicitar ao usuário antes de prosseguir.

### Step 2: Definir Composição Visual

Decidir layout do post baseado no tema:
- **Imagem-first:** imagem gerada/fornecida ocupa 70-80% do frame, texto mínimo
- **Texto-over-imagem:** fundo colorido ou gradiente com texto centralizado
- **Split layout:** metade imagem, metade texto com cor de marca
Escolher tipografia conforme brand_config: headline em fonte primária, corpo em fonte secundária.

### Step 3: Gerar ou Processar Imagem Base

**Se ai_prompt fornecido:**
- Verificar GPU disponível → FLUX.2 [klein] local (≥13GB VRAM)
- Fallback: HuggingFace Inference API free tier (zero setup)
- Fallback 2: Together.ai API free tier
- Gerar imagem com dimensões nativas do formato alvo

**Se imagem fornecida:**
- Validar dimensões mínimas (1080px no menor lado)
- Aplicar crop/resize mantendo composition principal
- Ajustar cor via OpenCV para alinhar com brand palette

### Step 4: Composição Final com Pillow

Montar layers na ordem:
1. Background (imagem ou cor de marca)
2. Overlay de cor semi-transparente para legibilidade (se necessário)
3. Headline — fonte, tamanho e posição do brand_config
4. Body text (opcional)
5. CTA element (botão visual, seta, tag)
6. Logo (posição e opacidade do brand_config)
7. Elementos vetoriais via PyCairo (bordas, divisores, ícones)

### Step 5: Exportar em Todos os Formatos

Usando dimensões do `casey-format-presets.yaml`:
- Gerar 1:1 (1080x1080) — crop centralizado
- Gerar 4:5 (1080x1350) — crop com safe zones
- Gerar 9:16 (1080x1920) — versão stories (adicionar elementos topo/base)
- Salvar PNG (qualidade máxima) e WebP (web-optimized)
- Gerar export_manifest.json com todos os paths

### Step 6: Validar Output

Abrir imagem gerada e validar:
- Legibilidade do texto em fundo (contrast ratio ≥ 4.5:1)
- Logo visível e proporcional
- Nenhum elemento cortado nos formatos exportados
- Tamanho de arquivo: PNG ≤ 2MB, WebP ≤ 500KB

## Acceptance Criteria

- [ ] **AC-1:** Post gerado em todos os formatos configurados (mín. 1:1 e 4:5)
- [ ] **AC-2:** Brand config aplicado — cores, fontes e logo corretos
- [ ] **AC-3:** Headline legível com contrast ratio adequado (≥ 4.5:1)
- [ ] **AC-4:** export_manifest.json gerado com todos os paths de output
- [ ] **AC-5:** Nenhum elemento visual cortado em nenhum formato exportado

## Validation Checklist (VM-TP-001)

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
_Pattern: VM-TP-001_
_Last Updated: 2026-05-10_
_Compliant: Yes_
