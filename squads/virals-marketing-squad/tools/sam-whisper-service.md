# Sam Whisper Service Tool

**Tool ID:** `sam-whisper-service`
**Agente:** @sam-kolder-vid
**Versão:** 1.0.0

## Descrição

Serviço de transcrição e geração de legendas via OpenAI Whisper (open-source, local).
Roda 100% offline sem API key. Suporta português e inglês com alta precisão.

---

## API Disponível

### `transcribe(audio_path: str, config: dict) → TranscriptionResult`

Transcreve áudio e retorna texto com timestamps por palavra.

```python
from tools.sam_whisper_service import transcribe

result = transcribe(
    audio_path="video.mp4",  # aceita MP4, MP3, WAV, M4A
    config={
        "model": "base",     # tiny | base | small | medium | large
        "language": "pt",    # pt | en | es | None (auto-detect)
        "task": "transcribe",
        "word_timestamps": True,
        "verbose": False
    }
)

print(result.text)           # Transcrição completa como string
print(result.segments)       # Lista de segmentos com start/end/text
print(result.words)          # Lista de palavras com timestamps
print(result.language)       # Idioma detectado
print(result.duration_s)     # Duração total transcrita
```

---

### `generate_srt(result: TranscriptionResult, config: dict) → str`

Gera arquivo SRT a partir do resultado da transcrição.

```python
srt_path = generate_srt(
    result=transcription_result,
    config={
        "output_path": "output/video.srt",
        "max_chars_per_line": 40,
        "max_lines": 2,
        "max_duration_s": 4.0  # duração máxima de cada legenda
    }
)
```

**Formato SRT gerado:**
```srt
1
00:00:01,500 --> 00:00:04,200
Primeiro trecho de legenda aqui.

2
00:00:04,800 --> 00:00:07,100
Segunda legenda com conteúdo.
```

---

### `generate_ass(result: TranscriptionResult, style: dict) → str`

Gera arquivo ASS com estilo visual customizado para legendas animadas.

```python
ass_path = generate_ass(
    result=transcription_result,
    style={
        "font_name": "Arial",
        "font_size": 48,
        "bold": True,
        "primary_color": "&H00FFFFFF",   # BBGGRR em hex
        "outline_color": "&H00000000",
        "outline_width": 2,
        "alignment": 2,                  # 2=bottom-center
        "margin_v": 80,
        "output_path": "output/video.ass"
    }
)
```

---

### `hardcode_subtitles(video: str, subtitle: str, output: str) → str`

Burna legendas no vídeo via FFmpeg.

```python
output_path = hardcode_subtitles(
    video="video_edited.mp4",
    subtitle="output/video.srt",  # ou .ass para estilos customizados
    output="video_captioned.mp4"
)

# Comando FFmpeg gerado internamente:
# ffmpeg -i video.mp4 -vf "subtitles=video.srt:force_style='FontName=Arial,FontSize=48'" output.mp4
```

---

## Seleção de Modelo por Caso de Uso

| Conteúdo | Modelo Recomendado | Motivo |
|----------|-------------------|--------|
| Reel 60s | `base` | Rápido, qualidade suficiente |
| TikTok 30s | `tiny` | Velocidade máxima |
| Entrevista 30min | `small` | Boa precisão, razoável |
| Podcast 60min | `medium` | Alta precisão para nomes |
| Webinar técnico | `large` | Máxima precisão, termos técnicos |

---

## Instalação

```bash
pip install openai-whisper

# Para GPU (CUDA) — muito mais rápido:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Modelos são baixados automaticamente na primeira execução
# Localização: ~/.cache/whisper/
```

## Dependências

```txt
openai-whisper>=20231117
torch>=2.1.0
numpy>=1.24.0
ffmpeg-python>=0.2.0
```

---

## Performance Estimada

| Modelo | GPU (CUDA) | CPU Only | VRAM |
|--------|-----------|----------|------|
| tiny | ~32x real-time | ~10x real-time | 1GB |
| base | ~16x real-time | ~7x real-time | 1GB |
| small | ~6x real-time | ~3x real-time | 2GB |
| medium | ~2x real-time | ~0.5x real-time | 5GB |
| large | ~1x real-time | ~0.3x real-time | 10GB |

> Exemplo: Reel de 60s com modelo `base` em CPU demora ~9 segundos.
> Mesmo reel em GPU CUDA demora ~4 segundos.

---

_Tool Version: 1.0.0_
_Last Updated: 2026-05-10_
