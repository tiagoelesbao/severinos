# Template: ModeledCarouselSlide (carousel-slide)

**Template ID:** `carousel-slide`
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` (PHASE-6)
**Source (React):** `apps/creative-design/src/components/design-system/templates/ModeledCarouselSlide.tsx`

## Arquétipo

Carrossel de notícia/conteúdo/digest — 3+ slides com variants HOOK | CONTENT | IMAGE_FOCUS | CTA.

## Props essenciais

- `slideNumber` / `totalSlides` (number)
- `variant` ('HOOK' | 'CONTENT' | 'IMAGE_FOCUS' | 'CTA')
- `headline` / `subHeadline` / `bodyText` (string)
- `mainObjectImage` (path) — imagem contextual (Pexels/AI/brand)
- `accentColor` (hex) — default `#FF5B3F` (Vermelho Sinal, paleta Aurora)
- `theme` ('dark' | 'light') — default `dark`
- Overrides do Editor: `headlineFontSize`, `bodyFontSize`, `imageZoom`, `imagePosX`, `imagePosY`

## Canvas

- **1080×1350** (4:5 — grade do Instagram).
- Safe-zone horizontal padrão: `px-20` (80px).
- Header `h-[120px]` · Footer `h-[96px]` · Content `flex-1`.

## Quando usar

Default para criativos com 3+ slides. Forçar via `--template=carousel-slide`.
