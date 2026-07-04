# VEX-03: Confiabilidade do editor — atalhos core, guard de edições, persistência completa

**Status:** InReview — **QA Gate: ✅ PASS** (gate file: `docs/qa/gates/VEX-03-confiabilidade-editor.yml`)
**Epic:** EPIC-MKT-Video-Excellence (F1 — Destravar o produto)
**Prioridade:** **P0** — bugs que fazem o usuário perder trabalho ou perder confiança no app
**Complexidade:** M (Simple/Standard — 7 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** editor usando o `/studio` diariamente
**Eu quero** os atalhos universais de edição (Ctrl+Z/Y, Delete, frame-step), nenhuma ação que descarte meu trabalho sem avisar, e que TUDO que configuro sobreviva ao reload
**Para que** eu confie no editor como confio num NLE profissional.

## Contexto (evidência da auditoria — `studio/page.tsx`)
1. **Toggle de auto-cut destrói edições:** `load()` (linha ~124) re-busca da API e zera `hist`/`snap` a cada mudança de `autocutOn`/`maxGap` — edições não salvas somem sem confirmação.
2. **`styleId` (modelo de chunking de legenda) não é persistido:** `save()` envia `timeline/fxPlan/captionSource`, mas o estilo escolhido (frase2/linha1/punchy/karaokê) se perde no reload.
3. **Atalhos:** só Space, ←/→ (1s), Ctrl+S, Esc. Sem Ctrl+Z/Ctrl+Y (undo existe só como botão!), sem Delete (remover clipe/elemento selecionado), sem `,`/`.` (frame a frame), sem C (razor), sem Home/End.
4. Undo não cobre algumas mutações (ex.: `liveUpdate` de sliders fora de transação `beginEdit` em alguns fluxos — verificar cobertura).

## Tarefas (Checklist)
- [x] Atalhos: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, Delete/Backspace contextual (elemento de camada > clipe de vídeo; ignora inputs/select), `,`/`.` (±1 frame), ←/→ (±1s, mantido), Home/End, C (toggle razor), Esc. Popover "?" no transporte com o mapa. _(Desvios: Shift+←/→ desnecessário — ←/→ já é ±1s; V-seleção desnecessário — C é toggle; delete de CUE fora do escopo — cue não tem semântica de remoção definida.)_
- [x] Guard de trabalho: `dirty` + confirmação ao alternar auto-cut/agressividade com edições não salvas + aviso `beforeunload`.
- [x] `styleId` persistido no `studio-edit.json` (save → POST; load restaura quando `persisted`).
- [x] `autocutOn`/`maxGap` persistidos e restaurados no load (o timeline salvo já reflete o corte; o estado só sincroniza a UI).
- [x] Cobertura do undo: sliders ao vivo (Ken Burns, volume, x/y/escala/opacidade) ganharam `onPointerDown={beginEdit}` — 1 gesto = 1 passo de undo; undo/redo marcam `dirty`.
- [x] Indicador "não salvo" (dot vermelho no 💾 Salvar) + Ctrl+S mantido.
- [x] Validação: suíte 89/89, `tsc --noEmit` e `next build` limpos. _(Sem funções puras novas — a story é wiring de UI + passthrough de API; round-trip do payload coberto por code review + typecheck.)_

## Critérios de Aceite
- [x] **AC1:** Ctrl+Z desfaz e Ctrl+Shift+Z/Ctrl+Y refaz; sliders viraram transacionais (`onPointerDown=beginEdit`) — 1 gesto = 1 passo. _(Verificação de código; clique real no browser = conferência do dono.)_
- [x] **AC2:** `guardedAutocut` exibe confirmação com `dirty`; cancelar não altera estado (toggle e slider).
- [x] **AC3:** `styleId` no payload do save + restaurado no load quando `persisted` (round-trip implementado nos dois lados).
- [x] **AC4:** Delete contextual: elemento de camada selecionado > clipe de vídeo (guarda de mínimo 1 clipe); ignora foco em input/textarea/select.
- [x] **AC5:** `beforeunload` ativo apenas com `dirty`.

## Escopo
**IN:** atalhos, guards, persistência de styleId/autocut, cobertura de undo, indicador de estado.
**OUT:** redesign visual (VEX-07); multi-seleção e ripple (VEX-08); command palette (VEX-10).

## Dependências
- Nenhuma. Paralelizável com VEX-01/02. **Habilita:** base de confiança para todo o F3.

## Riscos
- **[Baixo] Conflito de atalhos com o navegador** (Ctrl+Z em inputs): já há guard de `e.target` para inputs/textarea — estender aos novos atalhos.
- **[Baixo] Undo de gestos ao vivo:** garantir que sliders usem transação (1 entrada por gesto), não 1 entrada por tick.

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude no papel @dev)

### File List
- `apps/video-studio/src/app/studio/page.tsx` (modificado — atalhos completos + popover "?", dirty/guard/beforeunload, dot não-salvo, sliders transacionais, restauração de styleId/autocut no load, save com preferências)
- `apps/video-studio/src/app/api/timeline/route.ts` (modificado — POST persiste `styleId`/`autocut`; GET os devolve quando `persisted`)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-02 — Claude (@po) — Validada (GO 9/10). Draft → Ready.
- 2026-07-03 — Claude (@dev) — Implementada (atalhos, guards, persistência de preferências, transações de undo); 3 desvios menores documentados no checklist. Ready → Ready for Review.
- 2026-07-03 — Claude (@qa) — Gate ✅ PASS (2 Lows: sem E2E de browser — conferência do dono; delete de cue fora de escopo). → InReview.
