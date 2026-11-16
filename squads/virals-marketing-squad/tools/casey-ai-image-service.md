# Casey AI Image Service Tool

**Tool ID:** `casey-ai-image-service`
**Agente:** @casey-neistat-img
**Versão:** 1.0.0

## Descrição

Serviço unificado de geração de imagens via IA com detecção automática de ambiente
e fallback entre modelos. Zero configuração manual — detecta GPU e seleciona o melhor
modelo disponível automaticamente.

---

## Decision Tree de Modelos

```
GPU disponível?
  ├── SIM → VRAM ≥ 13GB?
  │           ├── SIM → FLUX.2 [klein] local (4B/9B) — melhor qualidade
  │           └── NÃO → VRAM ≥ 8GB?
  │                       ├── SIM → SDXL via HuggingFace Diffusers local
  │                       └── NÃO → CPU only → HF Inference API (free)
  └── NÃO → HF Inference API free tier
              └── Quota esgotada? → Together.ai free tier
```

---

## API Unificada

### `generate(prompt: str, config: dict) → GenerationResult`

```python
from tools.casey_ai_image_service import generate

result = generate(
    prompt="A sleek modern product on white background, studio photography, 4k",
    config={
        "negative_prompt": "blurry, watermark, text, low quality",
        "width": 1080,
        "height": 1080,
        "model_preference": "auto",  # auto | flux-klein | sdxl-local | hf-api | together-ai
        "seed": None,               # None = aleatório
        "steps": 28,                # passos de difusão (padrão: 28)
        "guidance_scale": 7.5       # CFG scale
    }
)

result.image.save("output/generated.png")
print(f"Model used: {result.model_used}")
print(f"Seed: {result.seed}")
print(f"Generation time: {result.time_s}s")
```

---

## Configuração de Modelos

### FLUX.2 [klein] Local

```python
# Requer: pip install diffusers transformers accelerate
# VRAM mínima: 13GB para variante 4B, ~24GB para 9B

config = {
    "model": "black-forest-labs/FLUX.1-schnell",  # ou FLUX.1-dev
    "dtype": "bfloat16",
    "device": "cuda"
}
```

### SDXL via HuggingFace Diffusers

```python
# Requer: pip install diffusers torch
# VRAM mínima: 8GB

config = {
    "model": "stabilityai/stable-diffusion-xl-base-1.0",
    "dtype": "float16",
    "device": "cuda"
}
```

### HuggingFace Inference API (free tier)

```python
# Zero setup — apenas token HF
# Criar token gratuito em: huggingface.co/settings/tokens

import os
os.environ["HF_TOKEN"] = "hf_..."  # configurar em .env

config = {
    "api_url": "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    "headers": {"Authorization": f"Bearer {os.environ['HF_TOKEN']}"}
}
```

### Together.ai (free tier — $25 créditos no onboarding)

```python
# pip install together
import os
os.environ["TOGETHER_API_KEY"] = "..."  # configurar em .env

config = {
    "model": "black-forest-labs/FLUX.1-schnell-Free",
    "provider": "together"
}
```

---

## Variáveis de Ambiente Necessárias

```env
# .env (na raiz do projeto)
HF_TOKEN=hf_...                    # HuggingFace token (gratuito)
TOGETHER_API_KEY=...               # Together.ai key (gratuito no onboarding)
REPLICATE_API_TOKEN=...            # Replicate (opcional, backup)
AI_MODEL_PREFERENCE=auto           # auto | flux-klein | sdxl-local | hf-api | together-ai
AI_OUTPUT_DIR=outputs/ai-generated/
```

---

## Dependências Python

```txt
diffusers>=0.27.0
transformers>=4.38.0
accelerate>=0.27.0
torch>=2.1.0
Pillow>=10.0.0
together>=1.1.0
requests>=2.31.0
python-dotenv>=1.0.0
```

---

_Tool Version: 1.0.0_
_Last Updated: 2026-05-10_
