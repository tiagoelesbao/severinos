# MKT-MC4-05: Brand-Agnostic Palette (PremiumBackground + todos os templates)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que o `PremiumBackground` e todos os 7 templates de produção (`ModeledCarouselSlide`, `SinglePostSlide`, `QuoteSlide`, `StepListSlide`, `DataCardSlide`, `FounderDiarySlide`, `ProvocationHeroSlide`) aceitem props de paleta (`primaryColor`, `secondaryColor`, `accentAlt`, `accentAurora`) que sobrescrevem as CSS vars hardcoded `--virals-*`
**Para que** clientes não-Virals renderizem com a paleta canônica do seu próprio brand-config (ex.: Tiago = preto profundo + laranja-vermelho + âmbar) ao invés do azul/roxo Virals

## Contexto
Mesmo após o fix do MKT-MC4-04 (signature + footer), o 2º run de Tiago ainda mostrava **fundo violeta/roxo** porque o `PremiumBackground` usa classes Tailwind hardcoded:
- `bg-virals-primary` (= `#0C0A1F`)
- `from-virals-primary via-virals-secondary to-black` (gradient com vars Virals)
- `bg-virals-accent-alt` (= `#7B5BFF` Magic Indigo — o roxo!)
- `bg-virals-aurora` (= `#2DE2C8` teal)

Essas vars vinham de `globals.css`. Mesmo com `accentColor` correto via props, o background ignorava o brand-config. Os 4 templates novos da Fase B2 tinham o mesmo bug — eles também usavam `<PremiumBackground theme="dark" />` sem propagar paleta.

## Tarefas (Checklist)
- [x] Refactor `PremiumBackground.tsx`:
  - Adicionar props `primaryColor?`, `secondaryColor?`, `accentColor?`, `accentAlt?`, `accentAurora?`
  - Dois modos: (a) **back-compat Virals** quando nenhuma prop é passada — mantém todas as classes `bg-virals-*` originais; (b) **brand-agnostic** quando qualquer prop de paleta vem setada — usa `style={{ background: linear-gradient(...) }}` + `style={{ backgroundColor }}` ao invés das CSS vars
- [x] Em todos os 7 templates, adicionar as 4 props no interface + props destructuring + passar para `<PremiumBackground>`:
  - Templates legacy: `ModeledCarouselSlide`, `SinglePostSlide`, `QuoteSlide`
  - Templates novos: `StepListSlide` (HOOK + STEP + CTA_THINK — 3 ocorrências de PremiumBackground), `DataCardSlide`, `FounderDiarySlide`, `ProvocationHeroSlide`
- [x] `orchestrate_carousel.py`:
  - Ler `brand_tokens.palette` do brief
  - Quando `client_slug != 'virals'` E paleta existe → montar `palette_props` dict com primary/secondary/accent_alt/accent_aurora
  - Mesclar no payload de props enviado ao render (somente keys com valor real)
  - Log: `Paleta: primary=... · alt=... · aurora=...`

## Critérios de Aceite
- [x] `_pipeline-trace.json` mostra `render_inputs.palette_injected` com as 4 cores reais do Tiago
- [x] Smoke test 1 (carousel-news → ModeledCarouselSlide): fundo agora preto + glow laranja-vermelho (era navy + glow roxo)
- [x] Smoke test 2 (carousel-step → StepListSlide): mesma paleta correta nas 3 variants (HOOK, STEP, CTA_THINK)
- [x] Back-compat: cliente `virals` continua renderizando com paleta Aurora original (nenhuma prop de paleta passada → PremiumBackground entra no modo legacy)
- [x] Sem regressões TypeScript nos 4 arquivos patched (verificado via `npx tsc --noEmit`)

## Out of Scope
- Tornar `text_primary` / `text_secondary` também brand-agnostic (hoje hardcoded em white/zinc-200 nos templates). Texto branco funciona bem em todos os clientes; pode entrar em iteração futura
- Suportar paletas light-mode per cliente (hoje só dark)

## Referências
- Componente refatorado: `apps/creative-design/src/components/design-system/molecules/PremiumBackground.tsx`
- Templates legacy: `ModeledCarouselSlide.tsx`, `SinglePostSlide.tsx`, `QuoteSlide.tsx`
- Templates novos: `StepListSlide.tsx`, `DataCardSlide.tsx`, `FounderDiarySlide.tsx`, `ProvocationHeroSlide.tsx`
- Orquestrador: `orchestrate_carousel.py` (bloco "Brand-agnostic palette (MKT-MC4-05)")
- Brand-tokens fonte: `brief-v5-*.yaml` → `brand_tokens.palette` (injetado pelo deep_modeler a partir do brand-config do cliente)
