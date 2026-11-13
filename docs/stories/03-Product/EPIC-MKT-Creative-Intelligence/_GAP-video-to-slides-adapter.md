# GAP — Adapter `bench_type=video` → segmentação em slides

**Status:** Aberto · brief para `@sm *draft`
**Autor:** @marketing-chief · 2026-05-25
**Epic sugerido:** EPIC-MKT-Creative-Intelligence (epic dono do motor de modelagem)
**ID sugerido:** MCI-05

## O problema (observado em sessão real)

O protocolo `design_creative_protocol` (em `.claude/commands/VIRALS/agents/marketing-chief.md`) promete, no step 4: *"Um bench de Reel pode virar Carrossel"*. Na prática, ao rodar:

```
python design_creative.py <bench-video> carousel \
  --client=tiago-elesbao --bench-platform=instagram --bench-type=video \
  --template=carousel-step --image-mode=pexels
```

a Etapa 1/6 (`deep_modeler.py`) aborta com:

```
ERRO: Nenhum slide encontrado na transcrição.
```

### Causa raiz

- `deep_modeler.py:160` chama `split_slide_blocks(transcript)` que faz `re.split(r"##[^\n]*Slide\s+0*\d+", transcript)`.
- Transcrições produzidas pelo `*creative-benchmark` para `bench_type=video` (ig-reel, tiktok, shorts) saem em formato minuto-por-minuto:
  ```
  ## ⏱️ Minuto 00:00 — 00:59
  **[00:00]** Me desculpa te falar isso, mas...
  **[00:07]** É difícil você fazer coisa extraordinária...
  ```
  — sem nenhum `## Slide NN`.
- `design_creative.py` aceita e propaga `--bench-type=video`, mas usa o valor APENAS para escolher template via `scoring_match`. **Nenhuma transformação** é aplicada à transcrição antes de invocar `deep_modeler`.
- Resultado: a promessa do protocolo é letra morta para QUALQUER benchmark `video-short` (Reels, Shorts, TikTok). Hoje o pipeline só funciona com benchmarks já-extraídos como `carousel` ou `image-single`.

### Impacto de negócio

- O `*daily-monitor` traz ~70% de benchmarks `video-short` no Instagram/TikTok/YouTube (ex.: 2026-05-24 tiago-elesbao → 7 video-short vs 3 carousel vs 1 image-single).
- Sem este adapter, **dois terços dos top criativos não modelam** — o que reduz drasticamente o ROI dos pipelines `*creative-benchmark` e `*audit-benchmark` (auditamos, mas não conseguimos produzir derivado).

## A visão — Adapter `transcript_to_slides()`

Inserir uma etapa de pré-processamento no `deep_modeler.py` (ou em `analyze_benchmark.py`) que, quando `bench_type=video` (detectável via `Benchmark.json.platform_type`):

1. **Segmenta a transcrição minuto-por-minuto em N momentos-chave** (chamada LLM holística — pode reusar `call_llm` do `recast_engine`).
2. Cada momento-chave vira um pseudo-bloco em formato `## Slide NN` com headline + body destacados.
3. O `deep_modeler` segue o fluxo normal a partir daí (extração de gatilhos, métricas, ai_prompt, etc.).
4. A recomendação de **número de slides** vem do `analyze_benchmark.py` (MCI-01 já entrega isso) — o adapter respeita esse N.

### Alternativa heurística (não-LLM)

Quebrar por minuto (cada `## ⏱️ Minuto NN:NN` vira 1 slide) — simples, mas perde o critério de "momentos-chave". Vale como fallback se o LLM cair.

## Critérios de Aceite sugeridos

- **AC1:** Quando `bench_type=video`, a Etapa 1 (`deep_modeler`) NÃO aborta com "Nenhum slide encontrado".
- **AC2:** O brief produzido tem `content_data` com N slides, onde N respeita a recomendação do `analyze_benchmark.py` (ou `min=3, max=10` se análise indisponível).
- **AC3:** Cada slide do brief tem `reference_headline` e `reference_body` populados (não vazios).
- **AC4:** O tema central do vídeo (gravado em `brief["central_theme"]` por MCI-04) reflete a essência do reel, não apenas o primeiro minuto.
- **AC5:** Teste real no `14-pablomarcal1-e129b8` (2026-05-24, ig-reel, 44s) gera carrossel `carousel-step` completo, ponta-a-ponta.
- **AC6:** Fallback heurístico (segmentação por minuto) ativa quando LLM indisponível, com aviso explícito no report.
- **AC7:** `bench_type=carousel` e `bench_type=single` continuam funcionando (regressão zero).

## Escopo sugerido

**IN:**
- `squads/virals-marketing-squad/scripts/deep_modeler.py` (ou novo `squads/virals-marketing-squad/scripts/modeling/transcript_adapter.py`)
- Detecção de `bench_type` (via `Benchmark.json.platform_type` ou `--bench-type` propagado pelo `design_creative.py`)

**OUT:**
- Mudanças no `analyze_benchmark.py` (MCI-01 já é compatível, espera `content_data`)
- Mudanças no `recast_engine.py` (MCI-04 já é plan-aware)
- Mudanças nos templates de render (recebem `content_data` no mesmo formato)

## Dependências

- MCI-01 ✔ (analyze_benchmark.py existe — fornece recomendação de N)
- MCI-04 ✔ (recast plan-aware existe — consome o brief sem mudanças)
- Acesso a LLM (OpenRouter) ✔ (já usado por analyze/plan/recast)
- `Benchmark.json` com `platform_type` ✔ (já populado pelo `*creative-benchmark`)

## Riscos

- **R1:** Segmentação LLM pode produzir N inconsistente entre runs. → Mitigar com seed/temperatura baixa + cache por bench hash.
- **R2:** Reels muito curtos (<20s) podem não ter momentos-chave suficientes para 5+ slides. → Validar N mínimo na análise + fallback "single post" se N<2.
- **R3:** Custo de LLM extra por benchmark de vídeo. → Aceitável (1 chamada extra), mas medir e reportar.

## Complexidade estimada

**M (Medium — 5 pontos)** — reusa infra LLM existente, escopo isolado em uma camada de adapter. Pode ser maior se o time decidir refatorar `deep_modeler.py` em vez de adicionar adapter.

## Próximo passo

`@sm *draft` desta gap para formalizar como `MCI-05.md` com tarefas e plano de implementação, depois `@po *validate-story-draft` (GO/NO-GO ≥7/10), depois `@dev *develop`.

---
*Brief escrito por @marketing-chief durante sessão real de `*design-creative` que falhou no benchmark `14-pablomarcal1-e129b8` (Pablo Marçal · ig-reel · Tiago Elesbão · 2026-05-24).*
