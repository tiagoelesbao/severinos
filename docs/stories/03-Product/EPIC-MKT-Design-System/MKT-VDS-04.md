# MKT-VDS-04: Migração da Pipeline Casey para VVS

## Story
**Como** Desenvolvedor de Automação
**Eu quero** que os orquestradores de mídia usem o novo motor de renderização Storybook (VVS)
**Para que** a produção de posts e carrosséis utilize os componentes React oficiais do Design System.

## Contexto
Temos o `VVSRenderService` validado. Agora precisamos atualizar o `orchestrate_post_single.py` e o `orchestrate_carousel.py` para que, em vez de chamarem o `compose_post` (Pillow), eles chamem o serviço Playwright enviando os dados do briefing como props.

## Tarefas (Checklist)
- [x] Atualizar `orchestrate_post_single.py` para integrar com `VVSRenderService`.
- [x] Atualizar `orchestrate_carousel.py` para integrar com `VVSRenderService`.
- [x] Validar a geração de um Post Único real a partir de um briefing. (Validado com `MKT-MEDIA-02-brief.yaml`).
- [x] Validar a geração de um Carrossel completo de 5 slides usando o novo motor. (Validado com `MKT-MEDIA-03-carousel-brief.yaml`).
- [x] Remover (ou marcar como legado) as chamadas antigas ao Pillow nos scripts atualizados. (Migração completa realizada).

## Dev Agent Record
### Debug Log
- [2026-05-12] Migração do `orchestrate_post_single.py` concluída.
- [2026-05-12] Migração do `orchestrate_carousel.py` concluída.
- [2026-05-12] Integração de caminhos absolutos e protocolo `file://` para garantir carregamento de imagens locais no Playwright.
- [2026-05-12] Validação final de ponta a ponta: do briefing YAML à imagem renderizada via Design System.

## Critérios de Aceite
- [x] Posts e carrosséis gerados com sucesso utilizando os templates React do Storybook.
- [x] Qualidade visual superior (anti-aliasing, sombras e layouts complexos do Tailwind).
- [x] Pipeline unificada funcionando de ponta a ponta (Copy -> Briefing -> VVS Render).


## Referências
- `squads/virals-marketing-squad/tools/vvs_render_service.py`
- `squads/virals-marketing-squad/scripts/orchestrate_post_single.py`
