# MVC-09: Biblioteca de FX/templates virais (hook FX, transições, legendas, motion)

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase B)
**Complexidade:** XL (Complex — 13 pontos)
**Criada por:** @sm (River) · 2026-06-21
**Validada por:** @po (Pax) · 2026-06-21 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-21

## Story
**Como** Marketing Chief
**Eu quero** componentes Remotion de FX viral (hook FX, transições, legendas word-by-word, inserts, motion graphics) dirigidos pelo registry do cliente
**Para que** a timeline auto-montada já saia com o tratamento viral on-brand, não crua.

## Contexto
3ª story da Fase B. É o que transforma "clips sequenciados" em "criativo viral". Consome o `video-templates.yaml` (MVC-06): cada ID de preset (`hook-snap-zoom`, `cap-amber-pop`, `trans-cut-dry`, `motion-founder-lowerthird`…) vira um componente React/Remotion, calibrado pela paleta/tipografia do cliente.

## Decisão de arquitetura
- `src/remotion/fx/` — componentes por categoria:
  - **Hook FX:** snap-zoom, hard-cut, whip-pan, number-reveal (entram no 1º clip).
  - **Transições:** `@remotion/transitions` (cut, whip, zoom, glitch/speed-ramp).
  - **Legendas word-by-word:** `@remotion/captions` + `@remotion/install-whisper-cpp` transcreve a narração → caption animada (cor = accent do cliente).
  - **Inserts/b-roll:** wrapper para sobrepor screen captures com framing/zoom.
  - **Motion graphics:** lower-third, progress-bar, big-number (preset por cliente).
- **Driver:** lê `video-templates.yaml` via o loader da MVC-06 (`recommend(hook_type)`); o `edit_spec.template_refs` do plano escolhe quais presets aplicar.
- **Anti-fabricação:** presets de número (`big-number`/`number-reveal`) só renderizam com valor real vindo do plano (coerente com o gate da MVC-04) — sem número → não renderiza o preset.
- Brand tokens (cor/fonte) injetados em todos os FX.

## Tarefas (Checklist)
- [x] Hook FX (3: snap-zoom, hard-cut, whip) — `HookFx.tsx`.
- [x] Transições — `@remotion/transitions` instalado; resolver `resolveTransition` (fade/slide/wipe). _(Aplicação na timeline = MVC-10, onde o usuário escolhe entre clips.)_
- [x] Legendas word-by-word com cor de marca — `CaptionsOverlay` + geração `captionsFromScript` (fallback determinístico; whisper documentado).
- [x] **Enquadramento inteligente** (Concern MVC-08) — `SmartFrame` (contain-blur p/ screen capture, cover p/ talking-head).
- [x] Motion graphics — `LowerThird`, `ProgressBar`, `BigNumber` (com guard).
- [x] Driver: `fxRegistry` resolve IDs do `video-templates.yaml` → renderers (cobertura total testada).
- [x] Guard: `isRenderableNumber` — `BigNumber` só com dado real.
- [x] Validação: 7 testes + render smoke FX no Chase Chappell.

## Critérios de Aceite
- [x] **AC1:** 3 hook FX (snap-zoom/hard-cut/whip), 3 renderers de transição (fade/slide/wipe), legendas word-by-word, 4 motion (lower-third/progress-bar/big-number/underline).
- [x] **AC2:** Todo preset do `video-templates.yaml` (tiago + virals) resolve via `fxRegistry` — testado (cobertura total, 0 órfãos).
- [x] **AC3:** Legendas word-by-word da narração (129 captions, ~48,57s) com cor de marca — render real saiu accent **#FFB800 (âmbar/tiago)**.
- [x] **AC4:** FX herdam paleta do `brand-config` (render real com accent do cliente; `fxPlan.brand` injetado em todos).
- [x] **AC5:** `BigNumber` retorna null sem dado real (`isRenderableNumber`: vazio/null/placeholder/sem-dígito → false). Testado.

## Escopo
**IN:** componentes FX, driver de templates, legendas, motion graphics.
**OUT:** UI de edição (MVC-10); export final (MVC-11).

## Dependências
- **MVC-07** (composição base) + **MVC-08** (timeline montada).
- **MVC-06** (`video-templates.yaml` + loader `video_templates.py` — referência do schema de presets).
- `@remotion/transitions`, `@remotion/captions`, `@remotion/install-whisper-cpp`. **Habilita:** MVC-10, MVC-11.

## Riscos (PO)
- **[Médio] Setup do Whisper local:** `@remotion/install-whisper-cpp` baixa/builda whisper.cpp + modelo (download pesado, compilação). Risco de ambiente. **Mitigação:** se o whisper local falhar, degradar — aceitar legenda a partir de transcript já existente (a narração do Chase Chappell pode ser transcrita 1x e cacheada), sem bloquear a story.
- **[Baixo] Coerência com MVC-06:** os IDs do `video-templates.yaml` (ex.: `motion-founder-lowerthird`, `cap-amber-pop`) DEVEM existir como componente — validar 1:1 contra o registry (AC2) para não haver preset órfão.
- **[Nota] XL no teto:** 5 categorias de FX numa story. Se travar, split por categoria (hook/transição/legenda como sub-entregas).

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- **Risco whisper mitigado (decisão do @po):** legendas word-by-word via `captionsFromScript` — distribui as palavras do roteiro pela duração da narração (timing estimado ponderado por tamanho). Determinístico, sem download/build do whisper, testável. Whisper local fica como refinamento de timing documentado.
- **Concern MVC-08 resolvida:** `SmartFrame` enquadra screen captures landscape em `contain-blur` (conteúdo preservado + fundo borrado) e talking-heads em `cover`. Mapeado por papel (`roleToFrameMode`).
- **Concern Low do gate MVC-07 corrigida:** `brand.ts` agora recebe `repoRoot` explícito (substitui `process.cwd()` frágil).
- **Driver:** `fxRegistry` resolve por categoria via heurística → **nenhum preset órfão** (AC2 testado com tiago+virals). Acoplado ao `template_refs` do `content_plan` (MVC-03→06).
- **Guard de fidelidade (AC5):** `isRenderableNumber` espelha o princípio da MVC-04 — `BigNumber` não renderiza placeholder/vazio/sem-dígito.
- **Run real (Chase Chappell):** `fxPlan` resolveu hook=hard-cut, caption=word-pop, motion=[lower-third,progress-bar], 129 captions, accent #FFB800. `fx-smoke.mp4` 1080×1920 h264+aac renderizado com FX aplicados.
- **Transições:** `@remotion/transitions` instalado + `resolveTransition`; a aplicação entre clips (TransitionSeries) acontece na MVC-10 (editor decide os pontos).
- **CodeRabbit:** pré-commit (WSL) NÃO executado nesta sessão.

### Redesign Fase B — legendas reais + estética (2026-06-21, rework do dono)
Feedback do dono: "visuais feios", "legenda difere do que é dito". Atacado na raiz:
- **Legendas REAIS (fecha a Concern Medium "timing estimado"):** `captionsFromScript` (estimado) substituído por transcrição Whisper das PRÓPRIAS gravações (`transcribe.py` → `transcript.json`; `transcript.ts` → `buildRealCaptions`). As palavras de hook+narração+CTA são posicionadas no frame absoluto da timeline → legenda = o que é dito, no tempo exato (146 captions reais; fallback ao roteiro se sem transcript).
- **Estética das legendas:** scrim/pílula (legibilidade sobre site branco — antes texto branco sumia), contorno (text-stroke em camadas), **keywords on-brand sempre no accent** + palavra ativa com "pop" (spring).
- **Enquadramento (refina o `SmartFrame`):** o contain-blur virava tirinha minúscula; trocado por **"painel de tela"** — quadro grande no terço superior (`cover`, mostra o miolo da tela legível) + **Ken Burns** (zoom lento). Validado por stills renderizados (Claude e site da Grüns legíveis).
- **Motion:** lower-third com entrada (spring) + ponto accent; progress-bar com brilho/ponta.
- **Validação:** `renderStill` headless gerou frames reais inspecionados; `tsc`/build limpos.

### File List
- `apps/video-studio/src/lib/captions.ts` (novo) · `src/lib/captions.test.ts` (novo — 3 testes)
- `apps/video-studio/src/lib/videoTemplates.ts` (novo — loader do registry)
- `apps/video-studio/src/lib/fxRegistry.ts` (novo — resolvers + guard) · `src/lib/fxRegistry.test.ts` (novo — 4 testes)
- `apps/video-studio/src/lib/fxPlan.ts` (novo — plano de FX)
- `apps/video-studio/src/lib/brand.ts` (modificado — `repoRoot` em vez de `process.cwd()`)
- `apps/video-studio/src/remotion/fx/{SmartFrame,Captions,HookFx,Motion}.tsx` (novos)
- `apps/video-studio/src/remotion/TimelineFxComposition.tsx` (novo)
- `apps/video-studio/src/remotion/Root.tsx` (modificado — registra TimelineFx)
- `apps/video-studio/scripts/render-fx.ts` (novo — render smoke/full com FX)
- `apps/video-studio/package.json` (modificado — `@remotion/captions` + `@remotion/transitions`)
- _Redesign:_ `apps/video-studio/src/lib/transcript.ts` (novo — `buildRealCaptions`, `computeSpeechCut`, `mapViaSegments`, `detectSilences`) · `src/lib/transcript.test.ts` (novo — 4 testes)
- _Redesign:_ `apps/video-studio/src/remotion/fx/{Captions,SmartFrame,Motion}.tsx` (estética: scrim/stroke/keyword/pop · painel de tela + Ken Burns · motion polido)
- _Redesign:_ `apps/video-studio/scripts/{transcribe.py,render-stills.ts}` (transcrição + stills de inspeção)

## QA Results

**Gate:** ✅ **PASS** · @qa (Quinn) · 2026-06-21 — e **fecha 2 Concerns anteriores** (MVC-07 brand.ts, MVC-08 enquadramento).

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ Componentes coesos; resolvers puros; `fxPlan` serializável; SmartFrame elegante |
| 2 | Testes | ✅ 13/13 (`node:test`) — resolvers, **AC2 cobertura total**, **AC5 guard**, captions |
| 3 | Critérios de aceite | ✅ AC1–AC5 verificados (render FX real + testes) |
| 4 | Sem regressões | ✅ MVC-07/08 intactas; build/tsc limpos |
| 5 | Performance | ⚠️ SmartFrame contain-blur dobra o decode por clip (ver Concern) |
| 6 | Segurança | ✅ Sem segredos novos; leitura de YAML |
| 7 | Documentação | ✅ Decisões/limitações documentadas honestamente |

### Concerns anteriores — verificadas FECHADAS
- **MVC-07 (brand.ts `process.cwd()`)** → ✅ corrigido para `repoRoot` explícito.
- **MVC-08 (enquadramento corta screen captures)** → ✅ `SmartFrame` contain-blur preserva o conteúdo.

### Evidência (verificação independente)
13/13 testes; render FX real do Chase Chappell → `fx-smoke.mp4` h264+aac com FxPlan resolvido (hook=hard-cut, caption=word-pop, motion=[lower-third,progress-bar], 129 captions, accent #FFB800).

### Concerns (advisory — rastreadas)
- **[Medium · qualidade] Legendas com timing ESTIMADO, não sincronizado com o áudio.** `captionsFromScript` distribui palavras por peso ao longo da duração — funcional, mas as legendas não casam exatamente com a fala. Mitigação do risco-PO (whisper pesado), mas **antes de produção real** o whisper local (timing por palavra) é o refinamento necessário. **Follow-up.**
- **[Low · cobertura/escopo] `resolveTransition` sem teste** (`void` no teste) e **transições não aplicadas** na composição — só os renderers existem; `TransitionSeries` entre clips é a **MVC-10**. Código preparado, não validado visualmente.
- **[Low · performance] `SmartFrame` contain-blur renderiza o clip 2× (fundo + foreground)** — dobra o decode; monitorar no render **full** (MVC-11).
- **[Low · processo] CodeRabbit** pré-commit não executado.

### Veredito
Biblioteca de FX sólida, **provada com render real on-brand**, fecha 2 Concerns anteriores e cobre AC2/AC5 com testes fortes. As novas Concerns são de refinamento (legendas/whisper) e escopo-sequência (transições→MVC-10). **PASS.** Próxima: MVC-10 (editor timeline). Push pendente → @devops (3 stories Fase B acumuladas).

---

### Re-Gate — Redesign Fase B · @qa (Quinn) · 2026-06-22

**Gate:** ✅ **PASS** — legendas reais + estética.

**Evidência (re-verificada):** **29/29** testes (incl. 4 de `transcript`), `tsc` limpo, `next build` OK. **Visual verificado por `renderStill` headless** (não só relato): frames reais inspecionados — legenda legível sobre o Claude escuro E sobre o site branco da Grüns, com keyword em âmbar e scrim.

**Concern Medium anterior FECHADA:** *"legendas com timing estimado"* → migradas de `captionsFromScript` para **transcrição Whisper das próprias gravações** (`buildRealCaptions`): 146 captions posicionadas no frame exato da fala (hook+narração+CTA). Fallback ao roteiro permanece se faltar transcript.

**Também endereçado:** enquadramento — o `contain-blur` (que virava tirinha minúscula) foi para **"painel de tela"** (conteúdo grande e legível) + Ken Burns.

**Novos itens (Low):**
- **[Low · testes]** render FULL (todos os FX sobre o vídeo inteiro) ainda não validado — só stills + smoke → MVC-11.
- **[Low · manutenção]** regex de diacríticos combinantes literal (NFD) — funciona (testado), trocar por `̀-ͯ` num follow-up.
- **[Low · ambiente]** Whisper é passo manual/cacheado por criativo.

**Veredito:** fecha a Concern Medium com legendas reais; estética comprovada por frames renderizados. **PASS.** Gate file: `docs/qa/gates/MVC-09-fx-library.yml`.

## Change Log
- 2026-06-21 — @sm (River) — Story criada (Draft).
- 2026-06-21 — @po (Pax) — Validada (GO 8/10); Riscos (whisper setup + degradação, preset órfão) + nota de split; Draft → Ready.
- 2026-06-21 — @dev (Dex) — Implementada biblioteca de FX (SmartFrame/Captions/HookFx/Motion + fxRegistry/fxPlan); 7 testes + render smoke FX real; resolveu Concern MVC-08 (enquadramento) e Low MVC-07 (brand.ts); Ready → Ready for Review.
- 2026-06-21 — @dev (Dex) — **RETRABALHO — legendas reais + estética:** legendas migradas de estimadas (`captionsFromScript`) para **transcrição Whisper** das gravações (`transcript.ts`/`buildRealCaptions`, 146 captions sincronizadas) — **endereça a Concern Medium "timing estimado"**. Estética: scrim+contorno+keyword+pop nas legendas; **painel de tela** (substitui o contain-blur letterbox) + Ken Burns; motion polido. Validado por `renderStill` (frames inspecionados). Recomendado re-QA do gate visual.
