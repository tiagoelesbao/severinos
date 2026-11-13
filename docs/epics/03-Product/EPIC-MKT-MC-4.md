# EPIC-MKT-MC-4: Design-Creative Refactor — 6-Step Flow + Templates Registry

## Visão Geral
Refatorar o comando `*design-creative` de um fluxo de 3 passos (cliente → template → path) para um fluxo de 6 passos que separa **bench-type** (vídeo/post único/carrossel da fonte) de **output-type** (carrossel ou post único a produzir), e que carrega templates dinamicamente de `data/clients/<slug>/templates.yaml` — registry per-client com ≥3 templates por output_type.

Permite que um Reel de benchmark vire um carrossel para o cliente, ou que um carrossel vire um post único — cross-type modeling sob controle explícito do usuário.

## Status: ✅ COMPLETE (Fase B1 + B2 entregues)
**Epic ID:** MKT-MC-4
**Owner:** @marketing-chief (orchestration), @dev (implementation)
**Priority:** High
**Início:** 2026-05-23
**Conclusão Fase B1:** 2026-05-23
**Conclusão Fase B2:** 2026-05-23 (via EPIC-MKT-MC-6)

## Contexto
O comando `*design-creative` original aceitava `<benchmark_dir> <single|carousel> [--template]` com 3 templates hardcoded globais (`carousel-slide`, `quote-slide`, `single-post`). Não havia:
- Registry per-client de templates (cada cliente é forçado aos 3 globais)
- Distinção explícita entre tipo de bench-fonte e output desejado
- Recomendação automática de template baseada em bench-type × output-type

O dono pediu fluxo de 6 passos com seleção em: cliente → rede do bench → tipo do bench → path → output → template (3+ opções).

## Problema
- 3 templates globais não escalam para múltiplos clientes com identidades distintas
- Usuário não consegue dizer "esse Reel quero virar carrossel para Tiago" — o classificador automático decidia sozinho
- Sem registry, adicionar templates significa modificar código (orchestrate_carousel.py + render/page.tsx) em vez de YAML
- "Auto" pick não considerava o tipo da fonte de bench → resultados inconsistentes

## Objetivo
1. `data/clients/<slug>/templates.yaml` lista templates per output_type com metadata + `scoring_match[output_type][from_<bench_type>]`
2. `design_creative.py` aceita `--bench-type`, `--bench-platform`, `--template=<id-from-registry>`, `--list-templates`
3. Resolver `_resolve_template_id()`: explicit-id (se válido no registry) > scoring_match > fallback heurístico
4. `marketing-chief.md` ganha protocolo de 6 passos com `templates_source` dinâmico
5. Tiago + Virals ambos têm 3+ templates registrados para cada output_type

## KPIs de Sucesso
- [x] `python design_creative.py --list-templates --client=tiago-elesbao` mostra 3 carousel + 3 single, com `preview_status` por template
- [x] `templates.yaml` per cliente válido (sanity check Python parsing) para virals + tiago-elesbao
- [x] Resolver dispatch correto na matriz 2 × 3 (output × bench_type) sem hardcode
- [x] `*design-creative` no agent tem 6 perguntas em ordem definida
- [x] Backward compat: forma curta `design_creative.py <dir> <single|carousel> [--client=...]` continua funcionando
- [x] Templates dedicados StepListSlide + DataCardSlide entregues (Fase B2 → EPIC-MKT-MC-6 COMPLETE)
- [x] Templates novos FounderDiarySlide + ProvocationHeroSlide adicionados (4º carrossel + 4º single para Tiago)

## Roadmap
- [x] **MKT-MC4-01**: `templates.yaml` per-client schema + configs (Tiago + Virals)
- [x] **MKT-MC4-02**: `design_creative.py` CLI: `--bench-type`, `--bench-platform`, `--list-templates`, resolver
- [x] **MKT-MC4-03**: Agent protocol `design_creative_protocol` reescrito (6 steps + templates_source)
- [x] **MKT-MC4-04**: Brand-Agnostic Signature & Footer nos 3 templates legacy (signatureHandle + footerText)
- [x] **MKT-MC4-05**: Brand-Agnostic Palette (PremiumBackground + 7 templates aceitam props de paleta)
- [x] **MKT-MC4-06**: Pipeline Trace JSON (auditabilidade por run — YAMLs, hashes, LLMs, paleta injetada)
- [x] **MKT-MC4-07**: Output unique-per-run (`<template>__<ts>/` subpasta) + HOOK image loading (StepListSlide consome mainObjectImage)
- [x] **MKT-MC4-08**: Fallbacks defensivos nos 4 templates novos (QuoteSlide footer, ProvocationHero quote, DataCard graceful degradation, FounderDiary photo+caption) + patch do `orchestrate_post_single.py` para paridade com carousel (--template, brand-agnostic, per-run subfolder, pipeline trace)
- [ ] **MKT-MC4-09**: Recast Engine especializado por template_id (gerar campos template-specific como `number`, `unitSuffix`, `quote`, `caption`, `dateLabel`) — DRAFT

## Dependências
- **EPIC-MKT-MC** (Multi-Client Design Pipeline) — `_client_resolver.py`, `data/clients/`
- **EPIC-MKT-Design-System (VVS)** — componentes React `ModeledCarouselSlide`, `QuoteSlide`, `SinglePostSlide` (continuam sendo os componentes que renderizam o conteúdo)

## Decisões
- **Placeholders B2:** dois templates (`carousel-step`, `single-data`) estão registrados com `preview_status: fase_b2_pending` apontando para componente vizinho. Substituir quando MKT-MC-6 entregar `StepListSlide` + `DataCardSlide`
- **Registry per-client (Shared React + per-client YAML)** vs componentes React per-client: escolhida a primeira (menos duplicação, brand-config já driva paleta)
- **Render fallback:** se `--template` passado não está no registry, é passado direto como `template_id_render` ao orquestrador (back-compat com IDs legados)

## Riscos
- **Placeholders confundem usuário:** mitigado por `preview_status` e `preview_note` explícitos no YAML + na saída de `--list-templates`
- **Drift entre registry e React switch:** mitigado por `template_id_render` ser fonte única consumida por `orchestrate_carousel.py` → `app/render/page.tsx`

## Referências
- Script: `squads/virals-marketing-squad/scripts/design_creative.py`
- Configs: `data/clients/{virals,tiago-elesbao}/templates.yaml`
- Agent canonical: `.claude/commands/VIRALS/agents/marketing-chief.md` → `design_creative_protocol`
- Render switch: `apps/creative-design/src/app/render/page.tsx`

---
*Cada cliente escolhe o template certo para o output certo — em 6 cliques.*
