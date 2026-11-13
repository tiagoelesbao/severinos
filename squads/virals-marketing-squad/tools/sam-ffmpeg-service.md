# Sam FFmpeg Service Tool

**Tool ID:** `sam-ffmpeg-service`
**Agente:** @sam-kolder-vid
**Versão:** 1.0.0

## Descrição

Interface declarativa para operações FFmpeg e MoviePy.
Abstrai comandos complexos em métodos com presets prontos para conteúdo social.

---

## Operações Disponíveis

### `probe(video_path: str) → VideoInfo`

Análise completa do vídeo via FFprobe.

```python
from tools.sam_ffmpeg_service import probe

info = probe("raw/gravacao.mp4")
print(info.duration_s)    # 2700
print(info.codec)         # "h264"
print(info.resolution)    # (1920, 1080)
print(info.fps)           # 30.0
print(info.bitrate_mbps)  # 15.2
print(info.audio_channels)# 2
```

---

### `silence_cut(input: str, output: str, threshold_pct: float) → CutReport`

Corte automático de silêncio via auto-editor.

```python
from tools.sam_ffmpeg_service import silence_cut

report = silence_cut(
    input="raw/gravacao.mp4",
    output="processed/gravacao_cut.mp4",
    threshold_pct=8.0
)
print(f"Redução: {report.reduction_pct}%")
print(f"Cortes aplicados: {report.cuts_count}")
```

---

### `reformat(input: str, preset: str, reframe_mode: str, output: str) → str`

Reformata vídeo para um preset de plataforma.

```python
# Presets disponíveis: reels, tiktok, shorts, feed-square, feed-vertical, youtube, linkedin

output_path = reformat(
    input="master.mp4",
    preset="reels",          # 1080x1920, 8Mbps, H.264, 30fps
    reframe_mode="blur-bg",  # center | blur-bg | smart
    output="exports/reel.mp4"
)
```

**Blur-bg (automático):**
```bash
# Gerado internamente:
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black[fg];\
   [0:v]scale=1080:1920,boxblur=20[bg];\
   [bg][fg]overlay=(W-w)/2:(H-h)/2" \
  -c:v libx264 -b:v 8M -c:a aac -b:a 128k output.mp4
```

---

### `apply_lut(input: str, lut_path: str, intensity: float, output: str) → str`

Aplica LUT com intensidade configurável.

```python
output_path = apply_lut(
    input="edited.mp4",
    lut_path="data/luts/cinematic-warm.cube",
    intensity=0.85,   # 0.0 a 1.0
    output="graded.mp4"
)
```

---

### `extract_clip(input: str, start_s: float, end_s: float, output: str) → str`

Extrai um clip sem re-encode (cópia direta de stream).

```python
clip = extract_clip(
    input="long_video.mp4",
    start_s=245.0,
    end_s=305.0,
    output="highlights/clip_01.mp4"
)
```

---

### `normalize_audio(input: str, target_lufs: float, output: str) → str`

Normaliza áudio para loudness alvo.

```python
# -14 LUFS = padrão YouTube/Spotify
normalized = normalize_audio(
    input="video.mp4",
    target_lufs=-14.0,
    output="video_normalized.mp4"
)
```

---

### `batch_reformat(inputs: list, preset: str, reframe_mode: str, output_dir: str) → list`

Reformata lista de vídeos em lote.

```python
outputs = batch_reformat(
    inputs=["clip_01.mp4", "clip_02.mp4", "clip_03.mp4"],
    preset="reels",
    reframe_mode="center",
    output_dir="exports/reels/"
)
```

---

## Presets de Plataforma Completos

```python
PRESETS = {
    "reels":       {"w": 1080, "h": 1920, "fps": 30,  "bitrate": "8M",  "codec": "libx264"},
    "tiktok":      {"w": 1080, "h": 1920, "fps": 30,  "bitrate": "8M",  "codec": "libx264"},
    "shorts":      {"w": 1080, "h": 1920, "fps": 60,  "bitrate": "8M",  "codec": "libx264"},
    "feed-square": {"w": 1080, "h": 1080, "fps": 30,  "bitrate": "6M",  "codec": "libx264"},
    "youtube":     {"w": 1920, "h": 1080, "fps": 60,  "bitrate": "12M", "codec": "libx264"},
    "linkedin":    {"w": 1920, "h": 1080, "fps": 30,  "bitrate": "8M",  "codec": "libx264"},
}
```

---

## Dependências

```txt
ffmpeg-python>=0.2.0
moviepy>=2.0.0
auto-editor>=24.0.0
```

## Instalação

```bash
# FFmpeg (sistema)
# Windows: winget install ffmpeg
# Linux: sudo apt install ffmpeg

pip install ffmpeg-python moviepy auto-editor
```

---

_Tool Version: 1.0.0_
_Last Updated: 2026-05-10_
