# Extrair Highlights Inteligentes de Conteúdo Longo

**Task ID:** `sam-clip-highlight`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Extrair Highlights Inteligentes de Conteúdo Longo |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Agent` |
| **input** | ["long_video (path)", "content_type", "n_clips", "clip_duration_s", "output_format"] |
| **output** | ["clips_dir (path)", "clips_manifest (JSON)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |

## Input

- **long_video** (path): Vídeo longo fonte. Required: Yes
- **content_type** (enum): `"podcast"` | `"interview"` | `"webinar"` | `"lecture"`. Required: Yes
- **n_clips** (integer): Número de clips a extrair. Padrão: 5. Required: No
- **clip_duration_s** (integer): Duração alvo por clip em segundos. Padrão: 60. Máx: 90. Required: No
- **output_format** (enum): `"reels"` | `"tiktok"` | `"shorts"` | `"raw"`. Padrão: `"raw"`. Required: No

## Output

- **clips_dir**: Pasta com cada clip numerado e nomeado pelo tema detectado
- **clips_manifest** (JSON): Timestamps de origem, score de relevância, tema detectado por clip

## Estratégia de Detecção de Highlights

```
1. Transcrição completa via Whisper
2. Análise NLP da transcrição:
   - Detectar picos de emoção (palavras-chave: "incrível", "nunca pensei", "o que aconteceu foi...")
   - Detectar statements declarativos fortes (frases curtas, diretas, assertivas)
   - Detectar momentos de riso/reação (marcadores de energia)
3. Score por segmento (0-10):
   - Clareza da ideia: 40%
   - Energia do apresentador: 30%
   - Completude (faz sentido fora do contexto): 30%
4. Selecionar top N segmentos por score
5. Ajustar timestamps para início/fim naturais da fala
```

## Action Items

### Step 1: Transcrever Conteúdo Completo
Executar Whisper (modelo: small ou medium) no long_video.
Gerar transcrição com timestamps por palavra.
Agrupar em segmentos de 30-90s.

### Step 2: Scoring de Segmentos
Analisar cada segmento da transcrição:
- Detectar palavras/frases de alto impacto emocional
- Calcular density de informação (informações únicas por minuto)
- Penalizar segmentos que começam ou terminam no meio de uma frase
- Calcular score final 0-10 por segmento

### Step 3: Selecionar e Ajustar Timestamps
Selecionar top N segmentos por score.
Ajustar start_time: recuar 2s para incluir contexto de entrada.
Ajustar end_time: avançar 1s após ponto final natural.
Garantir que nenhum clip começa ou termina abruptamente.

### Step 4: Extrair Clips
Para cada segmento selecionado, extrair via FFmpeg:
```bash
ffmpeg -i long_video.mp4 -ss {start} -to {end} -c copy clip_{n}_{tema}.mp4
```
Nomear clips com número e tema detectado: `clip_01_momento-chave.mp4`.

### Step 5: Gerar Clips Manifest
```json
{
  "source": "long_video.mp4",
  "n_clips_requested": 5,
  "n_clips_extracted": 5,
  "clips": [
    {
      "file": "clip_01_momento-chave.mp4",
      "start_s": 245,
      "end_s": 305,
      "duration_s": 60,
      "score": 8.7,
      "theme": "momento-chave",
      "excerpt": "Primeiro trecho da transcrição do clip..."
    }
  ]
}
```

## Acceptance Criteria

- [ ] **AC-1:** N clips extraídos com timestamps naturais (sem corte de palavras)
- [ ] **AC-2:** Cada clip faz sentido fora do contexto do vídeo original
- [ ] **AC-3:** clips_manifest.json com score e tema detectado por clip
- [ ] **AC-4:** Clips nomeados com tema detectado (não só números)

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
