# MVC-10: Editor timeline `/studio` (tracks/clips/keyframes + ajuste fino)

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase B)
**Complexidade:** XL (Complex — 13 pontos)
**Criada por:** @sm (River) · 2026-06-21
**Validada por:** @po (Pax) · 2026-06-21 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-21

## Story
**Como** Marketing Chief
**Eu quero** um editor de timeline em `/studio` onde eu vejo o criativo auto-montado e faço o ajuste fino
**Para que** o motor vire produto usável — eu ajusto timing, troco preset e clip, e vejo o preview ao vivo antes de exportar.

## Contexto
4ª story da Fase B. Espelha o papel do `/studio` do `creative-design` (que o dono já validou como produto), mas timeline-based em vez de slide-based. Transforma o "gerador automático" (MVC-08+09) em "editor" — o usuário tem a última palavra.

## Decisão de arquitetura
- `src/app/studio/` — editor com 3 zonas (padrão `creative-design/studio`):
  - **Esquerda:** lista de criativos do cliente + faixas (tracks) da timeline.
  - **Centro:** `@remotion/player` (preview ao vivo reativo ao estado) + régua de timeline com clips arrastáveis.
  - **Direita:** inspector do clip/preset selecionado (timing, FX, troca de mídia, legenda).
- **Estado:** timeline JSON da MVC-08 como fonte; edições mutam o estado (mesmo padrão de history/undo-redo do `creative-design/studio`).
- **Ações:** mover/aparar clip, trocar preset (do `video-templates.yaml`), trocar mídia (upload/outro clip), editar legenda, ajustar duração — refletido no Player.
- **Cliente como contexto** (1º input / `?client=`), como no `creative-design`.
- Persistência do projeto editado: MVC-11.

## Tarefas (Checklist)
- [x] Layout 3 zonas (clips/tracks · preview · inspector).
- [x] `@remotion/player` com preview reativo ao estado (inputProps memoizados; media via API).
- [x] Lista de clips com selecionar/mover/aparar/remover (resolve Concern MVC-08: reordenação manual).
- [x] Inspector: trimming, troca de hook/caption preset, editar legenda. _(Troca de mídia = follow-up, ver Notes.)_
- [x] Undo/redo (histórico de snapshots).
- [x] Carrega o Chase Chappell auto-montado via `/api/timeline` (server real validado).
- [x] **Extra:** `/api/media` com Range (serve clips ao Player) + guard de path traversal.

## Critérios de Aceite
- [x] **AC1:** `/studio` carrega o timeline auto-montado — `/api/timeline` retornou 6 clips na ordem + fxPlan (server real); `/studio` → HTTP 200.
- [~] **AC2:** Preview `@remotion/player` com inputProps reativos ao estado; `/api/media` serve os clips com **Range 206** (Player consegue seekar). _Renderização visual no browser não verificada nesta sessão (requer browser interativo) — ver Notes._
- [x] **AC3:** Mover/aparar clip e trocar preset atualizam timeline+fxPlan (editorState 7/7 testes; inspector ligado).
- [~] **AC4:** **Editar legenda** funciona (`editCaption` + input, testado). **Trocar mídia** de um clip = follow-up (não no MVP do @po).
- [x] **AC5:** Undo/redo com histórico de snapshots (past/future).

## Escopo
**IN:** UI `/studio`, preview Player, edição de timeline, inspector.
**OUT:** render/export final + persistência durável (MVC-11).

## Dependências
- **MVC-08** (timeline JSON) + **MVC-09** (FX/presets) + **MVC-07** (composição/Player).
- Padrão de UX: `apps/creative-design/src/app/studio/page.tsx`. **Habilita:** MVC-11.

## Riscos (PO)
- **[Médio] Complexidade de UI timeline:** régua com clips arrastáveis + keyframes é a peça mais cara de UI da Fase B. **Mitigação/MVP:** v1 foca em **selecionar / aparar / mover clip + trocar preset + editar legenda** (já cobre o ajuste fino do caso real). Keyframes finos de motion podem virar follow-up se estourar o budget.
- **[Baixo] Perf do Player:** `@remotion/player` com vídeos reais (não só HTML) pode pesar no preview — validar com os clips do Chase Chappell (até ~10s cada).
- **[Nota] XL no teto:** terceira XL seguida (08→09→10). Acompanhar velocity; se atrasar, o MVP acima entrega o valor central.

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- **Lógica de edição pura (`editorState.ts`):** `moveClip`/`trimClip`/`removeClip` (recomputam startFrames) + `setHookRenderer`/`setCaptionRenderer`/`editCaption` — imutáveis, 7 testes. Resolve a **Concern MVC-08** (reordenação manual).
- **Player no browser × clips fora de public/:** criada `/api/media/[...path]` com **Range (206)** + guard de path traversal (403). A composição ganhou `mediaBaseUrl` opcional (`useMediaSrc`): API no Player, `staticFile` no render headless. `SmartFrame` agora recebe `src` resolvido.
- **`/api/timeline`:** roda ingest + buildFxPlan server-side → `{timeline, fxPlan}`. Validado em server real (6 clips, 129 captions, accent #FFB800).
- **UI `/studio`:** 3 zonas (clips · `@remotion/player` · inspector), undo/redo por snapshots, controles ligados ao `editorState`.
- **⚠️ Validação parcial (honesta):** backend 100% validado em server real (APIs, range, segurança, /studio 200) + lógica 7/7 testes. **A renderização visual do Player no browser NÃO foi verificada** (requer browser interativo) — recomendo o dono rodar `npm run dev` + abrir `/studio`, ou usar o skill `verify`.
- **AC4 trocar mídia:** não implementado (fora do MVP do @po); editar legenda sim. Follow-up.
- **Concern MVC-09 (transições):** `TransitionSeries` entre clips ainda não na UI — o inspector troca presets de hook/caption; transições entre clips é refinamento.
- **CodeRabbit:** pré-commit (WSL) NÃO executado.

### Redesign Fase B — editor NLE + auto-cut (2026-06-21, rework do dono)
Feedback do dono: o editor "parecia mais um editor de imagem que de vídeo" (enviesado pelo `creative-design` slide-based). Reconstruído como **NLE (non-linear editor) de verdade**:
- **Timeline horizontal** (`Timeline.tsx`): régua com scrub, tracks V/A/T, **playhead sincronizado** ao `PlayerRef` (`frameupdate`/`seekTo`), **waveform** da narração (Web Audio API), **trim por arraste** (handle no clip). Substitui o layout de 3 colunas tipo slide.
- **Transporte + atalhos** (espaço/setas), zoom (pps) com **fit-to-window**, undo/redo com **trim em transação** (1 entrada de histórico por gesto, não por pixel).
- **Auto-cut de silêncios** (pedido do dono): server-side e sincronizado — apara dead air dos talking-heads E remove respiros da narração (`computeSpeechCut` → segmentos; narração toca segmentada via `<Series>`; janelas dos inserts e legendas recomputadas pelo mesmo mapeamento). **Slider de agressividade ao vivo** (`?maxgap=`, debounce 220ms): 3→18 segmentos conforme o limiar.
- **Track de legendas** mostra o texto real; modelo de áudio híbrido visível (🔊/🔇 por clip).
- **Preview visual (endereça a Concern Medium AC2):** a composição com FX foi verificada por **stills renderizados headless** (`renderStill`) — frames reais inspecionados (legibilidade/enquadramento OK). A interação ao vivo do NLE ainda se beneficia de um check no browser (`npm run dev`).
- **Validação:** 26 testes (ingest 11 + editorState 7 + transcript 4 + captions/fxRegistry); `tsc`/build limpos.

### File List
- `apps/video-studio/src/lib/editorState.ts` (novo) · `src/lib/editorState.test.ts` (novo — 7 testes)
- `apps/video-studio/src/app/studio/page.tsx` (reescrito — editor completo)
- `apps/video-studio/src/app/api/timeline/route.ts` (novo)
- `apps/video-studio/src/app/api/media/[...path]/route.ts` (novo — stream com Range)
- `apps/video-studio/src/remotion/TimelineFxComposition.tsx` (modificado — `mediaBaseUrl`)
- `apps/video-studio/src/remotion/fx/SmartFrame.tsx` (modificado — recebe `src`)
- _Redesign:_ `apps/video-studio/src/components/{Timeline,Waveform}.tsx` (novos — NLE timeline horizontal + waveform)
- _Redesign:_ `apps/video-studio/src/app/studio/page.tsx` (reescrito — layout NLE, PlayerRef sync, transporte, auto-cut + slider de agressividade)
- _Redesign:_ `apps/video-studio/src/app/api/timeline/route.ts` (modificado — `?autocut=1&maxgap=`, legendas reais, resumo de silêncios)
- _Redesign:_ `apps/video-studio/src/lib/ingest.ts` (`applyTalkingHeadAutocut`) · `src/lib/transcript.ts` (`computeSpeechCut`/`mapViaSegments`)

## QA Results

**Gate:** ⚠️ **CONCERNS** · @qa (Quinn) · 2026-06-21 — aprovado para seguir; preview visual fica como dívida de validação do dono.

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ `editorState` imutável/limpo; APIs com guard de segurança; UI organizada em 3 zonas |
| 2 | Testes | ✅ 20/20 (`editorState` 7/7 cobre toda a lógica de edição) |
| 3 | Critérios de aceite | ⚠️ AC1/AC3/AC5 ✅; AC2/AC4 parciais (ver Concerns) |
| 4 | Sem regressões | ✅ MVC-07/08/09 intactas; build/tsc limpos; composição com `mediaBaseUrl` retrocompatível |
| 5 | Performance | ✅ media com Range (evita baixar o vídeo todo); inputProps memoizados |
| 6 | Segurança | ✅ **path traversal → 403** (verificado independente); runtime nodejs explícito |
| 7 | Documentação | ✅ Limitações declaradas com honestidade |

### Verificação independente (server real, porta 3211)
- `/api/timeline` válido → 6 clips + fxPlan; inexistente → 500 com `{error}` (ver Concern).
- `/api/media`: Range → **206**; full → **200** (audio/ogg); inexistente → **404**; traversal → **403**.
- `/studio` → **200**, renderiza o shell ("Carregando" → fetch).

### Concerns (advisory — rastreadas)
- **[Medium · validação] Preview visual do Player NÃO verificado** (AC2). Toda a infra está provada (APIs, range, build, inputProps reativos), mas a renderização do `@remotion/player` no browser não foi confirmada nesta sessão (sem browser interativo). **Risco residual baixo, mas real.** **Ação recomendada ao dono:** `npm run dev` + abrir `/studio` e confirmar o preview + as edições refletindo (ou usar o skill `verify`). Antes disso, o editor não pode ser considerado "produto validado".
- **[Low · escopo] AC4 troca de mídia** não implementada (fora do MVP do @po); editar legenda ✓. Follow-up.
- **[Low · API] `/api/timeline` retorna 500 para criativo inexistente** — deveria ser 404. A UI trata `d.error`, mas o status semântico está errado.
- **[Low] Transições entre clips** (`TransitionSeries`) ainda não na UI (refinamento, herdado da MVC-09).
- **[Low · processo] CodeRabbit** não executado.

### Veredito
Editor estruturalmente sólido, **backend 100% validado em server real** (APIs, range, segurança), lógica de edição com cobertura completa de testes. O que impede um PASS limpo é a **ausência de verificação visual do preview** (AC2) — não um defeito conhecido, mas falta de evidência. **CONCERNS = aprovado para a MVC-11**, com a recomendação explícita de o dono validar o preview visual antes de tratar o editor como pronto. Push pendente → @devops (4 stories Fase B acumuladas).

---

### Re-Gate — Redesign Fase B · @qa (Quinn) · 2026-06-22

**Gate:** ⚠️ **CONCERNS** (melhorou, mas ainda não PASS) — editor NLE + auto-cut.

**Evidência (re-verificada):** **29/29** testes (incl. 7 de `editorState`), `tsc` limpo, `next build` OK (`/studio`, `/api/timeline`, `/api/media`). Auto-cut em 3 limiares: `maxgap` 0,7→0,4→0,2 = **3→12→18 segmentos** (monotônico). Composição renderiza correta (stills headless).

**Concern Medium anterior (AC2 preview visual) — PARCIALMENTE endereçada:** a **saída** da composição agora tem evidência (frames renderizados). **Porém a camada interativa do NLE** (trim por arraste, playhead↔`PlayerRef`, slider de auto-cut com debounce) **continua sem verificação em browser**.

**Novos itens:**
- **[Medium · segurança]** `/api/timeline` usa `client`/`creative` (query) direto em `path.join` e em `video-brief-${creative}.yaml` **sem sanitizar** → **path traversal** (mesma classe que o `/api/media` guardou com 403). Risco real **baixo** (ferramenta local), mas legítimo. **Recomendação:** allowlist de slug (`/^[a-z0-9-]+$/i`) no route.
- **[Medium · validação]** interação ao vivo do NLE não verificada — dono rodar `npm run dev` + `/studio` e confirmar trim por arraste, playhead seguindo o play e o slider recomputando ao vivo.

**Mantidos (Low):** `/api/timeline` retorna 500 (não 404) para criativo inexistente; CodeRabbit não executado.

**Veredito:** funcionalmente forte e a saída visual agora tem evidência, mas **CONCERNS** persiste por (1) interação do NLE sem check em browser e (2) **novo gap de segurança** (traversal). Corrigir o traversal (rápido) e validar a interação antes de "produto pronto". Gate file: `docs/qa/gates/MVC-10-editor-studio.yml`.

---

### Re-Verificação dos Fixes — @qa (Quinn) · 2026-06-22

**Gate:** ⚠️ **CONCERNS** (mantido — só por dívida de validação do dono, **sem item de código aberto**).

O @dev aplicou o `QA_FIX_REQUEST-MVC-10`. **Re-verifiquei de forma independente** (inspeção do código + auditoria adversarial ao vivo no dev server :3000):

- **FIX 1 [Medium · segurança] — ✅ RESOLVIDO.** Guard `SLUG /^[a-z0-9][a-z0-9-]*$/i` na **linha 41, ANTES** de qualquer I/O (`fs.existsSync`/`ingestCreative` vêm depois). 7 vetores de ataque → **400** (`../../foo`, `..%2F..%2Fetc`, `...`, slug+slash, `-etc` leading-dash, client traversal). Nenhum entrada inválida toca o filesystem. Path traversal **fechado**.
- **FIX 2 [Low · API] — ✅ RESOLVIDO.** Criativo inexistente (formato válido) → **404** (antes 500); erro real permanece 500.
- **Sem regressão:** criativo válido → 200; `autocut=1&maxgap=0.3` → 200.

**Itens remanescentes (não-código):**
- **[Medium · validação]** interação ao vivo do NLE (trim por arraste, playhead, slider) — **ação do dono** no browser, não defeito.
- **[Low · processo]** CodeRabbit não executado.

**Conclusão:** as duas Concerns acionáveis por código estão **fechadas e verificadas**. O gate segue **CONCERNS** apenas pela validação interativa pendente (evidência do dono) — **liberado para @devops (push)**. Validar o NLE no browser promove o gate a PASS.

## Change Log
- 2026-06-21 — @sm (River) — Story criada (Draft).
- 2026-06-21 — @po (Pax) — Validada (GO 8/10); Riscos (UI timeline + MVP, perf do Player); Draft → Ready.
- 2026-06-21 — @dev (Dex) — Editor `/studio` + APIs (timeline/media com Range) + editorState; 7 testes + backend validado em server real; Ready → Ready for Review. AC2/AC4 parciais (preview visual + troca de mídia).
- 2026-06-21 — @dev (Dex) — **RETRABALHO — editor NLE + auto-cut:** layout slide-based reconstruído como **NLE real** (timeline horizontal, tracks V/A/T, playhead via PlayerRef, waveform, trim por arraste, fit-to-window, trim em transação). **Auto-cut de silêncios** (talking-heads + respiros da narração) com **slider de agressividade ao vivo** (`?maxgap=`, debounce). Preview visual da composição **verificado por stills renderizados** (`renderStill`) — endereça a Concern Medium AC2 (resta o check interativo no browser). 26 testes. Recomendado re-QA.
- 2026-06-22 — @dev (Dex) — **QA fix (`QA_FIX_REQUEST-MVC-10`):** **FIX 1 [Medium·segurança]** allowlist de slug (`/^[a-z0-9][a-z0-9-]*$/i`) em `client`/`creative` no `/api/timeline` ANTES de qualquer I/O → **400** em path traversal (fecha o gap; espelha o guard do `/api/media`). **FIX 2 [Low·API]** criativo inexistente → **404** (via `fs.existsSync(materialsDirFor)`), não mais 500. Verificado no dev server ao vivo: válido 200 · traversal `../../foo` e `..%2F..` 400 · inexistente 404 · client malicioso 400. `tsc`/`build` limpos. _CodeRabbit pré-commit: não executado (consistente com a Fase B)._
