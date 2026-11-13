# Gerar Legendas Automáticas com Whisper

**Task ID:** `sam-caption-auto`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Gerar Legendas Automáticas com Whisper |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Agent` |
| **input** | ["video_path", "language", "whisper_model", "caption_style", "hardcode"] |
| **output** | ["srt_file", "ass_file (opcional)", "captioned_video (se hardcode=true)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |

## Modelos Whisper — Trade-off

| Modelo | VRAM | Velocidade | Qualidade |
|--------|------|------------|-----------|
| `tiny` | 1GB | ~10x real-time | Básico |
| `base` | 1GB | ~7x real-time | Bom |
| `small` | 2GB | ~4x real-time | Muito bom |
| `medium` | 5GB | ~2x real-time | Excelente |
| `large` | 10GB | ~1x real-time | Máxima |

Padrão recomendado: `base` para Reels, `medium` para conteúdo longo.

## Input

- **video_path** (path): Vídeo ou arquivo de áudio. Required: Yes
- **language** (string): Idioma do áudio. Padrão: `"pt"`. Required: No
- **whisper_model** (string): Modelo Whisper. Padrão: `"base"`. Required: No
- **caption_style** (object): Estilo visual das legendas (fonte, cor, tamanho, posição). Required: No
- **hardcode** (boolean): Burnar legendas no vídeo. Padrão: `false`. Required: No

## Caption Style Padrão

```yaml
font: "Arial Bold"
font_size: 48
primary_color: "#FFFFFF"
outline_color: "#000000"
outline_width: 2
position: "bottom_third"  # bottom_third | center | top
max_chars_per_line: 40
max_lines: 2
```

## Action Items

### Step 1: Extrair Áudio
Se input for vídeo: extrair áudio via FFmpeg (`-acodec pcm_s16le -ar 16000`).
Whisper requer WAV 16kHz mono para melhor performance.

### Step 2: Transcrever com Whisper
Executar Whisper com modelo e idioma configurados.
Capturar timestamps de cada segmento (início, fim, texto).
Estimar progresso com barra de progresso via Rich.

### Step 3: Gerar SRT
Formatar output do Whisper em SRT padrão:
```
1
00:00:01,500 --> 00:00:04,200
Primeira linha de legenda aqui.

2
00:00:04,800 --> 00:00:07,100
Segunda linha da legenda.
```
Aplicar quebras de linha respeitando max_chars_per_line.

### Step 4: Gerar ASS (se caption_style customizado)
Se caption_style não-padrão: gerar arquivo ASS com estilos visuais avançados.
ASS permite: animações de entrada, karaoke style, múltiplas cores, gradientes.

### Step 5: Hardcode no Vídeo (se hardcode=true)
Aplicar via FFmpeg:
```bash
ffmpeg -i input.mp4 -vf subtitles=legenda.srt output_captioned.mp4
```
Para ASS: `subtitles=legenda.ass`
Verificar sincronização nos primeiros e últimos 30s do vídeo.

## Acceptance Criteria

- [ ] **AC-1:** SRT gerado com timestamps sincronizados com o áudio
- [ ] **AC-2:** Linhas respeitam max_chars_per_line (sem legendas longas demais)
- [ ] **AC-3:** Se hardcode=true: legendas visíveis e legíveis no vídeo final
- [ ] **AC-4:** Modelo Whisper e idioma documentados no output

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
