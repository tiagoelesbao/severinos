# MKT-MEDIA-09: Pipeline Unificado `*design-creative`

**Status:** Done
**Epic:** EPIC-MKT-Media-Production
**Complexidade:** S (Small — 3 pontos)
**Criada por:** @sm (River) · 2026-05-16

## Story
**Como** Marketing Chief
**Eu quero** rodar o `*design-creative` num comando só
**Para que** modelagem, recast e render aconteçam encadeados, sem 3 execuções manuais.

## Contexto
O pipeline exige hoje 3 comandos: `deep_modeler` → `recast_engine` → `orchestrate_carousel`. Unificar num orquestrador único.

## Decisão de arquitetura
- `scripts/modeling/design_creative.py` encadeia os 3 motores via subprocess.
- **Recast não-fatal:** se o LLM cair, o pipeline segue com o brief modelado (recast pendente é sinalizado pelo orquestrador).
- Modelagem e render são fatais (falha aborta).
- Validado para `carousel`; `single` é best-effort.

## Tarefas (Checklist)
- [x] `design_creative.py` — encadeia deep_modeler → recast_engine → orchestrate.
- [x] Recast como etapa não-fatal (degradação graciosa).
- [x] Flag `--image-mode` repassada ao render.
- [x] Teste real no benchmark #2.

## Critérios de Aceite
- [x] **AC1:** Um comando executa as 3 etapas em sequência.
- [x] **AC2:** Falha de modelagem ou render aborta com exit code real.
- [x] **AC3:** Falha de recast NÃO aborta — segue com brief modelado e avisa.
- [x] **AC4:** `--image-mode` é repassada ao orquestrador.

## Escopo
**IN:** `scripts/modeling/design_creative.py`.
**OUT:** Atualização do protocolo do agente `@marketing-chief` (doc); pipeline de `single`.

## Dev Agent Record
### File List
- `scripts/modeling/design_creative.py` (novo)

## QA Results
**Gate:** PASS · @qa · 2026-05-16 — AC1–AC4 verificados via run real no benchmark #2.

## Change Log
- 2026-05-16 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
