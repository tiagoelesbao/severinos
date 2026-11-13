# MKT-MC5-03: Two-Screen Flow (Client Picker em / + Editor com back button)

## Status
Done

## Story
**Como** usuário do editor
**Eu quero** uma tela inicial dedicada para escolher o cliente (com tiles grandes mostrando paleta da marca + contagem de criativos) e um botão claro para voltar a essa seleção quando estou editando
**Para que** a sessão de trabalho tenha estado mental claro (um cliente por vez) e a navegação entre marcas seja explícita

## Contexto
Sucessora da MKT-MC5-02 (tabs). O dono testou as tabs e pediu UX mais hierárquica: cliente como PRIMEIRA decisão da sessão, em sua própria tela, com visual rico (paleta da marca, count, hover state). O editor depois fica focado num cliente só, com volta clara.

## Tarefas (Checklist)
- [x] Substituir o boilerplate Next.js em `apps/creative-design/src/app/page.tsx` por uma página `ClientPickerPage` ('use client')
- [x] `CLIENT_THEME[slug]`: dicionário com `{accent, bg1, bg2, tagline}` por cliente — paletas Virals (coral+roxo) e Tiago (âmbar+laranja-vermelho)
- [x] Fetch de `/api/briefs` no mount, popular `clients[]` + `total`
- [x] Renderizar grid 1-col/2-col responsivo com tiles ≥220px de altura, cantos arredondados 16px, halo de cor da marca via blur radial
- [x] Cada tile: slug em uppercase tracking-wide; display name H2; count gigante na cor accent; tagline; "Abrir editor" + ícone seta
- [x] `router.push('/editor?client=<slug>')` no clique
- [x] Footer minimalista com link conceitual ao pipeline `*design-creative` e ao `_registry.yaml`
- [x] Estados: loading, error, empty (nenhum cliente)
- [x] Editor: `useSearchParams` lê `?client`; sem `?client` → `router.replace('/')`
- [x] Editor: refetch de briefs usa `/api/briefs?client=<slug>` (filtro server-side)
- [x] Editor: remover state `selectedClient`, `totalBriefs` (legacy das tabs)
- [x] Editor: botão "← Trocar cliente" no topo da sidebar com hover state (seta animada)
- [x] Editor: cabeçalho enfatiza cliente ativo em coral; `{visibleBriefs.length} criativos`
- [x] Editor: wrap em `<Suspense>` (requerido pelo Next 15 para `useSearchParams`)

## Critérios de Aceite
- [x] Abrir `localhost:3001/` mostra a tela de seleção com tiles dos clientes ativos
- [x] Clicar em um tile navega para `/editor?client=<slug>` com a sidebar já filtrada
- [x] Botão "Trocar cliente" no editor volta para `/`
- [x] `/editor` sem `?client` redireciona para `/`
- [x] Paleta de cada tile reflete a marca: Virals = coral; Tiago = âmbar
- [x] Hover state: halo intensifica (opacity 40→60), seta translada 0.5x
- [x] Editor sem tabs (substituídas pela tela inicial)

## Out of Scope
- Custom themes per-cliente lidos de `brand-config.yaml` via API (hoje `CLIENT_THEME` é hardcoded no frontend). Anotado para iteração futura
- Drag-and-drop entre clientes
- Múltiplas tabs/janelas simultâneas

## Referências
- Landing: `apps/creative-design/src/app/page.tsx`
- Editor: `apps/creative-design/src/app/editor/page.tsx`
- API consumida: `apps/creative-design/src/app/api/briefs/route.ts`
