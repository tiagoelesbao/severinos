# Template: SinglePostSlide (single-post)

**Template ID:** `single-post`
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Workflow:** `design-creative.workflow.md` (PHASE-6)
**Source (React):** `apps/creative-design/src/components/design-system/templates/SinglePostSlide.tsx`

## Arquétipo

Post único de insight/notícia — imagem em destaque no topo + headline e corpo abaixo.

## Props essenciais

- `headline` / `subHeadline` / `bodyText` (string)
- `mainObjectImage` (path) — imagem destaque (1 imagem por post)
- `accentColor` (hex)
- Overrides do Editor: `headlineFontSize`, `bodyFontSize`, `imageZoom`, `imagePosX`, `imagePosY`

## Canvas

- **1080×1350** (4:5).
- Header `h-[176px]` (respiro generoso da logo) · Imagem `h-[640px]` · Texto `flex-1` · Footer `h-[96px]`.

## Quando usar

- `ctype=single` ou usuário escolhe "Post único de insight".
- Forçar via `--template=single-post` (no fluxo carousel).
