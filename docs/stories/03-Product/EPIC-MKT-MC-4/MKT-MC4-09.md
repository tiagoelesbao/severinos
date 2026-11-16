# MKT-MC4-09: Recast Engine especializado por template_id (campos template-specific)

## Status
Draft

## Story
**Como** Marketing Chief produzindo criativos via `*design-creative`
**Eu quero** que o `recast_engine.py` detecte o `template_id_render` do brief e GERE os campos template-specific (`number`, `unitSuffix`, `kicker`, `callToThink`, `quote`, `caption`, `dateLabel`) a partir do conteúdo do benchmark, NÃO só os campos genéricos (`headline`, `body_text`, `sub_headline`)
**Para que** templates como `DataCardSlide` mostrem seu **número-hero gigante** (não degrade para layout "headline+body" genérico), `ProvocationHeroSlide` use uma **quote provocativa real** (não a headline literal), `FounderDiarySlide` tenha **dateLabel** ("23/05 · bastidor da reunião") e cada arquétipo visual cumpra seu papel completo

## Contexto
Após MKT-MC4-08 (fallbacks defensivos), todos os 8 templates do Tiago renderizam sem crash. Mas 4 dos templates novos têm visual **degradado** porque o recast_engine atual produz apenas campos genéricos:

| Template | Campo crítico ausente | Resultado atual |
|---|---|---|
| `DataCardSlide` | `number` (string), `unitSuffix` | Renderiza sem número-hero (vira basicamente um SinglePostSlide com paleta Tiago) |
| `ProvocationHeroSlide` | `quote` (provocação curta separada) | Usa `headline` (longa, descritiva) como quote — falta o impacto provocativo |
| `FounderDiarySlide` | `caption` (frase curta da lição), `dateLabel` | Usa `headline` como caption; sem data, perde o feel "diário" |
| `StepListSlide` (variant STEP) | `stepNumber` (já cai no slideNumber via fallback) | OK, mas poderia ser explícito |

A solução é **prompt-aware por template** no recast: quando o brief tem `template_id_render: tiago-data`, o prompt instrui o LLM a também extrair um número-âncora; quando `tiago-provocation`, instrui a derivar uma quote provocativa curta (até 15 palavras) da caption; etc.

## Tarefas (Checklist)
- [ ] Mapear quais campos cada template_id_render precisa (documentar em `data/templates/_field-requirements.yaml` ou similar)
- [ ] Estender `recast_engine.build_prompt()` para detectar `brief.template_id_render` (ou inferir de `archetype`+`template_id`)
- [ ] Adicionar bloco condicional no prompt:
  - Se `tiago-data`: instruir LLM a extrair `number` (string até 5 chars), `unitSuffix` (até 6 chars: "%", "x", "k/mês", "M"), `kicker` (frase curta uppercase), `callToThink` (pergunta provocadora curta) da caption/análise do bench
  - Se `tiago-provocation`: instruir LLM a derivar `quote` (provocação curta, máx 15 palavras), pode usar `headline` como matéria-prima
  - Se `tiago-diary`: instruir LLM a gerar `caption` curta (lição em 1 frase), `dateLabel` (formato "DD/MM · contexto curto")
  - Se `tiago-step` variant=STEP: pode receber `stepNumber` explícito (default = slideNumber)
- [ ] Estender JSON schema esperado do recast para incluir esses novos campos como opcionais
- [ ] `recast_engine.apply_recast()` persiste os novos campos em `slide.X` (para o orquestrador passar como prop)
- [ ] `orchestrate_carousel.py` e `orchestrate_post_single.py` já mesclam campos extras nos props (`for extra in ('kicker', 'number', ...)` já está implementado em MC4-07/08) — verificar se cobre tudo
- [ ] Regenerar os 4 templates problemáticos para validar visualmente

## Critérios de Aceite
- [ ] `DataCardSlide` rendered com número-hero gigante extraído do bench (ex.: bench fala "+12% CTR" → `number: '12', unitSuffix: '%'`)
- [ ] `ProvocationHeroSlide` rendered com quote ≤15 palavras (não a headline descritiva longa)
- [ ] `FounderDiarySlide` rendered com `dateLabel` no formato canônico
- [ ] `StepListSlide` variant=STEP tem `stepNumber` explícito (pode ser igual ao slideNumber se não houver lógica especial)
- [ ] Brief persiste os campos novos em `content_data[].kicker`, `content_data[].number`, etc.
- [ ] Sem regressões: templates legacy (`ModeledCarouselSlide`, `SinglePostSlide`, `QuoteSlide`) continuam funcionando normalmente
- [ ] Pipeline trace registra os campos especiais quando presentes

## Decisões em Aberto (resolver antes do build)
- [ ] **Onde detectar template_id_render?** No `recast_engine.py` lendo do brief, ou via flag passada pelo `design_creative.py`? Recomendação: do brief (single source of truth)
- [ ] **Campos opcionais vs obrigatórios?** Se o LLM falhar em gerar `number`, manter fallback degradado (MC4-08) ou abortar? Recomendação: manter fallback (degradação graciosa é melhor que abort)
- [ ] **Múltiplos retries?** Se o LLM não retornar `number` numa primeira chamada, retry com prompt mais específico? Recomendação: NO em V1 (mantém custo baixo), avaliar depois
- [ ] **Compatibilidade com clientes futuros?** O schema de campos é universal ou per-cliente? Recomendação: universal (templates são compartilhados)

## Out of Scope
- Patches em `quality_gate.py` para validar a presença dos campos novos (vira nova story se necessário)
- Adicionar template_ids customizados além dos 4 novos do Tiago

## Referências
- Templates afetados:
  - `DataCardSlide.tsx` (props: `kicker?, number?, unitSuffix?, callToThink?`)
  - `ProvocationHeroSlide.tsx` (props: `quote?, authorRole?`)
  - `FounderDiarySlide.tsx` (props: `caption?, dateLabel?`)
  - `StepListSlide.tsx` (props: `stepNumber?`)
- Engine a estender: `squads/virals-marketing-squad/scripts/recast_engine.py` (função `build_prompt`)
- Schema do brief: campos opcionais em cada `content_data[]` slide

## Estimativa
~1h de trabalho focado:
- 15min mapeamento de campos + decisão arquitetura
- 30min estender `build_prompt` com blocos condicionais
- 15min validar via re-run dos 4 templates afetados
