# MKT-MEDIA-10: Pexels Turbinado — Busca, Curadoria e Dimensionamento

**Status:** Done
**Epic:** EPIC-MKT-Media-Production
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-16

## Story
**Como** Marketing Chief
**Eu quero** imagens Pexels relevantes, curadas e dimensionadas corretamente por placeholder
**Para que** os slides parem de sair com fotos sem nexo ou cortadas.

## Contexto
As fotos saíam genéricas (query "burger king restaurant" → pessoa aleatória comendo), cortadas e fora de contexto. Decisão do dono: turbinar o Pexels — a busca pelo sujeito concreto (incl. marca) traz resultados melhores; faltava curadoria e orientação correta.

## Decisão de arquitetura
- **Query pelo sujeito concreto:** o `recast_engine` passa a gerar `pexels_query` com o sujeito/marca real do slide (ex.: "burger king", "coca cola world cup"). Capa (HOOK) recebe query de curiosidade/criatividade.
- **Curadoria:** `pexels_service` busca 15 resultados e escolhe o melhor por match de contexto (texto `alt` da foto × termos da query).
- **Orientação por placeholder:** HOOK (painel lateral) → `portrait`; demais (faixa) → `landscape`. Elimina o corte.
- **Template:** faixa de imagem do CONTENT de 280px → 360px (aspecto menos extremo).

## Tarefas (Checklist)
- [x] `pexels_service`: `per_page=15` + curadoria por `alt` + parâmetro `orientation`.
- [x] `recast_engine`: `pexels_query` pelo sujeito concreto; HOOK com query de capa.
- [x] `orchestrate_carousel`: passa `orientation` conforme a variante do slide.
- [x] `ModeledCarouselSlide.tsx`: faixa de imagem do CONTENT ampliada.
- [x] Teste real no benchmark #2.

## Critérios de Aceite
- [x] **AC1:** `pexels_service` busca múltiplos resultados e cura o melhor por contexto.
- [x] **AC2:** Imagem buscada com a orientação correta do placeholder (portrait/landscape).
- [x] **AC3:** `pexels_query` reflete o sujeito concreto do slide; capa tem query própria.
- [x] **AC4:** Render do benchmark #2 sem imagens cortadas perdendo o assunto.

## Escopo
**IN:** `pexels_service.py`, `recast_engine.py` (prompt), `orchestrate_carousel.py`, `ModeledCarouselSlide.tsx`.
**OUT:** IA generativa; scraping de notícia real.

## Dev Agent Record
### File List
- `squads/virals-marketing-squad/tools/pexels_service.py`
- `scripts/modeling/recast_engine.py`
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py`
- `apps/creative-design/src/components/design-system/templates/ModeledCarouselSlide.tsx`

## QA Results
**Gate:** PASS · @qa · 2026-05-16 — AC1–AC4 verificados via render real do benchmark #2.

## Change Log
- 2026-05-16 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
