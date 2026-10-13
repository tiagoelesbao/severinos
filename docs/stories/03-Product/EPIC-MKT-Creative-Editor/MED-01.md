# MED-01: Editor Shell + Carregar Criativo

**Status:** Done
**Epic:** EPIC-MKT-Creative-Editor
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** Marketing Chief
**Eu quero** uma rota `/editor` que lista os criativos e mostra o preview ao vivo
**Para que** eu tenha a base do editor para, nas próximas stories, fazer o ajuste fino.

## Contexto
1ª story do EPIC-MKT-Creative-Editor. Entrega o shell: rota, API de leitura dos briefs e preview read-only dos slides.

## Decisão de arquitetura
- App `apps/creative-design` (Next.js 16, App Router). Parser `yaml` instalado.
- `GET /api/briefs` — lista os `brief-v5-*.yaml` (id, arquétipo, nº de slides).
- `GET /api/briefs/[id]` — lê um brief YAML → JSON.
- `/editor` (client component) — seletor de criativo + preview dos slides reusando os componentes de template (`ModeledCarouselSlide` / `QuoteSlide` / `SinglePostSlide`), escalados.
- MED-01 é read-only; imagens entram na MED-03; edição na MED-02.

## Tarefas (Checklist)
- [x] Instalar parser `yaml` no app.
- [x] `api/briefs/route.ts` — lista de briefs.
- [x] `api/briefs/[id]/route.ts` — brief individual.
- [x] `editor/page.tsx` — seletor + preview ao vivo.
- [x] Roteamento de template por arquétipo no preview.
- [x] Teste: API responde, página renderiza.

## Critérios de Aceite
- [x] **AC1:** `/api/briefs` retorna a lista de criativos disponíveis.
- [x] **AC2:** `/api/briefs/[id]` retorna o brief em JSON.
- [x] **AC3:** `/editor` lista os criativos e, ao selecionar, mostra o preview dos slides.
- [x] **AC4:** O preview usa o template correto por arquétipo.
- [x] **AC5:** Sem novos erros `tsc` nos arquivos criados.

## Escopo
**IN:** `api/briefs/*`, `editor/page.tsx`.
**OUT:** Edição de texto (MED-02); imagens (MED-03); export (MED-04).

## Dev Agent Record
### File List
- `apps/creative-design/src/app/api/briefs/route.ts` (novo)
- `apps/creative-design/src/app/api/briefs/[id]/route.ts` (novo)
- `apps/creative-design/src/app/editor/page.tsx` (novo)
- `apps/creative-design/package.json` (dep `yaml`)

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
