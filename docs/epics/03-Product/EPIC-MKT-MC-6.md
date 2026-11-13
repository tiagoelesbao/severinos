# EPIC-MKT-MC-6: Tiago Templates Pack (Fase B2)

## Visão Geral
Entregar os 4 componentes React dedicados que dão substância visual ao perfil pessoal `@tiagoelesbao` no pipeline `*design-creative`. Substituir os 2 placeholders `fase_b2_pending` do registry (`carousel-step` + `single-data`) e adicionar 2 templates novos (`carousel-founder-diary` + `single-provocation`) que cobrem o pillar mix de bastidor 40% / lessons 25% / mindset 20% / mercado 15%.

Os templates são derivados de pesquisa de tendências 2026 (founder personal brand, Hormozi-style numbered framework, "This Is Who" humanizing, photo dump pattern) calibrados para a brand-identity de Tiago: arquétipo Herói, voz Hormozi/GaryVee-direta, paleta preto + âmbar, tipografia Outfit.

## Status: ✅ COMPLETE
**Epic ID:** MKT-MC-6
**Owner:** @ux-design-expert (design), @dev (React build)
**Priority:** Medium
**Spec source:** `data/clients/tiago-elesbao/templates-spec-fase-b2.md`
**Início:** 2026-05-23
**Conclusão:** 2026-05-23

## Contexto
A Fase B1 (concluída em EPIC-MKT-MC-4) entregou o registry `templates.yaml` per cliente com 3 templates por output_type, mas 2 deles (`carousel-step` e `single-data`) ficaram como placeholders apontando para componentes vizinhos (`ModeledCarouselSlide` e `SinglePostSlide` respectivamente) — ou seja, o usuário pode escolher esses templates no fluxo de 6 passos, mas o visual ainda é o dos templates antigos.

Adicionalmente, a pesquisa de tendências mostrou que faltam dois formatos comprovadamente performáticos para founder personal brand: o "founder diary" (foto raw + frase curta, polaroid digital) e o "provocation hero" (quote provocativo + assinatura formal). Esses entram como 4º template de carousel e single respectivamente.

## Problema
- 2 placeholders no `templates.yaml` do Tiago confundem o usuário (escolhe "Step List" mas vê visual de "News Digest")
- Pillar mix de Tiago não é totalmente coberto: mindset-mitos (20%) e bastidor-recorrente (subset do 40%) ficam sem template dedicado
- Tendências 2026 (números-herói gigantes, photo-dump diário, framework numerado) não têm representação visual nos templates atuais

## Objetivo
1. `StepListSlide.tsx` — carrossel numerado (HOOK + STEP × N + CTA_THINK), número GIGANTE no slide tipo Hormozi
2. `DataCardSlide.tsx` — single com número-herói (280-340px), unidade lateral, contexto + call-to-think
3. `FounderDiarySlide.tsx` — carrossel polaroid-digital (foto raw bastidor + frase + data + grain sutil)
4. `ProvocationHeroSlide.tsx` — single com quote provocativo grande + assinatura formal "Tiago Elesbão · Founder"
5. `templates.yaml` do Tiago atualizado: 4 entradas `preview_status: ready` substituindo os pending; `scoring_match` atualizado com os 2 novos
6. `app/render/page.tsx` switch atualizado com 4 novos `templateId` cases
7. Storybook stories para cada componente (cobertura de variants principais)

## KPIs de Sucesso
- [x] `python design_creative.py --list-templates --client=tiago-elesbao` mostra 4 carousel + 4 single, todos `preview_status: ready`
- [x] `*design-creative` rodado contra benchmark real do Tiago produz output com paleta preto+âmbar consistente para os 4 templates novos
- [x] Storybook tem ao menos 1 story por componente (StepList HOOK/STEP/CTA, DataCard com/sem bg image, Diary com 4 fotos, Provocation com/sem background)
- [x] Léxico-tabu nunca aparece em defaults/placeholders dos componentes
- [x] Safe-zone 60px respeitada em todos os 4 (medido visualmente em render 1080×1350)

## Roadmap (Stories)
- [x] **MKT-MC6-01**: `StepListSlide.tsx` (carrossel numerado tipo Hormozi)
- [x] **MKT-MC6-02**: `DataCardSlide.tsx` (single número-herói)
- [x] **MKT-MC6-03**: `FounderDiarySlide.tsx` (carrossel polaroid-digital)
- [x] **MKT-MC6-04**: `ProvocationHeroSlide.tsx` (single quote provocativo)
- [x] **MKT-MC6-05**: Wire-up (templates.yaml + render switch + smoke test)

## Dependências
- **EPIC-MKT-MC-4** (Templates Registry) — `templates.yaml` precisa estar funcional para receber os updates
- **EPIC-MKT-Design-System (VVS)** — convenções dos componentes existentes (1080×1350, Tailwind, BrandingLogo, PremiumBackground)
- **Spec aprovado:** `data/clients/tiago-elesbao/templates-spec-fase-b2.md`

## Decisões Tomadas (Spec)
- **Shared React + per-client styling:** os 4 componentes são genéricos React; a paleta vem do brand-config do Tiago. NÃO duplicar componentes per-cliente
- **Outfit Black para números gigantes:** já está em `/assets/fonts/`, não precisa baixar fonte nova
- **Grain via SVG noise overlay** (sem dependência extra)
- **Exclusivos Tiago:** os 4 templates novos NÃO aparecem no `templates.yaml` de Virals (Virals tem outra agenda visual e mantém seus 3 atuais por enquanto)

## Decisões em Aberto
- [x] DataCard precisa de variant para 2 números encadeados? (default: NÃO na v1)
- [x] FounderDiary precisa de variant landscape (1080×1080)? (default: NÃO — manter 1080×1350)
- [x] Provocation precisa de variant com foto/sem foto separados? (default: SIM via prop opcional `backgroundImage`)

## Riscos
- **Drift entre Storybook e produção:** mitigar com smoke test final rodando `*design-creative` real
- **Fonte Outfit-Black ausente:** verificar antes do build (`assets/fonts/Outfit-Black.ttf` deve existir; se não, ajustar size para Bold)

## Referências
- Spec completo (mockups ASCII, props interfaces, 5 trends-âncora citados): `data/clients/tiago-elesbao/templates-spec-fase-b2.md`
- Existing patterns: `apps/creative-design/src/components/design-system/templates/{ModeledCarouselSlide,QuoteSlide,SinglePostSlide}.tsx`
- Brand-identity: `data/clients/tiago-elesbao/brand-identity.yaml` (arquétipo Herói, léxico-tabu, pilares)
- Brand-config: `data/clients/tiago-elesbao/brand-config.yaml` (paleta + tipografia)

---
*4 templates novos, lente Tiago Elesbão, calibrados para 2026.*
