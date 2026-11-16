# `*design-creative` — Referência do Pipeline de Criativos

**Documento-mãe.** Descreve o pipeline completo de produção de criativos a partir
de benchmarks: insumos, etapas, saídas, execução e troubleshooting.

Última atualização: 2026-05-17.

---

## 1. Visão geral

O `*design-creative` modela um criativo (carrossel ou post único) a partir de um
benchmark de alta performance já coletado pelo `*creative-benchmark`. O motor
**analisa, planeja, produz na voz Virals, valida e renderiza** — mantendo o tema
central do benchmark, sem copiar literalmente.

```
benchmark → [6 etapas: design_creative.py] → criativo renderizado → [Editor: ajuste fino] → publicação
```

Entrada: um diretório de benchmark.
Saída: PNG/WebP + ZIP em `outputs/carousels/{slug}/`.

---

## 2. Pré-requisitos de runtime

| Requisito | Como garantir |
|---|---|
| Render service no ar | `cd apps/creative-design && npm run dev -- -p 3001` |
| Acesso a LLM | `OPENROUTER_API_KEY` no `.env` (modelos `:free`); fallback Gemini/OpenAI |
| Banco de imagens | `PEXELS_API_KEY` no `.env` |
| Identidade da marca | `squads/virals-marketing-squad/data/virals-brand-identity.yaml` |
| Identidade visual | `squads/virals-marketing-squad/data/casey-brand-config.yaml` |
| Benchmark | diretório gerado pelo `*creative-benchmark` |

---

## 3. As 6 etapas (`squads/virals-marketing-squad/scripts/design_creative.py`)

| # | Etapa | Script | Insumo → Saída | Fatal? |
|---|---|---|---|---|
| 1 | Modelagem | `deep_modeler.py` | Transcrição/Análise/Screenshots → `brief-v5-{slug}.yaml` | **Sim** |
| 2 | Análise holística | `analyze_benchmark.py` | brief → `brief.benchmark_analysis` | Não |
| 3 | Planejamento | `plan_creative.py` | análise + identidade → `brief.content_plan` | Não |
| 4 | Produção/Recast | `recast_engine.py` | plano → `content_data` na voz Virals | Não |
| 5 | Quality Gate | `quality_gate.py` | content_data → checklists + self-healing | Não |
| 6 | Render | `orchestrate_carousel.py` | brief → PNG/WebP/ZIP | **Sim** |

**Degradação graciosa + GATE DE COPY (MCI-06):** etapas 2–5 continuam não-fatais
(se o LLM cair, o `recast_engine` volta ao modo legado). **Porém o render NÃO é
mais incondicional:** entre a etapa 5 e a 6 há um **gate bloqueante** — se a copy
final ainda estiver `_validation: FAIL`, com `PENDING_RECAST`, headline
`[RECAST PENDENTE]` ou números fabricados não resolvidos, o pipeline **aborta**
(exit 2) em vez de renderizar OCR cru. Override consciente: `--force`.

### Detalhe por etapa
- **1. deep_modeler** — parser robusto (PT/EN, multi-formato), extrai headline/body/
  gatilhos por slide; lê os 3 insumos; consome `casey-brand-config.yaml`; valida sem
  fallback silencioso. Define `archetype` heurístico. **MCI-05:** quando `bench_type=video`,
  o `transcript_adapter.py` reformata a transcrição minuto-por-minuto em N slides
  (modos: `key_moments` > `llm` > `heuristic`) antes da extração.
- **2. analyze_benchmark** — análise do benchmark *como um todo*: tema central, arco,
  estrutura, redundâncias, fatores de performance, recomendação de nº de slides.
- **3. plan_creative** — decide o **Plano de Conteúdo**: nº de slides (corta
  redundância), papel + kicker contextual + direção de copy/imagem por slide.
- **4. recast_engine** — modo *plan-aware*: executa o plano, reconstrói `content_data`,
  ancorado no **tema central**. Multi-provedor LLM (OpenRouter free → Gemini → OpenAI).
- **5. quality_gate** — checklist C1-C9; reprovado → corrige e revalida em loop
  (máx. 3 iterações). **MCI-06:** após convergir, roda o **guard terminal** —
  `enforce_fact_fidelity` (remove número/estatística sem lastro na fonte, em loop
  de reparo) + `sanitize_author_refs` (tira `@handle`/nome do autor). Esta é a
  ÚLTIMA transformação de texto (o gate também reescreve, então a fidelidade
  precisa vir depois dele). C8 agora proíbe número fabricado.
- **5.5 gate de render (MCI-06)** — `design_creative._render_blockers` inspeciona
  o brief; havendo bloqueio, aborta antes do render (a menos que `--force`).
- **6. orchestrate_carousel** — pre-check do render service; imagem por slide
  (Pexels curado / Editor / IA); render VVS Playwright; isolamento por slide; ZIP.

---

## 4. Templates por arquétipo

| Arquétipo | Template React | Quando |
|---|---|---|
| `quote` | `QuoteSlide` | frase motivacional/aspiracional |
| `single` | `SinglePostSlide` | post único de insight (1 slide) |
| `news` | `ModeledCarouselSlide` | carrossel de notícias/conteúdo |

Regra: `quote` vem do classificador (estilo); `single` vs carrossel é estrutural
(nº de slides). Override manual: `--template={carousel-slide|quote-slide|single-post}`.

---

## 5. Quality Gate — checklist (C1-C7)

C1 PT-BR · C2 sem @handle/marca d'água de terceiros · C3 dentro do tema central ·
C4 voz Virals · C5 headline não-placeholder · C6 comprimento adequado ·
C7 sem emoji e sem hashtag · **C8 voz do cliente** (slide deve ter NÚMERO/bastidor/
processo, não motivacional genérico) · **C9 CTA proibido** (último slide sem "comente X",
"link na bio", "zona de conforto", "extraordinário"). Reprovou → self-healing corrige e revalida.

---

## 6. Editor — ajuste fino (`http://localhost:3001/editor`)

Após o pipeline, o Editor permite o acabamento humano:
- editar kicker/headline/body; ajustar tamanho de fonte;
- enviar/trocar imagem; reenquadrar (zoom + posição);
- **Salvar e Exportar** → grava no brief + re-render Playwright em alta qualidade.

---

## 7. Como executar

**Via agente:** `@marketing-chief` → `*design-creative` (seletor de template + path).

**Via CLI direto:**
```bash
python squads/virals-marketing-squad/scripts/design_creative.py <benchmark_dir> carousel \
  [--image-mode=pexels|brand|ai] [--template=carousel-slide|quote-slide|single-post]
```

---

## 8. Artefatos

| Artefato | Local |
|---|---|
| Brief | `squads/virals-marketing-squad/data/brief-v5-{slug}.yaml` |
| Criativo final | `outputs/carousels/{slug}/` (PNG, WebP, ZIP, manifest) |
| Imagens | `apps/creative-design/public/render-assets/` |

---

## 9. Troubleshooting

| Sintoma | Causa / Ação |
|---|---|
| `ERRO: render service indisponível` | Suba `npm run dev -- -p 3001` |
| `AVISO: recast indisponível` | LLM fora — segue com brief modelado; revalide chaves no `.env` |
| Slide sem imagem | Pexels não achou para a query — não derruba o batch |
| `Quality Gate: WARN_MAX_ITER` | Não convergiu em 3 iterações — render segue; revise manualmente |
| `Nenhum slide encontrado` | Resolvido pelo `transcript_adapter.py` (MCI-05); se persistir, valide o `Benchmark.json` (precisa de `key_moments` ou LLM disponível) |
| `RENDER_BASE_URL` em outra porta | Definir env var: `RENDER_BASE_URL=http://localhost:3000 python ...` |
| `x RENDER BLOQUEADO (MCI-06)` | A copy falhou no gate (FAIL/recast pendente/placeholder/número fabricado). Re-rode com LLM disponível; ou `--force` para renderizar mesmo assim |
| Números fabricados na copy | O guard terminal (MCI-06) remove %/×/magnitude/contagens grandes sem lastro; se persistir em `_validation.fact_fidelity_unresolved`, revise manualmente |

---

## 10. Mapa de arquivos-chave

- `squads/virals-marketing-squad/scripts/` — `design_creative.py`, `deep_modeler.py`,
  `analyze_benchmark.py`, `plan_creative.py`, `recast_engine.py`, `quality_gate.py`
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` — render
- `squads/virals-marketing-squad/tools/pexels_service.py` — imagens
- `apps/creative-design/` — templates React + Editor + render service
- `squads/virals-marketing-squad/data/virals-brand-identity.yaml` — identidade Virals

**Histórico de stories:** `EPIC-MKT-Media-Production` (MKT-MEDIA-05..12),
`EPIC-MKT-Creative-Intelligence` (MCI-01..04), `EPIC-MKT-Creative-Editor` (MED-01..04).
