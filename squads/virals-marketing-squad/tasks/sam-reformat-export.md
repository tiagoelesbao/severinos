# Reformatar e Exportar Vídeo para Múltiplos Formatos

**Task ID:** `sam-reformat-export`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Reformatar e Exportar Vídeo para Múltiplos Formatos |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Agent` |
| **input** | ["master_video (path)", "target_formats (array)", "reframe_mode"] |
| **output** | ["exports_dir (path)", "export_manifest (JSON)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |

## Presets de Exportação (`sam-export-presets.yaml`)

| Preset | Resolução | AR | Plataforma | Bitrate | FPS |
|--------|-----------|----|------------|---------|-----|
| `reels` | 1080×1920 | 9:16 | Instagram Reels | 8 Mbps | 30 |
| `tiktok` | 1080×1920 | 9:16 | TikTok | 8 Mbps | 30 |
| `shorts` | 1080×1920 | 9:16 | YouTube Shorts | 8 Mbps | 60 |
| `feed-square` | 1080×1080 | 1:1 | Instagram Feed | 6 Mbps | 30 |
| `feed-vertical` | 1080×1350 | 4:5 | Instagram Feed | 6 Mbps | 30 |
| `youtube` | 1920×1080 | 16:9 | YouTube | 12 Mbps | 60 |
| `linkedin` | 1920×1080 | 16:9 | LinkedIn | 8 Mbps | 30 |

## Reframe Modes

- `center`: Crop centralizado (padrão)
- `blur-bg`: Adiciona fundo blur da imagem original para preencher frame vertical
- `smart`: Face detection via OpenCV para manter rosto no centro do frame
- `manual`: Especificar coordenadas de crop manualmente

## Input

- **master_video** (path): Vídeo master de alta qualidade. Required: Yes
- **target_formats** (array): Lista de presets a gerar. Padrão: todos. Required: No
- **reframe_mode** (enum): `"center"` | `"blur-bg"` | `"smart"` | `"manual"`. Padrão: `"center"`. Required: No

## Output

- **exports_dir**: Subpastas por preset — `exports/reels/`, `exports/youtube/`, etc.
- **export_manifest** (JSON): Paths, file sizes, bitrates, presets usados

## Action Items

### Step 1: Analisar Master Video
FFmpeg probe: resolução, codec, bitrate, FPS, duração.
Verificar se master tem resolução suficiente para todos os formatos alvo.

### Step 2: Para Cada Formato — Reframe
Processar reframe conforme reframe_mode:

**center:** FFmpeg crop centralizado
```bash
ffmpeg -i input.mp4 -vf "crop=1080:1920:(iw-1080)/2:(ih-1920)/2" output_9x16.mp4
```

**blur-bg:** Escalar vídeo + adicionar blur do fundo preenchendo espaço vertical
```bash
ffmpeg -i input.mp4 -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black[fg];[0:v]scale=1080:1920,boxblur=20[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2" output.mp4
```

**smart:** Detectar face via OpenCV → calcular posição x do crop → FFmpeg com crop_x calculado.

### Step 3: Transcodificar para Preset
Para cada formato: aplicar bitrate, FPS e codec do preset.
Codec: H.264 (libx264) para compatibilidade máxima.
Audio: AAC 128kbps normalizado.

### Step 4: Organizar Output
Estrutura:
```
exports/
  reels/     video_reels.mp4
  tiktok/    video_tiktok.mp4
  youtube/   video_youtube.mp4
  ...
```

### Step 5: Gerar Export Manifest
```json
{
  "master": "video_master.mp4",
  "reframe_mode": "blur-bg",
  "exports": {
    "reels": {"path": "exports/reels/...", "size_mb": 45, "duration_s": 60},
    "youtube": {"path": "exports/youtube/...", "size_mb": 180, "duration_s": 900}
  }
}
```

## Acceptance Criteria

- [ ] **AC-1:** Todos os formatos exportados sem distorção ou conteúdo importante cortado
- [ ] **AC-2:** Bitrates e FPS corretos por preset conforme tabela
- [ ] **AC-3:** Modo blur-bg sem borda preta — fundo preenche todo o frame
- [ ] **AC-4:** export_manifest.json com paths e file sizes de todos os outputs

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
