# VEX-11: Export batch "1 body × 3 hooks" — variantes A/B direto do plano

**Status:** InProgress — inc.1 (detecção + modelo + troca de variante + seletor) entregue; export batch e avisos E1 pendentes
**Epic:** EPIC-MKT-Video-Excellence (F4 — Diferencial IA-first + escala)
**Prioridade:** **P2** — a estratégia central da pesquisa-âncora ("1 body, 3 hooks") hoje morre no papel do plano
**Complexidade:** M (Standard — 8 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** Marketing Chief testando criativos
**Eu quero** gravar 3 hooks (as 3 variantes do plano), soltar os arquivos na pasta e exportar de uma vez 3 mp4s — mesmo corpo, hooks diferentes
**Para que** o teste A/B de hook (a alavanca nº 1 de retenção) seja um clique, não 3 edições manuais.

## Contexto (evidência da auditoria)
- A Fase A entrega `hook.variants[3]` (gate V1 exige ≥3), mas a Fase B ingere UM arquivo de hook (`classifyRole` → 1 clipe "hook") e nada usa as variantes.
- O epic-pai declarava a estratégia "1 body, 3 hooks" como princípio herdado — sem implementação em produção.

## Decisão de arquitetura (proposta)
- **Convenção de captura:** `hook-1.mp4`, `hook-2.mp4`, `hook-3.mp4` (ou marcação no `assembly.clips[]` da VEX-02/06: `role: "hook", variant: 1..3`). O `_COMO-GRAVAR.md` (VEX-02) já instrui os nomes.
- **Modelo:** `timeline.hookVariants?: { file, transcriptKey, durationInFrames }[]`; a timeline principal usa a variante ATIVA (`activeHookVariant: number`). Trocar a variante recompõe a espinha (o hook é talking-head com duração própria — narração/inserts re-ancoram automaticamente pelo `withVideoTrack` existente).
- **UI:** seletor de variante de hook no inspector do clipe hook (H1/H2/H3 + preview rápido); legendas do hook re-derivadas do transcript da variante (`buildRealCaptions` já é por arquivo).
- **Export batch:** no fluxo da VEX-01, opção "Exportar 3 variantes" → itera as variantes, renderiza `export-h1.mp4`, `export-h2.mp4`, `export-h3.mp4` (jobs sequenciais com progresso agregado). Nome inclui o `text_overlay` da variante (slug curto) para identificação no Ads Manager.
- **Degradação:** 1 só hook gravado → comportamento atual, UI não mostra o seletor.

## Tarefas (Checklist)
- [x] Convenção/detecção de múltiplos hooks (`hook-*.mp4` por `role === "hook"`): mantém 1 na espinha, coleta as demais como `hookVariants` (ingest). Verificado (2 hooks → 1 no track + 2 variantes).
- [x] `hookVariants` no modelo (clip + legendas por variante, preenchidas na rota via `wordsToCaptions`) + `switchHookVariant` puro (swap + recompose + re-timing das legendas do corpo) undoable. Teste de round-trip.
- [x] Seletor de variante (H1/H2/H3) no inspector do hook, com duração; troca client-side preserva o corpo.
- [ ] Export batch das variantes no worker da VEX-01 (nomes identificáveis + resumo final).
- [ ] Auditoria E1: aviso se as variantes divergem demais em duração (> 2s) ou se falta transcript de alguma.
- [ ] E2E: criativo com 3 hooks gravados → 3 mp4s exportados, cada um com legendas do próprio hook.

## Critérios de Aceite
- [x] **AC1:** `hook-*.mp4` na pasta → o Studio detecta as variantes e abre com a 1ª ativa. ✓ verificado (2 hooks → seletor H1/H2, H1 ativa).
- [x] **AC2:** Trocar para H2 re-monta a timeline (durações/âncoras corretas) e as legendas do hook trocam para a fala da variante. ✓ switch verificado (Ativa H1→H2); re-timing das legendas coberto por teste puro.
- [ ] **AC3:** "Exportar 3 variantes" gera 3 mp4s com corpo idêntico (bit a bit no miolo não é exigido; conteúdo/timing sim) e hooks distintos.
- [x] **AC4:** Edições do corpo (miolo/CTA/camadas) valem para as variantes sem retrabalho — a troca é client-side pura (só o hook + suas legendas mudam; o resto do timeline editado é preservado). ✓ por construção.
- [x] **AC5:** Criativo com 1 hook segue 100% igual — `hookVariants` só é anexado com >1 hook; o seletor não aparece. ✓.

## Escopo
**IN:** detecção de variantes, troca ativa, export batch, avisos E1.
**OUT:** variação de CTA/corpo (só hook); publicação automática nas plataformas (futuro); relatório de performance por variante (dashboards de outra squad).

## Dependências
- **VEX-01** (export) e **VEX-02** (assembly/transcrição automáticos). Beneficia-se da VEX-06 (papéis pelo plano).

## Riscos
- **[Baixo] Hooks com durações muito diferentes** mudam o tamanho total — é o esperado; o aviso E1 cobre exageros.
- **[Baixo] Cache de transcript por variante:** já resolvido pela transcrição por arquivo (VEX-02).

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-05 — Claude (@dev) — Inc.1 (detecção + troca): ingest detecta `hook-*.mp4` (mantém 1 na espinha + `hookVariants`); rota preenche legendas por variante (`wordsToCaptions`); `switchHookVariant` puro (swap+recompose+re-timing) com teste; seletor H1/H2/H3 no inspector. AC1/AC2/AC4/AC5 ✓. Typecheck, `next build`, 138 testes. Verificado via fixture (2 hooks) + Playwright, fixture removida. Draft → InProgress.

### File List (inc.1 — detecção + troca de variante)
- `src/lib/timeline.ts` (`HookVariant` + `hookVariants`/`activeHookVariant`)
- `src/lib/ingest.ts` (`hookVariantClip` + detecção em `ingestCreative`, opt `activeHook`)
- `src/lib/transcript.ts` (`wordsToCaptions` exportado)
- `src/lib/editorState.ts` (`switchHookVariant`) + `editorState.test.ts` (teste)
- `src/app/api/timeline/route.ts` (legendas por variante via `wordsToCaptions`)
- `src/app/studio/page.tsx` (seletor de variante no inspector do hook)
