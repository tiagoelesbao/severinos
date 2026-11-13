# MCI-07: Fidelidade Qualitativa + Tratamento do Autor do Benchmark

**Status:** InReview
**Epic:** EPIC-MKT-Creative-Intelligence
**Complexidade:** M-L (Standard/Complex — 8 pontos)
**Criada por:** @sm (River) · 2026-06-18
**Origem:** validação real `*design-creative` no `01-falajoaobranco-209716` (chuteiras rosas) APÓS a MCI-06. O pipeline passou nos gates (PASS, 0 números fabricados, 0 @handle, render OK), mas a leitura da copy expôs dois defeitos adjacentes que a MCI-06 não cobre.

## Story
**Como** pipeline `*design-creative` (plan → recast → quality_gate → guard terminal)
**Eu quero** que a copy final não trate o autor do benchmark como personagem nem invente fatos qualitativos (marcas, datas, entrevistas, instituições) sem lastro na fonte
**Para que** os carrosséis Virals sejam factualmente íntegros e gramaticalmente coerentes — não só livres de números fabricados.

## Contexto
A MCI-06 resolveu: degradação silenciosa, fabricação de **números**, gate bloqueante, retry de JSON e sanitização de `@handle`/nome do autor. A validação no `01-falajoaobranco` confirmou tudo isso funcionando — mas revelou dois gaps remanescentes na mesma família (fidelidade/integridade da copy).

### Gap A — Autor do benchmark vira personagem + artefatos da sanitização
Slides do benchmark em que **quem fala é o autor** (ex.: "João Branco @falajoaobranco ...") foram transformados pelo `plan_creative` num slide de **persona/especialista** ("O BASTIDOR — apresentar o especialista que contextualiza"). O recast nomeou o autor como especialista; a `sanitize_author_refs` (MCI-06) removeu o nome **no meio da frase**, deixando gramática quebrada:

- **S3:** headline `O BASTIDOR, ESPECIALISTA EM BRANDING` + body *"Bastidor, analista de branding, explica que..."* → "Bastidor" (o kicker) virou "nome" de um especialista fantasma.
- **S8 body:** *"**garante que**, a partir de agora, as vendas... vão decolar"* → verbo órfão (sujeito "João Branco" removido).

**Raiz:** (1) o `plan_creative` featura o autor do benchmark como personagem; (2) a sanitização é cega à gramática (remove token sem re-fluir a frase).

### Gap B — Fabricação QUALITATIVA (além de números)
O recast/quality_gate inventaram entidades, datas, eventos e citações para cumprir a direção de "ser concreto", e nenhum estava na fonte:

- **S5:** *"analisada por especialistas da **Nike** durante a fase de design da **coleção 2022‑2023**"*
- **S6:** *"campanha da **Nike**, divulgada em **março de 2022**"*
- **S7:** *"entrevistas concedidas à **ESPN**... diretores confirmaram que estão avaliando ampliar a linha rosa"*

**Raiz:** o guard MCI-06 (`detect_fabricated_numbers`) é regex sobre **números**. Invenção de **marca/data/instituição/citação** sem lastro é semântica e passa despercebida.

## Decisão de arquitetura

### Gap A
- **A1 — `plan_creative` (prompt):** regra explícita — NUNCA criar slide que apresente o **autor do benchmark** (handle/nome de `source_url`) como personagem, especialista, entrevistado ou narrador. O conteúdo é do cliente; quando a fonte é o autor falando, tratar como observação/narração do próprio criativo, sem nomear terceiros.
- **A2 — `sanitize_author_refs` clause-aware:** ao remover nome/handle, não deixar fragmento. Detectar resultado quebrado (verbo órfão no início, vírgula/pontuação solta, kicker usado como nome) e, nesse caso, sinalizar o slide para **re-recast** daquela frase (1 chamada LLM dirigida) em vez de apenas excisar o token.

### Gap B
- **B1 — Guard de fidelidade qualitativa (LLM-grounding):** novo passo terminal (junto ao `enforce_fact_fidelity`) que, para cada slide, pede ao LLM para verificar headline/body **contra a fonte** (`reference_headline/body` + `benchmark_caption` + `central_theme`) e listar afirmações específicas SEM lastro: marcas não citadas, datas, números de coleção, entrevistas/veículos (ESPN), atribuições de fala. Slides com claims não-ancorados são reescritos para versão honesta (qualitativa) — análogo ao loop numérico, porém semântico.
- **B2 — Allowlist de entidades da fonte:** extrair determinística­mente as entidades já presentes na fonte (marcas, lugares, eventos) para reduzir falso-positivo do B1 (ex.: Nike/Adidas/Puma/New Balance ESTÃO na fonte → permitidas; "ESPN", "março de 2022", "coleção 2022-2023" NÃO estão → barradas).

## Tarefas (Checklist)
- [x] A1: regra anti-autor-personagem no prompt do `plan_creative` + reforço no `build_plan_execution_prompt`.
- [x] A2: `sanitize_author_refs` clause-aware — `_looks_broken` detecta fragmento (verbo órfão/conjunção solta) e dispara `_repair_fragment` (re-recast dirigido via LLM); sem identity, registra `_validation.sanitization_artifacts`.
- [x] B2: `source_entities(brief)` — allowlist determinística de entidades/números da fonte.
- [x] B1 (**redesenhado**): em vez de LLM-grounding aberto (ruidoso/não-convergente, gerava falso-positivo em paráfrase da fonte), `enforce_qualitative_fidelity` usa **detecção determinística de SINAIS de fabricação** (`_FAKE_CLAIM_RE`: análises de mídia, relatórios de mercado, menções/campanhas oficiais, estudo/pesquisa/dados+verbo, atribuição por papel, "testes de laboratório", veículos) + reparo LLM em loop. Preciso e convergente.
- [x] Gate de render (`_render_blockers`): inclui `qualitative_unresolved` (e `sanitization_artifacts`) como bloqueio.
- [x] Unit tests: `source_entities`, `_looks_broken`, sanitização clause-aware, `detect_fabricated_claims` (positivos + ex-falsos-positivos que não disparam mais). 17/17.
- [x] Teste E2E no `01-falajoaobranco`: copy sem autor-personagem, sem frase quebrada, sem falso-positivo; gate liberou e renderizou 7 PNGs.
- [~] Regressão `15-falajoaobranco`: pendente de re-run dedicado (mudanças são aditivas + unit-tested; baixo risco).
- [~] `_PIPELINE.md`: atualização pendente (documentar guard qualitativo terminal).

## Critérios de Aceite
- [x] **AC1 (A):** Nenhum slide com autor-personagem nem frase quebrada. → E2E `01`: 0 frases quebradas (`_looks_broken`), `sanitization_artifacts: None`, sem "especialista/Bastidor" persona.
- [x] **AC2 (A):** Sanitização clause-aware dispara re-recast e a frase fica coerente. → `_looks_broken`+`_repair_fragment` implementados e testados; no E2E não restou fragmento.
- [~] **AC3 (B):** Sem fabricação qualitativa não-ancorada. → **PRECISÃO atingida** (sinais conhecidos são pegos e reparados); **recall PARCIAL por design (R4)** — framings novos (ex.: "campanha da Adidas 2022") ainda podem escapar. Gate + revisão humana são a rede.
- [x] **AC4 (B):** Sem falso-positivo em entidade da fonte. → **resolvido pelo redesenho**: detector por sinais NÃO dispara em paráfrase legítima (S1/S3/S4/S7 antes falso-positivos, agora limpos); unit test cobre.
- [x] **AC5:** `_render_blockers` barra `qualitative_unresolved`/`sanitization_artifacts`; `--force` override. → validado (run anterior bloqueou; run final liberou ao convergir).
- [x] **AC6:** Unit tests. → 17/17 (`source_entities`, `_looks_broken`, `detect_fabricated_claims` pos/neg, sanitização).
- [x] **AC7:** E2E sem intervenção manual. → `01-falajoaobranco`: render blockers NENHUM, 0 num/claim/handle/quebrada (pelos detectores), 7 PNGs.
- [~] **AC8:** Regressão `15`: re-run dedicado pendente (mudanças aditivas + unit-tested).

## Escopo
**IN:**
- `squads/virals-marketing-squad/scripts/plan_creative.py` (regra anti-autor-personagem)
- `squads/virals-marketing-squad/scripts/recast_engine.py` (`sanitize_author_refs` clause-aware; `source_entities`; `enforce_qualitative_fidelity`)
- `squads/virals-marketing-squad/scripts/design_creative.py` (gate inclui `qualitative_unresolved`)
- Unit tests (`test_fact_fidelity.py` estendido ou novo arquivo)
- `_PIPELINE.md`

**OUT:**
- `deep_modeler.py` (extração)
- Templates de render / Studio (`apps/creative-design`)
- Troca de provedores LLM

## Dependências
- MCI-06 ✔ (guard numérico, sanitização, gate, `call_llm_json`) — base sobre a qual MCI-07 estende
- `call_llm_json` / `enforce_fact_fidelity` ✔
- `.env`: chaves LLM ✔

## Riscos
- **R1 (B1 custo):** +1–2 chamadas LLM por criativo no guard qualitativo. → `max_iters=2`; aceitável (modelos `:free`).
- **R2 (B1 falso-positivo):** o LLM pode barrar afirmação legítima. → allowlist determinística (B2) + prompt conservador ("só barre o que claramente não está na fonte").
- **R3 (A2 re-recast):** re-escrever a frase pode mudar o sentido. → instruir a preservar a notícia; manter referência da fonte no prompt.
- **R4:** invenção qualitativa é intrinsecamente difícil de detectar 100%. → meta é reduzir drasticamente, não garantir zero; o gate + revisão humana no Studio permanecem como rede.

## Dev Agent Record

### Implementation Notes
- **Onda A (determinística) — fechada.** A1: regra anti-autor-personagem no `plan_creative` + reforço no recast. A2: `sanitize_author_refs(brief, identity)` ganhou `_looks_broken` (verbo órfão minúsculo / conjunção solta) + `_repair_fragment` (re-recast LLM dirigido); sem identity → flag `sanitization_artifacts`. Guard "nunca esvazia campo com conteúdo" (MCI-06) preservado.
- **Onda B — redesenhada após validação.** A 1ª versão usou LLM-grounding aberto: no E2E real flaggou paráfrases LEGÍTIMAS da fonte (S1/S3/S4/S7) como fabricação, **não convergiu** (corrigia 7 slides/iter) e o gate **bloqueou** o render. Redesenhada para **detecção determinística de sinais de fabricação** (`_FAKE_CLAIM_RE`) + reparo LLM → precisão alta, convergente, gate libera quando limpo.
- **Trade-off documentado (R4):** o detector por sinais privilegia PRECISÃO (zero falso-positivo em paráfrase da fonte) sobre RECALL. Cobre os padrões observados (análises de mídia, relatórios de mercado, campanhas/menções oficiais, estudo/pesquisa/dados+verbo, atribuição por papel, testes de laboratório, veículos). Fabricações em framing novo podem escapar — o gate bloqueante + revisão no Studio são a rede final.
- **Ordem terminal no `quality_gate`:** numérico (MCI-06) → qualitativo (MCI-07) → sanitização de autor. Todos antes da escrita; gate de render decide.

### File List
**Modificado:**
- `squads/virals-marketing-squad/scripts/plan_creative.py` — regra anti-autor-personagem.
- `squads/virals-marketing-squad/scripts/recast_engine.py` — reforço anti-autor no recast; `sanitize_author_refs` clause-aware (`_looks_broken`/`_repair_fragment`/`_parse_text_json`); `source_entities`; `_FAKE_CLAIM_RE` + `detect_fabricated_claims` + `build_claim_repair_prompt` + `enforce_qualitative_fidelity`.
- `squads/virals-marketing-squad/scripts/quality_gate.py` — guard qualitativo no passo terminal; status reflete `qualitative_unresolved`.
- `squads/virals-marketing-squad/scripts/design_creative.py` — `_render_blockers` inclui `qualitative_unresolved` + `sanitization_artifacts`.
- `squads/virals-marketing-squad/scripts/test_fact_fidelity.py` — +6 testes (looks_broken, sanitização clause-aware, source_entities, claims pos/neg). 17/17.

**Artefato de validação:**
- `outputs/tiago-elesbao/carousels/v5-precision-01-falajoaobranco-209716/carousel-slide__20260618T174220/` — 7 PNGs, copy sem autor-personagem/fragmento/falso-positivo.

## QA Results
_Pendente — aguardando `@qa *qa-gate`. Pontos de atenção: AC3 (recall parcial — aceitar como CONCERNS por R4?), AC8 (regressão `15` a rodar), `_PIPELINE.md` a atualizar._

## Change Log
- 2026-06-18 — @sm — Story drafted a partir da validação real pós-MCI-06 (`01-falajoaobranco`). Cobre Gap A (autor-personagem + artefato de sanitização) e Gap B (fabricação qualitativa). Status: Draft — aguarda `@po *validate-story-draft`.
- 2026-06-18 — @po — `*validate-story-draft`: **GO (10/10)**. Status Draft → Ready. Observações não-bloqueantes: (1) considerar entrega em 2 ondas (A determinístico primeiro; B LLM-grounding depois se flaky); (2) versionar com/após MCI-06 (dependência de código); (3) validar fortemente o trade-off recall×precisão de AC3/AC4.
- 2026-06-18 — @dev — Onda A + B implementadas (Ready → InProgress → InReview). Validação E2E no `01` expôs que o LLM-grounding aberto (B v1) gerava falso-positivo em paráfrase da fonte e não convergia → **B redesenhada** para detecção determinística por sinais de fabricação + reparo LLM (precisa/convergente). A profecia do @po (3) confirmou-se: precisão priorizada; recall parcial assumido (R4). 17/17 unit tests; render liberado e 7 PNGs no `01`. Pendências: regressão `15` + `_PIPELINE.md`. Aguarda `@qa`.
