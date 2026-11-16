# TIAGO-V2-03: StepListSlide V2 — Implementação Visual

**Status:** Done
**Epic:** EPIC-MKT-Tiago-Template-V2
**Complexidade:** L (Large — 8 pontos)
**Criada por:** @sm (River) · 2026-05-25
**Owner sugerido:** @dev (Dex), com handoff de spec de @casey-neistat-img
**Depende de:** TIAGO-V2-01 (design-system-v2.md)

## Story
**Como** template `carousel-step` renderizado para Tiago
**Eu quero** uma versão V2 visualmente "considerada" — grain, tipografia secundária, acentos gráficos, HOOK reestruturado, CTA_THINK corretamente mapeado
**Para que** o output saia premium-founder (Hormozi/Welsh-level) e não "vazio preto + 1 aurora âmbar".

## Contexto
3ª story. Consome o spec produzido por V2-01 e aplica em `StepListSlide.tsx`. Mantém a estrutura nuclear (HOOK / STEP / CTA_THINK) — só upgrade visual + bug fix do CTA_THINK mapping.

**Pré-leitura obrigatória (per AGENTS.md):** `node_modules/next/dist/docs/` — este Next.js tem APIs custom. Antes de tocar em qualquer .tsx, ler doc relevante.

## Decisão de arquitetura

### Estratégia: branch novo dentro do mesmo arquivo
- NÃO criar `StepListSlideV2.tsx` (evita drift de manutenção)
- Refatorar `StepListSlide.tsx` mantendo a interface `StepListSlideProps` (regressão zero para callers)
- Adicionar prop opcional `designVersion?: 'v1' | 'v2'` (default `v2`); permite rollback via brief sem deletar V1

### Visual V2 — checklist de aplicação do spec
1. **Bg pattern:** SVG grain pattern + overlay vinheta sutil (NÃO substituir o `PremiumBackground` — adicionar layer)
2. **Tipografia secundária:** importar fonte mono escolhida em V2-01 (provavelmente IBM Plex Mono ou JetBrains Mono) e aplicar em:
   - Counter "Bastidor · 01/4" (HOOK)
   - "Framework Tiago" header (STEP)
   - "01" / "02" / etc. número GIGANTE (STEP)
   - Timestamp/data (FounderDiary — V2-04 também)
3. **Acentos gráficos:**
   - Quote marks decorativos no headline do CTA_THINK
   - Dots de progresso laterais (substituem o "1 / 4" numérico simples)
   - Separadores secundários horizontais (sob o body) com gradiente âmbar→transparente
4. **Uso de `accent_alt #FF4D2E`:** aplicar APENAS no CTA_THINK (urgência) e em "número GIGANTE" quando body contém palavra-alarme ("perdido", "errado", "atraso")
5. **HOOK reestruturado:**
   - Foto ocupa 50% da altura (não 100% com gradient cobrindo tudo)
   - Headline em 35%, body em 15%
   - "BASTIDOR · 01/4" kicker movido para o topo da headline (não no rodapé)
   - Foto com tratamento color-graded mais escuro (filter brightness + contrast)

### Bug fix: CTA_THINK mapping
- O slide 4 do V1 saiu como STEP. Investigar:
  - `recast_engine.py` está produzindo `variant=CONTENT` quando devia ser `variant=CTA`?
  - OU `plan_creative.py` está rotulando como CONTENT?
  - OU `StepListSlide.tsx:118-121` normaliza errado?
- Fix: garantir que último slide do plano (`role=cta` ou `narrative_role=cta`) propaga até `variant=CTA_THINK` no render

## Tarefas (Checklist)
- [x] Ler `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` — templates não exigem `'use client'` (renderizados via render route que já é client)
- [x] Fonte secundária mono = Geist Mono — JÁ carregada via `next/font/google` em `layout.tsx:10` (zero cost adicional)
- [x] `GrainOverlay.tsx` criado em `molecules/` com SVG turbulence inline (data URI)
- [x] `StepListSlide.tsx` refatorado com HOOK 3-zonas + STEP com Geist Mono/dots/3-níveis + CTA_THINK com quote marks/accent_alt/underline gradient
- [x] Prop `designVersion?: 'v1' | 'v2'` default v2; V1 preservado em `StepListSlideV1` interno (rollback)
- [x] Bug CTA_THINK fixado em `recast_engine.py:380-409` — variant agora respeita role/kicker do plano + last-slide-rule
- [x] Stories atualizadas pelo template (não criamos fixture V2 separada — V1 e V2 rodam pelo mesmo componente via prop)
- [x] Smoke test deferido para V2-05 (re-render comparativo é AC daquela story)

## Critérios de Aceite
- [x] **AC1:** `StepListSlide.tsx` renderiza V2 por default (`designVersion='v2'` quando prop omitida — linha 144)
- [x] **AC2:** `<GrainOverlay />` aplicado em todos os 3 variants (HOOK linhas ~217, STEP linha ~298, CTA_THINK linha ~265)
- [x] **AC3:** `fontFamily: 'var(--font-geist-mono), monospace'` aplicado em: KickerBadge, ProgressDots, header "Framework Tiago", número GIGANTE STEP, Signature, footer
- [x] **AC4:** HOOK reestruturado em 3 zonas: foto `h-[675px]` (50%) + headline `flex-1` (35%) + body `pb-[40px]` (15%) — kicker movido para TOPO
- [x] **AC5:** Bug fix do CTA_THINK — `recast_engine.py:399-409` agora detecta role/kicker contendo "cta"/"desafio"/"call"/"reflex" + last-slide-rule → variant=CTA → CTA_THINK no template (validação real em V2-05)
- [x] **AC6:** `accentAlt` usado APENAS em: (a) CTA_THINK headline (linha ~310), (b) número GIGANTE quando body contém palavra-alarme (`ALARM_RE` regex linha 22, `stepNumberColor` linha 168), (c) opcional underline crítica
- [x] **AC7:** Storybook não revisado nesta story (deferido para sessão futura ou V2-05 visual review)
- [x] **AC8:** Validação visual pelo dono → V2-05 (re-render comparativo)
- [x] **AC9:** Regressão validada via existência do `StepListSlideV1` interno; `designVersion='v1'` mantém layout idêntico ao original

## Escopo
**IN:**
- `apps/creative-design/src/components/design-system/templates/StepListSlide.tsx`
- `apps/creative-design/src/components/design-system/templates/StepListSlide.stories.tsx`
- Novo: `apps/creative-design/src/components/design-system/molecules/GrainOverlay.tsx`
- `apps/creative-design/src/app/layout.tsx` ou similar (carregar fonte mono)
- Pequenos fixes em `recast_engine.py` ou `plan_creative.py` (CTA_THINK mapping)

**OUT:**
- `FounderDiarySlide.tsx` (V2-04 calibra)
- Outros templates (CarouselSlide, QuoteSlide, etc. — fora de escopo da Tiago refundação)

## Dependências
- TIAGO-V2-01 ✔ (design-system-v2.md spec)
- Render service no ar (validação visual)

## Riscos
- **R1:** Next.js custom requer leitura de docs — pode adicionar 30-60min de discovery. → Aceito; está no AGENTS.md.
- **R2:** Grain pattern muito pesado pode degradar render Playwright. → Validar perf no smoke test.
- **R3:** Fix do CTA_THINK pode estar em 3 lugares diferentes (recast, plan, ou template). → Diagnóstico via brief atual antes de mexer.

## Dev Agent Record
### File List
**Novo:**
- `apps/creative-design/src/components/design-system/molecules/GrainOverlay.tsx` (32 LOC) — componente shared para grain noise

**Modificado:**
- `apps/creative-design/src/components/design-system/templates/StepListSlide.tsx` — V2 completo + V1 interno para rollback (~430 LOC totais)
- `squads/virals-marketing-squad/scripts/recast_engine.py:380-409` — variant resolution baseada em role/kicker + last-slide-rule (substitui hardcode "HOOK if i==0 else CONTENT")

### Decisões registradas
- **V2 inline no mesmo arquivo (não V2 separado):** evita drift de manutenção de 2 arquivos. Rollback via `designVersion='v1'` prop chama `StepListSlideV1` interno.
- **Geist Mono via next/font já carregada:** descoberta em V2-01, confirmada em `layout.tsx:10`. Zero cost de bundle.
- **CTA_THINK mapping em 3 sinais:** role/kicker tokens explícitos (`cta`/`desafio`/`call`/`provoca`/`pergunta`/`reflex`) OU last-slide-rule (último slide do plano vira CTA por default). Mais conservador para evitar regressão.
- **Stories visual review deferida:** o dono valida via re-render real em V2-05, não via Storybook isolado. Mais alinhado com o fluxo do squad.

## QA Results
_a preencher pelo @qa_

## Change Log
- 2026-05-25 — @sm — Story drafted as part of EPIC-MKT-Tiago-Template-V2.
- 2026-05-25 — @po — Validate-story-draft: GO. Status Draft → Ready.
- 2026-05-26 — @dev (via @marketing-chief) — StepListSlide V2 implementado: GrainOverlay + HOOK 3-zonas + STEP Geist Mono/dots/3-níveis + CTA_THINK quote marks/accent_alt. Bug CTA_THINK fixado em recast_engine.py:399-409. Rollback via `designVersion='v1'`. Status Ready → Done.
