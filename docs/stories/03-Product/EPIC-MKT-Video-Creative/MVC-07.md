# MVC-07: Scaffold `apps/video-studio` (Next.js + Remotion) + composição base

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase B)
**Complexidade:** L (Standard — 8 pontos)
**Criada por:** @sm (River) · 2026-06-21
**Validada por:** @po (Pax) · 2026-06-21 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-21

## Story
**Como** Marketing Chief
**Eu quero** o app `apps/video-studio` scaffoldado com Remotion, composição base vertical e render headless
**Para que** as próximas stories tenham o esqueleto onde montar timeline, FX e export — o equivalente em vídeo do `creative-design`.

## Contexto
1ª story da Fase B. Espelha a arquitetura de `apps/creative-design` (Next.js 16 + App Router), mas o motor é **Remotion** (decisão do dono). Entrega o esqueleto runnable: um app que renderiza um mp4 vertical "hello world" on-brand, provando o pipeline Next+Remotion antes de qualquer feature.

## Decisão de arquitetura
- `apps/video-studio/` — Next.js (mesma major do `creative-design`) + `remotion`, `@remotion/cli`, `@remotion/player`.
- `src/remotion/` — `Root.tsx` (registra composições) + `Composition` base 1080×1920 (9:16), fps 30.
- **Brand tokens:** lê `data/clients/<slug>/brand-config.yaml` (paleta/tipografia) → CSS vars/props da composição (mesmo padrão do `creative-design`). Cliente como input (default virals).
- `src/app/render/` — rota que monta a composição a partir de props (paridade com `creative-design/render`).
- Render headless via CLI: `npx remotion render` → mp4 em `outputs/<slug>/video-renders/` (gitignored, como `outputs/`).
- `/studio` fica como placeholder (editor completo é MVC-10).

## Tarefas (Checklist)
- [x] Scaffold `apps/video-studio` (package.json, next.config.ts, tsconfig, remotion.config.ts).
- [x] Instalar `remotion` + `@remotion/cli` + `@remotion/player` + `@remotion/bundler` + `@remotion/renderer` (v4.0.481).
- [x] `src/remotion/Root.tsx` + `BaseComposition.tsx` (1080×1920@30) + `index.ts` (registerRoot).
- [x] Loader de brand tokens (`src/lib/brand.ts` + leitura inline no render) → props da composição.
- [x] Render headless `scripts/render.mjs [slug]` → mp4 on-brand em `outputs/<slug>/video-renders/`.
- [x] `/studio` placeholder + landing + README do app.
- [x] Smoke: `npm run build` ✓ · `npx tsc --noEmit` ✓ · render mp4 válido ✓.

## Critérios de Aceite
- [x] **AC1:** `npm run build` (next build) → "Compiled successfully" + `tsc --noEmit` limpo.
- [x] **AC2:** Composição `BaseComposition` 1080×1920@30 registrada (`registerRoot`); ffprobe confirma 1080×1920, 90 frames/30fps = 3,05s.
- [x] **AC3:** Render headless → mp4 h264 válido (ffprobe: codec_name=h264, 206KB).
- [x] **AC4:** Cores vêm do `brand-config`: tiago accent=#FFB800 vs virals accent=#FF3D68 (renders distintos comprovados).
- [x] **AC5:** `outputs/<slug>/video-renders/base-composition.mp4` confirmado gitignored (`git check-ignore`).

## Escopo
**IN:** scaffold, composição base, brand tokens, render headless CLI.
**OUT:** ingestão de material (MVC-08); FX (MVC-09); editor UI (MVC-10); export final (MVC-11).

## Dependências
- App-referência: `apps/creative-design` (estrutura, padrão de brand tokens).
- `data/clients/<slug>/brand-config.yaml` (paleta/tipografia — já rastreado na Fase A).
- Remotion (`@remotion/*`). **Habilita:** MVC-08, MVC-09.

## Decisão de arquitetura RESOLVIDA (dono · 2026-06-21)
**Remotion standalone + UI Next separada.** No mesmo app `apps/video-studio`, o Remotion roda como projeto próprio (sua config, versão React suportada pelo Remotion, render via `npx remotion render`). A UI `/studio` é Next e usa `@remotion/player` apenas para preview. **Desacopla versões — sem forçar a major do `creative-design`.** Isto sobrepõe qualquer menção a "mesma major do creative-design" no corpo da story.

## Riscos (PO)
- **[Resolvido] Compat Next-major × Remotion:** endereçado pela decisão acima (desacoplamento). Não bloqueia.
- **[Baixo] Render headless no Windows:** `remotion render` usa Chromium headless; validar que builda/renderiza no ambiente do dono (não só WSL).

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- **Decisão honrada:** Remotion standalone (`src/remotion/` + `scripts/render.mjs`) desacoplado da UI Next (`src/app/`). React 19 compartilhado (Next 16.2.6 + Remotion 4.0.481 coexistem sem conflito).
- **Render headless via `@remotion/bundler` + `@remotion/renderer`** (programático, não CLI) — dá controle sobre `inputProps` (brand tokens). Baixa Chrome Headless Shell na 1ª vez (~113MB, automático).
- **Brand tokens:** `render.mjs` lê `brand-config.yaml` do cliente (mesma fonte da Fase A) → cores no mp4. AC4 provado com 2 clientes (accent âmbar vs coral). `src/lib/brand.ts` é o módulo TS equivalente para uso da UI (MVC-10).
- **Fix de tipo (Remotion 4):** `Composition` exige props `Record<string, unknown>`; resolvido com cast no `component` + `satisfies BaseCompositionProps` nas defaultProps (mantém segurança nos valores).
- **`next build` reescreveu o tsconfig** (jsx `preserve`→`react-jsx`, +`.next/dev/types`) — comportamento normal do Next; typecheck segue limpo.
- **Não testado:** `@remotion/player` (preview na UI) — só entra de fato na MVC-10; nesta story `/studio` é placeholder.
- **CodeRabbit:** pré-commit (WSL) NÃO executado nesta sessão.

### File List
- `apps/video-studio/package.json` · `tsconfig.json` · `next.config.ts` · `remotion.config.ts` · `.gitignore` · `README.md` (novos)
- `apps/video-studio/src/remotion/{index.ts,Root.tsx,BaseComposition.tsx}` (novos)
- `apps/video-studio/src/lib/brand.ts` (novo)
- `apps/video-studio/src/app/{layout.tsx,page.tsx,studio/page.tsx}` (novos)
- `apps/video-studio/scripts/render.mjs` (novo)

## QA Results

**Gate:** ✅ **PASS** · @qa (Quinn) · 2026-06-21 — 1º gate da Fase B.

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ Estrutura limpa espelhando `creative-design`; Remotion desacoplado do Next conforme decisão; fix de tipo Remotion-4 bem resolvido (cast + `satisfies`) |
| 2 | Testes | ⚠️ Sem unitário; validação é **render real E2E** (mp4 dos 2 clientes) — aceitável p/ scaffold (ver Concern) |
| 3 | Critérios de aceite | ✅ AC1–AC5 verificados de forma independente (re-build + ffprobe + git check-ignore) |
| 4 | Sem regressões | ✅ App novo isolado; não toca código existente |
| 5 | Performance | ✅ Build ~1,4s; render base ~3s pós-Chromium |
| 6 | Segurança | ✅ Sem segredos hardcoded; 2 vulnerabilidades **moderate** (transitivas, npm) — monitorar |
| 7 | Documentação | ✅ README claro (arquitetura, scripts, roadmap) + story completa |

### Evidência (verificação independente)
- `tsc --noEmit` = 0 · `next build` = "Compiled successfully"
- mp4 **tiago** e **virals**: ambos 1080×1920 (ffprobe)
- **Versões Remotion idênticas** (4.0.481 em remotion/cli/player/bundler/renderer) — requisito do Remotion satisfeito
- AC4 comprovado: accent #FFB800 (tiago) vs #FF3D68 (virals), ambos do `brand-config`

### Concerns (advisory — não bloqueantes)
- **[Low · robustez] `src/lib/brand.ts` usa `process.cwd()`** (linha 20) para resolver o path dos clients — frágil quando a UI Next rodar de outro cwd. O `render.mjs` (que valida os ACs) usa path absoluto via `import.meta.url` (robusto). **Recomendação:** alinhar o `brand.ts` ao padrão do `render.mjs` antes de a UI consumi-lo na **MVC-10**.
- **[Low · testes] `brand.ts` sem unitário** (parse + fallback) — validado indiretamente pelo render. Sugiro teste quando virar dependência da UI.
- **[Low · deps] 2 vulnerabilidades moderate** (transitivas) — `npm audit` periódico.
- **[Low · processo] CodeRabbit** pré-commit não executado.

### Veredito
Scaffold sólido, decisão de arquitetura honrada e **validado com render real** (não fixture) nos 2 clientes. Versões Remotion consistentes. As 4 observações são Low/advisory; a do `process.cwd()` deve ser endereçada ao construir a UI (MVC-10). **PASS.** Próxima: MVC-08 (ingestão → timeline). Push pendente → @devops.

## Change Log
- 2026-06-21 — @sm (River) — Story criada (Draft).
- 2026-06-21 — @po (Pax) — Validada (GO 8/10); seção Riscos adicionada (compat Next×Remotion); Draft → Ready.
- 2026-06-21 — @po (Pax) — Decisão do dono travada: **Remotion standalone + UI Next separada** (desacoplado).
- 2026-06-21 — @dev (Dex) — Implementado scaffold + composição base + render headless; 5/5 ACs validados com render real (Remotion 4.0.481); Ready → Ready for Review.
