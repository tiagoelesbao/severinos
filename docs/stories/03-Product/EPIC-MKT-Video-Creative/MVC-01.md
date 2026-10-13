# MVC-01: Schema do `video-brief` + `deep_modeler_video`

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase A)
**Complexidade:** L (Standard — 8 pontos)
**Criada por:** @marketing-chief · 2026-06-19
**Validada por:** @po (Pax) · 2026-06-19 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-19

## Story
**Como** Marketing Chief
**Eu quero** um extrator que leia uma pasta de benchmark de vídeo e produza um `video-brief.yaml` estruturado
**Para que** as etapas seguintes (análise, plano, gate) tenham uma base canônica do criativo de referência.

## Contexto
1ª story da Fase A. Espelha o `deep_modeler.py` (estáticos), mas para vídeo. O input é a pasta gerada pelo `*creative-benchmark`: `Benchmark.json` (metadata + key_moments), `Transcrição.md` (timestamps por minuto), `Análise.md` (inteligência), `Screenshots/` (frames). O cliente é injetado no brief (1º input do fluxo).

## Decisão de arquitetura
- `squads/virals-marketing-squad/scripts/deep_modeler_video.py`.
- CLI: `deep_modeler_video.py <benchmark_dir> --client=<slug> [--bench-platform=...]`.
- Schema `video-brief-<slug>.yaml`: `client_slug`, `source` (handle/plataforma/url), `transcript` (segmentos com start/end/text), `frames` (paths + timestamp), `beats` (batidas detectadas), `hook_raw` (primeiros ~3s), `metadata` (views/likes/duração), `_validation`.
- Reusa o `_client_resolver` e o padrão de persistência YAML dos motores existentes.

## Tarefas (Checklist)
- [x] Definir o schema do `video-brief` (documentado no topo do script).
- [x] Parser da `Transcrição.md` → segmentos com timestamps (reusa `_parse_sentences` do `transcript_adapter`).
- [x] Parser do `Benchmark.json` → metadata + key_moments.
- [x] Mapear `Screenshots/` → `frames[]` com timestamp inferido (key_moments → spread uniforme → None).
- [x] Detecção inicial de `beats` (reusa segmentadores do `transcript_adapter`; fallback local) e `hook_raw` (janela 0–3s).
- [x] Injeção de `client_slug` + `_validation`.
- [x] Teste — fixture sintética de vídeo (não há benchmark de vídeo real no repo ainda) + 11 testes unitários.

## Critérios de Aceite
- [x] **AC1:** Roda contra uma pasta de benchmark e grava `video-brief-<slug>.yaml` (validado com fixture sintética → status PASS, 9 segmentos/3 frames/3 beats).
- [x] **AC2:** `transcript[]` preserva start/end/text de cada segmento (end = start do próximo; último = duração).
- [x] **AC3:** `frames[]` referencia os screenshots com timestamp (via key_moments ou spread uniforme).
- [x] **AC4:** `client_slug` correto no brief (resolvido via `_client_resolver`; testado com tiago-elesbao).
- [x] **AC5:** Sem segmentos de transcript → `_validation: FAIL`, mas brief é gravado e exit=2 (não-fatal, padrão MCI-06). Só falta o arquivo `Transcrição.md` é fatal (exit 1).

## Escopo
**IN:** `deep_modeler_video.py`, schema do `video-brief`.
**OUT:** Análise holística (MVC-02); plano (MVC-03).

## Dependências
- **`*creative-benchmark`** já executado — pasta `benchmark/{plataforma}/{rank}-{handle}/` com `Benchmark.json`, `Transcrição.md`, `Análise.md`, `Screenshots/`.
- `_client_resolver` + `data/clients/_registry.yaml`.
- Nenhuma story-predecessora (1ª da cadeia). **Habilita:** MVC-02.

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- Espelhou o `deep_modeler.py` (estáticos): UTF-8 reconfigure, `_client_resolver`, `_validation` explícito, exit 2 em FAIL não-fatal, exit 1 fatal.
- **IDS REUSE:** reaproveitou `_parse_sentences`, `_segment_via_key_moments` e `_segment_via_heuristic` do `transcript_adapter.py` (com fallback local se o import falhar) — zero duplicação do parser de vídeo. Etapa deliberadamente **determinística** (sem LLM); segmentação semântica refinada fica para MVC-02/03.
- **Schema `video-brief` v1.0:** `source`, `metadata`, `transcript[]{start,end,text}`, `frames[]{file,timestamp,t_seconds}`, `beats[]{n,start,end,text,role}`, `hook_raw`, `_validation`.
- **Achado (gap → resolvido):** a princípio não havia benchmark de **vídeo** real visível (busca inicial só em 2026-05-23, tudo carrossel). O dono apontou um real em `2026-06-16/.../30-hormozi-fc605e` (video-short, 32s, 5 key_moments). Modelagem real → **PASS** (13 segmentos, 5 frames mapeados aos key_moments reais, 5 beats hook→build×3→cta, hook "If you could have all the money and power in the world"). Brief real salvo em `data/video-brief-30-hormozi-fc605e.yaml`.
- **CodeRabbit:** review pré-commit (WSL, 7–30 min) NÃO executado nesta sessão — recomendado antes do push pelo @devops.

### File List
- `squads/virals-marketing-squad/scripts/deep_modeler_video.py` (novo — extrator)
- `squads/virals-marketing-squad/scripts/test_deep_modeler_video.py` (novo — 11 testes, 11/11 passando)
- `squads/virals-marketing-squad/scripts/_fixtures_video/01-testcreator-deadbeef/` (nova fixture sintética: Transcrição.md + Benchmark.json + Screenshots/)

## QA Results

**Gate:** ✅ **PASS** · @qa (Quinn) · 2026-06-20

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review (padrões/legibilidade) | ✅ Espelha fielmente `deep_modeler.py`; funções puras e testáveis; nomes claros |
| 2 | Testes unitários | ✅ 11/11 passando; cobre parse, transcript, hook (janela/fallback/vazio), frames (3 modos), validação (PASS/WARN/FAIL), load_inputs (fatal/completo) |
| 3 | Critérios de aceite | ✅ AC1–AC5 rastreados e atendidos |
| 4 | Sem regressões | ✅ Apenas arquivos novos; `transcript_adapter`, `deep_modeler` e `deep_modeler_video` importam sem erro; nenhum módulo existente alterado |
| 5 | Performance | ✅ Determinístico, sem LLM/rede; parsing O(n) sobre a transcrição |
| 6 | Segurança | ✅ Sem `eval`/shell/rede/segredos; só leitura de arquivo + `json.loads` + regex |
| 7 | Documentação | ✅ Docstring de schema completa; story atualizada |

### Evidência (validação real)
Modelagem do benchmark **real** `30-hormozi-fc605e` (video-short, 32,3s, tiago-elesbao) → **PASS**: 13 segmentos, 5 frames mapeados 1:1 aos key_moments reais, 5 beats (hook→build×3→cta), hook = "If you could have all the money and power in the world".

### Observações (advisory — não bloqueantes)
- **[Low · robustez]** `build_frames`: se `len(key_moments) < len(screenshots)` E os tempos dos moments não baterem com a distribuição uniforme, os timestamps dos frames podem sair **não-monotônicos** (mix de modo moment + spread). No engine atual há 1 screenshot por key_moment (1:1), então o risco é teórico. **Follow-up sugerido:** ordenar `frames` por `t_seconds` ou usar estratégia única. Relevante para a MVC-02 (alinhamento frame↔fala). → registrar como tech-debt.
- **[Low · processo]** CodeRabbit pré-commit (WSL, 7–30 min) **não executado**. Recomendado pelo @devops antes do push. Sem bloqueio: módulo novo, isolado, com testes verdes.
- **[Info · by design]** Atribuição de `role` em `beats` é heurística (último = cta). Refinamento semântico é escopo da MVC-02/03 — correto para uma etapa de extração determinística.

### Veredito
AC completos, validação contra dado real, zero regressão, segurança limpa. As observações são Low/advisory. **Aprovado para seguir.** Próxima: MVC-02 (`analyze_video_benchmark`) consome este `video-brief`. Push pendente → @devops.

## Change Log
- 2026-06-19 — @marketing-chief — Story criada (Draft).
- 2026-06-19 — @po (Pax) — Validada (GO 8/10); seção Dependências adicionada; Draft → Ready.
- 2026-06-19 — @dev (Dex) — Implementada: `deep_modeler_video.py` + testes (11/11) + fixture; Ready → Ready for Review.
- 2026-06-20 — @dev (Dex) — Validada contra benchmark de vídeo REAL (30-hormozi-fc605e, tiago-elesbao) → PASS.
