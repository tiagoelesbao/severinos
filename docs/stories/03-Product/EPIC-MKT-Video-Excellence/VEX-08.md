# VEX-08: Timeline pro — thumbnails, snap visual, track headers, multi-seleção e markers

**Status:** InProgress — inc.1 (filmstrip/thumbnails) entregue; snap visual, track headers, seleção múltipla e markers pendentes
**Epic:** EPIC-MKT-Video-Excellence (F3 — Paridade NLE + estética)
**Prioridade:** **P2**
**Complexidade:** L (Standard — 13 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** editor no `/studio`
**Eu quero** a timeline com os affordances padrão de NLE — miniaturas nos clipes, indicação visual de snap, headers de track com mute/solo/lock, seleção múltipla, ripple delete e marcadores
**Para que** editar seja rápido e visualmente orientado, como em Premiere/CapCut/DaVinci.

## Contexto (evidência da auditoria — `components/Timeline.tsx`)
- Clipes são retângulos com texto — **sem thumbnail/filmstrip** (identificação visual pobre).
- Snap existe (`snapFrame`, 8px) mas é **invisível** — nenhuma linha magnética/feedback.
- Calha de labels (V/A/T) é decorativa: **sem mute/solo/lock por track**.
- Seleção é única; **sem multi-select** (shift/marquee), sem ripple delete, sem duplicar clipe, sem markers, sem context menu (a VEX-07 entrega o componente; aqui o conteúdo).
- Régua só em segundos; em zoom alto não mostra frames.

## Decisão de arquitetura (proposta)
- **Filmstrip:** rota `/api/thumbs?client=&creative=&file=&t=` gera miniaturas ffmpeg (96px de altura) com cache em disco (`.thumbs/` no diretório do criativo, gitignored); o clipe mostra 1..N frames conforme largura/zoom. Lazy + IntersectionObserver.
- **Snap visível:** ao arrastar com snap ativo, renderizar linha vertical no ponto-alvo + haptic visual (flash curto). Toggle de snap (ímã) na toolbar da timeline; tecla N.
- **Track headers reais** (na calha, largura ~120px com o design system): nome, mute (vídeo: olho/áudio: alto-falante), solo, lock. Estado no modelo: `TimelineAudio.muted?`, `ExtraLayer.{muted,locked,solo}?`, `videoTrack` lock global. Mute/solo respeitados no Player E no export (props da composição).
- **Multi-seleção:** shift+click e marquee (arrastar em área vazia); ações em lote: delete (com ripple), nudge (←/→), mover camada. Modelo de seleção unificado `{kind, ids[]}` substituindo os 4 estados paralelos atuais (`sel`, `selectedCue`, `selectedAudio`, `selectedLayerClip`).
- **Ripple delete:** remover clipe fecha o buraco (já é o comportamento do `removeClip` na track principal); para camadas extras, opção "delete" vs "ripple delete".
- **Markers:** `timeline.markers[]` `{frame, color, label}`; tecla M adiciona no playhead; visíveis na régua; navegação Shift+M / clique.
- **Régua adaptativa:** frames em zoom alto (pps > 150), meio-segundos em zoom médio.

## Tarefas (Checklist)
- [x] Rota de thumbnails com cache + filmstrip nos clipes de vídeo (lazy). `/api/thumbs` (ffmpeg `-ss` seek + cache em `Materiais Brutos/.thumbs/`, gitignored via `outputs/`); componente `Filmstrip.tsx` (N frames por largura/zoom, teto 40, `loading=lazy`, scrim para o rótulo). Verificado via Playwright: 44/44 thumbs carregados, 0 erros.
- [ ] Linha de snap visível + toggle de ímã (UI + tecla N).
- [ ] Track headers com mute/solo/lock (modelo + UI + respeito no render/preview).
- [ ] Modelo de seleção unificado + shift-click + marquee + ações em lote (delete/nudge).
- [ ] Markers (modelo, régua, atalhos, persistência no save).
- [ ] Régua adaptativa por zoom.
- [ ] Context menu nos clipes (Cortar aqui / Duplicar / Delete / Ripple delete / Propriedades) usando o ContextMenu da VEX-07.
- [ ] Testes puros: seleção em lote, ripple em camadas, serialização de markers/mute.

## Critérios de Aceite
- [x] **AC1:** Clipes de vídeo mostram filmstrip real do arquivo; zoom muda a densidade de frames; scroll não trava (cache + lazy). ✓ verificado no `/studio` real.
- [ ] **AC2:** Arrastar perto de uma borda mostra a linha magnética; N desliga o snap.
- [ ] **AC3:** Mute numa camada silencia no preview E no mp4 exportado; lock bloqueia qualquer edição na track.
- [ ] **AC4:** Shift+click seleciona N clipes; Delete em lote com ripple mantém a timeline contígua; tudo em 1 passo de undo.
- [ ] **AC5:** M cria marker no playhead; markers sobrevivem ao save/reload e aparecem na régua.

## Escopo
**IN:** filmstrip, snap visual, headers com mute/solo/lock, multi-seleção/ripple, markers, régua adaptativa, context menu.
**OUT:** keyframes e multi-track de vídeo (VEX-09); waveform styling avançado (mantém o atual).

## Dependências
- **VEX-07** (componentes/tokens; context menu). **VEX-03** (modelo de undo consolidado).

## Riscos
- **[Médio] Performance do filmstrip** em criativos longos: limitar thumbs simultâneas + cache agressivo em disco.
- **[Médio] Refactor do modelo de seleção** toca muitos handlers: cobrir com testes puros antes de mexer na UI.

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-04 — Claude (@dev) — Inc.1 (filmstrip): `/api/thumbs` (ffmpeg + cache em disco) + `Filmstrip.tsx` nos clipes de vídeo (lazy, densidade por zoom, scrim para o rótulo); `client`/`creative` passados ao Timeline. AC1 atendido e verificado via Playwright (44/44 thumbs). Typecheck, build e 102/102 testes limpos. Draft → InProgress.

### File List (inc.1 — filmstrip)
- `src/app/api/thumbs/route.ts` (novo — rota de miniaturas ffmpeg com cache)
- `src/components/Filmstrip.tsx` (novo — tira de frames lazy)
- `src/components/Timeline.tsx` (props `client`/`creative`; Filmstrip + scrim no clipe de vídeo)
- `src/app/studio/page.tsx` (passa `client`/`creative` ao TimelineView)
