# MCI-03: Checklists de Produção + Loop Self-Healing

**Status:** Done
**Epic:** EPIC-MKT-Creative-Intelligence
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** pipeline `*design-creative`
**Eu quero** validar cada slide produzido contra checklists de qualidade e auto-corrigir
**Para que** nenhuma peça fraca chegue ao render — sem bloqueio manual.

## Contexto
Última story do EPIC-MKT-Creative-Intelligence. MCI-04 integrou o cérebro; falta a camada de qualidade. Decisão do dono: checklist reprovado **corrige sozinho e revalida em loop até passar**.

## Decisão de arquitetura
- Novo `scripts/modeling/quality_gate.py`.
- Roda entre o recast e o render. Avalia o `content_data` produzido contra o checklist via LLM.
- **Loop self-healing:** cada iteração avalia + entrega correções; aplica e revalida; repete até todos aprovados ou atingir `MAX_ITERATIONS` (3).
- Sem bloqueio manual: ao atingir o limite, renderiza com a melhor versão e registra `quality_gate.status = WARN_MAX_ITER`.
- Checklist: PT-BR, sem @handle de terceiros, dentro do tema central, voz Virals, headline não-placeholder, comprimento adequado.

## Tarefas (Checklist)
- [x] `quality_gate.py`: checklist + loop self-healing.
- [x] Aplica correções ao `content_data` e revalida.
- [x] Limite de iterações (anti-loop-infinito).
- [x] `design_creative`: encadeia o quality gate (6 etapas).
- [x] Teste real no #03.

## Critérios de Aceite
- [x] **AC1:** Avalia cada slide contra o checklist e registra `brief["quality_gate"]`.
- [x] **AC2:** Slide reprovado é corrigido automaticamente e revalidado.
- [x] **AC3:** Loop respeita o limite de iterações (não trava).
- [x] **AC4:** Convergindo, `status = PASS`; no limite, `WARN_MAX_ITER` (render segue).
- [x] **AC5:** Pipeline `*design-creative` roda 6 etapas com o gate antes do render.

## Escopo
**IN:** `scripts/modeling/quality_gate.py`, `design_creative.py`.
**OUT:** Checklists de composição visual (dependeriam de visão computacional).

## Dev Agent Record
### File List
- `scripts/modeling/quality_gate.py` (novo)
- `scripts/modeling/design_creative.py`

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC5 verificados via pipeline real do #03.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada. **Fecha o EPIC-MKT-Creative-Intelligence.**
