# MVC-08: Ingestão automática — video-brief + material bruto → timeline auto-montada

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase B)
**Complexidade:** XL (Complex — 13 pontos)
**Criada por:** @sm (River) · 2026-06-21
**Validada por:** @po (Pax) · 2026-06-21 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-21

## Story
**Como** Marketing Chief
**Eu quero** que o app leia o `video-brief.yaml` + a pasta de material bruto e monte sozinho a timeline na ordem do plano
**Para que** eu abra um criativo já pré-editado (clips no lugar, narração sincronizada) em vez de montar do zero.

## Contexto
2ª story da Fase B — o coração da automação. Conecta a Fase A (o plano) à Fase B (o editor). Usa o `edit_spec` da MVC-05 (ordem de montagem: clip → papel → duração) e o mapa narração→insert para sequenciar os clips reais automaticamente.

**Caso de validação (real):** o criativo `13-realchasechappell-84d69e` — 6 clips de vídeo (`hook.mp4`, `Skill_activate.mov`, `Site_modeling.mov`, `Site_gen.mov`, `Site_resultado.mov`, `final do video.mp4`) + `audio_narrado.ogg` (~48,6s), já mapeados no `Plano-de-Criativo.md`.

## Decisão de arquitetura
- `src/lib/ingest.ts` — lê o `video-brief.yaml` (`content_plan.edit_spec` + storyboard) e resolve os clips na pasta `Materiais Brutos/`.
- Detecta duração/resolução real de cada clip (ffprobe via serviço Node ou `@remotion/media-utils`).
- Monta um **timeline JSON** (tracks: vídeo principal sequenciado + faixa de áudio da narração + faixa de legenda placeholder) → props da composição Remotion.
- Sincroniza `audio_narrado.ogg` na faixa de áudio; aplica a **nota de ritmo** do plano (narração mais longa que visuais → estende inserts com hold OU sinaliza ajuste).
- Clips ausentes/desalinhados → marca `[GAP]` no timeline (não quebra; degrada).
- API route `/api/ingest?client=&creative=` devolve o timeline JSON.

## Tarefas (Checklist)
- [x] Resolução de ordem de montagem: `classifyRole` por nome de arquivo + ordem canônica de papéis (override via `order`). _(Nota: o `video-brief.yaml` não carrega nomes de clip; a classificação por role do material é mais robusta e foi a via escolhida.)_
- [x] Resolver clips em `Materiais Brutos/` + ffprobe de duração/resolução (`probeMedia`, `resolveMaterials`).
- [x] Builder do timeline JSON (`buildTimeline`): faixa de vídeo sequenciada + faixa de áudio (narração) + caption placeholder.
- [x] Sincronização da narração + `meta.rhythmGapSeconds` (nota de ritmo computada).
- [x] `TimelineComposition` consome o timeline e sequencia via `<Series.Sequence>` + `OffthreadVideo` + `Audio`.
- [x] Tratamento de GAP (clip ausente → placeholder visível + `meta.gaps`), sem quebrar.
- [x] Validação E2E com Chase Chappell (CLI `ingest.ts` + render smoke).

## Critérios de Aceite
- [x] **AC1:** Chase Chappell → `timeline.json` com **6 clips na ordem de montagem** (hook→skill→reference→generation→result→cta), startFrames sequenciais.
- [x] **AC2:** Cada clip com **duração real ffprobe** (hook 4,37s · skill 4,67s · ref 6,23s · gen 9,97s · result 5,2s · cta 7,73s), não a estimada.
- [x] **AC3:** `audio_narrado.ogg` (48,57s) como faixa de áudio; `rhythmGapSeconds=10,4` computado; render smoke saiu com áudio aac.
- [x] **AC4:** `TimelineComposition` renderizou (smoke) um mp4 1080×1920 h264+aac a partir do timeline com os clips reais.
- [x] **AC5:** Clip ausente → `gap:true` + `meta.gaps`, timeline ainda válido (teste unitário dedicado).

## Escopo
**IN:** `ingest.ts`, timeline JSON, composição sequenciada, API de ingestão.
**OUT:** FX/legendas estilizadas (MVC-09); ajuste manual (MVC-10); export final (MVC-11).

## Dependências
- **MVC-07** (scaffold + composição base).
- **MVC-05** (`edit_spec` no `video-brief` + `Plano-de-Criativo.md`) — formato da ordem de montagem.
- Material bruto real em `outputs/.../Materiais Brutos/` (Chase Chappell). **Habilita:** MVC-09, MVC-10.

## Riscos (PO)
- **[Médio · ambiente] Material de validação é gitignored:** os `Materiais Brutos/` do Chase Chappell vivem em `outputs/` (não versionado). Quem implementar/validar precisa ter os arquivos **localmente**. Pré-requisito de ambiente — registrar no handoff ao @dev. (O `video-brief-13-realchasechappell-84d69e.yaml` em `data/` está, mas com `content_plan` — o material em si não.)
- **[Médio] ffprobe em Node:** depende de ffmpeg no PATH OU `@remotion/media-utils`. Definir a via na implementação; sem ffprobe, durações reais (AC2) ficam indisponíveis.
- **[Baixo] Nota de ritmo:** estender inserts com hold vs. aparar narração é decisão de produto — na v1, apenas **sinalizar** o descompasso (~10s) no timeline, sem auto-resolver.
- **[Nota] XL no teto:** se a ingestão + composição sequenciada + tratamento de GAP crescer, candidata a split (`ingest-core` vs. `composition-wiring`).

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- **Decisão de ordem (desvio da story):** a story assumia que a ordem viria do `edit_spec` do `video-brief.yaml`, mas o yaml **não carrega nomes de clip** (esses estão no `Plano-de-Criativo.md` editado à mão). Implementei resolução por **`classifyRole`** (nome de arquivo → papel) + **ordem canônica de papéis**, com `order` (lista explícita) como override. Mais robusto e determinístico para o padrão de nomes do pipeline. Validado: 6/6 clips do Chase Chappell na ordem certa.
- **Lógica pura testável:** `classifyRole`, `orderClips`, `buildTimeline` (probe injetável) — 6 testes `node:test` (Node 24 type-stripping, sem runner extra).
- **ffprobe** via `execFileSync` (ffmpeg no PATH) — durações/dimensões reais.
- **Composição:** `TimelineComposition` sequencia via `<Series.Sequence>` + `OffthreadVideo` (objectFit cover, pois os clips são landscape num canvas 9:16) + `<Audio>` paralelo. `calculateMetadata` extrai duração/fps do timeline. GAP → `GapCard` visível.
- **Render real:** `render-timeline.ts` empacota com `publicDir = Materiais Brutos` (serve os clips via `staticFile`) e renderiza. **Smoke (90 frames)** por padrão — provou a montagem com vídeo+áudio reais sem o custo do render completo de 48s. `--full` disponível.
- **Nota de ritmo:** `rhythmGapSeconds=10,4` apenas **sinalizado** (não auto-resolvido) — conforme risco-PO.
- **CodeRabbit:** pré-commit (WSL) NÃO executado nesta sessão.

### Redesign Fase B — montagem narração-driven (2026-06-21, rework do dono)
A montagem "clips em sequência + narração cortada no miolo" foi a raiz do desalinhamento ("inserts não coincidem com a fala"). Reconstruída para **narração-driven**:
- **A narração é a espinha temporal.** Descoberta (via transcrição real): `audio_narrado.ogg` (48,5s) cobre o miolo INTEIRO (skill→resultado); o código antigo a tocava cortada e com offset errado.
- **Inserts ancorados à fala.** `assembly.json` (mapa narração→insert, derivado do Plano) + `computeMioloWindows`: cada insert recebe a janela da narração que o descreve (âncora por keyword no transcript). `playbackRate` (`nativo/janela`) estica/comprime o clip para cobrir a janela — sem tela preta, sincronizado.
- **Schema:** `TimelineClip` ganhou `nativeDurationInFrames` + `playbackRate`; `TimelineAudio` ganhou `segments?` (auto-cut, MVC-10). Narração toca integral do frame 0 sobre o miolo.
- **Resolve a Concern Medium "ordem inferida sem âncora no plano"** — agora há âncora explícita (`assembly.json`) ligada ao Plano.
- **Validação:** 11 testes ingest (incl. `computeMioloWindows`, `applyTalkingHeadAutocut`, `normalizeText`); check real → 6 clips na ordem, narração 4,37→52,9s, durações/velocidades coerentes.

### File List
- `apps/video-studio/src/lib/timeline.ts` (novo — tipos)
- `apps/video-studio/src/lib/ingest.ts` (novo — classificação/ordem/build)
- `apps/video-studio/src/lib/ingest.test.ts` (novo — 6 testes, 6/6)
- `apps/video-studio/src/remotion/TimelineComposition.tsx` (novo)
- `apps/video-studio/src/remotion/Root.tsx` (modificado — registra a composição Timeline)
- `apps/video-studio/scripts/ingest.ts` (novo — CLI de ingestão)
- `apps/video-studio/scripts/render-timeline.ts` (novo — render smoke/full)
- `apps/video-studio/tsconfig.json` (modificado — `allowImportingTsExtensions`)
- _Redesign:_ `apps/video-studio/src/lib/timeline.ts` (+`nativeDurationInFrames`/`playbackRate`/`AudioSegment`)
- _Redesign:_ `apps/video-studio/src/lib/ingest.ts` (narração-driven: `computeMioloWindows`/`normalizeText`/`applyTalkingHeadAutocut`/`ingestCreative` com assembly+transcript)
- _Redesign:_ `apps/video-studio/scripts/transcribe.py` (novo — Whisper word-level) · `scripts/check-assembly.ts` (diagnóstico)
- _Redesign (dados, gitignored):_ `outputs/.../13-realchasechappell-84d69e/{transcript.json,assembly.json}`

## QA Results

**Gate:** ✅ **PASS** · @qa (Quinn) · 2026-06-21 — com 2 Concerns Medium rastreadas para MVC-09/10.

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ Lógica pura separada do I/O (probe injetável); `Series`+`OffthreadVideo`+`Audio` idiomático |
| 2 | Testes | ✅ 6/6 `node:test` — classifyRole, orderClips, buildTimeline (durações/startFrames), **GAP**, override |
| 3 | Critérios de aceite | ✅ AC1–AC5 verificados independente (timeline.json + render smoke + ffprobe) |
| 4 | Sem regressões | ✅ MVC-07 intacta (build/tsc limpos); composição nova registrada sem quebrar a base |
| 5 | Performance | ✅ ffprobe rápido; render via OffthreadVideo (smoke validou) |
| 6 | Segurança | ✅ `execFileSync` (sem shell) com args em array — sem injeção via nome de arquivo |
| 7 | Documentação | ✅ Desvio de ordem documentado honestamente na story |

### Evidência (verificação independente)
`timeline.json` real: 6 clips de vídeo + 1 áudio, ordem `hook→skill→reference→generation→result→cta`, **startFrames monotônicos**, `rhythmGap=10,4s`, 0 gaps, 1457 frames. Render smoke → mp4 1080×1920 h264+aac.

### Concerns (advisory — rastreados)
- **[Medium · MVC-10] Ordem inferida por heurística, sem âncora no plano.** `classifyRole` (nome→papel) funciona para o padrão atual, mas: 2 clips do mesmo papel desempatam por nome (pode não ser a intenção); nomes fora do padrão viram `unknown` (vão ao fim). O override `order` existe mas **não está conectado a nenhuma fonte** (nem `edit_spec` nem `Plano-de-Criativo.md`). **Recomendação:** na **MVC-10** o editor permite reordenar manualmente (mitiga); idealmente conectar `order` a uma `assembly` explícita no video-brief num follow-up.
- **[Medium · MVC-09] `objectFit: cover` corta screen captures landscape.** Os clips são 1920×1080 num canvas 1080×1920 — "cover" recorta ~66% da largura, podendo cortar conteúdo do site demonstrado. **Recomendação:** enquadramento inteligente na **MVC-09** (contain+fundo, ou zoom/pan no foco) — crítico para clips de tela.
- **[Low] Render full não validado** (só smoke 90 frames cobrindo o hook). A sequência completa (transições + áudio ao longo de tudo) será o E2E definitivo na **MVC-11**.
- **[Low] CodeRabbit** pré-commit não executado.

### Veredito
Core sólido e **provado com material real** (timeline.json correto + render smoke). O desvio de ordem foi uma decisão pragmática justificada e documentada. As 2 Concerns Medium são de produto/refinamento e caem naturalmente nas próximas stories (MVC-09 enquadramento, MVC-10 reordenação). **PASS.** Próxima: MVC-09 (FX/legendas). Push pendente → @devops.

---

### Re-Gate — Redesign Fase B · @qa (Quinn) · 2026-06-22

**Gate:** ✅ **PASS** (mantido) — verificação independente do redesign narração-driven.

**Evidência (re-verificada):** suíte completa **29/29** (`node:test`, incl. 11 de ingest), `tsc --noEmit` limpo, `next build` OK. `check-assembly` real: 6 clips na ordem, narração como espinha (4,37→52,9s), `playbackRate` por insert coerente, auto-cut 60,7→56,1s.

**Concern anterior FECHADA:** *"ordem inferida sem âncora no plano"* → agora `assembly.json` (mapa narração→insert do Plano) + `computeMioloWindows` ancoram cada insert ao trecho da fala que o descreve. A heurística `classifyRole` deixou de ser a única fonte.

**Novos itens (Low):**
- **[Low · ambiente]** `transcript.json`/`assembly.json` são artefatos por-criativo gitignored; novo criativo exige `transcribe.py` (Whisper) + assembly. → automatizar na Fase A.
- **[Low · segurança]** `ingestCreative` deriva paths de `client`/`creative` sem sanitizar — gap pertence ao route (rastreado na MVC-10).
- **[Low · processo]** CodeRabbit não executado.

**Veredito:** core reconstruído com qualidade, Concern fechada, novos itens são Low. **PASS.** Gate file: `docs/qa/gates/MVC-08-ingest-timeline.yml`.

## Change Log
- 2026-06-21 — @sm (River) — Story criada (Draft).
- 2026-06-21 — @po (Pax) — Validada (GO 8/10); Riscos (material gitignored, ffprobe, ritmo) + nota de split; Draft → Ready.
- 2026-06-21 — @dev (Dex) — Implementado ingest + timeline + composição; 6 testes + E2E real (timeline.json + render smoke); Ready → Ready for Review.
- 2026-06-21 — @dev (Dex) — **RETRABALHO (feedback do dono — áudio dessincronizado):** modelo de áudio era errado (mutava TODOS os clips + narração única desde o frame 0, cortada/dessincronizada). Corrigido para **híbrido** (decisão do dono): `audioEnabled` por clip — talking-heads (hook/cta) tocam o próprio áudio; screen captures mudos com a **narração só no miolo** (`audioTrack.startFrame`/`windowFrames`: frame 131–913, 26,1s) + `startFrom` p/ continuar de onde o hook parou. Schema `TimelineClip.audioEnabled` + `TimelineAudio.startFrame/windowFrames`. 20 testes verdes. Parte da revisão profunda da Fase B (NLE editor + legendas whisper a seguir).
- 2026-06-21 — @dev (Dex) — **RETRABALHO 2 — montagem narração-driven:** o modelo "narração só no miolo cortado" ainda desalinhava inserts↔fala. Reconstruído: narração é a espinha; cada insert ancorado ao trecho da fala (`assembly.json` + `computeMioloWindows`), com `playbackRate` (`nativo/janela`) cobrindo a janela. Novos campos `nativeDurationInFrames`/`playbackRate`/`AudioSegment`. Transcrição real (Whisper) cacheada. Resolve a Concern Medium "ordem sem âncora no plano". 11 testes ingest. Recomendado re-QA.
