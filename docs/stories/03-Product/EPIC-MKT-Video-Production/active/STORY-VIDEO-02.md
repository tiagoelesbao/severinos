# STORY-VIDEO-02: Integração VVS para Overlays de Vídeo (Branding Automático)

**ID:** STORY-VIDEO-02
**Epic:** MKT-VIDEO
**Status:** ✅ Ready for Review
**Responsible:** @sam-kolder-vid / @georgi
**Priority:** High

## Descrição
Integrar o Virals Design System (VVS) desenvolvido para o Casey no pipeline de vídeo do Sam. O objetivo é usar o motor de renderização React para gerar overlays de alta fidelidade (Lower Thirds, Motion Titles, End Cards) e aplicá-los nos vídeos automaticamente.

## Objetivos
1. Portar componentes VVS (React) para presets de vídeo (1920x1080 e 1080x1920).
2. Criar ponte entre `vvs_render_service` e o compositor do Sam.
3. Garantir 100% de consistência de marca (cores, fontes, margens) nos vídeos.

## Tarefas (Tasks)
- [x] **Task 1**: Definir templates React para "Video Hook Title" e "Brand Watermark" no Storybook.
- [x] **Task 2**: Implementar script de captura headless para exportar overlays transparentes (PNG sequence ou ProRes 4444).
- [x] **Task 3**: Integrar overlays gerados via `vvs_render` no pipeline `sam-motion-title.md`.
- [x] **Task 4**: Validar contraste e legibilidade automática dos overlays sobre diferentes fundos de vídeo.

## Critérios de Aceite
- [x] Vídeo exportado com overlays gerados diretamente do Design System.
- [x] Margens e tipografia idênticas ao Brand Book definido em `casey-brand-config.yaml`.
- [x] Suporte a overlays dinâmicos (ex: texto do hook vindo do briefing).

## Dev Agent Record
### Agent Model Used
Gemini 1.5 Pro

### Debug Log
- [2026-05-13] Planejada integração VVS para unificar identidade visual entre estáticos e vídeos.
- [2026-05-13] Iniciando Task 1: Criação de templates React para vídeo em `apps/creative-design`.
- [2026-05-13] Templates `VideoHookOverlay` e `VideoBrandOverlay` criados e integrados na rota `/render` do VVS.
- [2026-05-13] `vvs_render_service.py` atualizado para suportar transparência (`omit_background`).
- [2026-05-13] Script `generate_video_overlays.py` implementado para gerar assets baseados em briefing JSON.
- [2026-05-13] Função `composite_overlay` adicionada ao `sam_ffmpeg_service.py` para composição via FFmpeg.
- [2026-05-13] Pipeline fim-a-fim validado com sucesso em `test_vvs_video_pipeline.py`.

### Completion Notes
- Integração VVS concluída. O pipeline de vídeo agora utiliza os mesmos componentes React do Design System, garantindo 100% de paridade visual com os posts estáticos.
- Suporte a transparência total permite sobreposição perfeita de Motion Titles e Watermarks.
- Otimização: A renderização headless via Playwright é combinada com a velocidade do FFmpeg para composição final.

### Change Log
- v1.0.0: Draft inicial.
