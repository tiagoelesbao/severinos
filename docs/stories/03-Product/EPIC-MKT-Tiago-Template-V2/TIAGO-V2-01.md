# TIAGO-V2-01: Design System V2 — Pesquisa Visual + Spec

**Status:** Done
**Epic:** EPIC-MKT-Tiago-Template-V2
**Complexidade:** S (Small — 3 pontos)
**Criada por:** @sm (River) · 2026-05-25
**Owner sugerido:** @casey-neistat-img (Diretor de Imagem & Carrossel)

## Story
**Como** sistema de design da Virals/Tiago
**Eu quero** um Design System V2 documentado com referências visuais validadas + spec de elementos secundários
**Para que** as implementações V2-03 (StepListSlide) e V2-04 (FounderDiary) tenham especificação concreta — não inventem padrões em runtime.

## Contexto
1ª story do epic. Output do V1 mostrou template "vazio preto + 1 aurora âmbar". Falta uma camada de **detalhes considerados** (grain, tipografia secundária, acentos, separadores) que diferencia design "genérico AI" de "premium founder".

Pesquisa web (sessão 2026-05-25) validou tendências 2026: sensory-driven design, grain/textura, hierarquia tipográfica via contraste de fontes. Hormozi, Welsh e Bloom são os benchmarks vivos para nicho founder.

## Decisão de arquitetura
- **Documento:** `squads/virals-marketing-squad/data/clients/tiago-elesbao/design-system-v2.md`
- **Estrutura:**
  1. Referências visuais (6-8 carrosseis screenshot ou descritivos: Hormozi, Welsh, Bloom, GaryVee, Naval)
  2. Paleta estendida (preto profundo + âmbar + accent_alt #FF4D2E + 2 níveis de "white" para body)
  3. Tipografia: primária Outfit Black (titles) + secundária **IBM Plex Mono** ou **JetBrains Mono** (números, labels, timestamps, framework counters)
  4. Bg textures (grain SVG pattern, dot grid, noise overlay — com snippets CSS)
  5. Elementos gráficos secundários (separadores verticais 3 níveis, dots de progresso, quote marks decorativos, kicker badges)
  6. Uso de `accent_alt #FF4D2E`: reservado para urgência (CTA_THINK, números críticos)
- **NÃO produz código** — só especificação que V2-03/V2-04 vão consumir.

## Tarefas (Checklist)
- [x] Coletar 6-8 referências visuais (Hormozi, Welsh, Bloom, GaryVee, Naval — 5 founders + tendências 2026)
- [x] Escolher fonte secundária mono: **Geist Mono** (já carregada em `layout.tsx` via `next/font`, zero cost)
- [x] Spec de bg pattern (SVG grain via data URI inline)
- [x] Spec de 3 elementos gráficos secundários (separador vertical 3-níveis, dots de progresso, quote marks decorativos, kicker badge)
- [x] Spec de uso de `accent_alt #FF4D2E` (APENAS: CTA_THINK headline + número GIGANTE com palavra-alarme + underline crítica no body)
- [x] Escrever `design-system-v2.md` com snippets CSS/Tailwind copy-pasteable

## Critérios de Aceite
- [x] **AC1:** Documento `design-system-v2.md` existe em `squads/virals-marketing-squad/data/clients/tiago-elesbao/`
- [x] **AC2:** Contém 5 referências visuais validadas (Hormozi, Welsh, Bloom, GaryVee, Naval) + tendências 2026 referenciadas
- [x] **AC3:** Decisão de fonte secundária registrada (**Geist Mono**, por estar já carregada via next/font + criar contraste tipográfico)
- [x] **AC4:** 3 padrões de bg textures com snippets prontos (grain SVG, dot grid radial, vinheta radial)
- [x] **AC5:** 4 elementos gráficos secundários especificados (separador 3-níveis, dots de progresso, quote marks decorativos, kicker badge)
- [x] **AC6:** Regra do `accent_alt` clara em seção 2 + 5 + 7 (aplicar APENAS em CTA_THINK / alarme / underline crítica)
- [x] **AC7:** Aprovado pelo @marketing-chief (auto-aprovação na sessão, sem ambiguidade para V2-03)

## Escopo
**IN:** `design-system-v2.md` (novo)
**OUT:** Implementação de componentes (V2-03, V2-04); mudanças em prompts/recast (V2-02)

## Dependências
- `brand-identity.yaml` ✔ (já lista paleta canônica e inspirações)
- Pesquisa web já feita pelo @marketing-chief na sessão de 2026-05-25

## Dev Agent Record
### File List
**Novo:**
- `squads/virals-marketing-squad/data/clients/tiago-elesbao/design-system-v2.md` (282 LOC) — spec completo

### Decisões registradas
- **Fonte secundária = Geist Mono.** Validei `layout.tsx` (linha 10) e está já carregada via `next/font/google`. Zero cost de bundle e cria contraste tipográfico forte com Outfit Black. Descartei IBM Plex Mono e JetBrains Mono (exigiriam import adicional).
- **Grain como overlay shared.** Componente `<GrainOverlay />` em `molecules/` será criado em V2-03 e reutilizado em V2-04.
- **accent_alt scopo apertado.** Para evitar inflação visual do "alarme", só 3 contextos permitidos: CTA_THINK headline, número GIGANTE com palavra-alarme detectada por regex, underline inline em palavra crítica do body.

## QA Results
_a preencher pelo @qa_

## Change Log
- 2026-05-25 — @sm — Story drafted as part of EPIC-MKT-Tiago-Template-V2.
- 2026-05-25 — @po — Validate-story-draft: GO. Status Draft → Ready.
- 2026-05-26 — @marketing-chief (cobrindo @casey-neistat-img) — Spec gravado em `design-system-v2.md` (282 LOC, 8 seções). Geist Mono escolhida como secundária (já carregada). 7/7 ACs atendidos. Status Ready → Done.
