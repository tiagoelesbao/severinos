# VEX-05: Áudio profissional — crossfades, ducking por envelope e legendas on-brand

**Status:** Draft
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
- [ ] `segmentEnvelope()` puro + aplicado aos segmentos da narração (com testes: bordas, segmento curto < 2×fade).
- [ ] `buildDuckingEnvelope()` puro (intervalos de fala → envelope com rampas) + wire no volume da trilha + controles no inspector.
- [ ] `keywords` no contrato brand (yaml → rota → FxPlan → CaptionsOverlay); remoção do hardcode; fallback documentado.
- [ ] `TimelineClip.volume` + slider no inspector de clipes falados.
- [ ] Fade-out global no tail.
- [ ] E2E auditivo no caso real: exportar (VEX-01) com auto-cut agressivo + trilha e validar sem cliques e com ducking audível.

## Critérios de Aceite
- [ ] **AC1:** Export com auto-cut (maxGap 0.2s) não tem clique audível em nenhum corte da narração (inspeção do waveform do mp4: sem descontinuidade abrupta > limiar).
- [ ] **AC2:** Trilha de fundo cai para o nível ducked em ≤ 300ms quando a fala entra e retorna suavemente nos silêncios; visível no waveform e audível no E2E.
- [ ] **AC3:** Legendas do cliente `tiago-elesbao` destacam APENAS keywords do brand-identity dele (nenhuma keyword da Virals) — e vice-versa.
- [ ] **AC4:** Volume por clipe falado persiste no save e aparece no export.
- [ ] **AC5:** Suíte de testes puros nova passando; nenhuma regressão nos 29+ testes existentes.

## Escopo
**IN:** envelopes de áudio (segmentos, ducking, fade-out), keywords on-brand, volume por clipe.
**OUT:** medidores VU na UI (VEX-10); biblioteca de SFX indexada (VEX-13); normalização de loudness/LUFS (futuro).

## Dependências
- **VEX-01** (export) para o E2E auditivo no artefato final — os envelopes em si funcionam no preview antes disso.

## Riscos
- **[Baixo] Paridade preview↔render do volume-callback:** validar que `<Audio volume={fn}>` se comporta igual no Player e no `renderMedia`.
- **[Baixo] Ducking em vídeos sem narração segmentada:** cair para janela única da narração (`windowFrames`).

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
