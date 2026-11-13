# Tiago Elesbão — Spec dos Novos Templates (Fase B2)

**Data:** 2026-05-23
**Status:** Spec aprovado, aguardando build dos componentes React.
**Consumidor:** `apps/creative-design/src/components/design-system/templates/` + `data/clients/tiago-elesbao/templates.yaml`.

---

## 1. Pesquisa de Tendências (resumo executivo)

Cinco constatações que dirigem o design:

1. **Carrosséis 8-10 slides são o sweet spot** — média de engajamento de 1,92% (vs 0,50% Reels, 0,45% post único). DM-shares pesam 3-5× mais que curtidas no algoritmo Instagram 2026.
2. **"Cognitive interruption, not beauty"** — Instagram 2026 prioriza interrupção cognitiva (pattern interrupt forte) sobre estética polida.
3. **"This Is Who" humanizing trend** — slide 1 com foto pessoal do founder + headline conectiva está superando hooks puramente visuais. Marcas faceless perdem para founders com cara visível.
4. **Carrossel numerado (Hormozi-style)** — cada slide com número GRANDE + headline curta + explicação 1 linha. A numeração cria pull natural pra próximo slide; completion rate alto.
5. **"Photo dump" pattern** — mistura foto polida + foto raw de celular gera 3× mais saves. Bastidor real > stock photo.

**Implicação para Tiago Elesbão:**
- Tiago **JÁ TEM** o arquétipo Herói + voz Hormozi/GaryVee-direta + mandato de "bastidor real". As tendências reforçam, não contradizem, a brand-identity.
- Paleta canônica (preto #0B0B0F + âmbar #FFB800 + laranja-vermelho #FF4D2E) cria contraste alto — coerente com "cognitive interruption".
- Tipografia Outfit Black/Bold serve para os números gigantes (estilo Hormozi).

**Fontes da pesquisa:**
- [Krumzi · 15 Carousel Ideas Driving 3× Engagement (2026)](https://www.krumzi.com/blog/15-instagram-carousel-ideas-that-actually-drive-engagement-in-2026)
- [PostNitro · Perfect IG Carousel Guide 2026](https://postnitro.ai/blog/post/instagram-carousel-post)
- [Krumzi · "This Is Who" trend](https://www.krumzi.com/blog/15-instagram-carousel-ideas-that-actually-drive-engagement-in-2026)
- [AI Maker · Como Hormozi posta 250+ vezes/semana](https://aimaker.substack.com/p/alex-hormozi-ai-content-repurposing-system-turn-one-idea-into-social-posts)
- [PRO Campaigns · D2C IG Growth 2026 — "Cognitive interruption, not beauty"](https://procampaigns.online/d2c-brands-instagram-growth-in-2026-without-ads-virality-or-luck/)
- [Hubspot · Hero Images Best Practices](https://blog.hubspot.com/marketing/hero-image)
- [Sprout Social · 20 Instagram Trends 2026](https://sproutsocial.com/insights/instagram-trends/)

---

## 2. Princípios de Design (Tiago-específicos)

Cada template novo segue OBRIGATORIAMENTE:

| Princípio | Aplicação |
|---|---|
| **Hierarquia agressiva** | 1 elemento dominante por slide (número gigante OU foto raw OU statement curto). Nunca 2 protagonistas. |
| **Contraste preto+âmbar** | Background `#0B0B0F` sólido OU foto + overlay `#000000` @ 0.60. Accent `#FFB800` SÓ em 1 elemento por slide. |
| **Tipografia Outfit, escala bruta** | Headlines 76-200px (Black). Body 22-32px (Regular). Sem itálico, sem decoração. |
| **Safe-zone 60px** | Texto nunca cola na borda. Safe-zone total = 1080×1350 com 60px de respiro em todos os lados. |
| **Léxico-tabu rígido** | NUNCA "segredo", "método secreto", "dica", "mentoria", "alavancar" — listados em `brand-identity.yaml`. |
| **CTA = call-to-think** | Último slide é pergunta provocadora, não "comenta EU QUERO". |
| **Assinatura mínima** | `@tiagoelesbao` em wordmark âmbar, canto inferior direito, opacidade 0.85. Sem logos extras. |

---

## 3. Templates Especificados (4 novos)

### 3.1 `TIAGO-NUMBERED-FRAMEWORK` (Carrossel · substitui placeholder `carousel-step`)

**React component a criar:** `StepListSlide.tsx`
**Output type:** `carousel`
**Slide count:** 5-7

**Estrutura por slide:**
```
┌──────────────────────────────────────┐
│  [slide 1 — HOOK]                    │
│                                      │
│  Foto raw do Tiago (celular,         │
│  bastidor) full-bleed                │
│  + overlay preto 0.60                │
│                                      │
│  HEADLINE GRANDE EM ÂMBAR            │
│  (Outfit Black 76-100px)             │
│  + linha de body curta abaixo        │
│                                      │
│  @tiagoelesbao · âmbar               │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  [slides 2 a N-1 — STEPS]            │
│                                      │
│                                      │
│   01    ← Outfit Black 200px         │
│  ────   ← linha âmbar 4px            │
│   ▌     ← acento vertical            │
│                                      │
│  TÍTULO DO PASSO (Outfit Black 56px) │
│  Body curto explicando (Regular 28px)│
│                                      │
│                                      │
│  ─────────────────────────  2/6      │
│                          @tiagoelesbao│
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  [slide final — CALL-TO-THINK]       │
│                                      │
│  Pergunta gigante centralizada       │
│  (Outfit Black 80-110px)             │
│                                      │
│  Linha âmbar curta abaixo            │
│                                      │
│  @tiagoelesbao · âmbar               │
└──────────────────────────────────────┘
```

**Props interface (proposto):**
```typescript
interface StepListSlideProps {
  slideNumber: number;          // 1-indexed display number
  totalSlides: number;
  variant: 'HOOK' | 'STEP' | 'CTA_THINK';
  stepNumber?: number;          // só usado em variant=STEP — número GIGANTE
  headline: string;             // título do passo (ou hook headline)
  bodyText?: string;
  backgroundImage?: string;     // foto raw bastidor (só HOOK)
  accentColor?: string;         // default '#FFB800'
  headlineFontSize?: number;
  bodyFontSize?: number;
}
```

**Quando usar:** framework numerado (Hunter Ads passos, lições de bastidor, lessons-learned com 4-6 takeaways).

---

### 3.2 `TIAGO-DATA-HERO` (Single · substitui placeholder `single-data`)

**React component a criar:** `DataCardSlide.tsx`
**Output type:** `single`

**Estrutura:**
```
┌──────────────────────────────────────┐
│                                      │
│  KICKER PEQUENO EM ÂMBAR             │
│  (Outfit Bold 18px, tracking grande) │
│                                      │
│                                      │
│          ┌─────────┐                 │
│          │   60    │  ← 280-340px    │
│          │    %    │     Outfit Black│
│          └─────────┘                 │
│                                      │
│  Halo âmbar atrás do número          │
│  (blur 180px, opacity 0.25)          │
│                                      │
│                                      │
│  CONTEXTO EM 1 LINHA                 │
│  (Outfit Bold 40-48px)               │
│                                      │
│  Body explicando em 2-3 linhas       │
│  (Outfit Regular 26-30px, 70% white) │
│                                      │
│  ────                                │
│  Pergunta call-to-think final        │
│  (Outfit Medium 22px, âmbar)         │
│                                      │
│                       @tiagoelesbao  │
└──────────────────────────────────────┘
```

**Props interface (proposto):**
```typescript
interface DataCardSlideProps {
  kicker?: string;              // "CAC", "ROAS", "BASTIDOR DO MÊS"
  number: string;               // "60", "3x", "R$ 12k" — string para suportar unidades
  unitSuffix?: string;          // "%", "x", "k/mês" — renderiza menor ao lado
  headline: string;             // contexto em 1 linha
  bodyText?: string;            // explicação em 2-3 linhas
  callToThink?: string;         // pergunta final
  backgroundImage?: string;     // opcional: foto bastidor de fundo (overlay 0.70)
  accentColor?: string;         // default '#FFB800'
  numberFontSize?: number;
  headlineFontSize?: number;
}
```

**Quando usar:** stat de bastidor, ROI/CAC real, antes/depois numérico, métrica de processo (ex.: "Reduzi CAC em 60% rodando creators · pergunta provocativa").

---

### 3.3 `TIAGO-FOUNDER-DIARY` (Carrossel · NOVO — adicionar como 4º template carrossel)

**React component a criar:** `FounderDiarySlide.tsx`
**Output type:** `carousel`
**Slide count:** 4-7

**Estrutura por slide:**
```
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │   FOTO RAW DE CELULAR          │  │
│  │   (3:4, bastidor, sem polish)  │  │
│  │   ↓ grain sutil + vinheta      │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│   "FRASE CURTA SOBRE A LIÇÃO         │
│    DAQUELE MOMENTO"                  │
│   (Outfit Bold 40-52px)              │
│                                      │
│   ── 23/05 · bastidor                │
│                       @tiagoelesbao  │
└──────────────────────────────────────┘
```

**Diferencial:**
- Foto NÃO ocupa fullbleed — fica em frame com bordas arredondadas, simulando polaroid digital
- Cada slide é UM momento + UMA frase. Fotos podem ser do mesmo dia ou de momentos diferentes
- Data abaixo da frase (formato "DD/MM · contexto curto")
- Vinheta + grain sutis dão feel analógico

**Props interface (proposto):**
```typescript
interface FounderDiarySlideProps {
  slideNumber: number;
  totalSlides: number;
  photo: string;                // URL da foto (obrigatório)
  caption: string;              // a frase principal
  dateLabel?: string;           // "23/05 · bastidor"
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  grainIntensity?: 'none' | 'subtle' | 'strong';
}
```

**Quando usar:** documentação do dia-a-dia ("bastidor 40%" do pillar mix), série recorrente semanal.

---

### 3.4 `TIAGO-PROVOCATION-HERO` (Single · NOVO — adicionar como 4º template single)

**React component a criar:** `ProvocationHeroSlide.tsx`
**Output type:** `single`

**Estrutura:**
```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│   "Se você ainda                     │
│    acha que isso é                   │
│    hype, vou esperar."               │
│                                      │
│    ← Outfit Black 96-130px           │
│    ← texto preenche 80% da largura   │
│    ← linha-altura 1.04                │
│                                      │
│                                      │
│   ▌  Tiago Elesbão                   │
│      Founder · Virals                │
│                                      │
│                                      │
│                       @tiagoelesbao  │
└──────────────────────────────────────┘
```

**Diferencial vs `single-quote`:**
- single-quote: quote genérico com fonte aspiracional (estilo GaryVee)
- provocation-hero: quote PROVOCATIVO (call-to-think direto) com assinatura formal
- Acento âmbar SÓ no traço-divisor antes do nome
- Background pode ser preto sólido OU foto bastidor com overlay 0.80

**Props interface (proposto):**
```typescript
interface ProvocationHeroSlideProps {
  quote: string;                // a provocação
  authorName: string;           // "Tiago Elesbão"
  authorRole?: string;          // "Founder · Virals"
  backgroundImage?: string;     // opcional, com overlay denso
  accentColor?: string;         // default '#FFB800'
  quoteFontSize?: number;
}
```

**Quando usar:** statement-âncora, manifesto, crítica direta a status-quo (pillar mindset-mitos 20%).

---

## 4. Atualizações em `templates.yaml`

Quando os componentes React forem entregues, atualizar
`squads/virals-marketing-squad/data/clients/tiago-elesbao/templates.yaml`:

```yaml
templates:
  carousel:
    - id: carousel-news                  # existente, ready
    - id: carousel-quote-stack           # existente, ready
    - id: carousel-step
      react_component: "StepListSlide"   # ← TROCAR (era ModeledCarouselSlide)
      template_id_render: "tiago-step"   # ← NOVO render id
      preview_status: "ready"            # ← era fase_b2_pending
      preview_note: ""                   # ← remover
    - id: carousel-founder-diary         # ← NOVO 4º template
      label: "Carrossel Founder-Diary"
      description: "Foto raw bastidor + frase curta de lição. Estilo polaroid digital."
      react_component: "FounderDiarySlide"
      template_id_render: "tiago-diary"
      best_for_bench_types: [video, carousel, single]
      slide_count_range: [4, 7]
      typical_use: "Bastidor recorrente, documentação semanal de dia-a-dia"
      preview_status: "ready"

  single:
    - id: single-insight                 # existente, ready
    - id: single-quote                   # existente, ready
    - id: single-data
      react_component: "DataCardSlide"   # ← TROCAR (era SinglePostSlide)
      template_id_render: "tiago-data"
      preview_status: "ready"
      preview_note: ""
    - id: single-provocation             # ← NOVO 4º template
      label: "Single Provocation-Hero"
      description: "Quote provocativo com assinatura formal. Call-to-think direto."
      react_component: "ProvocationHeroSlide"
      template_id_render: "tiago-provocation"
      best_for_bench_types: [single, video]
      typical_use: "Manifesto, crítica a status-quo, statement-âncora (pillar mindset-mitos)"
      preview_status: "ready"

scoring_match:
  carousel:
    from_carousel: [carousel-news, carousel-quote-stack, carousel-step, carousel-founder-diary]
    from_video:    [carousel-step, carousel-founder-diary, carousel-news, carousel-quote-stack]
    from_single:   [carousel-quote-stack, carousel-founder-diary, carousel-news, carousel-step]
  single:
    from_single:   [single-insight, single-quote, single-data, single-provocation]
    from_video:    [single-data, single-provocation, single-quote, single-insight]
    from_carousel: [single-insight, single-data, single-provocation, single-quote]
```

---

## 5. Plano de Build (Fase B2 — próximo turno)

Sequência de execução (sem dependências circulares):

| Etapa | Arquivo | Estimativa |
|---|---|---|
| 1 | `StepListSlide.tsx` + Storybook story | 30-45min |
| 2 | `DataCardSlide.tsx` + Storybook story | 30-45min |
| 3 | `FounderDiarySlide.tsx` + Storybook story | 45-60min |
| 4 | `ProvocationHeroSlide.tsx` + Storybook story | 20-30min |
| 5 | Update `app/render/page.tsx` switch (4 novos cases) | 5min |
| 6 | Update `templates.yaml` de Tiago (4 mudanças) | 5min |
| 7 | Update editor `pickTemplate` para reconhecer novos IDs | 10min |
| 8 | Smoke test: render manual via Storybook + via pipeline | 20min |

**Total estimado:** 3h-4h focados em design + React.

**Critério de aceite:**
- 4 templates renderizam corretamente no `/render?templateId=<id>`
- Storybook tem story para cada arquétipo (HOOK / STEP / CTA_THINK em StepList; default em DataCard; foto+quote em Diary; quote em Provocation)
- `*design-creative --list-templates --client=tiago-elesbao` mostra 4 carousel + 4 single, todos `preview_status: ready`
- Smoke test de pipeline gera output em `outputs/tiago-elesbao/carousels/<slug>/` com paleta preto+âmbar
- Léxico-tabu nunca aparece em nenhum default/placeholder dos componentes

---

## 6. Decisões em aberto (para confirmar antes da Fase B2)

| Decisão | Default proposto |
|---|---|
| Grain/vinheta em FounderDiary | Implementar com SVG noise overlay (sem dependência extra) |
| Fonte para números gigantes em StepList/DataCard | Reusar Outfit-Black (já em `/assets/fonts/`) — sem fonte nova |
| Single-data: ainda aceita `backgroundImage`? | Sim, com overlay 0.70 (default sem) |
| Provocation-Hero: precisa de variant para 2 quotes encadeados? | Não na primeira versão; adicionar se necessário depois |
| Templates devem aparecer também para Virals? | NÃO — esses 4 são exclusivos Tiago (founder personal brand). Virals tem outra agenda visual. |
