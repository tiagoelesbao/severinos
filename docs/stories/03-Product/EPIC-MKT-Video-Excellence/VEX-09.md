# VEX-09: Keyframes + multi-track de vídeo (PiP) + fades por clipe

**Status:** Draft
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
- [ ] Modelo `Keyframe`/`tracks` + `sampleTrack()` puro com testes (bordas, easing, 1 keyframe, fora do range).
- [ ] Render: `ElementWrap` e `SmartFrame` consomem tracks; volume callbacks compostos (base × keyframes × ducking VEX-05).
- [ ] UI: botão ◇ por propriedade no inspector + losangos na timeline (add/move/delete, undo integrado).
- [ ] PiP: trim de origem visual + objectFit + estilo de moldura no inspector de overlay de vídeo.
- [ ] Fades por clipe (vídeo e áudio) com handles visuais nos cantos do clipe (arrastar = duração do fade).
- [ ] Persistência (save/export) + testes de round-trip.
- [ ] E2E: reel com zoom keyframado durante uma fala + PiP de reação + fade final, exportado fiel (VEX-01).

## Critérios de Aceite
- [ ] **AC1:** Keyframes de escala num insert produzem zoom progressivo suave, idêntico no preview e no mp4.
- [ ] **AC2:** Overlay de vídeo com PiP (scale 0.35, canto, moldura) toca com trim de origem correto.
- [ ] **AC3:** Fade-out visual + de áudio no último clipe, com handle arrastável na timeline.
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
