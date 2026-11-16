# MKT-MC6-01: StepListSlide.tsx (carrossel numerado Hormozi-style)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um componente React `StepListSlide` que renderize um slide de carrossel numerado (HOOK + STEP × N + CTA_THINK) com número GIGANTE estilo Hormozi
**Para que** o template `carousel-step` do `templates.yaml` do Tiago deixe de ser placeholder e tenha visual dedicado

## Contexto
A pesquisa de tendências 2026 mostrou que carrosséis numerados (cada slide = 1 passo + número visual gigante) têm completion rate alto e são o formato-âncora do estilo Hormozi. A spec completa está em `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.1).

## Tarefas (Checklist)
- [x] Criar `apps/creative-design/src/components/design-system/templates/StepListSlide.tsx`
- [x] Props interface conforme spec: `slideNumber, totalSlides, variant: 'HOOK' | 'STEP' | 'CTA_THINK', stepNumber?, headline, bodyText?, backgroundImage?, accentColor?, headlineFontSize?, bodyFontSize?`
- [x] Variant HOOK: foto raw bastidor full-bleed + overlay preto 0.60 + headline em âmbar (Outfit Black 76-100px) + body curto + assinatura `@tiagoelesbao`
- [x] Variant STEP: número GIGANTE (Outfit Black 200px) na esquerda; linha âmbar 4px abaixo; acento vertical; título do passo (Outfit Black 56px) + body (Regular 28px); indicador slide N/N + assinatura no rodapé
- [x] Variant CTA_THINK: pergunta gigante centralizada (Outfit Black 80-110px) + linha âmbar curta + assinatura
- [x] 1080×1350, safe-zone 60px respeitada
- [x] Background: `PremiumBackground theme="dark"` quando não há imagem (variant STEP / CTA_THINK)
- [x] Adicionar `StepListSlide.stories.tsx` com 3 stories (HOOK, STEP, CTA_THINK)

## Critérios de Aceite
- [x] Componente renderiza sem erro em Storybook nas 3 variants
- [x] Número gigante (variant STEP) usa Outfit-Black 200px (verificar fonte existe; senão fallback Bold)
- [x] Safe-zone visível em mockup (medir border de 60px sem conteúdo)
- [x] Default `accentColor = '#FFB800'` (âmbar Tiago)
- [x] Aceita `headlineFontSize`/`bodyFontSize` overrides do editor

## Out of Scope
- Wire-up em `app/render/page.tsx` (→ MKT-MC6-05)
- Atualização do `templates.yaml` (→ MKT-MC6-05)

## Referências
- Spec: `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.1 — TIAGO-NUMBERED-FRAMEWORK)
- Patterns de referência: `ModeledCarouselSlide.tsx`, `QuoteSlide.tsx`
- Pesquisa de trend: AI Maker · Hormozi posta 250+/semana (carrossel numerado)
