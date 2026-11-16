# Reformatar e Exportar para Todos os Formatos de Plataforma

**Task ID:** `casey-image-resize-export`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Reformatar e Exportar para Todos os Formatos de Plataforma |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **input** | ["source_image (path)", "target_formats (array)", "crop_mode"] |
| **output** | ["exports_dir (path)", "export_manifest (JSON)"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 3 criteria |
| **elicit** | false |

## Input

- **source_image** (path): Imagem master de alta resolução. Required: Yes
- **target_formats** (array): Formatos desejados. Default: todos. Required: No
- **crop_mode** (enum): `"center"` | `"smart"` | `"top"` | `"bottom"`. Default: `"center"`. Required: No

## Formatos Disponíveis (`casey-format-presets.yaml`)

| Preset | Dimensões | Plataformas | Notas |
|--------|-----------|-------------|-------|
| `1:1` | 1080×1080 | Instagram Feed, Facebook, Carrossel | Mais universal |
| `4:5` | 1080×1350 | Instagram Feed vertical | Ocupa mais espaço no feed |
| `9:16` | 1080×1920 | Stories, Reels cover, TikTok | Máximo vertical |
| `16:9` | 1920×1080 | YouTube thumbnail, LinkedIn | Landscape |
| `1.91:1` | 1200×628 | LinkedIn Feed, Facebook ads | Open Graph |

## Action Items

### Step 1: Carregar e Validar Source
Verificar dimensões da imagem source (recomendado: ≥2000px no menor lado para reedições sem perda).
Se source < 1080px: upscale com Wand/ImageMagick antes de processar.

### Step 2: Aplicar Crop por Formato
Para cada formato alvo:
- Calcular aspect ratio necessário
- Aplicar crop conforme crop_mode:
  - `center`: crop centralizado (padrão)
  - `smart`: detectar ponto de interesse via OpenCV (face detection ou saliency map)
  - `top`/`bottom`: crop preferindo topo ou base da imagem
- Aplicar resize final para dimensão alvo

### Step 3: Exportar em PNG e WebP
Para cada formato: salvar PNG (lossless) e WebP (quality=85, web-optimized).
Nomear: `{slug}_{preset}.png` e `{slug}_{preset}.webp`.

### Step 4: Gerar Export Manifest
```json
{
  "source": "imagem-original.jpg",
  "exports": {
    "1:1": {"png": "path.png", "webp": "path.webp", "size_kb": 245},
    "4:5": {"png": "path.png", "webp": "path.webp", "size_kb": 312}
  },
  "crop_mode": "center",
  "timestamp": "ISO8601"
}
```

## Acceptance Criteria

- [ ] **AC-1:** Todos os formatos solicitados exportados sem distorção
- [ ] **AC-2:** Dimensões exatas dos presets — sem arredondamentos imprecisos
- [ ] **AC-3:** export_manifest.json com todos os paths e file sizes

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
