# MCI-06: Fidelidade Factual Terminal + Gate Bloqueante no Pipeline de Copy

**Status:** InReview
**Epic:** EPIC-MKT-Creative-Intelligence
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-06-17
**Origem:** sessão real `*design-creative` no `brief-v5-01-falajoaobranco-209716` (chuteiras rosas / João Branco) — copy entregue com OCR cru e, após re-run, com estatísticas fabricadas. Diagnóstico em `memory/project_copy_pipeline_fidelity_gap.md`.

## Story
**Como** pipeline `*design-creative` (Etapas 2–5: analyze → plan → recast → quality_gate)
**Eu quero** garantir que a copy final seja factualmente fiel à fonte e nunca seja o OCR cru de fallback
**Para que** os carrosséis Virals não publiquem números inventados, "pesquisas internas" inexistentes nem `@handle` do autor do benchmark — eliminando o risco de marca e a queda de qualidade.

## Contexto
6ª story do EPIC-MKT-Creative-Intelligence. MCI-01..05 entregaram análise, planejamento, recast plan-aware, self-healing e o adapter de vídeo. A sessão das chuteiras rosas expôs quatro gaps que derrubam a qualidade da copy:

1. **Degradação silenciosa.** Em `design_creative.py`, as Etapas 2–5 são `fatal=False`. Quando a LLM falha (modelos `:free` em rate-limit/JSON malformado), o pipeline **renderiza o OCR cru** do `deep_modeler` como copy final — com `@handle`/nome do autor vazados (slides 3/5/7/8/10 do caso), headlines de 200+ chars e slide `[RECAST PENDENTE]`. O brief vai a render mesmo com `_validation.status: FAIL` e `personalization: PENDING_RECAST`.

2. **Fabricação de estatísticas.** O prompt do `plan_creative.py` forçava *"NÚMERO em todo slide"*, induzindo o LLM a alucinar `%`, `1,8×`, `+1,2 mi`, `subiu 34%` e até "pesquisa interna". A fonte (benchmark) era 100% qualitativa.

3. **`quality_gate` re-injeta fabricações.** O `quality_gate.py` (Etapa 5) também reescreve via LLM e roda **depois** do recast — desfazendo qualquer limpeza feita no recast. No caso, o recast saiu limpo e o quality_gate re-introduziu `30%/25%/20%/40%/15%`.

4. **`parse_recast` frágil.** Um único `json.loads`, sem retry — quebra com JSON malformado dos modelos `:free` (ocorreu na sessão; só re-rodar resolveu).

### Já aplicado nesta sessão (PARCIAL — esta story formaliza/completa)
- `plan_creative.py`: regra de **FIDELIDADE AOS FATOS** no prompt (número só se presente na fonte; concretude via fato real, não dado inventado).
- `recast_engine.py`: **guard determinístico** `enforce_fact_fidelity()` (regex `_STAT_NUM_RE` + `_FAKE_EVIDENCE_RE` → loop de reparo via LLM) + regra anti-fabricação no `build_plan_execution_prompt`.
- **Limitação conhecida:** o guard roda dentro do recast, **antes** do quality_gate → ainda é driblado (gap 3). No caso das chuteiras foi preciso uma passada final manual de fidelidade para entregar copy honesta.

## Decisão de arquitetura

### 1. Guard de fidelidade TERMINAL
- O `enforce_fact_fidelity()` deve ser a **última transformação** de texto antes da escrita final. Opções (decidir na implementação):
  - **(a)** chamar `enforce_fact_fidelity()` ao final do `quality_gate.py` (após a convergência das iterações), OU
  - **(b)** novo estágio terminal no `design_creative.py` (Etapa 5.5) que roda o guard isolado após o quality_gate.
- Preferência inicial: **(a)** — mantém o gate como dono da última palavra sobre o texto.

### 2. Gate BLOQUEANTE antes do render
- `design_creative.py` deve **abortar o render** (ou exigir `--force`) quando, após as Etapas 2–5, o brief ainda tiver `_validation.status: FAIL`, qualquer `personalization.status: PENDING_RECAST`, headline `[RECAST PENDENTE]` ou `fact_fidelity_unresolved` não-vazio.
- Hoje a Etapa 6 (render) é fatal mas as 2–5 não — inverter a lógica: **a qualidade da copy é pré-condição do render**, não um nice-to-have.

### 3. `parse_recast` resiliente
- Em `JSONDecodeError`, re-tentar a chamada LLM (até `max_retries`) antes de desistir — o retry resolveu na sessão. Aplicar também em `analyze_benchmark._extract_json` e `plan_creative._extract_json`.

### 4. Sanitização determinística de autor
- Strip de `@handle` e do nome do autor do benchmark (de `source_url`/`benchmark_caption`) em headline/body, **independente** de a LLM ter rodado — defesa em profundidade para o gap 1.

## Tarefas (Checklist)
- [x] `quality_gate.py`: invocar `enforce_fact_fidelity()` como passo terminal (decisão **(a)** — dentro do quality_gate, após a convergência) + `sanitize_author_refs`; re-valida e marca `CONCERNS_FIDELITY` se sobrar fabricação.
- [x] `recast_engine.py`: `enforce_fact_fidelity`/`sanitize_author_refs` expostos e importados pelo quality_gate (import limpo, sem ciclo — verificado).
- [x] `design_creative.py`: gate bloqueante pré-render (`_render_blockers`: FAIL/PENDING_RECAST/`[RECAST PENDENTE]`/`fact_fidelity_unresolved`) + flag `--force`.
- [x] `recast_engine`: novo `call_llm_json(prompt, parser, max_retries=2)` — retry em JSON malformado; aplicado nos 2 recasts + reparo de fidelidade.
- [x] `analyze_benchmark`/`plan_creative`: usam `call_llm_json` (mesmo retry).
- [x] `sanitize_author_refs` determinístico (handles via `source_url` + `@mentions` + nome de exibição "Nome @handle"); aplicado no fim do recast E no guard terminal.
- [x] Unit tests (`test_fact_fidelity.py`, 11 testes): detector (%/×/mi/"pesquisa interna"/contagem grande), negativos (contagem 1 dígito, ano, número da fonte), sanitização (remove handle/nome, mantém marcas) e `_render_blockers`.
- [x] Teste E2E: brief cru restaurado → analyze→plan→recast→quality_gate **sem passada manual** → copy PASS, 0 fabricação, 0 `@handle`, render liberado.
- [x] Regressão: gate rodado em todos os 12 briefs — todos `PASS` liberam; só os `FAIL` cru bloqueiam.
- [x] `_PIPELINE.md` + `creative-quality-checklist.md` (C8): documentam gate bloqueante, guard terminal e proibição de número fabricado.
- [x] **(amend)** `design_creative.py`: Etapa 1 (deep_modeler) deixa de ser fatal em FAIL de **extração** (brief salvo) — aborta só em falha real (sem brief / exit 1). Era a causa de o pipeline morrer antes do recast e shippar OCR cru.

## Critérios de Aceite
- [x] **AC1:** Após Etapas 2–5, nenhuma copy final contém número/estatística sem lastro. → Verificado: `detect_fabricated_numbers` retorna **0** em todos os 8 slides do brief E2E. Detector cobre %/×/magnitude **e** inteiros multi-dígito ("1.200"/"500").
- [x] **AC2:** Guard terminal **depois** do quality_gate. → Log E2E: quality_gate convergiu em 2 iter, depois o guard detectou `{1:['30%'],5:['45%'],7:['2 milhões'],8:['150 milhões']}` re-injetados e reparou → "nenhum número fabricado restante".
- [x] **AC3:** `design_creative` não renderiza brief bloqueado; `--force` faz override. → `_render_blockers` + gate (exit 2) implementados; regressão confirma FAIL bloqueia, PASS libera.
- [x] **AC4:** Retry em JSON malformado. → `call_llm_json` re-chama o LLM até `max_retries`; usado em analyze/plan/recast(x2)/reparo/quality_gate.
- [x] **AC5:** Sem `@handle`/nome do autor mesmo sem recast. → `sanitize_author_refs` determinístico; brief E2E: 0 slides com `@`; unit test cobre remoção de handle+nome preservando marcas.
- [x] **AC6:** Unit tests do detector + gate. → `test_fact_fidelity.py`: **11/11** (6 detector, 2 sanitização, 3 gate).
- [x] **AC7:** E2E sem intervenção manual. → brief cru → 4 estágios → PASS, 0 fabricação, 0 handle, render liberado. Sem passada manual.
- [x] **AC8:** Regressão zero. → Gate em 12 briefs: todos `qg=PASS` liberam; só `v=FAIL` cru (recast nunca aplicado) bloqueiam — comportamento desejado.
- [x] **AC9 (amend):** O pipeline atravessa extração FAIL e alcança o recast; aborta só sem brief. → E2E `*design-creative` no `15-falajoaobranco-efac2a` (extração 7/9, FAIL): pipeline seguiu → plan/recast (9→5 slides) → guard pegou "58" fabricado → quality_gate PASS → **render de 5 PNGs**. validation PASS, 0 fabricação, 0 @handle.

## Escopo
**IN:**
- `squads/virals-marketing-squad/scripts/quality_gate.py` (guard terminal)
- `squads/virals-marketing-squad/scripts/recast_engine.py` (parse retry; sanitização autor; expor guard)
- `squads/virals-marketing-squad/scripts/design_creative.py` (gate bloqueante + `--force`)
- `squads/virals-marketing-squad/scripts/analyze_benchmark.py` / `plan_creative.py` (retry de JSON)
- Unit tests (novo arquivo de testes do squad)
- `docs/stories/03-Product/EPIC-MKT-Creative-Intelligence/_PIPELINE.md`

**OUT:**
- `deep_modeler.py` (extração — fora do escopo de fidelidade de copy)
- Templates de render / Studio (`apps/creative-design`)
- Troca de modelos LLM / configuração de provider (continua OpenRouter free → Gemini → OpenAI)

## Dependências
- MCI-01..04 ✔ (análise/plano/recast/quality_gate existentes)
- `call_llm()` e `enforce_fact_fidelity()` em `recast_engine.py` ✔ (guard já criado nesta sessão)
- `.env`: `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` ✔

## Riscos
- **R1:** Gate bloqueante pode travar runs legítimos quando a LLM está fora. → `--force` + mensagem explicando o que falhou; preferir falhar a publicar copy ruim.
- **R2:** Guard de fidelidade pode flaggar número legítimo presente na fonte com formatação diferente (ex.: "64" vs "sessenta e quatro"). → grounding por dígitos; aceitar falso-positivo raro (reparo mantém sentido).
- **R3:** Loop de reparo custa +1 chamada LLM por iteração. → `max_iters=2`; ~$0.001 OpenRouter free. Aceitável.
- **R4:** Sanitização de autor pode remover menção legítima a uma marca. → restringir a `@handle` e ao nome exato do autor (de `source_url`), não a marcas citadas no corpo.

## Dev Agent Record

### Implementation Notes
- **Decisão a/b resolvida → (a):** o guard terminal roda dentro do `quality_gate.py`, após a convergência do checklist. Motivo: o quality_gate é o último reescritor LLM; só assim a fidelidade é a última transformação. Confirmado em produção que ele **re-injeta** números (`30%/45%/2 milhões/150 milhões`) que o guard então remove.
- **Causa-raiz do gap 2/3 era o C8:** o checklist exigia "NÚMERO em todo slide", incentivando o LLM (no plan, recast E quality_gate) a fabricar. C8 reescrito (in-code + `.md`) para "concretude via fato real; número só se da fonte".
- **Detector em 3 camadas** (`detect_fabricated_numbers`): (1) estatística-shaped (`%`/`×`/magnitude), (2) inteiros multi-dígito sem lastro (pega "1.200"/"500"; ignora contagem 1 dígito e anos), (3) frases de evidência falsa ("pesquisa/dados/projeções internas"). Grounding por núcleo de dígitos normalizado contra `reference_headline+body`.
- **`call_llm_json`** centraliza o retry de JSON malformado — resolve o `JSONDecodeError` que travou o recast na sessão real (modelos `:free` devolvem JSON quebrado).
- **Limitação conhecida (aceita):** o detector pode flaggar contagem multi-dígito legítima de listicle ("10 dicas") se ausente da fonte — o reparo apenas reescreve qualitativo, sem perda de sentido (baixo risco). Contagens de 1 dígito e anos são preservadas.
- **Limitação fora de escopo:** coerência semântica entre slides (ex.: "três marcas" no S4 vs "quatro contas" no S6) é tarefa do checklist de coerência, não do guard de números.
- **Modelo observado:** `openrouter:openai/gpt-oss-120b:free` em todas as chamadas.

### File List
**Modificado:**
- `squads/virals-marketing-squad/scripts/recast_engine.py` — `call_llm_json`; detector reescrito (`_norm_num`, `_reference_numbers`, `_ANY_NUM_RE`, `_YEAR_RE`); `sanitize_author_refs` + `_author_tokens`; recasts e reparo via `call_llm_json`; sanitização ligada no fim do `recast_brief`.
- `squads/virals-marketing-squad/scripts/quality_gate.py` — imports do recast (`call_llm_json`/`enforce_fact_fidelity`/`sanitize_author_refs`) + resolver; loop via `call_llm_json`; **guard terminal** pós-convergência; C8 do fallback suavizado; status `CONCERNS_FIDELITY`.
- `squads/virals-marketing-squad/scripts/analyze_benchmark.py` — `call_llm_json` (retry).
- `squads/virals-marketing-squad/scripts/plan_creative.py` — `call_llm_json` (retry) + regra de FIDELIDADE no prompt.
- `squads/virals-marketing-squad/scripts/design_creative.py` — `_render_blockers`/`_render_blockers_from_path`; gate bloqueante pré-render; flag `--force`; ajuda atualizada.
- `squads/virals-marketing-squad/checklists/creative-quality-checklist.md` — C8 reescrito (proíbe número fabricado).
- `docs/stories/03-Product/EPIC-MKT-Creative-Intelligence/_PIPELINE.md` — gate bloqueante + guard terminal + troubleshooting.

**Novo:**
- `squads/virals-marketing-squad/scripts/test_fact_fidelity.py` — 11 unit tests (detector, sanitização, gate).

**Artefato de validação:**
- `squads/virals-marketing-squad/data/brief-v5-01-falajoaobranco-209716.yaml` — copy final PASS, 0 fabricação, 0 handle.

## QA Results
**Gate:** PASS · @qa (Quinn) · 2026-06-17

| Check | Status | Nota |
|-------|--------|------|
| 1. Code review | ✅ PASS | Limpo e DRY (`call_llm_json` centraliza retry). Revisão encontrou edge-case (sanitização podia esvaziar headline, sem revalidação por ser terminal) → **corrigido** (guard "não esvazia campo com conteúdo") + teste. |
| 2. Unit tests | ✅ PASS | `test_fact_fidelity.py` **12/12** (detector, sanitização incl. não-esvaziar, gate). |
| 3. Acceptance criteria | ✅ PASS | 8/8 com evidência (E2E + regressão + testes). |
| 4. Regressão | ✅ PASS | 12 briefs: todos `qg=PASS` liberam; só `v=FAIL` cru bloqueiam (proteção nova, não regressão). |
| 5. Performance | ✅ PASS | Guard terminal só chama LLM quando há fabricação (≤2 iter); detector é regex local. |
| 6. Segurança | ✅ PASS | `json.loads` (não `eval`); `re.escape` nos tokens dinâmicos (handle/nome) → sem regex injection. |
| 7. Documentação | ✅ PASS | `_PIPELINE.md`, `creative-quality-checklist.md` (C8), Dev Agent Record completos. |

**Observações (não-bloqueantes):**
- Detector pode flaggar contagem multi-dígito legítima de listicle ("10 dicas") ausente da fonte → reparo reescreve qualitativo (baixo risco; documentado).
- Coerência semântica entre slides (ex.: "três marcas" vs "quatro contas") está fora do escopo do guard de números — candidata a checklist de coerência (story futura).

**Recomendação:** apto para push. Status permanece **InReview** até `@devops *push` (que transiciona para Done).

## Change Log
- 2026-06-17 — @sm — Story drafted a partir da sessão real `*design-creative` (chuteiras rosas). Documenta 4 gaps; registra correções parciais já aplicadas (fidelidade no `plan_creative` + guard `enforce_fact_fidelity` no `recast_engine`) e formaliza o trabalho restante (guard terminal, gate bloqueante, retry de JSON, sanitização de autor, testes). Status: Draft — aguarda `@po *validate-story-draft`.
- 2026-06-17 — @po — `*validate-story-draft`: **GO (10/10)**. Status Draft → Ready. Observações não-bloqueantes: (1) @dev deve re-verificar que as correções parciais já aplicadas seguem no working tree antes de construir por cima; (2) resolver a decisão de arquitetura a/b (guard terminal no `quality_gate` vs. estágio 5.5) no início — recomendação da story é (a).
- 2026-06-17 — @dev — Implementação completa (Ready → InProgress → InReview). Decisão (a) adotada. Causa-raiz extra encontrada: C8 do checklist incentivava número fabricado → reescrito. 8 tarefas + 8 ACs verificados; 11/11 unit tests; E2E no `01-falajoaobranco` limpo sem passada manual; regressão zero (12 briefs). Aguarda `@qa`.
- 2026-06-17 — @qa — `*qa-gate`: **PASS** (7/7 checks). Revisão encontrou e corrigiu edge-case de headline em branco na sanitização (+ teste → 12/12). Observações não-bloqueantes registradas (falso-positivo de listicle; coerência entre slides fora de escopo). Apto para push; Status segue InReview até `@devops *push`.
- 2026-06-17 — @marketing-chief/@dev — **Validação E2E real** (`*design-creative` no `15-falajoaobranco-efac2a`, Tiago). Descoberto 5º gap do mesmo tema: Etapa 1 fatal em FAIL de extração matava o pipeline antes do recast → corrigido (AC9). Run completo PASS: 9→5 slides, guard pegou "58" fabricado, 0 @handle, 5 PNGs renderizados. Observação menor: erro ortográfico "SIGUISSE"→"SEGUISSE" no S5 (ortografia não é coberta pelo checklist atual — candidata a item de QA de copy). QA PASS mantido.
