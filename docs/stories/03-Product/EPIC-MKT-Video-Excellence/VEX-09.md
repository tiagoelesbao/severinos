# VEX-09: Keyframes + multi-track de vídeo (PiP) + fades por clipe

**Status:** InProgress — inc.1 (motor de keyframes) e inc.2 (fades por clipe) entregues; falta inc.3 (PiP completo) + keyframes no clipe de vídeo principal (SmartFrame)
**Epic:** EPIC-MKT-Video-Excellence (F3 — Paridade NLE + estética)
**Prioridade:** **P2** — os recursos que separam "montador" de "editor" (a MVC-10 prometia keyframes e não entregou)
**Complexidade:** XL (Complex — 16 pontos) — candidata a split (keyframes vs. multi-track) na validação
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** editor no `/studio`
**Eu quero** animar propriedades ao longo do tempo (keyframes de posição/escala/opacidade/volume), sobrepor vídeos (picture-in-picture) e aplicar fades por clipe
**Para que** eu produza os movimentos e composições que os reels virais usam (zoom progressivo em fala, PiP de reação, entra/sai suave) sem sair do app.

## Contexto (evidência da auditoria)
- O único "movimento" disponível é Ken Burns global por clipe (`kenBurns` 0–0.15) e animações fixas de entrada/saída dos elementos (`ElementAnim`). **Sem keyframes** — prometidos no escopo da MVC-10 ("tracks/clips/keyframes").
- A track de vídeo principal é única e estritamente sequencial (`recompute` força contiguidade) — **sem PiP/overlap** de vídeo com transform próprio (o overlay de camada existe, mas sem keyframes e sem trim de origem visual fino).
- Sem fade de vídeo por clipe (fade to black) nem fade de áudio por clipe.

## Decisão de arquitetura (proposta)
- **Modelo de keyframes genérico:** `Keyframe<T> = { frame: number; value: T; ease: "linear" | "in" | "out" | "inOut" }`; `ExtraClip.tracks?: { x?: Keyframe<number>[]; y?; scale?; opacity?; volume? }` e `TimelineClip.tracks?: { scale?; opacity?; volume? }`. Avaliador puro `sampleTrack(track, frame)` (interpolação com easing) usado por `ElementWrap`/`SmartFrame`/callbacks de volume — preview e render idênticos por construção.
- **Compat:** propriedades estáticas atuais (x/y/scale/opacity/volume/kenBurns) viram "valor base"; keyframes, quando existem, têm precedência. `animateIn/Out` continuam como atalhos que COMPILAM para keyframes ao serem editados (migração suave).
- **UI de keyframes (mínima viável):** no inspector, botão ◇ ao lado de cada propriedade (adiciona keyframe no playhead); na timeline, losangos na borda inferior do clipe selecionado (arrastáveis no tempo; delete). Sem curve editor gráfico nesta story (easing por dropdown).
- **PiP:** promover overlays de vídeo a cidadãos plenos: trim de origem (in/out), `objectFit` configurável, borda/raio/sombra opcionais (estilo CapCut), e transform keyframável (já coberto acima). Continua em `ExtraLayer` (sem mexer na track principal sequencial — decisão: a espinha narração-driven permanece single-track).
- **Fades por clipe:** `fadeIn/fadeOut` (frames) em `TimelineClip` (vídeo: para preto/transparente; áudio dos talking-heads: rampa) e em `ExtraClip` de áudio (generaliza o `segmentEnvelope` da VEX-05).

## Tarefas (Checklist)
- [x] Modelo `Keyframe`/`tracks` + `sampleTrack()` puro com testes (bordas, easing, 1 keyframe, fora do range). `keyframes.ts` — 8 testes.
- [x] Render (elementos): `ElementWrap` consome `tracks` (x/y/scale/opacity); volume da camada compõe base × keyframes × fades × ducking VEX-05. **Clipe de vídeo principal (`SmartFrame`) fica p/ inc. seguinte** (tem offset de pré-roll da transição).
- [x] UI: botão ◇ por propriedade no inspector (auto-keyframe ao mover o slider) + losangos na timeline do elemento selecionado (clique busca, arrasta move, Alt+clique remove — undo integrado).
- [ ] PiP: trim de origem visual + objectFit + estilo de moldura no inspector de overlay de vídeo. **(inc.3)**
- [x] Fades por clipe (vídeo e áudio) com handles visuais na timeline. `fadeGain` puro (+teste); clipe de vídeo principal com `FadeWrap` (opacidade → fade-to-black) + rampa no áudio; handles arrastáveis nos cantos do clipe selecionado + gradiente visual; inputs no inspector. Elementos já tinham fade via `animateIn/Out` + `fadeIn/fadeOut` na composição.
- [x] Persistência (save/export): `tracks`/`fadeIn`/`fadeOut` vivem no clipe → salvos e exportados. Round-trip coberto por teste (`editorState.test.ts`).
- [ ] E2E: reel com zoom keyframado + PiP + fade final exportado fiel. **(após inc.2/3)**

## Critérios de Aceite
- [ ] **AC1:** Keyframes de escala num insert produzem zoom progressivo suave, idêntico no preview e no mp4.
- [ ] **AC2:** Overlay de vídeo com PiP (scale 0.35, canto, moldura) toca com trim de origem correto.
- [x] **AC3:** Fade-out visual + de áudio no último clipe, com handle arrastável na timeline. ✓ verificado no `/studio` (fadeOut=40 → gradiente + handle no cta).
- [ ] **AC4:** Editar/mover/deletar keyframe é undoable e persiste no save.
- [ ] **AC5:** Timeline sem keyframes se comporta exatamente como hoje (zero regressão nos testes existentes).

## Escopo
**IN:** keyframes (transform/opacity/volume), PiP completo, fades por clipe.
**OUT:** curve editor gráfico; motion tracking; máscaras (futuro); speed ramp por keyframe (registrar como follow-up).

## Dependências
- **VEX-07** (inspector novo), **VEX-08** (seleção/undo consolidados), **VEX-05** (composição de envelopes de volume), **VEX-01** (validação no export).

## Riscos
- **[Alto] Escopo XL:** se estourar, split natural = VEX-09a (keyframes+fades) / VEX-09b (PiP completo).
- **[Médio] Composição de volumes** (base × keyframe × ducking × fade): definir ordem de composição única e testada.

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-05 — Claude (@dev) — Inc.1 (motor de keyframes): `keyframes.ts` (`sampleTrack` com easing linear/in/out/inOut + upsert/delete/move/shift, 8 testes) consumido pela composição (`ElementWrap` transform/opacidade + volume de camada) → animação idêntica preview/export. Inspector com ◇ por propriedade (x/y/scale/opacity/volume) e auto-keyframe; losangos arrastáveis na timeline (mover/remover). Modelo `tracks`/`fadeIn`/`fadeOut` em `ExtraClip` e `TimelineClip`. Split adotado: inc.2 = fades (handles), inc.3 = PiP, + keyframes do clipe principal (SmartFrame). Typecheck, `next build`, 125/125 testes. AC4/AC5 atendidos para elementos; AC1 via motor (verificado por testes + e2e dos losangos). Draft → InProgress.

### File List (inc.1 — motor de keyframes)
- `src/lib/keyframes.ts` + `src/lib/keyframes.test.ts` (novos)
- `src/lib/timeline.ts` (`Keyframe`/`Ease`/`KeyframeTracks`; `tracks`/`fadeIn`/`fadeOut` em ExtraClip e TimelineClip)
- `src/lib/editorState.ts` (setElementKfValue/toggleElementKeyframe/moveKeyframesAt/removeKeyframesAt/…) + testes
- `src/remotion/TimelineFxComposition.tsx` (ElementWrap sampleia tracks + fades; volume de camada por keyframes)
- `src/components/Timeline.tsx` (losangos do elemento selecionado + drag `kfMove`; props `onKeyframeMove/Remove`)
- `src/app/studio/page.tsx` (◇ por propriedade + auto-keyframe; wiring dos losangos)

### File List (inc.2 — fades por clipe)
- `src/lib/keyframes.ts` (`fadeGain` puro) + `keyframes.test.ts` (teste)
- `src/lib/editorState.ts` (`setClipFade`)
- `src/remotion/TimelineFxComposition.tsx` (`FadeWrap` no clipe principal + rampa no áudio)
- `src/components/Timeline.tsx` (handles de fade + gradiente no clipe selecionado; drag `fadeIn/fadeOut`; prop `onClipFade`)
- `src/app/studio/page.tsx` (inputs de fade no inspector do clipe; wiring `onClipFade`)
