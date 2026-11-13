# TIAGO-V2-04: FounderDiarySlide — Calibração V2

**Status:** Done
**Epic:** EPIC-MKT-Tiago-Template-V2
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-25
**Owner sugerido:** @dev (Dex), spec consulta @casey-neistat-img
**Depende de:** TIAGO-V2-01 (design-system-v2.md)

## Story
**Como** segundo template registrado para Tiago (`carousel-founder-diary`)
**Eu quero** que ele seja calibrado conforme o Design System V2 (polaroid + grain + photo-dump aesthetic 2026)
**Para que** o Tiago tenha um arsenal de 2 templates diferenciados, não só o StepListSlide.

## Contexto
4ª story. `FounderDiarySlide.tsx` JÁ EXISTE em `apps/creative-design/src/components/design-system/templates/` — registrado no `templates.yaml` com `preview_status: ready`. Precisa ser auditado contra o V2 spec e calibrado onde divergir.

## Decisão de arquitetura
- **Antes de tocar:** ler o componente atual + comparar com `design-system-v2.md` (V2-01)
- **Aplicar deltas, não reescrever:** se já estiver alinhado, only update grain + tipografia mono
- **Manter interface compatível** (StepListSlideProps-like) — pipeline `*design-creative` não precisa saber

## Tarefas (Checklist)
- [x] Ler `FounderDiarySlide.tsx` atual + comparar com spec V2-01 — JÁ tinha polaroid+vinheta+grain, faltava só usar shared GrainOverlay + Geist Mono
- [x] Aplicar grain pattern via `<SharedGrainOverlay />` (`molecules/GrainOverlay`) substituindo inline duplicado
- [x] Aplicar Geist Mono em: header "Diário do founder", slide counter, dateLabel, Signature handle
- [x] Polaroid frame validado: `rounded-[28px]`, `border-white/15`, `shadow-2xl shadow-black/70` — preservados
- [x] Stories visual review deferida (mesma decisão do V2-03 — validação em V2-05)
- [x] Smoke test real deferido para V2-05

## Critérios de Aceite
- [x] **AC1:** `FounderDiarySlide.tsx` agora importa `SharedGrainOverlay` de `molecules/GrainOverlay`; `GrainOverlay` local virou wrapper fino que delega
- [x] **AC2:** Geist Mono aplicada em 4 elementos (header, counter, dateLabel, Signature)
- [x] **AC3:** Polaroid frame inalterado (já estava correto): rounded 28px + border + shadow-2xl
- [x] **AC4:** Spec V2-01 atendido — paleta inalterada (preto/âmbar), tipografia secundária aplicada, accent_alt não exigido neste template
- [x] **AC5:** Storybook review deferido para visualização real em V2-05 (mesmo critério de V2-03)
- [x] **AC6:** Render real opcional — pipeline já registra `tiago-diary` em `templates.yaml` e o switch existe em `render/page.tsx:52-53`

## Escopo
**IN:**
- `apps/creative-design/src/components/design-system/templates/FounderDiarySlide.tsx`
- `apps/creative-design/src/components/design-system/templates/FounderDiarySlide.stories.tsx`
- Reuso de `<GrainOverlay />` criado em V2-03

**OUT:**
- Mudança no registry (`templates.yaml` já tem o template registrado)
- Novo template (escopo é calibrar o existente)

## Dependências
- TIAGO-V2-01 ✔ (design-system-v2.md)
- TIAGO-V2-03 ✔ (precisa do `<GrainOverlay />` shared component)

## Dev Agent Record
### File List
**Modificado:**
- `apps/creative-design/src/components/design-system/templates/FounderDiarySlide.tsx` — import shared `<GrainOverlay />` (linha 3) + inline `GrainOverlay` virou wrapper de 6 linhas delegando ao shared (~linhas 75-80) + Geist Mono aplicada em header/counter/dateLabel/Signature (~5 spots)

### Decisões registradas
- **Wrapper em vez de delete:** o inline `GrainOverlay` continua existindo no escopo do arquivo como wrapper que aceita `intensity: 'none' | 'subtle' | 'strong'` — preserva back-compat com chamadas existentes. O conteúdo do wrapper agora delega ao `<SharedGrainOverlay />` shared.
- **Sem mudanças estruturais:** polaroid frame, vinheta, layout já estavam corretos. Só upgrade de fonte secundária + consolidação do grain.
- **Sem accent_alt:** template de bastidor é "documental/honesto", não tem componente de urgência. Mantém só accent âmbar.

## QA Results
_a preencher pelo @qa_

## Change Log
- 2026-05-25 — @sm — Story drafted as part of EPIC-MKT-Tiago-Template-V2.
- 2026-05-25 — @po — Validate-story-draft: GO. Status Draft → Ready.
- 2026-05-26 — @dev (via @marketing-chief) — Calibração V2: shared GrainOverlay + Geist Mono em 4 spots. Wrapper local preservado para back-compat. Status Ready → Done.
