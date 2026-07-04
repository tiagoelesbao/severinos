# VEX-04: Fase A com olhos — visão computacional no benchmark + cadência de cortes real

**Status:** Draft
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
- [ ] Scene-detect no ETL do `*creative-benchmark` → `cut_timestamps` no `Benchmark.json` (com flag para pular em vídeos longos).
- [ ] Motor de visão: amostragem de frames + prompt estruturado + schema `visual_analysis` (com testes de parsing/degradação).
- [ ] `compute_cut_cadence` prioriza `cut_timestamps` reais; fallback atual mantido com rótulo honesto (`source: transcript-segments`).
- [ ] Injeção do `visual_analysis` nos prompts da MVC-02 e MVC-03 (com regra explícita de não-fato).
- [ ] `hook_raw` pela janela real 0–3s quando houver base temporal fina.
- [ ] Corrigir docstring do `quality_gate_video.py` (diz "máx 2 iterações", constante é 3) — higiene.
- [ ] E2E: re-rodar a Fase A no benchmark real e comparar o plano com/sem visão (cadência real reportada; storyboard citando evidência visual).

## Critérios de Aceite
- [ ] **AC1:** `Benchmark.json` de um benchmark novo traz `cut_timestamps` e a análise reporta `avg_shot_seconds` REAL (≠ média de segmentos de transcrição), com `source` explícito.
- [ ] **AC2:** `brief["visual_analysis"]` presente com shot types + on-screen text + caption style detectados nos frames amostrados.
- [ ] **AC3:** Sem provider de visão/rede → pipeline completa com `visual_analysis: null` e gate inalterado (degradação limpa, exit codes atuais).
- [ ] **AC4:** O plano gerado com visão referencia o DNA visual (ex.: `caption_style` coerente com o detectado) — validado no benchmark real.
- [ ] **AC5:** Nenhum número visto por OCR aparece no plano se não existir na fala/caption (gate V3 verificado num caso adversarial de teste).

## Escopo
**IN:** scene-detect no ETL, motor de visão, cadência real, hook preciso, injeção nos prompts.
**OUT:** consumo do `edit_spec` no editor (VEX-06); geração de templates visuais novos (já coberto pelo fluxo de estáticos).

## Dependências
- Nenhuma bloqueante. Se o ETL não puder mudar de imediato, a visão sobre `Screenshots/` existentes já entrega valor (cut_timestamps ficam para a fase do ETL).

## Riscos
- **[Médio] Custo/latência de visão** por criativo: amostragem limitada (≤10 frames) + cache no brief.
- **[Médio] Scene-detect com falsos positivos** em screen captures (scroll ≠ corte): calibrar threshold; guardar score por corte.
- **[Baixo] Disponibilidade do vídeo no ETL:** detecção precisa rodar durante o `*creative-benchmark` (o mp4 pode não ser persistido).

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
