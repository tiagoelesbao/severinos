# VEX-02: Ponte automática Fase A→B — transcrição + assembly sem trabalho manual

**Status:** InReview — **QA Gate: ✅ PASS** (gate file: `docs/qa/gates/VEX-02-ponte-automatica-fase-a-b.yml`) · Done após push @devops
**Epic:** EPIC-MKT-Video-Excellence (F1 — Destravar o produto)
**Prioridade:** **P0** — hoje cada criativo novo exige artesanato invisível (Whisper manual + assembly à mão)
**Complexidade:** L (Standard — 11 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** Marketing Chief
**Eu quero** que, ao soltar os arquivos gravados em `Materiais Brutos/`, o sistema transcreva tudo (Whisper word-level) e gere sozinho o `assembly.json` (âncoras narração→insert) a partir do Plano-de-Criativo
**Para que** qualquer criativo novo abra no `/studio` já montado e sincronizado — a promessa da MVC-08 valendo para TODOS os criativos, não só o caso de validação.

## Contexto (evidência da auditoria)
- `ingest.ts:483` espera `assembly.json` + `transcript.json` na pasta do criativo, mas **nenhum passo do pipeline os gera** — foram feitos à mão para `13-realchasechappell-84d69e`.
- O QA da MVC-08 já rastreava: "[Low · ambiente] novo criativo exige `transcribe.py` (Whisper) + assembly. → automatizar na Fase A".
- `sam_whisper_service.py` já existe no squad (REUSE) e `apps/video-studio/scripts/transcribe.py` foi criado no redesign da MVC-08.
- O protocolo do `*industrialize-video` (marketing-chief.md) ainda aponta a Fase B para o DaVinci (step 4B) e pede path de benchmark digitado à mão (step 2A).

## Decisão de arquitetura (proposta)
- **Scaffold no fim da Fase A:** quando o `video_plan.py` passa no gate, criar `outputs/<client>/video-plans/<slug>/Materiais Brutos/` + `_COMO-GRAVAR.md` (shotlist resumida + nomes de arquivo esperados por papel, derivados da shotlist do plano).
- **Preparador de criativo** (`scripts/prepare-creative.ts` no app + botão "Preparar" na UI e/ou detecção automática na rota `/api/timeline` quando `transcript.json` está ausente/desatualizado):
  1. Transcreve cada mídia falada de `Materiais Brutos/` via Whisper word-level → `transcript.json` (cache por mtime — não re-transcreve o que não mudou).
  2. Gera `assembly.json`: identifica o arquivo de narração (áudio solto ou o mais longo), e ancora cada insert ao trecho da fala casando **shotlist/storyboard do plano × transcript** (fuzzy match por keywords normalizadas; reuso do `normalizeText`/aligner de `transcript.ts`). Fallback: 1 chamada LLM barata quando o fuzzy score for baixo.
  3. Registra proveniência (`generatedBy`, score de confiança por âncora) — âncoras de baixa confiança aparecem como aviso na auditoria E1.
- **Protocolo do agente atualizado** (`.claude/commands/VIRALS/agents/marketing-chief.md`, fonte canônica):
  - Step 2A: listar automaticamente os benchmarks de vídeo disponíveis (varre `daily-monitoring/{DATE}/benchmark/**` das datas recentes) num `AskUserQuestion`, com "digitar path" como fallback.
  - Step 4B: destino = app próprio (`/studio`), com instrução "grave a shotlist → solte em `Materiais Brutos/` → abra o Studio"; DaVinci vira nota opcional.
- **Localização do brief:** passar a gravar/ler `video-brief.yaml` junto do plano (`outputs/<client>/video-plans/<slug>/`), mantendo leitura retrocompatível do path antigo (`data/video-brief-*.yaml`).

## Tarefas (Checklist)
- [x] Scaffold pós-gate no `video_plan.py` (pasta `Materiais Brutos/` + `_COMO-GRAVAR.md` derivado da shotlist, com nomes por papel).
- [x] `prepare-creative`: transcrição Whisper word-level com cache por tamanho+mtime (`_meta.files` no transcript.json; reusa `transcribe.py`).
- [x] Gerador de `assembly.json`: matching shotlist×transcript **determinístico** (DP monotônico por keywords, puro/testável) + score de confiança. _(Desvio justificado: fallback LLM ficou desnecessário — sem sinal, partição uniforme com confiança 0 + aviso E1; ver Dev Record.)_
- [x] Wire: botão "⚙ Preparar criativo" no Studio (aparece quando não há transcript) + `POST/GET /api/prepare` (worker destacado + poll + reload ao concluir).
- [x] Brief co-localizado: `video_plan.py` grava `video-brief.yaml` junto do plano; app (`/api/timeline` e `prepare-creative`) lê co-localizado com precedência e `data/` como fallback retrocompatível.
- [x] Protocolo do marketing-chief: step 2A lista os benchmarks de vídeo automaticamente (Glob + Benchmark.json, fallback digitar path); Fase B re-escrita para o app próprio (Preparar → Salvar → Exportar); DaVinci vira legado opcional.
- [x] E2E: sandbox com transcript+brief reais (sem assembly manual) → `prepare-creative` gerou assembly com âncoras válidas e monotônicas (ver Dev Record).

## Critérios de Aceite
- [ ] **AC1:** Pasta de criativo com materiais e SEM `transcript.json`/`assembly.json` → após preparação automática, o Studio abre com timeline narração-driven montada (inserts ancorados, legendas reais).
- [ ] **AC2:** Re-preparar sem mudanças em disco = no-op (cache); trocar 1 arquivo re-transcreve só ele.
- [ ] **AC3:** `assembly.json` gerado traz score por âncora; âncora < limiar aparece como aviso na auditoria E1 com sugestão.
- [ ] **AC4:** `*industrialize-video` Fase A lista os benchmarks de vídeo disponíveis (sem digitar path) e Fase B orienta para o Studio.
- [ ] **AC5:** Caso de validação existente continua abrindo idêntico (retrocompatibilidade dos paths de brief e dos artefatos manuais).

## Escopo
**IN:** transcrição automática, geração de assembly, scaffold, protocolo do agente, co-localização do brief.
**OUT:** visão nos frames do benchmark (VEX-04); classifyRole pelo plano no ingest (VEX-06 — aqui só geramos a fonte que ele consumirá).

## Dependências
- Nenhuma bloqueante (paralelizável com VEX-01). **Habilita:** VEX-06, VEX-11.
- Ambiente: Whisper local funcional (mesmo setup do `transcribe.py` da MVC-08).

## Riscos
- **[Médio] Qualidade do matching shotlist×fala:** planos genéricos podem gerar âncoras ambíguas. Mitigação: score de confiança + aviso E1 + edição manual sempre possível no Studio.
- **[Médio] Custo/latência do Whisper** em materiais longos: cache por mtime + transcrição incremental.
- **[Baixo] Divergência entre o gravado e a shotlist** (o dono improvisa): o fallback LLM ancora por semântica, não por texto literal.

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude no papel @dev)

### Decisões de implementação
1. **Matching determinístico em vez de fallback LLM.** `generateMioloAnchors` (em `src/lib/prepare.ts`): keywords das `falas_chave` da shotlist + tokens do filename → varredura por janelas na narração → **DP monotônico** escolhe as posições (ordem dos inserts = ordem na narração). A âncora emitida são as PRÓPRIAS palavras do transcript na posição (`uniqueAnchorAt` estende até desambiguar repetições) — o casamento pelo `computeMioloWindows` é **garantido por construção**. Sem sinal → partição uniforme com confiança 0. O fallback LLM previsto na story ficou desnecessário; baixa confiança → aviso E1 + revisão humana (mais barato e auditável que uma chamada LLM).
2. **Pareamento shotlist→inserts por contagem:** `len(shotlist) == inserts+2` → descarta 1ª/última (hook/cta); `== inserts` → direto; senão só filename tokens.
3. **Cache de transcrição por arquivo** (`_meta.files` com size+mtimeMs no próprio transcript.json — chave `_meta` é ignorada naturalmente pelos consumidores existentes). Só re-transcreve o que mudou.
4. **Co-localização do brief sem tocar os 4 motores:** eles seguem escrevendo em `data/` (fluxo interno); o `video_plan.py` copia o brief final para `outputs/.../video-brief.yaml` e os consumidores da Fase B leem o co-localizado com precedência. Retrocompatibilidade total.
5. Sem narração (áudio) na pasta → assembly é pulado com status explícito (`skipped-no-narration`, modo talking-head puro) — não é erro.

### Validação executada
- **7/7 testes novos** (`prepare.test.ts`: keywords, filename tokens, caso real com posições monotônicas + janelas contíguas via `computeMioloWindows`, uniform sem sinal, desambiguação de âncora, staleness) — suíte do app **89/89**; `tsc --noEmit` e `next build` limpos (rota `/api/prepare` registrada).
- **Python:** 10/10 testes do `test_video_plan.py` (sem regressão) + smoke do `render_como_gravar_md` (escape de `|`, papéis hook/insert/cta, narração).
- **E2E sandbox** (transcript + brief REAIS do Chase Chappell, sem assembly manual): gerou `method: keywords` com âncoras `Skill_activate←"segundos a" (0.5)`, `Site_modeling←"Brand Kit" (0.31 → flagada)`, `Site_gen←"Com esses" (0.5)`, `Site_resultado←"A página" (0.52)` — janelas equivalentes às âncoras feitas à mão (gen/resultado cravadas; modeling a ~2 palavras da manual, corretamente flagada para revisão).

### File List
- `apps/video-studio/src/lib/prepare.ts` (novo — keywordsFrom/filenameTokens/generateMioloAnchors/uniqueAnchorAt/staleFiles)
- `apps/video-studio/src/lib/prepare.test.ts` (novo — 7 testes)
- `apps/video-studio/scripts/prepare-creative.ts` (novo — worker: whisper com cache + assembly + status)
- `apps/video-studio/src/app/api/prepare/route.ts` (novo — POST worker destacado / GET status / 409)
- `apps/video-studio/src/app/api/timeline/route.ts` (modificado — brief co-localizado com precedência + aviso E1 de âncora com confiança < 0.4)
- `apps/video-studio/src/app/studio/page.tsx` (modificado — botão "⚙ Preparar criativo" + poll + reload)
- `squads/virals-marketing-squad/scripts/video_plan.py` (modificado — `render_como_gravar_md` + scaffold Materiais Brutos + brief co-localizado + report novo)
- `.claude/commands/VIRALS/agents/marketing-chief.md` (modificado — step 2A auto-lista benchmarks; Fase B → Studio; DaVinci legado)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-02 — Claude (@po) — Validada (GO 9/10; risco de matching mitigado por score+aviso E1). Draft → Ready.
- 2026-07-02 — Claude (@dev) — Implementação completa + E2E sandbox com dados reais; desvio documentado (matching determinístico substitui fallback LLM). Ready → Ready for Review.
- 2026-07-02 — Claude (@qa) — Gate ✅ PASS (AC1–AC5 met; 3 Lows; desvio do LLM-fallback aprovado com nota). Ready for Review → InReview.
