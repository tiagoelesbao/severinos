# MKT-MC6-04: ProvocationHeroSlide.tsx (single quote provocativo + assinatura formal)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um componente React `ProvocationHeroSlide` que renderize um post único com quote PROVOCATIVO em fonte gigante + assinatura formal "Tiago Elesbão · Founder · Virals"
**Para que** o pillar mindset-mitos 20% do Tiago tenha um template diferenciado do `single-quote` (que é aspiracional, estilo GaryVee)

## Contexto
O `single-quote` atual usa o `QuoteSlide` (estilo aspiracional/GaryVee). Para Tiago, é importante ter um formato distinto para CRÍTICA AO STATUS QUO / quebra de mitos — call-to-think direto, sem rodeio. Spec em `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.4).

## Tarefas (Checklist)
- [x] Criar `apps/creative-design/src/components/design-system/templates/ProvocationHeroSlide.tsx`
- [x] Props: `quote, authorName ('Tiago Elesbão'), authorRole? ('Founder · Virals'), backgroundImage?, accentColor?, quoteFontSize?`
- [x] Layout: quote ocupa 80% da largura, fonte Outfit Black 96-130px (depende do tamanho do texto), line-height 1.04; abaixo um traço-divisor âmbar curto seguido do nome (Outfit Bold 32px) + role abaixo (Regular 22px); assinatura `@tiagoelesbao` no canto inferior direito
- [x] Background: preto sólido (default) OU foto bastidor com overlay 0.80 (denser que o padrão para garantir legibilidade do quote gigante)
- [x] Adicionar `ProvocationHeroSlide.stories.tsx` com 2 stories (sem bg + com bg foto)

## Critérios de Aceite
- [x] Componente renderiza sem erro em Storybook
- [x] Quote em Outfit Black com tamanho responsivo ao length (96-130px)
- [x] Traço-divisor âmbar de ~80px de largura antes da assinatura
- [x] authorRole opcional (omitido se não passado)
- [x] Overlay 0.80 garante legibilidade quando há `backgroundImage`
- [x] Diferenciação visual vs `QuoteSlide`: mais formal (assinatura tipo livro), texto mais largo (não centralizado), traço-divisor lateral

## Out of Scope
- Wire-up em `app/render/page.tsx` (→ MKT-MC6-05)
- Atualização do `templates.yaml` para adicionar como 4º template single (→ MKT-MC6-05)
- Variant com 2 quotes encadeados (anotado para iteração futura)

## Referências
- Spec: `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.4 — TIAGO-PROVOCATION-HERO)
- Diferenciação vs `QuoteSlide`: spec seção "Diferencial vs single-quote"
- Brand-identity: pillar `mindset-mitos` 20% + CTA-style `call-to-think`
