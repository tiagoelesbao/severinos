# MKT-MC4-08: Fallbacks Defensivos nos Templates (orquestrador genérico)

## Status
Done

## Story
**Como** Marketing Chief rodando todos os 8 templates do Tiago via pipeline genérico
**Eu quero** que cada template degrade graciosamente quando o orquestrador não popula seus campos especializados (ex.: `quote`, `number`, `photo`)
**Para que** NENHUM template trave o render do pipeline e o usuário consiga visualizar pelo menos a estrutura básica, mesmo quando o recast_engine ainda não foi estendido para gerar campos template-specific

## Contexto
Após o patch do `orchestrate_post_single.py` (MKT-MC4-08 fase anterior) que permitiu rodar os 4 templates SINGLE do Tiago, a primeira rodada revelou 4 issues estruturais:

1. **`QuoteSlide` tinha footer hardcoded "Virals"** que escapou do MC4-04 (estava fora do BrandingLogo, em um `<span>` no fim). Resultado: mesmo com `signatureHandle=@tiagoelesbao` correto no topo, o rodapé exibia "V I R A L S" centralizado
2. **`ProvocationHeroSlide` quebrava** quando o orquestrador não enviava `quote` (campo specialized) — `quote.startsWith('"')` → TypeError → render crash → dir vazio
3. **`DataCardSlide` renderizava com número-hero VAZIO** quando o orquestrador não enviava `number` — o componente tentava exibir o número mas a string era undefined, criando um buraco visual gigante
4. **`FounderDiarySlide` renderizava frame da polaroid VAZIO** quando o orquestrador não enviava `photo` — mesmo padrão do StepListSlide HOOK antes do MC4-07

## Tarefas (Checklist)
- [x] **`QuoteSlide.tsx`:** trocar hardcode `"Virals"` por `{footerText}` (já existia na interface, só não estava sendo consumido no rodapé do componente). Default `''` para não renderizar nada quando vazio
- [x] **`ProvocationHeroSlide.tsx`:**
  - Tornar `quote` opcional na interface
  - Aceitar `headline` como fallback alternativo (campo do orquestrador genérico)
  - `const finalQuote = (quote || headline || '').trim()` antes de usar
- [x] **`DataCardSlide.tsx`:**
  - Tornar `number` opcional na interface
  - Aceitar `subHeadline` como fallback de `kicker`
  - Detectar `hasNumber = Boolean(number && number.trim())` e renderizar bloco do número condicionalmente — quando ausente, o template degrada para layout "kicker + headline + body + signature" (visualmente equivalente ao SinglePostSlide mas com paleta Tiago)
- [x] **`FounderDiarySlide.tsx`:**
  - Tornar `photo` opcional
  - Aceitar `mainObjectImage` como fallback (orquestrador popula este via Pexels/IA)
  - Aceitar `headline` como fallback de `caption`
  - `const finalPhoto = photo || mainObjectImage || ''` + `const finalCaption = caption || headline || ''`
  - `<img>` só renderiza quando `finalPhoto` truthy

## Critérios de Aceite
- [x] Os 4 templates renderizam sem crash quando o orquestrador genérico não popula campos especializados
- [x] `QuoteSlide` (carousel-quote-stack + single-quote) sem footer "Virals"
- [x] `ProvocationHeroSlide` renderiza usando `headline` como quote (verificado via `tiago-provocation__20260524T084742/`)
- [x] `DataCardSlide` mostra headline + body bonito mesmo sem `number`-hero (verificado via `tiago-data__20260524T084541/`)
- [x] `FounderDiarySlide` mostra a foto Pexels dentro do frame polaroid (verificado via `tiago-diary__20260524T084834/`)
- [x] Sem regressões TS (`npx tsc --noEmit` clean nos 4 patched)
- [x] Pipeline trace continua gerando corretamente

## Out of Scope
- Estender o `recast_engine.py` para gerar campos template-specific (`number`, `unitSuffix`, `quote`, `caption`, `dateLabel`, `kicker`) — vira **MKT-MC4-09** porque é refactor real do prompt builder
- Atualizar Storybook stories dos templates patchados para refletir as novas props opcionais

## Referências
- 4 templates patchados:
  - `apps/creative-design/src/components/design-system/templates/QuoteSlide.tsx`
  - `apps/creative-design/src/components/design-system/templates/ProvocationHeroSlide.tsx`
  - `apps/creative-design/src/components/design-system/templates/DataCardSlide.tsx`
  - `apps/creative-design/src/components/design-system/templates/FounderDiarySlide.tsx`
- Outputs validados:
  - Singles: `outputs/tiago-elesbao/posts/v5-single-06-publicitarioscriativos-2a6dbb/<template>__20260524T0847*/`
  - Founder Diary: `outputs/tiago-elesbao/carousels/v5-precision-06-publicitarioscriativos-2a6dbb/tiago-diary__20260524T084834/`
