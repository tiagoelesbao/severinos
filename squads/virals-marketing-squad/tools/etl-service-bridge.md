# ETL Service Bridge

Configuração de integração entre o virals-marketing-squad e o serviço ETL compartilhado em `services/ETL/`.

## Service Location

```yaml
service_path: "services/ETL/"
relative_from_squad: "../../services/ETL/"
```

## Available Scripts

| Script | Path | Description | Usage |
|--------|------|-------------|-------|
| **etl-pipeline.js** | `services/ETL/etl-pipeline.js` | Pipeline completo (batch from links file) | `node services/ETL/etl-pipeline.js` |
| **etl-orchestrator.js** | `services/ETL/etl-orchestrator.js` | Orquestrador single-link | `node services/ETL/etl-orchestrator.js` |
| **batch-processor.js** | `services/ETL/batch-processor.js` | Batch processor (244+ links) | `node services/ETL/batch-processor.js` |

## ETL Architecture

```
services/ETL/
├── Extract/
│   ├── downloader.js          # Download de vídeos (yt-dlp)
│   ├── extract-runner.js      # Runner de extração
│   ├── Links/                 # Arquivos de links por data
│   └── scrapers/              # Scrapers por plataforma
├── Transform/
│   ├── processors/
│   │   └── video-processor.js # Extração de áudio e frames
│   └── video-intelligence/
│       └── gemini-analyzer.js # Transcrição e análise via Gemini API
├── Load/
│   ├── handoff/
│   │   └── agent-context.js   # Gerador de dossier para agentes
│   └── database/              # (futuro) Persistência
├── outputs/                   # Pasta de output final por conteúdo
│   └── Conteudo{N}-{titulo}/
│       ├── Transcrição.md
│       ├── Benchmark.json
│       ├── Screenshots/
│       └── Análise.md
├── bin/                       # Binários (yt-dlp)
└── yt-dlp_win/               # yt-dlp para Windows
```

## Squad Wrapper Scripts

O squad possui scripts wrapper em `scripts/` que simplificam a chamada ao serviço:

| Script | Description |
|--------|-------------|
| `run-benchmark-single.js` | Processa um único link (ETL + organização de output) |
| `run-benchmark-batch.js` | Processa arquivo de links sequencialmente |

## Handoff Format

O dossier JSON criado em `.aiox/handoffs/` segue este schema:

```json
{
  "id": "benchmark_{timestamp}",
  "origin": "Viral-ETL-Engine",
  "target_agent": "configurable",
  "workflow_ref": "benchmark-creative-analysis.yaml",
  "content": {
    "url": "https://...",
    "platform": "instagram|tiktok|youtube|linkedin",
    "assets": {
      "video": "path/to/video.mp4",
      "audio": "path/to/audio.mp3",
      "frames_path": "path/to/frames/",
      "frames_count": 24
    },
    "output_dir": "services/ETL/outputs/Conteudo{N}-{titulo}/",
    "metadata": { "timestamp": "..." }
  },
  "status": "ready_for_analysis",
  "consumed": false
}
```

## Environment Requirements

- **GEMINI_API_KEY** — Required in `.env` for transcription via Gemini
- **yt-dlp** — Available in `services/ETL/bin/` or `services/ETL/yt-dlp_win/`
- **ffmpeg** — Required for audio/frame extraction (system PATH)

## Related Components

- **Workflow:** `workflows/benchmark-creative-analysis.yaml`
- **Orchestrator Task:** `tasks/analyze-benchmark.md`
- **Checklist:** `checklists/benchmark-analysis-checklist.md`
- **Template:** `templates/viral-deep-analysis-tmpl.md`
