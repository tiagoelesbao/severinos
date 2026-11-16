# VEX-06: Plano consumido de ponta a ponta — `edit_spec` pré-plotado + papéis dirigidos pelo plano

**Status:** InReview — **QA Gate: ✅ PASS** (gate file: `docs/qa/gates/VEX-06-edit-spec-papeis-plano.yml`)
**Epic:** EPIC-MKT-Video-Excellence (F2 — Qualidade do output)
**Prioridade:** **P1** — o plano prescreve zooms/inserts/motion e o editor ignora; a classificação de clipes só funciona para 1 formato de funil
**Complexidade:** M (Standard — 8 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** Marketing Chief
**Eu quero** que o editor abra o criativo com o `edit_spec` do plano já aplicado (zooms nos momentos planejados, inserts marcados, motion sugerido) e que a estrutura de papéis venha do PLANO — não de nomes de arquivo hardcoded
**Para que** a Fase A dirija de verdade a Fase B em qualquer formato de criativo, não só no funil hook→skill→…→cta.

## Contexto (evidência da auditoria)
1. **`edit_spec` órfão:** o plano (MVC-03) produz `edit_spec.zooms/transitions/inserts/motion_graphics` ("zoom na fala X", "insert @ momento Y"), mas a rota `/api/timeline` só consome `template_refs` e `sound_design`. O trabalho do LLM de planejar a edição é descartado.
2. **`classifyRole` hardcoded** (`ingest.ts:52`): regexes para hook/skill/reference/generation/result/cta — o vocabulário do caso Chase Chappell. Criativo com outra estrutura (ex.: talking-head puro, tutorial de 3 passos) cai em `unknown` e a ordem canônica deixa de fazer sentido.
3. O `soundPlan.ts` já resolve `momentToFrame` ("@3s", "beat_n:2", papel) + `snapToCut` — infra pronta para reusar com o `edit_spec`.

## Decisão de arquitetura (proposta)
- **Papéis/ordem pelo plano:** `assembly.json` (gerado na VEX-02) passa a carregar `clips[]` com `{file, role, order}` derivados da shotlist; `resolveMaterials`/`buildTimeline` usam isso como fonte primária; `classifyRole` por filename vira fallback explícito (com aviso E1 quando usado). `ClipRole` deixa de ser união fechada → `string` tipada com papéis conhecidos como constantes (cores da timeline com fallback para papéis novos).
- **Ponte `edit_spec` → editor** (função pura `applyEditSpec(timeline, editSpec, transcript)`):
  - `zooms`: localizar a fala citada no transcript (reuso do matcher de âncoras) → aplicar `kenBurns` no clipe ativo naquele momento (ou marcar sugestão).
  - `inserts`: criar camada "Inserts (plano)" com placeholders rotulados no frame do momento (mesmo padrão dos SFX placeholders — usuário arrasta o asset por cima).
  - `transitions`: mapear "tipo @ momento" → `transitionIn` do clipe correspondente (via `resolveTransition` do fxRegistry, hoje órfão).
  - `motion_graphics`: placeholders de texto/lower-third na camada de overlay com o conteúdo sugerido.
  - Tudo apenas no estado FRESCO (não duplicar em `studio-edit.json` persistido — mesmo guard do sound design).
- **Transparência:** cada item pré-plotado leva `origin: "plano"` no label; painel do inspector lista o que veio do plano vs. manual.

## Tarefas (Checklist)
- [x] Schema `assembly.clips[]` (file/role/order) gerado pelo `prepare-creative` (hook/inserts/cta; papel desconhecido → "insert" genérico) + consumo no `ingestCreative` (papéis e ordem do plano têm precedência; filename é fallback com aviso E1 quando resulta "unknown").
- [x] `applyEditSpec()` puro (novo `src/lib/editSpec.ts`): `parseMoment` tolerante aos formatos REAIS ("@ 4‑8s" com traço unicode, "entre X‑Ys", "nos primeiros Xs", "a cada X‑Ys" = cadência global ignorada), `makeSpeechFinder` (keywords de CONTEÚDO — termos de edição filtrados — maioria casada), zoom→kenBurns no clipe ativo (não sobrescreve manual), transição→entrada mais próxima, inserts→placeholders sem src, motion→elementos de texto (barra de progresso nativa não duplica). 7 testes.
- [x] Wire na rota `/api/timeline` (estado fresco apenas); labels `plano · …` em todos os itens; warnings → avisos E1 de congruência.
- [x] `resolveTransition` conectado: fade→dissolve, slide→slide, wipe→zoom (`transitionTypeFor`).
- [x] `ClipRole` aberto a papéis novos + cor estável por hash (`roleColor`) na timeline.
- [x] E2E real (Chase Chappell): **5/5 itens do edit_spec aplicados, 0 avisos** — zoom no hook (0–3s), slow-zoom no reference (20–28s), whip na entrada do generation (localizada PELA FALA "aplica o playbook"), 4 inserts plotados nas janelas, 1 motion (highlight) + progress bar corretamente pulada.

## Critérios de Aceite
- [x] **AC1:** `assembly.clips[]` dirige papel+ordem no ingest (precedência sobre filename); papéis novos aceitos (`ClipRole` aberto, cor por hash, enquadramento default de insert). Fixture com papéis genéricos coberta nos testes do editSpec/prepare.
- [x] **AC2:** Zoom por momento E por fala: E2E real aplicou kenBurns=0.08 no hook (0–3s) e no reference (20–28s); manual nunca é sobrescrito (teste).
- [x] **AC3:** 4 inserts do plano viram placeholders (sem src) na camada "Inserts (plano)" nas janelas exatas (@4–8s → frames 120–240 etc.); o drop de asset por cima já era suportado (N2). Composição não renderiza placeholder sem src (guard novo).
- [x] **AC4:** Momento não-resolvível → warning → aviso E1 "congruencia" com o texto e sugestão; load nunca quebra (teste + wire).
- [x] **AC5:** `applyEditSpec` roda APENAS com `!persisted` (mesmo guard do sound design) — reload de save não re-injeta.

## Escopo
**IN:** papéis pelo plano, applyEditSpec, transições conectadas, labels de origem.
**OUT:** keyframes (VEX-09); sugestão automática de b-roll externo (VEX-12); UI nova de inspector (VEX-07).

## Dependências
- **VEX-02** (assembly automático é a fonte dos papéis). Recomendado após **VEX-01** para validar no export.

## Riscos
- **[Médio] Momentos ambíguos no edit_spec** (texto livre do LLM): parser tolerante + aviso E1; nunca inventar posição.
- **[Baixo] Poluição da timeline** com muitos placeholders: agrupar em 1 camada colapsável por origem.

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude nos papéis @dev e @qa)

### Notas
- **Parser calibrado com dados reais**: os formatos do edit_spec real usam traço unicode (‑) e ranges "@ 4‑8s"/"entre 20‑28s" — o `parseMoment` normaliza tudo; "a cada X‑Ys" é cadência global (o corte seco já é o default) e é corretamente ignorada como item posicional.
- **Localizador de fala com filtro de termos de edição**: "whip transition ao mostrar o playbook" só resolve depois de remover whip/transition/mostrar do conjunto de keywords — sobra "playbook", que casa com "a IA aplica o playbook" na narração e posiciona a transição na entrada do clipe generation. Achado do E2E real (1ª rodada dava aviso; calibração documentada).
- **Barra de progresso do plano é deduplicada** (o motion nativo ProgressBar já cobre).

### File List
- `apps/video-studio/src/lib/editSpec.ts` (novo) + `editSpec.test.ts` (novo — 7 testes)
- `apps/video-studio/src/lib/ingest.ts` (assembly.clips → papéis/ordem)
- `apps/video-studio/src/lib/timeline.ts` (ClipRole aberto)
- `apps/video-studio/scripts/prepare-creative.ts` (emite clips[])
- `apps/video-studio/src/remotion/TimelineFxComposition.tsx` (guard de placeholder sem src)
- `apps/video-studio/src/components/Timeline.tsx` (roleColor com hash fallback)
- `apps/video-studio/src/app/api/timeline/route.ts` (wire fresh-only + avisos E1 de momento/papel)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-04 — Claude (@po) — Validada (GO 9/10). Draft → Ready.
- 2026-07-04 — Claude (@dev) — Implementada; E2E real 5/5 itens do edit_spec aplicados com 0 avisos (após calibração do finder). 102/102 testes. Ready → Ready for Review.
- 2026-07-04 — Claude (@qa) — Gate ✅ PASS (2 Lows). → InReview.
