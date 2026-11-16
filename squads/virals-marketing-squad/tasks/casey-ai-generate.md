# Gerar Imagem com IA (FLUX/Diffusers)

**Task ID:** `casey-ai-generate`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Gerar Imagem com IA |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **input** | ["prompt", "negative_prompt", "format_preset", "model_preference", "seed (opcional)"] |
| **output** | ["generated_image (PNG)", "generation_metadata (JSON)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | true |

## Input

- **prompt** (string): Prompt descritivo em inglês para o modelo. Required: Yes
- **negative_prompt** (string): O que evitar na geração. Required: No (padrão: "blurry, low quality, watermark")
- **format_preset** (string): `"1:1"`, `"4:5"`, `"9:16"`, `"16:9"`. Required: Yes
- **model_preference** (enum): `"flux-klein"` | `"sdxl-local"` | `"hf-api"` | `"together-ai"`. Required: No (auto-detect)
- **seed** (integer): Seed para reprodutibilidade. Required: No

## Output

- **generated_image** (PNG): Imagem gerada nas dimensões do formato alvo
- **generation_metadata** (JSON): Model usado, prompt, seed, dimensões, tempo de geração

## Decision Tree — Seleção de Modelo

```
GPU disponível com ≥13GB VRAM?
  ├── SIM → FLUX.2 [klein] local (melhor qualidade, mais rápido)
  └── NÃO → GPU com ≥8GB VRAM?
              ├── SIM → SDXL via HuggingFace Diffusers local
              └── NÃO → HuggingFace Inference API free tier
                         └── Quota esgotada? → Together.ai free tier
```

## Action Items

### Step 1: Detectar Ambiente e Selecionar Modelo
Verificar GPU disponível (nvidia-smi ou torch.cuda.is_available()).
Selecionar modelo conforme decision tree acima.
Exibir: "Modelo selecionado: {model}. Iniciando geração..."

### Step 2: Preparar Dimensões
Converter format_preset para pixels: 1:1→1080x1080, 4:5→1080x1350, 9:16→1080x1920, 16:9→1920x1080.
Ajustar para múltiplos de 64 (requisito dos modelos de difusão).

### Step 3: Executar Geração
Iniciar pipeline do modelo selecionado com prompt, negative_prompt, dimensões e seed.
Mostrar progress bar durante inferência.
Gerar 2 variações se seed não especificado (para escolha).

### Step 4: Pós-Processamento
Upscale se necessário para atingir 1080px mínimo.
Aplicar sharpening leve via OpenCV se imagem parecer suave.
Converter para PNG com qualidade máxima.

### Step 5: Salvar e Documentar
Salvar em `outputs/ai-generated/{slug}-{seed}.png`.
Gerar generation_metadata.json com model, prompt, seed, tempo, dimensões.

## Acceptance Criteria

- [ ] **AC-1:** Imagem gerada nas dimensões corretas do formato alvo
- [ ] **AC-2:** Qualidade visual adequada (sem artefatos graves, sem watermarks)
- [ ] **AC-3:** generation_metadata.json salvo para reprodutibilidade
- [ ] **AC-4:** Fallback de modelo documentado se modelo preferido indisponível

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
