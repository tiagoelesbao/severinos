# MKT-MEDIA-06: Sistema de Layout Harmônico do Carrossel

**Status:** Done
**Epic:** EPIC-MKT-Media-Production
**Complexidade:** M (Standard — 8 pontos)
**Criada por:** @sm (River) · 2026-05-16

## Story
**Como** Marketing Chief entregando criativos a partir de benchmarks
**Eu quero** que os slides renderizados tenham layout consistente, imagens contidas e espaçamento padronizado
**Para que** a entrega final seja um post realmente publicável, não um rascunho com falhas visuais.

## Contexto
A validação visual do `*design-creative` (MKT-MEDIA-05) confirmou que a extração está correta, mas o output visual está "uma bagunça":
- Imagens IA distorcidas e sem nexo (endpoint flux grátis).
- Imagens cortadas, mal posicionadas (HOOK em `right-[-5%]`, zona visual 35% escura).
- Margens e paddings inconsistentes entre variantes (`px-16`/`px-24`/`px-32`).
- Erro `tsc` pré-existente `size=" giant"`.

## Decisão de arquitetura (@architect)
- **Fonte de imagem plugável.** Default = `brand` (background determinístico de marca, via CSS — zero distorção). Modo `ai` preservado como opt-in. Provider de banco de imagens (Unsplash/Pexels) fica para MKT-MEDIA-07.
- **Sistema de espaçamento único:** safe-zone horizontal consistente (80px) em header, conteúdo e footer.
- **Imagem é opcional em toda variante.** Sem imagem → layout de marca limpo. Com imagem → container contido, sem offset negativo, sem overflow.
- **Zonas harmônicas:** proporção e escala de texto guiadas pelo conteúdo, sem clip rígido.

## Tarefas (Checklist)
- [x] Reescrever `ModeledCarouselSlide.tsx` com sistema de espaçamento consistente.
- [x] Tornar a imagem opcional e contida em todas as variantes (fim do crop/offset negativo).
- [x] Corrigir o erro `size=" giant"` → `xl`.
- [x] Background determinístico de marca como padrão visual.
- [x] `orchestrate_carousel.py`: flag `--image-mode` (brand|ai), default `brand`.
- [x] Re-render e validação visual dos 8 slides.

## Critérios de Aceite
- [x] **AC1:** Padding horizontal idêntico em header, conteúdo e footer de todas as variantes.
- [x] **AC2:** Nenhuma imagem cortada por offset negativo ou `scale` excessivo; toda imagem fica dentro da área segura.
- [x] **AC3:** Slide renderiza coerente COM e SEM `mainObjectImage`.
- [x] **AC4:** Modo `brand` não faz chamada de IA — render rápido e sem distorção.
- [x] **AC5:** `ModeledCarouselSlide.tsx` sem novos erros `tsc`; `size=" giant"` corrigido.
- [x] **AC6:** Os 8 slides do benchmark #2 re-renderizam sem texto cortado e com blocos alinhados.

## Escopo
**IN:** `ModeledCarouselSlide.tsx`; flag `--image-mode` em `orchestrate_carousel.py`.
**OUT:** Provider de banco de imagens reais (MKT-MEDIA-07); recast de copy para Virals; saneamento dos demais erros `tsc` do app.

## Dependências
- MKT-MEDIA-05 (motor v5 + brief com `text_metrics`). ✔

## Riscos
- **R1:** Remover a zona de imagem pode deixar slides "vazios" → mitigado por geometria de marca + hierarquia tipográfica forte.

## Dev Agent Record
### File List
- `apps/creative-design/src/components/design-system/templates/ModeledCarouselSlide.tsx` (reescrito)
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` (flag `--image-mode`)

### Completion Notes
- `ModeledCarouselSlide.tsx` reescrito: safe-zone única (`px-20`), imagem opcional e contida, background determinístico de marca.
- `orchestrate_carousel.py`: flag `--image-mode` (brand|ai), default `brand` — render sem chamada de IA.
- 8 slides do benchmark #2 re-renderizados em modo `brand`: 8/8 OK, 0 falhas.

## QA Results
**Gate:** PASS · **Revisor:** @qa (Quinn) · 2026-05-16

| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | OK — espaçamento tokenizado, helpers de render isolados |
| 2 | Testes | OK — validação visual dos 8 slides renderizados |
| 3 | Critérios de aceite | OK — AC1–AC6 verificados |
| 4 | Regressões | OK — modo `ai` preservado como opt-in; brief v5 compatível |
| 5 | Performance | OK — modo `brand` sem chamadas de API |
| 6 | Segurança | OK — sem mudança de superfície |
| 7 | Documentação | OK — story e File List atualizados |

**AC verificados:** AC1 padding idêntico (header/conteúdo/footer = `px-20`) ✔ · AC2 zero crop/offset negativo ✔ · AC3 render coerente com e sem imagem ✔ · AC4 modo `brand` sem IA ✔ · AC5 `size=" giant"` corrigido, sem novos erros `tsc` ✔ · AC6 8/8 slides sem texto cortado, blocos alinhados ✔

**Observações (não bloqueantes):**
- O kicker usa o nome cru do gatilho da análise (ex.: `SCARCITY/EXCLUSIVITY (IMPLIED)`) — termo interno em inglês vazando no criativo. Polimento de conteúdo no `deep_modeler` (sub_headline), não de layout. Recomendado follow-up.
- Slides CONTENT têm metade inferior vazia (texto centralizado verticalmente) — estética minimalista aceitável; sem imagem por design no modo `brand`.

**Veredito:** PASS — Status InReview → Done.

## Change Log
- 2026-05-16 — @sm — Story criada a partir da validação visual do MKT-MEDIA-05.
- 2026-05-16 — @po — Validação 10/10 → GO. Status Draft → Ready.
- 2026-05-16 — @dev — Implementação concluída. Status Ready → InReview.
- 2026-05-16 — @qa — Gate. Status InReview → Done.
