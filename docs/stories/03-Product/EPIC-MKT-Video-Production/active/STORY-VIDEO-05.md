**ID:** STORY-VIDEO-05
**Epic:** MKT-VIDEO
**Status:** 🏗️ ACTIVE
**Responsible:** @sam-kolder-vid / @dev-aiox
**Priority:** High

## Descrição
Desenvolver um gerador de arquivos FCPXML (Final Cut Pro XML) customizado que permita a injeção de propriedades de transformação (Zoom, Crop, Pan), Inserção de Overlays em Tracks separadas e Inserção de B-Rolls automaticamente. O objetivo é ler o JSON de "Edit Decisions" gerado pelo Agente Diretor (Story 04) e traduzir isso em uma timeline rica e editável no DaVinci Resolve.

## Objetivos
1. Criar o `fcpxml_builder.py` para gerar templates FCPXML 1.9/1.10.
2. Implementar suporte a `<video-item>` com propriedades de `<transform>` (Scale e Position).
3. Automatizar a criação de faixas (Tracks) para Media (V1), Overlays (V2/V3) e Subtitles (D1).

## Tarefas (Tasks)
- [x] **Task 1**: Desenhar o template base de FCPXML compatível com o DaVinci Resolve Free.
- [x] **Task 2**: Implementar lógica de aplicação de Zooms dinâmicos baseados no JSON de decisões.
- [/] **Task 3**: Implementação de B-Rolls dinâmicos via FCPXML tracks.
- [ ] **Task 4**: Validar importação no DaVinci Resolve com pelo menos 3 tracks de vídeo sobrepostas.

## Critérios de Aceite
- O arquivo FCPXML gerado abre no DaVinci Resolve sem erros de "Media Offline".
- A timeline importada já contém os zooms automáticos aplicados nos clips.
- A estrutura de tracks está organizada (Video, Overlay, Subtitles).

## Dev Agent Record
### Agent Model Used
Gemini 1.5 Pro

### Debug Log
- [2026-05-14] Story criada para viabilizar a materialização das decisões criativas do agente diretor na timeline do usuário.

### Completion Notes
- (Aguardando implementação)

### Change Log
- v1.0.0: Draft inicial.
