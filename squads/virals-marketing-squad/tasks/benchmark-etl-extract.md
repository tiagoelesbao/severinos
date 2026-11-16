# Extrair e Preparar Assets via ETL

**Task ID:** `benchmark-etl-extract`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 2.0.0
**Last Updated:** 2026-03-24
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (ETL Pipeline service)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Extrair e Preparar Assets via ETL |
| **status** | `pending` |
| **responsible_executor** | Worker (script-driven) |
| **execution_type** | `Worker` |
| **input** | ["links_file", "single_url"] |
| **output** | ["Conteudo{N}/ folder", ".aiox/handoffs/benchmark_*.json"] |
| **action_items** | 3 steps |
| **acceptance_criteria** | 4 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Worker |
| **Pattern** | HO-EP-004 |
| **Executor** | `scripts/run-benchmark-batch.js` ou `scripts/run-benchmark-single.js` |
| **Rationale** | Processo determinístico de download, extração de áudio, captura de frames e geração de dossier. Não requer inteligência/julgamento de agente. |

## Overview

Responsável por executar a extração inicial de dados de um link de vídeo (IG, TT, YT) usando o serviço `services/ETL/`.
Baixa o vídeo original, extrai o áudio, captura screenshots, realiza a **transcrição do áudio localmente (via Whisper CLI, se instalado)** (como token-saver para os agentes), cria a estrutura de pastas e gera o dossier de handoff para os agentes do marketing squad executarem a análise descritiva e estratégica na CLI.

## Input

- **links_file** (string) ou **single_url** (string)
  - Description: Txt/md com links ou URL direta do conteúdo.
  - Required: Yes

## Output

- **services/ETL/outputs/Conteudo{N}-{titulo}/** (folder)
  - `Transcrição.md` ou `Conteudo.md` (Texto extraído do conteúdo)
  - `Benchmark.json` (Metadata rico via yt-dlp ou HTML Fallback)
  - `video.mp4` e `audio.mp3` (Apenas se for Video)
  - `Screenshots/` (Apenas se for Video)
- **.aiox/handoffs/benchmark_{id}.json** (file)
  - Description: Dossier de contexto contendo o `type` (video/post) e caminhos válidos.

## Action Items

### Step 1: Iniciar Extração
Executar o wrapper script do squad focado no serviço ETL:
```bash
# Para arquivo longo de links (batch):
node squads/virals-marketing-squad/scripts/run-benchmark-batch.js

# Para link único (teste rápido):
node squads/virals-marketing-squad/scripts/run-benchmark-single.js <URL>
```

### Step 2: Acompanhar Pipeline Automático
O script irá lidar automaticamente com:
- Download do vídeo original e metadata rica via `yt-dlp`
- Extração de áudio compressado via `ffmpeg`
- Captura de thumbnails espaçadas (5s) via `ffmpeg`
- Transcrição do áudio para texto via Whisper CLI (off-grid)
- Organização dos arquivos base na pasta de destino
- Geração do Dossier de Handoff JSON

### Step 3: Validar Output e Handoff
Verificar no console/terminal se a criação de pastas e dos JSONs (Benchmark + Dossier) concluiu com sucesso (código 0).

## Acceptance Criteria

- [ ] **AC-1:** Pasta de output criada com sucesso.
- [ ] **AC-2:** Assets (Vídeo/Áudio ou Apenas Texto) salvos corretamente conforme o tipo de conteúdo detectado.
- [ ] **AC-3:** `Benchmark.json` gerado com runtime metadata e campo `type` definido.
- [ ] **AC-4:** Dossier gerado em `.aiox/handoffs/` informando os caminhos corretos (incluindo nulos para assets não gerados).

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

- [x] `task_name` follows "Verb + Object" format
- [x] `status` is one of: pending | in_progress | completed
- [x] `responsible_executor` is clearly specified
- [x] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [x] `input` array has at least 1 item
- [x] `output` array has at least 1 item
- [x] `action_items` has clear, actionable steps
- [x] `acceptance_criteria` has measurable criteria

---

_Task Version: 2.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-24_
_Compliant: Yes_
