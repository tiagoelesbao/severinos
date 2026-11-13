# MKT-MEDIA-05: Redesenho do Motor de Modelagem de Criativos (deep_modeler v5)

**Status:** Done
**Epic:** EPIC-MKT-Media-Production
**Complexidade:** M (Standard — 8 pontos)
**Criada por:** @sm (River) · 2026-05-16

## Story
**Como** Marketing Chief operando o pipeline `*design-creative`
**Eu quero** que a Etapa 1 (modelagem) leia os 3 insumos do benchmark e produza um brief fiel, validado e personalizável
**Para que** os criativos modelados reflitam de verdade o que tornou o benchmark viral, em vez de placeholders genéricos.

## Contexto
Validação do `@marketing-chief` (2026-05-16) reprovou a Etapa 1 (`scripts/modeling/deep_modeler.py` v4). Falhas estruturais:
- Lia só `Transcrição.md` — ignorava `Análise.md` e `Screenshots/` (1 de 3 insumos).
- Extração por regex frágil e acoplada a idioma → 8/8 bodies vazios, 4/8 headlines perdidas.
- Fallback silencioso (`CASE #2`, body vazio) mascarava falhas — brief quebrado saía como sucesso.
- Sem personalização Virals real — CTA/hook hardcoded; `casey-brand-config.yaml` referenciado mas nunca lido.
- `UnicodeEncodeError` no `print` final (cp1252 Windows).

Handoff de origem: `.aiox/handoffs/handoff-marketing-chief-to-eng-creative-engine-redesign.yaml`.

## Tarefas (Checklist)
- [x] Reescrever `deep_modeler.py` para ler os 3 insumos (Transcrição + Análise + Screenshots).
- [x] Parser de transcrição robusto, agnóstico de idioma/rótulo (PT/EN).
- [x] Eliminar fallback silencioso — campo não extraído vira flag explícita validada.
- [x] Consumir `casey-brand-config.yaml` (paleta, tipografia, zonas de layout).
- [x] Brief com rastreabilidade (cada campo aponta a origem) e métricas de texto por slide.
- [x] Bloco de personalização Virals obrigatório por slide (status + diretiva).
- [x] `validate_brief()` — relatório de validação explícito, sem mascarar.
- [x] Resiliência da Etapa 2 (`orchestrate_carousel.py`): pre-check do render service + isolamento por slide.
- [x] Fix de encoding UTF-8.
- [x] QA gate e teste real sobre o benchmark #2.

## Critérios de Aceite
- [x] **AC1:** O modeler lê e usa os 3 insumos; brief registra `inputs_used`.
- [x] **AC2:** Sobre o benchmark #2, extrai as 8 headlines reais e ≥7 bodies reais — zero placeholder `CASE #N`.
- [x] **AC3:** Nenhum campo obrigatório vazio passa silenciosamente — `_validation` lista toda pendência.
- [x] **AC4:** `brand_tokens` no brief vêm de `casey-brand-config.yaml` lido em runtime.
- [x] **AC5:** Cada slide tem bloco `personalization` com `status` e `directive`.
- [x] **AC6:** Script roda no Windows sem `UnicodeEncodeError`; exit code reflete o resultado real.
- [x] **AC7:** `orchestrate_carousel.py` checa o render service antes de iniciar e isola falha por slide.

## Escopo
**IN:** `scripts/modeling/deep_modeler.py`; resiliência em `orchestrate_carousel.py`; ajuste de escala de texto em `ModeledCarouselSlide.tsx`.
**OUT:** Camada de análise via LLM (extensão futura — seam preparado); redesenho completo do sistema de placeholders/zonas de layout (próxima story); subir o render service.

## Dependências
- Benchmark #2 já processado (`*creative-benchmark` de 2026-05-16). ✔
- `casey-brand-config.yaml` presente. ✔

## Riscos
- **R1:** Formato da `Transcrição.md` varia por slide (rótulos diferentes) → mitigado por dicionário de rótulos com prioridade.
- **R2:** Personalização real de copy exige intelecto criativo → o modeler entrega o modelo fiel + diretiva; recast é etapa de criação posterior, rastreada e obrigatória.

## Dev Agent Record
### File List
- `scripts/modeling/deep_modeler.py` (reescrito — v5)
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` (resiliência)
- `apps/creative-design/src/components/design-system/templates/ModeledCarouselSlide.tsx` (escala de texto)

### Debug Log
- [2026-05-16] Reescrita do `deep_modeler.py` para v5 (3 insumos + schema validado).
- [2026-05-16] Bug parser #1: `\s*` no regex atravessava `\n` e roubava conteúdo da linha seguinte → trocado por `[ \t]*`.
- [2026-05-16] Bug parser #2: rótulo com valor em sub-bullet aninhado (Formato B) → coleta line-aware multi-bullet.
- [2026-05-16] Bug parser #3: na coleta Formato B, `strip()` não removia o marcador de bullet → checagem de "próximo rótulo" falhava.
- [2026-05-16] Resiliência do `orchestrate_carousel.py`: pre-check + isolamento por slide.

### Completion Notes
- Motor v5 valida sobre 3 benchmarks reais: #2 (estruturado) PASS 8/8; #3 (napkin-quote) WARN 2/2 via heurística sinalizada; #1 (vídeo) erro explícito (insumo de `industrialize-video`, não de `design-creative`).
- Eliminado o fallback silencioso: extração falha vira flag explícita em `_validation`.
- `casey-brand-config.yaml` lido em runtime → `brand_tokens` no brief.
- Métricas de texto por slide alimentam a escala harmônica do template.

## QA Results
**Gate:** PASS · **Revisor:** @qa (Quinn) · 2026-05-16

| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | OK — funções coesas, documentadas, `analyze_slide()` é seam para LLM futuro |
| 2 | Testes | OK (observação) — regressão em 3 benchmarks reais; suíte pytest formal recomendada como follow-up |
| 3 | Critérios de aceite | OK — AC1–AC7 verificados (ver abaixo) |
| 4 | Regressões | OK — orquestrador aceita brief v5 e legado; modo `single` preservado |
| 5 | Performance | OK — modelagem < 1s por benchmark |
| 6 | Segurança | OK — só I/O local, sem segredos, sem injeção |
| 7 | Documentação | OK — story, handoff e docstrings atualizados |

**AC verificados:** AC1 `inputs_used` registrado ✔ · AC2 8/8 headlines, 8/8 bodies, zero `CASE #N` ✔ · AC3 `_validation` lista toda pendência ✔ · AC4 `brand_tokens` de config ✔ · AC5 bloco `personalization` por slide ✔ · AC6 sem `UnicodeEncodeError`, exit code real (0/1/2) ✔ · AC7 pre-check + isolamento ✔

**Observações (não bloqueantes):**
- `apps/creative-design` tem 8 erros `tsc` **pré-existentes** (ex.: `size=" giant"`, `type` vs `variant` nas stories) — fora do escopo desta story; recomendada story de saneamento do design-system.
- Heurística de headline para criativos quote-style coleta watermark junto (ex.: `@GARYVEE`); aceitável pois é sinalizada `WARN/revisar` — refino fino fica para a camada de análise LLM.

**Verdito:** PASS — Status InReview → Done.

## Change Log
- 2026-05-16 — @sm — Story criada a partir do handoff do @marketing-chief.
- 2026-05-16 — @po — Validação 10/10 → GO. Status Draft → Ready.
- 2026-05-16 — @dev — Implementação concluída. Status Ready → InReview.
- 2026-05-16 — @qa — Gate PASS. Status InReview → Done.
- 2026-05-16 — @dev — Hotfix pós-validação: render real expôs over-coleta no Formato B (slide 4 — headline incluía o slide inteiro). Causa: `_strip` removia os `**` antes da checagem do próximo rótulo. Corrigido removendo só o marcador de bullet. QA da extração deve checar TAMANHO da headline, não só presença. Revalidado: 8/8 headlines 45–85c.
