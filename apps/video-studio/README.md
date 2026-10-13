# video-studio

Editor de vídeo viral on-brand — **Fase B** do `EPIC-MKT-Video-Creative`. O
equivalente em vídeo do `apps/creative-design`: consome o plano + materiais da
Fase A e automatiza a montagem (timeline, FX, legendas), com ajuste fino e export.

## Arquitetura (decisão do dono · 2026-06-21)
**Remotion standalone + UI Next separada.** No mesmo app:
- **Motor (`src/remotion/`):** composições Remotion, render headless — desacoplado
  do Next (própria entry `src/remotion/index.ts`).
- **UI (`src/app/`):** Next (placeholder nesta story; editor de timeline na MVC-10),
  usa `@remotion/player` só para preview.

React 19 é compartilhado (Next 16 e Remotion 4 ambos suportam) — sem conflito de versão.

## Scripts
| Comando | O que faz |
|---------|-----------|
| `npm run studio` | Abre o Remotion Studio (preview interativo das composições) |
| `npm run render [slug]` | Render headless → mp4 on-brand em `outputs/<slug>/video-renders/` |
| `npm run dev` | Sobe a UI Next (landing + /studio placeholder) |
| `npm run build` | Build do Next (UI) |
| `npm run typecheck` | `tsc --noEmit` |

`slug`: `virals` (default) ou `tiago-elesbao` — define as cores via `brand-config.yaml`.

## Estado (MVC-07)
Scaffold + composição base 1080×1920@30 on-brand + render headless. As features
reais entram em sequência:
- **MVC-08** — ingestão do `video-brief` + material → timeline auto-montada
- **MVC-09** — biblioteca de FX (hook, transições, legendas word-by-word, motion)
- **MVC-10** — editor de timeline `/studio`
- **MVC-11** — export mp4 + persistência (DaVinci opcional)

> Outputs (mp4/projetos) vão para `outputs/` (gitignored — regeneráveis).
