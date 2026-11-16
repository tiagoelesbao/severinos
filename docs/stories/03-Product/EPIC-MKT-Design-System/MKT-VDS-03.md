# MKT-VDS-03: Render Engine (Playwright Integration)

## Story
**Como** Engenheiro de Automação
**Eu quero** um serviço que converta componentes do Storybook em imagens reais de alta definição
**Para que** possamos automatizar a produção de mídia com a fidelidade total do Design System.

## Contexto
Temos os templates no Storybook, mas precisamos de uma forma programática de "fotografá-los" com dados reais. O Playwright permite abrir o navegador em modo headless, injetar propriedades via URL (args) e capturar o elemento exato em PNG/WebP.

## Tarefas (Checklist)
- [x] Criar o script `squads/virals-marketing-squad/tools/vvs_render_service.py`.
- [x] Implementar a lógica de mapeamento entre Briefing YAML e Storybook Args (URL encoding).
- [x] Configurar o Playwright para capturar o viewport de 1080x1080 com pixel ratio 2x para alta definição.
- [x] Implementar suporte a exportação em PNG e WebP otimizado.
- [x] Criar um teste de fumaça renderizando um Post e um Carrossel completo via linha de comando.

## Dev Agent Record
### Debug Log
- [2026-05-12] Implementação do `VVSRenderService` usando Playwright.
- [2026-05-12] Sucesso na renderização headless de `SinglePostTemplate` e `CarouselSlide`.
- [2026-05-12] Implementado suporte a WebP via Pillow pós-screenshot.
- [2026-05-12] Viewport configurado para 1080x1080 com `device_scale_factor: 2` (Resultando em 2160x2160 pixels de alta densidade).

## Critérios de Aceite
- [x] O script gera uma imagem idêntica ao componente visualizado no Storybook.
- [x] O serviço aceita um JSON/YAML de entrada e retorna o path da imagem gerada.
- [x] Tempo de renderização por imagem não ultrapassa 5 segundos (em ambiente local).

## Referências
- `apps/creative-design/src/components/design-system`
- `squads/virals-marketing-squad/workflows/casey-post-production.yaml`
