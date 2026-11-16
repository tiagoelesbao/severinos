# MKT-MC5-01: API /api/briefs com cliente resolvido + filtro

## Status
Done

## Story
**Como** frontend do editor
**Eu quero** que `/api/briefs` me devolva cada brief com `{client: {slug, display}}` resolvido + uma lista `clients[]` com counts
**Para que** eu possa renderizar a tela de seleção de cliente + filtrar a sidebar do editor server-side via `?client=<slug>`

## Contexto
A API original retornava apenas `{briefs: [{id, file, archetype, slideCount, theme}]}` sem informação de cliente. Para a UX two-screen, o frontend precisa:
1. Saber QUE clientes existem (para a tela de seleção)
2. Saber QUAL cliente cada brief pertence (para mostrar badge na lista)
3. Filtrar a lista por cliente (server-side via query param)

## Tarefas (Checklist)
- [x] `resolveClient(brief)`: extrai cliente via cascata (1) `client_slug` direto; (2) parse de `carousel_brief.brand_config` path com regex `/clients\/([^\\/]+)\/brand-config/`; (3) fallback `virals`
- [x] `loadClientDisplayMap()`: lê `_registry.yaml` e retorna `{slug: nome_exibicao}` para enriquecer a resposta
- [x] GET handler aceita `?client=<slug>` para filtrar briefs server-side
- [x] Resposta: `{briefs: [...], clients: [{slug, display, count}], total: <int>}`
- [x] `clients[]` ordena por ordem do registry (clientes oficiais primeiro, depois clientes descobertos via briefs)
- [x] Cada brief em `briefs[]` inclui `client: {slug, display}`

## Critérios de Aceite
- [x] `curl http://localhost:3001/api/briefs` retorna estrutura nova (não quebra back-compat — frontend antigo recebe campos extras)
- [x] `curl http://localhost:3001/api/briefs?client=tiago-elesbao` filtra para apenas briefs do Tiago
- [x] Briefs sem `client_slug` no YAML caem em `virals` (back-compat com briefs legados)
- [x] `clients[].count` é consistente com `briefs[]` filtrados (count = total não-filtrado)

## Out of Scope
- UI da tela de seleção (→ MKT-MC5-03)
- Tabs no editor (→ MKT-MC5-02, transicional)

## Referências
- API: `apps/creative-design/src/app/api/briefs/route.ts`
- Registry: `data/clients/_registry.yaml`
