# EPIC-MKT-Creative-AIOX-Alignment — Migração do Motor de Criativos ao Padrão AIOX

**Status:** Executado · 2026-05-19 (todas as 6 stories Done)
**Autor:** @marketing-chief + @architect

## Problema
O motor `*design-creative` funciona ponta a ponta, mas seus artefatos **não respeitam
a convenção AIOX do squad**:
- Os 6 scripts do motor vivem em `scripts/modeling/` na **raiz do repositório** — fora
  de `squads/virals-marketing-squad/`.
- O pipeline é **apenas código** — não há `tasks/`, `workflows/` nem `checklists/`
  formais (.md/.yaml) descrevendo o fluxo, embora o squad tenha essas pastas.
- A `IDE-FILE-RESOLUTION` do agente espera `squads/virals-marketing-squad/{type}/{name}`
  — hoje os scripts do motor não resolvem por esse caminho.

## Objetivo
Migrar todo o motor de criativos para o padrão AIOX **dentro do squad**
`squads/virals-marketing-squad/` — tasks, workflows, scripts, checklists, templates,
tools, services — sem quebrar o pipeline.

## Princípios da migração
1. **Pipeline funcional ao fim de cada story** — nada de big-bang.
2. **Task-first** — workflows compostos de tasks; cada task com inputs/outputs/condições.
3. **Sem reescrita de lógica** — é migração de estrutura, não refatoração de motor.
4. Respeitar o boundary L1-L4 e as deny/allow rules de `.claude/settings.json`.

## Inventário — estado atual → destino AIOX

| Artefato (hoje) | Destino AIOX |
|---|---|
| `scripts/modeling/{deep_modeler,analyze_benchmark,plan_creative,recast_engine,quality_gate,design_creative}.py` | `squads/virals-marketing-squad/scripts/` |
| Fluxo `*design-creative` (6 etapas) | `workflows/design-creative.workflow.md` |
| As 6 etapas (modelagem→render) | `tasks/*.md` (uma task por etapa) |
| Quality Gate C1-C7 (em código) | `checklists/creative-quality-checklist.md` |
| Templates React (ModeledCarouselSlide, QuoteSlide, SinglePostSlide) | `templates/` (referência; código fica em `apps/creative-design`) |
| `tools/` (pexels_service, vvs_render_service, casey_*) | `tools/` (já no squad — normalizar/documentar) |
| App `apps/creative-design` (Editor + render service) | Service externo — registrar em `services/` / `squad.yaml` |
| briefs, `virals-brand-identity.yaml`, `casey-brand-config.yaml` | `data/` (já no squad) |

## Stories

| Story | Entrega |
|---|---|
| **AIOX-01** | Migração dos scripts do motor para `squads/.../scripts/` (imports e paths) |
| **AIOX-02** | Workflow formal `design-creative.workflow.md` |
| **AIOX-03** | Tasks formais das 6 etapas (`tasks/*.md`) |
| **AIOX-04** | Checklists formais — Quality Gate C1-C7 como checklist AIOX |
| **AIOX-05** | Templates, tools & services normalizados no padrão do squad |
| **AIOX-06** | Atualização de referências (agente, `_PIPELINE.md`, `squad.yaml`, `CLAUDE.md`, boundary rules) |

## Riscos
- **R1:** Imports cruzados — `recast_engine`/`analyze_benchmark`/`plan_creative`/`quality_gate`
  importam `deep_modeler`/`recast_engine` via `sys.path`. Mover exige reapontar.
- **R2:** Paths fixos — o protocolo do agente e o `_PIPELINE.md` citam `scripts/modeling/...`.
- **R3:** deny/allow rules de `.claude/settings.json` podem afetar a escrita nos novos paths.

## Dependências
- Pipeline `*design-creative` completo e validado (EPIC-MKT-Creative-Intelligence,
  EPIC-MKT-Creative-Editor, MKT-MEDIA-05..12). ✔

## Estimativa
6 stories · epic de porte M-L · sem risco de produto (migração estrutural).
