# MKT-MC6-03: FounderDiarySlide.tsx (carrossel polaroid-digital com photo dump)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um componente React `FounderDiarySlide` que renderize um slide de carrossel estilo polaroid digital — foto raw em frame arredondado + frase curta da lição daquele momento + data
**Para que** o pillar bastidor 40% do mix do Tiago tenha um template recorrente próprio (série semanal)

## Contexto
Tendência "Photo dump" 2026 (Krumzi · 15 Carousel Ideas) mostra que mistura de foto polida + foto raw de celular gera 3× mais saves. Para Tiago (founder real, voz Hormozi-direta), o formato bastidor recorrente é o coração do pillar mix (40% do calendário). Spec em `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.3).

## Tarefas (Checklist)
- [x] Criar `apps/creative-design/src/components/design-system/templates/FounderDiarySlide.tsx`
- [x] Props: `slideNumber, totalSlides, photo (obrigatório), caption, dateLabel?, imageZoom?, imagePosX?, imagePosY?, grainIntensity?: 'none' | 'subtle' | 'strong'`
- [x] Layout: foto NÃO full-bleed — frame com bordas arredondadas (24-32px), simulando polaroid digital; margem de respiro 60-80px nas laterais; abaixo da foto a frase principal (Outfit Bold 40-52px); data abaixo (formato "DD/MM · contexto curto", Outfit Regular 22px); assinatura `@tiagoelesbao` no canto inferior direito
- [x] Implementar grain via SVG noise overlay (componente interno reusável) — sem dependência extra
- [x] Implementar vinheta sutil (radial gradient escuro nas bordas)
- [x] `PremiumBackground theme="dark"` no fundo (fora da polaroid)
- [x] Adicionar `FounderDiarySlide.stories.tsx` com 3 stories (foto vertical, foto quadrada, sem dateLabel)

## Critérios de Aceite
- [x] Componente renderiza sem erro em Storybook
- [x] Frame da foto com bordas arredondadas claramente visíveis (não full-bleed)
- [x] Grain sutil aplicado (controlável via prop)
- [x] Vinheta nas bordas da foto perceptível mas não distrai
- [x] Caption com Outfit Bold 40-52px abaixo da foto
- [x] dateLabel renderizado quando passado; omitido quando ausente
- [x] Aceita `imageZoom`, `imagePosX`, `imagePosY` para enquadramento

## Out of Scope
- Wire-up em `app/render/page.tsx` (→ MKT-MC6-05)
- Atualização do `templates.yaml` para adicionar como 4º template carrossel (→ MKT-MC6-05)
- Variants future (e.g., landscape 1080×1080)

## Referências
- Spec: `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 3.3 — TIAGO-FOUNDER-DIARY)
- Trend: Krumzi · "Photo dump" pattern 3× mais saves
- Brand-identity: pillar `backstage` 40% em `data/clients/tiago-elesbao/brand-identity.yaml`
