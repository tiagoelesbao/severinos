# MKT-VDS-02: Templates de Criativos (React Components)

## Story
**Como** Diretor Criativo
**Eu quero** templates de posts e carrosséis construídos como componentes React no Design System
**Para que** possamos renderizar conteúdos de alta qualidade visual com total consistência de marca.

## Contexto
Com os átomos (Typography, Logo, Accent) prontos, agora precisamos das moléculas e templates. Estes componentes serão o "corpo" dos nossos posts, aceitando props como `headline`, `image`, `cta` e `theme`.

## Tarefas (Checklist)
- [x] Criar o componente `SinglePostTemplate` com suporte a variantes:
    - `image-first` (Background image dominante).
    - `text-over-image` (Headline centralizada com overlay).
    - `split-layout` (Divisão clara entre texto e imagem).
- [x] Criar o componente `CarouselSlide` com suporte a:
    - Numeração automática de slides.
    - Barra de progresso visual.
- [x] Implementar suporte a temas `light` e `dark` nos templates.
- [x] Documentar todos os templates no Storybook com diversos estados de teste (copy longo, copy curto, sem imagem).

## Dev Agent Record
### Debug Log
- [2026-05-12] Implementação do `SinglePostTemplate` com suporte a 3 variantes e temas.
- [2026-05-12] Implementação do `CarouselSlide` com lógica de progress bar dinâmica e tipos de slide (Hook/Valor/CTA).
- [2026-05-12] Documentação completa dos templates no Storybook em `Design System/Templates`.

## Critérios de Aceite
- [x] `SinglePostTemplate` renderiza corretamente as 3 variantes via props.
- [x] `CarouselSlide` mantém consistência visual independente do conteúdo.
- [x] Todos os templates utilizam exclusivamente os Design Tokens definidos na MKT-VDS-01.

## Referências
- `docs/stories/03-Product/EPIC-MKT-Design-System/MKT-VDS-01.md`
- `squads/virals-marketing-squad/data/casey-brand-config.yaml`
