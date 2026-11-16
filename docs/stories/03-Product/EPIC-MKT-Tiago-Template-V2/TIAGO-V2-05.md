# TIAGO-V2-05: Audit Cruzado + Re-render Comparativo V1 vs V2

**Status:** Ready
**Epic:** EPIC-MKT-Tiago-Template-V2
**Complexidade:** S (Small — 3 pontos)
**Criada por:** @sm (River) · 2026-05-25
**Owner sugerido:** @marketing-chief (validação final)
**Depende de:** TIAGO-V2-02, TIAGO-V2-03, TIAGO-V2-04

## Story
**Como** dono do projeto Virals
**Eu quero** ver o mesmo benchmark (`14-pablomarcal1-e129b8`) re-renderizado com a stack V2 (template V2 + voz reforçada) lado-a-lado com V1
**Para que** a evolução seja visualmente óbvia e mensurável.

## Contexto
5ª story (fechamento do epic). Consome todas as outras. Valida via 2 mecanismos:
1. **Subjetivo:** comparativo lado-a-lado V1 vs V2 mostrado ao dono
2. **Objetivo:** audit-benchmark dos 2 outputs com painel multi-agente + dimensões visuais novas

## Decisão de arquitetura
- **Audit-config update:** adicionar dimensões visuais novas no `audit-config.yaml` de Tiago:
  - `visual_richness` (1-10): grain, hierarquia, acentos secundários presentes
  - `voice_fit` (1-10): NÚMERO + BASTIDOR + ausência de clichê
  - `cta_quality` (1-10): call-to-think > comente X
- **Re-render:** rodar `*design-creative` no `14-pablomarcal1` com pipeline V2 completo
- **Comparativo:** copiar os 4 PNGs V1 e V2 lado-a-lado em pasta nova `_comparativo-v1-vs-v2/`
- **Audit:** rodar `*audit-benchmark` nos 2 outputs (V1 e V2) — comparar scores

## Tarefas (Checklist)
- [ ] Atualizar `squads/virals-marketing-squad/data/clients/tiago-elesbao/audit-config.yaml` com 3 dimensões novas
- [ ] Re-rodar `*design-creative` no `14-pablomarcal1` com pipeline V2 (todos os fixes ativos)
- [ ] Criar pasta `outputs/tiago-elesbao/carousels/_comparativo-v1-vs-v2/` com PNGs lado-a-lado
- [ ] Rodar `*audit-benchmark` separadamente em V1 (já existe) e V2
- [ ] Documento `_RELATORIO-V2.md` no epic dir com:
  - Comparativo de scores
  - Screenshots lado-a-lado dos 4 slides
  - Nota subjetiva do dono
- [ ] Mostrar ao dono e obter aprovação para fechar o epic

## Critérios de Aceite
- [ ] **AC1:** `audit-config.yaml` de Tiago tem ≥ 3 dimensões novas (visual_richness, voice_fit, cta_quality)
- [ ] **AC2:** Re-render do `14-pablomarcal1` com V2 produz 4 PNGs em `outputs/tiago-elesbao/carousels/.../tiago-step__{YYYYMMDDTHHMMSS}/`
- [ ] **AC3:** Pasta comparativa criada com PNGs side-by-side
- [ ] **AC4:** Audit dos 2 outputs com scores documentados em JSON
- [ ] **AC5:** `_RELATORIO-V2.md` existe no dir do epic com 3 seções (visual, voz, scores)
- [ ] **AC6:** Score V2 > Score V1 em pelo menos 2 das 3 dimensões novas
- [ ] **AC7:** Aprovação explícita do dono em mensagem (registrar no Change Log)

## Escopo
**IN:**
- `squads/virals-marketing-squad/data/clients/tiago-elesbao/audit-config.yaml`
- `outputs/tiago-elesbao/carousels/_comparativo-v1-vs-v2/`
- `docs/stories/03-Product/EPIC-MKT-Tiago-Template-V2/_RELATORIO-V2.md`

**OUT:**
- Mudanças no pipeline (já feitas em V2-02/V2-03/V2-04)
- Mudanças no template (já feitas em V2-03/V2-04)

## Dependências
- TIAGO-V2-02 ✔ (voz reforçada — produz slide 4 sem "Comente 'SAI'")
- TIAGO-V2-03 ✔ (StepListSlide V2)
- TIAGO-V2-04 ✔ (opcional para audit, mas evidencia o arsenal)
- Render service no ar

## Dev Agent Record
### File List
_a preencher pelo @marketing-chief_

## QA Results
_a preencher pelo @qa_

## Change Log
- 2026-05-25 — @sm — Story drafted as part of EPIC-MKT-Tiago-Template-V2.
- 2026-05-25 — @po — Validate-story-draft: GO. Status Draft → Ready.
