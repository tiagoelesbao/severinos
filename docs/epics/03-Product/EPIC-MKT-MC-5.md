# EPIC-MKT-MC-5: Editor Two-Screen UX (Client Picker + Editor)

## Visão Geral
Refatorar o editor `apps/creative-design` de uma única tela monolítica (sidebar lista TODOS os briefs) para um fluxo de **duas telas integradas**:
1. **Tela 1 — Client Picker:** landing `/` com blocos retangulares grandes por cliente (paleta da marca, contagem de criativos, hover state com glow)
2. **Tela 2 — Editor:** `/editor?client=<slug>` filtra briefs do cliente, com botão "← Trocar cliente" no topo da sidebar para voltar à seleção

A primeira tela serve como hub de entrada; ao escolher um cliente, abre o editor já contextualizado. Quem precisa alternar entre clientes faz isso com 1 clique pelo botão de voltar.

## Status: ✅ COMPLETE
**Epic ID:** MKT-MC-5
**Owner:** @ux-design-expert (UX), @dev (implementation)
**Priority:** Medium
**Início:** 2026-05-23
**Conclusão:** 2026-05-23

## Contexto
O editor anterior (`/editor`) mostrava na sidebar uma lista única de todos os briefs, sem distinção de cliente. Quando os pipelines passaram a produzir criativos para múltiplos clientes (Virals + Tiago Elesbão a partir de MKT-MC-3 e MKT-MC-4), a UX virou um problema:
- Briefs de clientes diferentes misturados no scroll
- Sem indicação visual de a qual cliente cada criativo pertence
- Sem forma de focar em UM cliente para uma sessão de trabalho

A tentativa inicial foi tabs horizontais compactas no topo da sidebar (MKT-MC5-02). O dono ajustou: prefere duas telas integradas com seleção em tiles grandes (mais claro, melhor estado mental por sessão).

## Problema
- Briefs de clientes diferentes na mesma lista geram confusão visual
- Sem onboarding/contexto: usuário não sabe quantos criativos cada cliente tem
- Tabs compactas são funcionais mas não comunicam hierarquia (cliente = primeira decisão)
- Branding visual dos clientes (paletas distintas) não é aproveitado na navegação

## Objetivo
1. API `/api/briefs` resolve cliente por brief (via `client_slug` ou parse de `brand_config` path) e devolve lista de clientes detectados com count
2. `/` (landing) lista clientes em tiles grandes (2 colunas em sm+, 1 em mobile) com paleta da marca (Virals: coral+roxo; Tiago: âmbar+laranja-vermelho)
3. `/editor?client=<slug>` filtra briefs server-side; sem `?client`, redireciona para `/`
4. Editor mostra botão "← Trocar cliente" + cabeçalho enfatizando o cliente ativo
5. Mantém todas as features existentes do editor (preview reativo, font controls, image upload, export)

## KPIs de Sucesso
- [x] `/api/briefs` retorna `clients[]` + `total` + `briefs[]` com `client: {slug, display}` por brief
- [x] `/api/briefs?client=<slug>` filtra server-side
- [x] `/` substitui o boilerplate Next.js, renderiza tiles por cliente com paleta correta
- [x] Tiles têm hover state (glow âmbar/coral), contador de criativos, seta visual de navegação
- [x] `/editor` sem `?client` redireciona para `/`
- [x] Editor tem botão "Trocar cliente" no topo da sidebar (volta para `/`)
- [x] Briefs sem `client_slug` no YAML caem em `virals` por backward-compat (resolver via parse de `brand_config` path)
- [x] Tabs antigas (MKT-MC5-02) removidas da sidebar do editor (substituídas pelo two-screen flow)

## Roadmap
- [x] **MKT-MC5-01**: API `/api/briefs` retorna cliente resolvido + filtra por query
- [x] **MKT-MC5-02**: Tabs de cliente no editor (versão transicional — substituída)
- [x] **MKT-MC5-03**: Two-screen flow (Client Picker em `/` + Editor com back button)
- [x] **MKT-MC5-04**: Editor Preview reflete brand-agnostic (signature + paleta do brief no SlidePreview)

## Dependências
- **EPIC-MKT-MC** — `data/clients/_registry.yaml` é a fonte da lista de clientes ativos
- **EPIC-MKT-MC-3** + **EPIC-MKT-MC-4** — criam os briefs/criativos multi-cliente que justificam o switcher

## Decisões
- **Tiles grandes vs dropdown vs tabs:** tiles grandes (escolha do dono). Razões: melhor estado mental por sessão; aproveita paleta de cada marca; UI mais clara para 2-5 clientes ativos (que é o caso esperado)
- **Routing vs state:** routing com `?client=<slug>` (compartilhável via URL, deep-link friendly) vs state-only. Escolhido routing
- **Back to selection icon vs textual:** ícone (seta para esquerda) + texto "Trocar cliente" — combo de affordance visual + clareza
- **Tema visual dos tiles:** hardcoded `CLIENT_THEME[slug]` na page.tsx por enquanto. Futura iteração: ler de `brand-config.yaml` via API

## Riscos
- **Cliente novo sem entrada em `CLIENT_THEME`:** mitigado por fallback default no `getTheme()`. Acidente visual mínimo, função preservada
- **Backward compat de briefs antigos** (sem `client_slug` no YAML): resolver da API tenta parse de `brand_config` path; última instância usa `virals` como default

## Referências
- Frontend: `apps/creative-design/src/app/page.tsx` (landing), `src/app/editor/page.tsx` (editor)
- API: `apps/creative-design/src/app/api/briefs/route.ts`
- Tema visual: `CLIENT_THEME` em `page.tsx`

---
*Duas telas, uma decisão clara: qual cliente? Depois, o trabalho flui.*
