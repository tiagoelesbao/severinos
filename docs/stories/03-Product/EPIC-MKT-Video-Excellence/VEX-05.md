# VEX-05: Áudio profissional — crossfades, ducking por envelope e legendas on-brand

**Status:** InReview — **QA Gate: ✅ PASS** (gate file: `docs/qa/gates/VEX-05-audio-profissional.yml`)
**Epic:** EPIC-MKT-Video-Excellence (F2 — Qualidade do output)
**Prioridade:** **P1** — os artefatos de áudio (cliques nos cortes) e as keywords erradas são o que denuncia "vídeo feito por máquina"
**Complexidade:** M (Standard — 9 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** espectador do reel final
**Eu quero** cortes de narração imperceptíveis, trilha que abaixa sozinha quando há fala, e destaque de palavras-chave coerente com a marca do cliente
**Para que** o output automatizado soe/pareça editado por um profissional.

## Contexto (evidência da auditoria)
1. **Clique/pop nos cortes de narração:** os `AudioSegment` do auto-cut entram/saem secos (`TimelineFxComposition.tsx` — `<Audio startFrom/endAt>` sem fade). Corte de silêncio por energia é preciso, mas a transição abrupta de forma de onda gera clique audível.
2. **Ducking falso:** a trilha usa volume fixo (`soundPlan.ts` — 0.2 quando `ducking: true`), não um envelope que reage à presença de fala.
3. **KEYWORDS hardcoded:** `Captions.tsx` tem um `Set` fixo em PT com vocabulário misturado dos dois clientes ("virals", "claude", "loja"...) — o destaque de keyword deveria vir do léxico do `brand-identity.yaml` do cliente ativo.
4. Volume por clipe de talking-head inexistente (hook/CTA sempre 1.0); sem fade-out no fim do vídeo.

## Decisão de arquitetura (proposta)
- **Micro-crossfade nos segmentos:** cada `AudioSegment` ganha fade-in/out de 2–3 frames via `volume={(f) => ...}` (função pura `segmentEnvelope(f, durationInFrames, fadeFrames)` testável). Default global; sem novo conceito de UI.
- **Ducking por envelope:** derivar janelas de fala (dos próprios `AudioSegment` da narração + clipes `audioEnabled`) → série de intervalos "voz ativa"; volume da trilha = `duckedVol` dentro (com attack/release ~8 frames de rampa), `baseVol` fora. Puro (`buildDuckingEnvelope(timeline)`) e aplicado no `volume` callback da trilha. Toggle no inspector do elemento de música (`ducking: on/off`, níveis configuráveis).
- **Keywords do brand:** `brand-identity.yaml` → `tom_de_voz.lexico.sempre_usar`/`palavras_chave` expostos em `loadBrandTokens`/rota timeline → `fxPlan.brand.keywords: string[]` → `CaptionsOverlay` usa isso (fallback: destaque só da palavra ativa). Remover o Set hardcoded.
- **Ganho por clipe falado:** `TimelineClip.volume?` (default 1) editável no inspector; aplicado no `SmartFrame`/`Media`.
- **Fade-out final:** rampa de 12 frames em todos os áudios no tail do vídeo (evita corte seco no fim).

## Tarefas (Checklist)
- [x] `segmentEnvelope()` puro (fade 3 frames, escala em trecho curto) aplicado aos segmentos da narração E à narração integral — testes de bordas/curto/degenerado.
- [x] Ducking por envelope: `speechIntervals()` (hook/CTA + segmentos, mesclados) + `duckingGain()` (duck 0.35, rampas 8 frames ≈ 267ms) no volume dos elementos de áudio com `ducking: true`; checkbox no inspector; trilha do plano e "＋ fundo" entram com ducking ativo (base 0.4 em vez do 0.2 fixo).
- [x] `keywords` do brand: `loadBrandKeywords()` (brand-identity → lexico.sempre_usar+palavras_chave) → `FxBrand.keywords` → `CaptionsOverlay` (Set hardcoded REMOVIDO; lista vazia = só a palavra ativa destaca — caso virals, léxico malformado, degrada limpo).
- [x] `TimelineClip.volume` + `setClipVolume` + slider "Volume da fala" nos clipes falados (transacional no undo).
- [x] Fade-out global no tail (12 frames) em TODOS os áudios (narração, clipes falados via SmartFrame volume-fn, camadas extras).
- [x] E2E: export smoke (offthread) com auto-cut + trilha ducked + envelopes → render limpo, áudio íntegro; envelopes numericamente verificados por unit tests (percepção auditiva final = conferência do dono no próximo export).

## Critérios de Aceite
- [x] **AC1:** Todo corte de narração entra/sai por rampa de 3 frames (unit: bordas nunca a ganho pleno; trecho curto escala) — descontinuidade abrupta eliminada por construção. _Percepção auditiva: dono no próximo export._
- [x] **AC2:** Rampas de 8 frames = 267ms ≤ 300ms (unit: 1 fora, 0.35 dentro, intermediário nas rampas; buracos < 2×rampa não sobem a trilha).
- [x] **AC3:** `loadBrandKeywords` real: tiago-elesbao → 8 keywords do SEU léxico (founder, bastidor, número…); virals (léxico malformado) → [] com fallback limpo; nenhum vocabulário cruzado (Set global removido).
- [x] **AC4:** `clip.volume` vive no timeline → persiste no `studio-edit.json` e flui ao export pelo mesmo payload (verificado por caminho de dados).
- [x] **AC5:** 6 testes novos (`audioEnvelopes.test.ts`) + suíte 95/95; typecheck e build limpos; 1 teste antigo do soundPlan atualizado ao novo contrato de ducking (documentado).

## Escopo
**IN:** envelopes de áudio (segmentos, ducking, fade-out), keywords on-brand, volume por clipe.
**OUT:** medidores VU na UI (VEX-10); biblioteca de SFX indexada (VEX-13); normalização de loudness/LUFS (futuro).

## Dependências
- **VEX-01** (export) para o E2E auditivo no artefato final — os envelopes em si funcionam no preview antes disso.

## Riscos
- **[Baixo] Paridade preview↔render do volume-callback:** validar que `<Audio volume={fn}>` se comporta igual no Player e no `renderMedia`.
- **[Baixo] Ducking em vídeos sem narração segmentada:** cair para janela única da narração (`windowFrames`).

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude nos papéis @dev e @qa)

### Notas
- **Envelopes puros compartilhados** (`src/lib/audioEnvelopes.ts`) consumidos pela composição — Player e render idênticos por construção (mesma função, mesmo frame).
- **Ducking melhora a presença da trilha**: antes era volume fixo 0.2 (baixa o vídeo todo); agora 0.4 de base caindo a ~0.14 sob a fala — trilha viva nos respiros sem competir com a voz.
- **Follow-up da VEX-01 (inserts a ~10fps) NÃO entrou aqui** — é vídeo, não áudio; permanece designado à VEX-09 (hold+zoom ou minterpolate), conforme o gate da VEX-01.

### File List
- `apps/video-studio/src/lib/audioEnvelopes.ts` (novo) + `audioEnvelopes.test.ts` (novo — 6 testes)
- `apps/video-studio/src/lib/timeline.ts` (TimelineClip.volume; ExtraClip.ducking)
- `apps/video-studio/src/lib/editorState.ts` (setClipVolume)
- `apps/video-studio/src/lib/brand.ts` (loadBrandKeywords)
- `apps/video-studio/src/lib/fxPlan.ts` (FxBrand.keywords)
- `apps/video-studio/src/lib/soundPlan.ts` (+ soundPlan.test.ts atualizado — trilha com ducking real)
- `apps/video-studio/src/remotion/TimelineFxComposition.tsx` (envelopes na narração/camadas + keywords no overlay)
- `apps/video-studio/src/remotion/fx/SmartFrame.tsx` (prop volume nos talking-heads)
- `apps/video-studio/src/remotion/fx/Captions.tsx` (keywords por prop; Set hardcoded removido)
- `apps/video-studio/src/app/api/timeline/route.ts` (brand.keywords)
- `apps/video-studio/src/app/studio/page.tsx` (slider volume da fala + checkbox ducking + fundo com ducking)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-04 — Claude (@po) — Validada (GO 9/10). Draft → Ready.
- 2026-07-04 — Claude (@dev) — Implementada; E2E smoke com envelopes renderizado limpo. 95/95. Ready → Ready for Review.
- 2026-07-04 — Claude (@qa) — Gate ✅ PASS (2 Lows: percepção auditiva final = dono; virals sem keywords até consertarem o léxico no brand-identity). → InReview.
