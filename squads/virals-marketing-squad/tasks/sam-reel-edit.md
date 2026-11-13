# Editar Vídeo Curto (Reels/TikTok/Shorts)

**Task ID:** `sam-reel-edit`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Editar Vídeo Curto (Reels/TikTok/Shorts) |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Hybrid` |
| **input** | ["raw_video (path)", "reel_brief", "platform", "target_duration_s", "lut_preset"] |
| **output** | ["reel_video (MP4)", "reel_manifest (JSON)"] |
| **action_items** | 7 steps |
| **acceptance_criteria** | 6 criteria |
| **elicit** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | VM-EP-003 |
| **Executor** | @sam-kolder-vid |
| **Rationale** | Decisão criativa no briefing/pacing + execução automatizada via FFmpeg/MoviePy |

## Pipeline de Produção

```
raw_video
    ↓
[1] silence-cut (auto-editor)          → remove silêncios
    ↓
[2] clip selection (manual/Clips AI)   → seleciona os melhores momentos
    ↓
[3] cut + pacing (MoviePy)             → edita no ritmo
    ↓
[4] motion titles (Movis/MoviePy)      → adiciona textos animados
    ↓
[5] caption hardcode (Whisper+FFmpeg)  → legendas burnadas
    ↓
[6] color grade (FFmpeg LUT)           → grading cinematic
    ↓
[7] reformat + export (FFmpeg)         → 9:16 principal + formatos alternativos
```

## Input

- **raw_video** (path): Vídeo bruto (qualquer formato aceito pelo FFmpeg). Required: Yes
- **reel_brief** (object): Tema, hook (primeiros 3s), música de fundo, mood, referências. Required: Yes
- **platform** (enum): `"reels"` | `"tiktok"` | `"shorts"`. Required: Yes
- **target_duration_s** (integer): Duração alvo em segundos. Padrão: 60. Máx: 90. Required: No
- **lut_preset** (string): Nome do LUT de `sam-lut-library.yaml`. Padrão: `"cinematic-warm"`. Required: No

## Output

- **reel_video** (MP4): Reel final em 9:16 (1080x1920) com captions e grading
- **reel_manifest** (JSON): Metadados de produção, duração final, LUT usado, plataforma

## Action Items

### Step 1: Ingerir e Analisar Material Bruto
Verificar codec e dimensões do raw_video via FFmpeg probe.
Calcular duração total disponível.
Exibir resumo: "Vídeo: {duração} | Codec: {codec} | Resolução: {res}"

### Step 2: Silence Cut Automático
Executar auto-editor com threshold configurado para o tipo de conteúdo:
- `--silent-threshold 4%` para conteúdo dinâmico
- `--silent-threshold 8%` para entrevistas/conversas
Exibir preview do corte antes de aplicar.
Output: vídeo intermediário sem silêncios.

### Step 3: Seleção e Montagem de Clips
Identificar melhores momentos baseado no reel_brief.
Se conteúdo longo (>5min): usar Clips AI para highlight detection automático.
Montar sequência de clips em MoviePy seguindo target_duration_s.
Aplicar cross-cuts e zoom transitions no ritmo do conteúdo.

### Step 4: Adicionar Motion Titles e Elementos Visuais
Hook text nos primeiros 3s (texto animado — entra rápido, sai rápido).
Lower thirds para nomes/títulos se entrevista.
Marca d'água em posição discreta (canto inferior).
Usar Movis para animações ou MoviePy para textos básicos.

### Step 5: Legendas Automáticas com Whisper
Transcrever áudio do vídeo montado com Whisper (modelo: base ou small).
Gerar arquivo SRT com timestamps.
Configurar estilo de caption: fonte, tamanho, cor, posição (inferior 1/3).
Hardcode das legendas no vídeo via FFmpeg `subtitles` filter.

### Step 6: Color Grading
Aplicar LUT via FFmpeg: `ffmpeg -i input.mp4 -vf lut3d={lut_path} output.mp4`
LUT padrão: `cinematic-warm` (de `sam-lut-library.yaml`).
Ajustar exposure e contrast pós-LUT se necessário.

### Step 7: Reformat e Export Final
Reformatar para 9:16 (1080x1920) — crop inteligente ou blur background.
Exportar MP4 H.264 com bitrate 8Mbps (padrão Reels/TikTok).
Gerar também versão 1:1 para feed se plataforma == "reels".
Gerar reel_manifest.json com todos os metadados de produção.

## Acceptance Criteria

- [ ] **AC-1:** Duração final dentro de ±5s do target_duration_s
- [ ] **AC-2:** Primeiros 3s têm hook visual claro e texto de abertura
- [ ] **AC-3:** Legendas hardcoded, visíveis e sincronizadas com o áudio
- [ ] **AC-4:** Color grade aplicado — LUT identificado no manifest
- [ ] **AC-5:** Formato 9:16 correto para a plataforma alvo
- [ ] **AC-6:** reel_manifest.json com pipeline completo documentado

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
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
