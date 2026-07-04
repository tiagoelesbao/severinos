# VEX-04: Fase A com olhos — visão computacional no benchmark + cadência de cortes real

**Status:** InReview — **QA Gate: ✅ PASS** (gate file: `docs/qa/gates/VEX-04-visao-cadencia-real.yml`)
**Epic:** EPIC-MKT-Video-Excellence (F2 — Qualidade do output)
**Prioridade:** **P1** — o "benchmark como bússola" hoje ignora exatamente o que faz um reel viral: o visual
**Complexidade:** L (Standard — 12 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** Marketing Chief rodando `*industrialize-video` (Fase A)
**Eu quero** que o pipeline ANALISE os frames do benchmark (enquadramento, texto na tela, densidade de b-roll, estilo visual) e meça a cadência de cortes REAL do vídeo
**Para que** o storyboard e o `edit_spec` do plano sejam modelados em evidência visual, não em chute do LLM sobre texto.

## Contexto (evidência da auditoria)
- `deep_modeler_video.py:171` (`build_frames`): os `Screenshots/` só ganham timestamp — **nenhuma etapa olha o conteúdo dos frames**. O prompt da análise (MVC-02) e do plano (MVC-03) são 100% textuais.
- `analyze_video_benchmark.py:86` (`compute_cut_cadence`): divide a duração pelo nº de segmentos da `Transcrição.md` — mede a segmentação da transcrição (minuto a minuto), **não os cortes de edição**. O checkpoint de retenção (~1,5–2s) está sendo avaliado sobre um dado falso.
- Precedente de REUSE: `generate_template_from_benchmark.py` já usa visão (Gemini) no pipeline de estáticos.
- `extract_hook` com transcrição minuto-a-minuto devolve blocos imprecisos para a janela 0–3s.

## Decisão de arquitetura (proposta)
- **Detecção de cortes no ETL** (`run-creative-benchmark.js`, enquanto o vídeo está disponível): ffmpeg scene-detect (`select='gt(scene,0.3)'`/`scdet`) → gravar `cut_timestamps[]` (+ `shot_count`, `avg_shot_seconds`) no `Benchmark.json`. Retrocompatível: campo ausente → comportamento atual.
- **Etapa de visão na Fase A** (novo passo dentro do `deep_modeler_video` ou motor irmão `vision_video_benchmark.py`, chamado pelo `video_plan.py`): amostra N frames (≤10) e extrai por visão LLM: `shot_type` (talking-head/screen/b-roll), texto on-screen (OCR + estilo: posição/caixa/cor), presença de legenda word-by-word, elementos gráficos, paleta dominante. Grava `brief["visual_analysis"]` — **determinístico no formato, degradável**: sem visão disponível → `visual_analysis: null` e o pipeline segue (padrão não-fatal MCI-06).
- **Consumo:** `analyze_video_benchmark` usa `cut_timestamps` para a cadência real e `visual_analysis` no prompt; `plan_video_creative` recebe o DNA visual para fundamentar `storyboard.shot_type/broll/motion` e o `caption_style`.
- **Fidelidade preservada:** a visão só descreve o benchmark (fonte), nunca gera fatos novos do cliente — o gate V3/V4 continua soberano. OCR de números do benchmark NÃO autoriza números no plano além do que já vale hoje (transcript + caption como fonte); decisão explícita: OCR entra como contexto descritivo, não como allowlist de fatos.
- **Hook preciso:** quando `cut_timestamps`/transcript por palavra existirem, `hook_raw` usa a janela real 0–3s.

## Tarefas (Checklist)
- [x] Scene-detect no ETL (`run-creative-benchmark.js`): `detectSceneCuts` (ffmpeg `select=gt(scene,0.30)`, timeout 120s, não-fatal, windowsHide) roda ANTES do cleanup do vídeo → `cut_timestamps` no `Benchmark.json`.
- [x] Motor de visão `vision_video_benchmark.py`: amostragem uniforme ≤8 frames (nomes carregam timestamp+fala), Gemini 2.5-flash (mesmo padrão do generate_template), `normalize_visual_analysis` com defaults seguros; sem chave/rede/frames → `visual_analysis: null` e exit 0.
- [x] `compute_cut_cadence` prioriza `metadata.cut_timestamps` (`source: scene-detect`, shots = cortes+1); fallback rotulado `source: transcript-segments` (honestidade documentada no código).
- [x] Injeção do `visual_analysis` nos prompts MVC-02 e MVC-03 com regra explícita: "contexto DESCRITIVO; número/texto visto nos frames NÃO é fato utilizável".
- [x] `hook_raw`: verificado que a Transcrição.md real é por SENTENÇA com timestamp por segundo (`[00:00]`, `[00:01]`) — a janela 0–3s já é precisa; sem mudança necessária (nota no Dev Record).
- [x] Docstring do `quality_gate_video.py` corrigida (máx 3).
- [x] E2E real (sandbox do benchmark Chase Chappell + cortes sintéticos): visão REAL Gemini identificou shot_mix 0.4/0.6, hook visual e caption style ("bottom-center, contorno, palavra destacada" ≈ word-pop); cadência `scene-detect` 18 shots/2,03s; análise LLM consumiu ambos.

## Critérios de Aceite
- [x] **AC1:** Cadência com `cut_timestamps` → `source: scene-detect`, 18 shots, avg 2,03s (≠ 3,6s da transcrição) — E2E real. Benchmark NOVO ganhará os cortes no próximo `*creative-benchmark` (função validada em vídeo real: 0 cortes numa captura contínua = correto).
- [x] **AC2:** `visual_analysis` presente: 5 frames com shot_type/on_screen_text/has_captions + caption_style + hook visual + shot_mix (Gemini real).
- [x] **AC3:** Testes de degradação: sem chave → `vision_call` retorna None → `visual_analysis: null`, exit 0; normalize inutilizável → None; pipeline segue (etapa não-fatal no video_plan).
- [x] **AC4:** Prompt do plano recebe o DNA visual (bloco `_visual_block`); análise LLM real consumiu visão + cadência. _(Plano LLM completo com visão: validar no próximo `*industrialize-video` de produção.)_
- [x] **AC5:** Regra de não-fato injetada nos DOIS prompts; gate V3/V4 permanece a jusante e intocado (37 testes Python verdes, incl. gate).

## Escopo
**IN:** scene-detect no ETL, motor de visão, cadência real, hook preciso, injeção nos prompts.
**OUT:** consumo do `edit_spec` no editor (VEX-06); geração de templates visuais novos (já coberto pelo fluxo de estáticos).

## Dependências
- Nenhuma bloqueante. Se o ETL não puder mudar de imediato, a visão sobre `Screenshots/` existentes já entrega valor (cut_timestamps ficam para a fase do ETL).

## Riscos
- **[Médio] Custo/latência de visão** por criativo: amostragem limitada (≤10 frames) + cache no brief.
- **[Médio] Scene-detect com falsos positivos** em screen captures (scroll ≠ corte): calibrar threshold; guardar score por corte.
- **[Baixo] Disponibilidade do vídeo no ETL:** detecção precisa rodar durante o `*creative-benchmark` (o mp4 pode não ser persistido).

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude nos papéis @dev e @qa)

### Notas
- **`hook_raw` já era preciso:** a suposição da auditoria (transcrição minuto-a-minuto) estava errada para os benchmarks reais — o ETL gera timestamp POR SENTENÇA (`[00:00]`, `[00:01]`). Tarefa fechada sem mudança, com verificação.
- **Scene-detect no ponto exato:** o vídeo é APAGADO pelo `run-creative-benchmark.js` logo após escrever o Benchmark.json — a detecção roda imediatamente antes, não-fatal.
- **Motor de visão separado** (`vision_video_benchmark.py`, etapa 1b do orquestrador) em vez de acoplar ao deep_modeler: mantém a etapa 1 determinística (contrato da MVC-01) e a visão 100% degradável.
- E2E real: Gemini leu os frames e devolveu exatamente o que a Fase B usa (caption word-pop, shot mix, hook visual) — evidência de que o plano passa a ser fundamentado em visual real.

### File List
- `squads/virals-marketing-squad/scripts/vision_video_benchmark.py` (novo — motor de visão, etapa 1b)
- `squads/virals-marketing-squad/scripts/test_vision_video_benchmark.py` (novo — 8 testes)
- `squads/virals-marketing-squad/scripts/run-creative-benchmark.js` (modificado — detectSceneCuts + cut_timestamps no Benchmark.json)
- `squads/virals-marketing-squad/scripts/deep_modeler_video.py` (modificado — metadata.cut_timestamps)
- `squads/virals-marketing-squad/scripts/analyze_video_benchmark.py` (modificado — cadência real com source + DNA visual no prompt)
- `squads/virals-marketing-squad/scripts/plan_video_creative.py` (modificado — `_visual_block` no prompt do plano)
- `squads/virals-marketing-squad/scripts/video_plan.py` (modificado — etapa 1b no orquestrador)
- `squads/virals-marketing-squad/scripts/quality_gate_video.py` (modificado — docstring)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-04 — Claude (@po) — Validada (GO 9/10). Draft → Ready.
- 2026-07-04 — Claude (@dev) — Implementada + E2E real com visão Gemini e cadência scene-detect. 37 testes Python verdes. Ready → Ready for Review.
- 2026-07-04 — Claude (@qa) — Gate ✅ PASS (2 Lows: threshold 0,30 a calibrar com benchmarks novos; AC4-plano-completo a confirmar no 1º run de produção). → InReview.
