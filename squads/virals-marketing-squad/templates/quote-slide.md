# Template: QuoteSlide (quote-slide)

**Template ID:** `quote-slide`
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` (PHASE-6)
**Source (React):** `apps/creative-design/src/components/design-system/templates/QuoteSlide.tsx`

## Arquétipo

Aspiracional/motivacional — quote centralizada full-bleed (1 ou poucos slides).

## Props essenciais

- `headline` (string) — a quote propriamente dita
- `subHeadline` (string) — autor / contexto
- `mainObjectImage` (path) — fundo full-bleed esmaecido (opcional)
- `accentColor` (hex) — barra de acento

## Canvas

- **1080×1350** (4:5).
- `items-center justify-center` — quote centralizada.

## Quando usar

Quando `plan.archetype_final == 'quote'` OU usuário escolhe "Aspiracional / motivacional" no seletor do Chief.
