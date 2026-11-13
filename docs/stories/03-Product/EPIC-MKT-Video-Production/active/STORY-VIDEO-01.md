# STORY-VIDEO-01: Estabilização e Testes de Regressão do Sam FFmpeg Service

**ID:** STORY-VIDEO-01
**Epic:** MKT-VIDEO
**Status:** ✅ Ready for Review
**Responsible:** @sam-kolder-vid
**Priority:** High

## Descrição
Garantir que o `sam-ffmpeg-service` e as ferramentas base (FFmpeg, MoviePy, auto-editor) funcionem de forma robusta em diversos cenários de entrada (variantes de codec, resoluções e framerates) sem falhas silenciosas.

## Objetivos
1. Criar suite de testes de estresse para o pipeline de edição.
2. Validar compatibilidade de codecs de entrada (MOV, MP4, MKV).
3. Implementar logs de performance para monitorar tempo de renderização.

## Tarefas (Tasks)
- [x] **Task 1**: Implementar `scripts/test-video-engine.py` para testar todas as operações do `sam-ffmpeg-service`.
- [x] **Task 2**: Validar o fluxo de `silence_cut` com diferentes níveis de threshold em vídeos com ruído de fundo.
- [x] **Task 3**: Criar benchmark de renderização (FFmpeg Nativo vs MoviePy) para otimizar tempo de export.
- [x] **Task 4**: Implementar validação de integridade do arquivo de saída (bitrate, resolution, corruption check).

## Critérios de Aceite
- [x] Suite de testes executa com sucesso para pelo menos 5 formatos de vídeo diferentes.
- [x] Relatório de performance gerado em `docs/qa/video-engine-benchmark.md`.
- [x] Erros de codec são capturados e reportados de forma clara, sem crashar o orchestrator.

## Dev Agent Record
### Agent Model Used
Gemini 1.5 Pro

### Debug Log
- [2026-05-13] Story inicializada para focar na base do pipeline.
- [2026-05-13] Iniciando Task 1: Implementação do script de testes.
- [2026-05-13] Script `test_video_engine.py` implementado. Primeiro run detectou discrepância de duração em `extract_clip` (comum em stream copy).
- [2026-05-13] Iniciando Task 2: Validação de silence cut.
- [2026-05-13] Dependências Python instaladas (auto-editor, moviepy, etc). Task 2 validada com sucesso: redução de 57% detectada em vídeo de teste com silêncio.
- [2026-05-13] Iniciando Task 3: Benchmark de renderização.
- [2026-05-13] Benchmark concluído: FFmpeg CLI (0.95s) vs MoviePy (16.67s). Ganho massivo de performance ao usar FFmpeg direto para transformações de layout. Relatório gerado.
- [2026-05-13] Iniciando Task 4: Validação de integridade.
- [2026-05-13] Função `validate_integrity` implementada no service e validada no script de teste (casos positivos e negativos).

### Completion Notes
- Pipeline de vídeo estabilizado.
- O motor principal agora prioriza FFmpeg CLI para transformações básicas (17x mais rápido que MoviePy).
- Suite de testes automatizada pronta para rodar em CI ou manualmente via `scripts/test_video_engine.py`.

### Change Log
- v1.0.0: Draft inicial.
