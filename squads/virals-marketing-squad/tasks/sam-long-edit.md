# Editar Vídeo Longo (YouTube/Podcast/Webinar)

**Task ID:** `sam-long-edit`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Editar Vídeo Longo |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Hybrid` |
| **input** | ["raw_video (path)", "long_brief", "platform", "chapters (opcional)", "lut_preset"] |
| **output** | ["long_video (MP4)", "chapters_file (SRT/JSON)", "long_manifest (JSON)"] |
| **action_items** | 7 steps |
| **acceptance_criteria** | 5 criteria |
| **elicit** | true |

## Input

- **raw_video** (path): Vídeo bruto longo (gravação de câmera, screencast, podcast). Required: Yes
- **long_brief** (object): Tema, público, plataforma, capítulos esperados, tom. Required: Yes
- **platform** (enum): `"youtube"` | `"linkedin"` | `"podcast-video"`. Required: Yes
- **chapters** (array): Lista manual de capítulos `[{title, start_s, end_s}]`. Optional — se não fornecido, gera via Whisper + NLP.
- **lut_preset** (string): LUT de `sam-lut-library.yaml`. Padrão: `"neutral-grade"`. Required: No

## Output

- **long_video** (MP4): Vídeo editado em 16:9 com intro, legenda e grading
- **chapters_file**: Arquivo SRT de capítulos para YouTube + JSON para uso programático
- **long_manifest** (JSON): Pipeline completo, timestamps de cada seção, LUT, duração

## Action Items

### Step 1: Ingerir e Analisar Material
FFmpeg probe: codec, dimensões, duração, canais de áudio.
Calcular estimativa de output após silence-cut (~20-30% de redução típica).

### Step 2: Silence Cut e Limpeza de Áudio
auto-editor com threshold 8% (mais conservador para conteúdo longo/entrevista).
Gerar preview do tempo salvo antes de confirmar.
Aplicar normalização de áudio: loudness -14 LUFS (padrão YouTube).

### Step 3: Estruturar Capítulos
Se `chapters` fornecido: usar como base.
Se não fornecido: transcrever com Whisper → analisar transcrição para detectar mudanças de tópico → gerar capítulos automaticamente.
Gerar arquivo de capítulos em formato YouTube (`00:00 Intro\n05:30 Tópico 2\n...`).

### Step 4: Edição e Montagem
Cortar material desnecessário baseado nos capítulos.
Adicionar intro (5-15s com logo animado via MoviePy).
Adicionar lower thirds para nome do entrevistado/apresentador.
Adicionar end screen (últimos 20s) com cards de recomendação.
Transições entre capítulos (corte seco para conteúdo informativo, fade para mais suave).

### Step 5: Legendas Completas com Whisper
Transcrever áudio completo com Whisper (modelo: medium ou large para máxima precisão).
Gerar SRT com timestamps.
Revisar pontos de falha (nomes próprios, termos técnicos).
Hardcode opcional (alguns prefere só o .srt para upload no YouTube).

### Step 6: Color Grade e Thumbnail
Aplicar LUT neutro de correção de cor (corrige temperatura e exposição).
Capturar frame mais expressivo para thumbnail (extrair com FFmpeg).
Preparar thumbnail para processamento posterior pelo @casey-neistat-img.

### Step 7: Export e Distribuição
Exportar 16:9 H.264, bitrate 10-15Mbps (YouTube recomendado).
Gerar versão 1:1 cortada (primeiros 10min) para LinkedIn preview.
Gerar long_manifest.json com pipeline completo e timestamps.

## Acceptance Criteria

- [ ] **AC-1:** Silêncios e pausas desnecessárias removidos (silence-cut aplicado)
- [ ] **AC-2:** Capítulos gerados com timestamps e exportados no formato YouTube
- [ ] **AC-3:** Legenda SRT completa e sincronizada
- [ ] **AC-4:** Color grade neutro aplicado — vídeo sem dominantes de cor indesejadas
- [ ] **AC-5:** Export em 16:9 com qualidade compatível com YouTube (≥8Mbps)

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
