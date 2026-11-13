# MKT-MC6-02: DataCardSlide.tsx (single número-herói)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um componente React `DataCardSlide` que renderize um post único com NÚMERO GIGANTE (280-340px) como herói + contexto curto + call-to-think
**Para que** o template `single-data` do `templates.yaml` do Tiago deixe de ser placeholder e sirva para métricas de bastidor / antes-depois numéricos

## Contexto
Tendência "cognitive interruption, not beauty" (Instagram 2026, PRO Campaigns) reforça que números concretos como herói visual são o gatilho de parada de scroll mais eficaz para founders D2C. Spec em `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.2).

## Tarefas (Checklist)
- [x] Criar `apps/creative-design/src/components/design-system/templates/DataCardSlide.tsx`
- [x] Props: `kicker?, number, unitSuffix?, headline, bodyText?, callToThink?, backgroundImage?, accentColor?, numberFontSize?, headlineFontSize?`
- [x] Layout: kicker pequeno âmbar (Outfit Bold 18px tracking-wide) no topo; número centralizado vertical (Outfit Black 280-340px); unitSuffix lateral menor (60-80px); halo âmbar atrás do número (blur 180px opacity 0.25); contexto headline (40-48px); body (Regular 26-30px @ 70% white); call-to-think no rodapé (Medium 22px âmbar); assinatura `@tiagoelesbao`
- [x] Suporta `backgroundImage` opcional com overlay 0.70
- [x] `PremiumBackground theme="dark"` quando sem imagem
- [x] Adicionar `DataCardSlide.stories.tsx` com 2 stories (default + com bg image)

## Critérios de Aceite
- [x] Componente renderiza sem erro em Storybook
- [x] Número gigante centralizado vertical, halo âmbar visível atrás
- [x] unitSuffix renderiza imediatamente à direita do número, alinhado verticalmente
- [x] callToThink em âmbar, separado por linha sutil do body
- [x] Aceita `numberFontSize` para override manual no editor

## Out of Scope
- Wire-up em `app/render/page.tsx` (→ MKT-MC6-05)
- Atualização do `templates.yaml` (→ MKT-MC6-05)

## Referências
- Spec: `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.2 — TIAGO-DATA-HERO)
- Patterns: `SinglePostSlide.tsx`
- Trend research: PRO Campaigns · "Cognitive interruption, not beauty"
