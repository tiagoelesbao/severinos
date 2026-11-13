# Tiago Elesbão — Design System V2

**Status:** Aprovado pelo @marketing-chief · 2026-05-26
**Owner do spec:** @casey-neistat-img (Diretor de Imagem & Carrossel)
**Consumido por:** TIAGO-V2-03 (StepListSlide V2), TIAGO-V2-04 (FounderDiary calibration)
**Fonte canônica:** este arquivo · alterações exigem story formal sob EPIC-MKT-Tiago-Template-V2

---

## 1. Referências visuais validadas

Carrosseis-benchmark de founders no nicho-alvo (research web 2026-05-25):

| Founder | Handle | O que aprender |
|---------|--------|----------------|
| Alex Hormozi | @hormozi | Number-driven typography, bold claims, high-contrast bg, ZERO floreio. Cores: preto + verde — adaptado para preto + âmbar. |
| Justin Welsh | @justinwelsh | Estrutura solopreneur: hook → frame → 3-5 steps → CTA-think. Layout limpo, ícones minimalistas. |
| Sahil Bloom | @sahilbloom | Story arc nos carrosseis: problema relatable → unpack visual → twist. Consistência tipográfica é parte da marca. |
| GaryVee | @garyvee | Energia + urgência. Cores: preto + vermelho — usar nosso `accent_alt #FF4D2E` no mesmo papel. |
| Naval/Lex Fridman | @lexfridman | Minimalismo founder pessoal. Preto + branco. Tipografia faz o trabalho. |

**Padrão extraído (tendência 2026 — `versacreative.com`, `socialhabitmarketing.com`):**
- Sensory-driven, tactile design: grain overlay sutil em TODO bg
- Hierarquia tipográfica via **contraste de fontes** (não só tamanho)
- Hand-drawn accents OU geometric secondary elements
- Cover slide é "audição de 2 segundos" — exige sujeito visual + headline específica

---

## 2. Paleta estendida

| Token | Hex | Uso |
|-------|-----|-----|
| `primary` | `#0B0B0F` | Preto profundo — bg base (sempre) |
| `accent` | `#FFB800` | Âmbar dourado — títulos, números, separadores. Maioria das aplicações. |
| `accent_alt` | `#FF4D2E` | Laranja-vermelho — **APENAS** em: (a) CTA_THINK headline, (b) número GIGANTE quando body contém palavra-alarme (`perdido`, `errado`, `atraso`, `morto`, `quebrei`), (c) underline de palavras-chave críticas no body. NUNCA em mais de 1 elemento por slide. |
| `text_primary` | `#FFFFFF` | Body principal |
| `text_secondary` | `rgba(255,255,255,0.75)` | Body secundário (parágrafo extenso) |
| `text_quiet` | `rgba(255,255,255,0.40)` | Counters, micro-labels |
| `surface_overlay` | `rgba(0,0,0,0.85)` | Overlay sobre fotos (HOOK) |
| `grain_alpha` | `0.04-0.08` | Opacity do grain pattern (sutil — não obstrui texto) |

**Regra de combinação:**
- Slide não pode ter `accent` E `accent_alt` ao mesmo tempo em elementos primários
- `accent_alt` é "sinal de alarme" — usado raramente para não inflacionar

---

## 3. Tipografia

### Hierarquia de fontes

| Família | Variável CSS | Uso |
|---------|--------------|-----|
| **Outfit** (primária) | (carregada em `globals.css`) | Headlines (Black), body (Medium), kickers (Black) |
| **Geist Mono** (secundária) | `--font-geist-mono` (já em `layout.tsx`) | Números GIGANTES, counters ("01/4"), timestamps, framework labels, handle, dados |

### Por que mono na secundária
- Cria **contraste de fontes** sem precisar carregar terceira fonte
- Numbers monoespaçados parecem "técnicos/dados" — alinha com voz Tiago (NÚMERO + processo)
- Geist Mono já está disponível via next/font (zero cost)

### Aplicação

| Elemento | Fonte | Peso | Tamanho |
|----------|-------|------|---------|
| HOOK headline | Outfit | 900 (Black) | 48-100px (responsive) |
| STEP número GIGANTE | **Geist Mono** | 700-800 | 210-260px |
| STEP "Framework Tiago" header | **Geist Mono** | 700 | 12px tracking 0.42em |
| STEP slide counter (1 / 4) | **Geist Mono** | 700 | 14px tracking 0.18em |
| Body parágrafo | Outfit | 500 (Medium) | 22-30px |
| Body destaque (palavra-chave) | Outfit | 900 (Black) inline | mesmo tamanho do body |
| Signature handle | **Geist Mono** | 700 | 14px tracking 0.18em |
| CTA_THINK quote marks | Outfit | 900 (Black) | 180px decorativo |

---

## 4. Bg textures (snippets prontos)

### 4.1 Grain pattern (uso primário — TODOS os slides)

Componente compartilhado `<GrainOverlay opacity={0.06} />`:

```tsx
// apps/creative-design/src/components/design-system/molecules/GrainOverlay.tsx
import React from 'react';

interface GrainOverlayProps {
  opacity?: number;  // default 0.06
  blendMode?: 'overlay' | 'soft-light' | 'multiply';
}

export const GrainOverlay: React.FC<GrainOverlayProps> = ({
  opacity = 0.06,
  blendMode = 'overlay',
}) => (
  <div
    className="absolute inset-0 pointer-events-none z-[5]"
    style={{
      opacity,
      mixBlendMode: blendMode,
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/></svg>")`,
      backgroundSize: '256px 256px',
    }}
  />
);
```

**Regra:** sempre logo após `PremiumBackground` (ou foto), com z-index 5 (entre bg e content).

### 4.2 Dot grid sutil (HOOK e CTA_THINK)

```tsx
<div
  className="absolute inset-0 pointer-events-none z-[3]"
  style={{
    backgroundImage: 'radial-gradient(rgba(255,184,0,0.10) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
  }}
/>
```

**Quando usar:** apenas em HOOK e CTA_THINK (não nos STEP — já têm número gigante competindo por atenção).

### 4.3 Vinheta lateral (HOOK com foto)

```tsx
<div
  className="absolute inset-0 z-[6] pointer-events-none"
  style={{
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
  }}
/>
```

Aprofunda o foco no centro da composição, mata distrações nas bordas.

---

## 5. Elementos gráficos secundários

### 5.1 Separador vertical 3-níveis (STEP e FounderDiary)

```tsx
<div className="flex flex-col items-center gap-2 mx-6">
  <div className="w-[2px] h-12 bg-[#FFB800]/80" />
  <div className="w-[2px] h-6 bg-[#FFB800]/40" />
  <div className="w-[2px] h-3 bg-[#FFB800]/20" />
</div>
```

Substitui o "border-l-[4px]" simples — adiciona ritmo visual.

### 5.2 Dots de progresso (substituem "1 / 4" numérico)

```tsx
<div className="flex items-center gap-1.5">
  {Array.from({ length: totalSlides }).map((_, i) => (
    <div
      key={i}
      className={`h-1.5 rounded-full transition-all ${
        i + 1 === slideNumber
          ? 'w-6 bg-[#FFB800]'
          : i + 1 < slideNumber
          ? 'w-1.5 bg-[#FFB800]/40'
          : 'w-1.5 bg-white/20'
      }`}
    />
  ))}
</div>
```

**Visual:** slide atual vira pill âmbar, anteriores ficam dot âmbar fraco, futuros dot branco fraco. Mais "designed" que "01 / 04".

### 5.3 Quote marks decorativos (CTA_THINK)

```tsx
<div
  className="absolute -top-12 -left-8 text-[180px] leading-none font-black opacity-15"
  style={{ color: '#FFB800', fontFamily: "'Outfit', sans-serif" }}
>
  &ldquo;
</div>
```

Posicionar antes do headline centralizado. Cria "shape" sem competir com texto.

### 5.4 Kicker badge (HOOK header)

Substitui o `BASTIDOR · 01/4` linear por um badge:

```tsx
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFB800]/30 bg-[#FFB800]/8 backdrop-blur-sm">
  <div className="h-1.5 w-1.5 rounded-full bg-[#FFB800] animate-pulse" />
  <span className="font-mono text-[11px] font-bold tracking-[0.32em] uppercase text-[#FFB800]">
    Bastidor · 01/04
  </span>
</div>
```

---

## 6. Layouts revisados

### 6.1 HOOK reestruturado (3 zonas — não "tudo no rodapé")

```
┌──────────────────────────────────┐
│  [Kicker badge top-left]    ─    │  ← 60px padding top
│                                  │
│                                  │
│      [FOTO color-graded]         │  ← 50% altura (650px de 1350)
│      brightness 0.6              │
│      contrast 1.15               │
│                                  │
│                                  │
├──────────────────────────────────┤
│  HEADLINE BLOCK                  │  ← 35% altura (475px)
│  (Outfit Black 80-100px)         │
│                                  │
│                                  │
├──────────────────────────────────┤
│  body parágrafo (Outfit 26px)    │  ← 15% altura (225px)
│  @tiagoelesbao (Geist Mono)      │
└──────────────────────────────────┘
```

### 6.2 STEP revisado (mantém estrutura, só upgrade visual)

- Bg: `PremiumBackground` + `<GrainOverlay opacity={0.07} />`
- Header: "Framework Tiago" em Geist Mono + Dots de Progresso (substituem "1 / 4")
- Número GIGANTE: Geist Mono Black 240px, kerning -0.04em
- Separador: 3-níveis vertical (em vez de border-l-4 linear)
- Body: opção de destacar 1-2 palavras-chave em `font-black` inline + cor `accent_alt` se for número ou palavra-alarme

### 6.3 CTA_THINK revisado

- Bg: `PremiumBackground` + grain + dot grid sutil
- Quote marks decorativos (`"`) atrás do headline (opacity 15%)
- Headline em `accent_alt #FF4D2E` (URGÊNCIA — única exceção da regra de single accent)
- Underline secundária com gradiente âmbar→transparente
- Body em `text_secondary` opacity 65%
- Signature handle em Geist Mono no rodapé

---

## 7. Resumo executável (checklist para o @dev)

Quando implementar V2-03 (StepListSlide V2), atender:

- [ ] Criar `<GrainOverlay />` em `apps/creative-design/src/components/design-system/molecules/`
- [ ] Usar `font-family: var(--font-geist-mono)` nos elementos da seção 3 (sem importar nova fonte)
- [ ] Aplicar grain em todos os 3 variants
- [ ] HOOK: 3-zonas (foto 50% / headline 35% / body 15%) — kicker badge no TOPO
- [ ] STEP: dots de progresso + separador 3-níveis + número Geist Mono
- [ ] CTA_THINK: quote marks decorativos + headline em `accent_alt` + underline gradiente
- [ ] Regra do `accent_alt`: só CTA_THINK headline, OU 1 destaque inline no body com palavra-alarme
- [ ] Detectar palavra-alarme no body via regex: `\b(perdido|errado|atraso|morto|quebrei|fracassei|matei|destruí)\b`

---

## 8. Não-objetivos

- ❌ NÃO mudar paleta canônica (preto + âmbar já é assinatura)
- ❌ NÃO trocar fonte primária (Outfit é parte da identidade)
- ❌ NÃO adicionar terceira fonte (Geist Mono cobre o gap)
- ❌ NÃO usar accent_alt em STEP padrão (só CTA_THINK e exceções de alarme)
- ❌ NÃO usar imagens illustrated/ícones genéricos (anti-Tiago — ele é founder real, não brand institucional)

---

*Spec spec @marketing-chief · pesquisa validada via web (Hormozi, Welsh, Bloom, GaryVee) · Tendências 2026 (versacreative, socialhabitmarketing, pineable).*
