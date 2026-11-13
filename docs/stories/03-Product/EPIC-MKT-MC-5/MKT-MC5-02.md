# MKT-MC5-02: Tabs de cliente no editor (transicional)

## Status
Done · Superseded by MKT-MC5-03 (substituída pelo two-screen flow)

## Story
**Como** usuário do editor
**Eu quero** alternar entre clientes sem sair da tela do editor
**Para que** posso navegar entre criativos de marcas diferentes rapidamente

## Contexto
Primeira tentativa de UX multi-cliente no editor: tabs horizontais compactas no topo da sidebar (`Todos · N | Virals · 5 | Tiago · 2`). O dono testou e ajustou direção: prefere uma tela de seleção dedicada com tiles grandes (MKT-MC5-03), mais clara para o estado mental de "qual cliente estou trabalhando".

Esta story é mantida como Done na história para documentar o caminho percorrido e o motivo da mudança.

## Tarefas (Checklist)
- [x] Adicionar state `selectedClient`, `clients`, `totalBriefs` no editor
- [x] Renderizar tab bar com botões compactos (Todos + 1 por cliente, com count)
- [x] Tab ativa estilizada com border + bg coral
- [x] Filtrar briefs visíveis: `briefs.filter(b => !selectedClient || b.client?.slug === selectedClient)`
- [x] Badge do cliente em cada brief card quando "Todos" está selecionado
- [x] Cabeçalho dinâmico mostra cliente ativo + count

## Critérios de Aceite
- [x] Tabs aparecem no topo da sidebar do editor
- [x] Clicar em uma tab filtra a lista de briefs
- [x] Tab "Todos" mostra todos os briefs com badge de cliente
- [x] UX validada pelo dono (que então pediu mudança para two-screen)

## Decisão de Substituição (2026-05-23)
Após teste do dono, a UX foi considerada "funcional, mas não comunica hierarquia". Substituída por MKT-MC5-03 (two-screen flow com tiles grandes em `/` + back button no editor). Os componentes desta story foram REMOVIDOS do `editor/page.tsx` quando MKT-MC5-03 entrou.

## Out of Scope
- Tela de seleção dedicada (→ MKT-MC5-03)

## Referências
- Commit/diff que removeu as tabs: presente no histórico do `editor/page.tsx`
- Sucessor: `docs/stories/03-Product/EPIC-MKT-MC-5/MKT-MC5-03.md`
