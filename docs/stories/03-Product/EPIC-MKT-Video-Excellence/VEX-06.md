# VEX-06: Plano consumido de ponta a ponta — `edit_spec` pré-plotado + papéis dirigidos pelo plano

**Status:** Draft
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
- [ ] Schema `assembly.clips[]` (role/order) + geração na VEX-02 + consumo no ingest (fallback filename com aviso).
- [ ] `applyEditSpec()` puro com testes (zoom por fala, insert placeholder, transição por momento, motion placeholder; momentos não resolvidos → aviso, não erro).
- [ ] Wire na rota `/api/timeline` (estado fresco apenas) + labels `origin: plano`.
- [ ] `resolveTransition` (fxRegistry) conectado ao `TransitionType` da timeline (mapeamento wipe→zoom/slide documentado).
- [ ] Cores/legendas da timeline tolerantes a papéis novos (fallback estável por hash do nome).
- [ ] E2E: plano real com edit_spec rico → Studio abre com zooms/inserts/transições plotados nos momentos certos.

## Critérios de Aceite
- [ ] **AC1:** Criativo com estrutura DIFERENTE do funil canônico (fixture com 3 papéis novos) monta na ordem do plano, sem `unknown`.
- [ ] **AC2:** `edit_spec.zooms` com fala localizável → Ken Burns aplicado no clipe/momento correto (verificado no preview e no timeline JSON).
- [ ] **AC3:** `edit_spec.inserts` viram placeholders visíveis na camada "Inserts (plano)" no frame certo; arrastar um asset por cima substitui o placeholder.
- [ ] **AC4:** Momento não-resolvível (fala que não existe no transcript) gera aviso na auditoria E1 com o texto do momento — nunca quebra o load.
- [ ] **AC5:** Reload de edição salva NÃO re-injeta itens do plano (sem duplicação).

## Escopo
**IN:** papéis pelo plano, applyEditSpec, transições conectadas, labels de origem.
**OUT:** keyframes (VEX-09); sugestão automática de b-roll externo (VEX-12); UI nova de inspector (VEX-07).

## Dependências
- **VEX-02** (assembly automático é a fonte dos papéis). Recomendado após **VEX-01** para validar no export.

## Riscos
- **[Médio] Momentos ambíguos no edit_spec** (texto livre do LLM): parser tolerante + aviso E1; nunca inventar posição.
- **[Baixo] Poluição da timeline** com muitos placeholders: agrupar em 1 camada colapsável por origem.

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
