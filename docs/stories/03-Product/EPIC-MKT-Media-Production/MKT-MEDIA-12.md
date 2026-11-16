# MKT-MEDIA-12: Seletor Manual de Template

**Status:** Done
**Epic:** EPIC-MKT-Media-Production
**Complexidade:** S (Small — 3 pontos)
**Criada por:** @sm (River) · 2026-05-17

## Story
**Como** Marketing Chief
**Eu quero** escolher manualmente o template do criativo ao iniciar o `*design-creative`
**Para que** eu não dependa só do classificador automático.

## Contexto
O MKT-MEDIA-11 entregou 3 templates com classificação automática. O dono pediu controle manual: um seletor no início do fluxo.

## Decisão de arquitetura
- `orchestrate_carousel.py` aceita `--template=` que sobrepõe o arquétipo classificado.
- `design_creative.py` repassa `--template=`.
- O protocolo `*design-creative` do `@marketing-chief` apresenta o seletor (AskUserQuestion) e mapeia a opção amigável → `templateId`.

## Tarefas (Checklist)
- [x] `orchestrate_carousel`: arg `--template=` (override).
- [x] `design_creative`: repassa `--template=`.
- [x] Protocolo `design_creative_protocol` do agente: seletor de template.
- [x] Smoke test do override.

## Critérios de Aceite
- [x] **AC1:** `--template=` sobrepõe o template escolhido pelo classificador.
- [x] **AC2:** Sem `--template`, o classificador automático continua valendo.
- [x] **AC3:** Protocolo do agente apresenta o seletor de template no passo 1.

## Mapa opção → template
| Opção do usuário | templateId |
|---|---|
| Carrossel de notícia | carousel-slide |
| Carrossel de conteúdo | carousel-slide |
| Carrossel aspiracional | quote-slide |
| Post único de insight | single-post |
| Post único inspiracional | quote-slide |
| Automático (classificador) | (sem override) |

## Dev Agent Record
### File List
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py`
- `scripts/modeling/design_creative.py`
- `.claude/commands/VIRALS/agents/marketing-chief.md`

## QA Results
**Gate:** PASS · @qa · 2026-05-17 — AC1–AC3 verificados.

## Change Log
- 2026-05-17 — @sm/@po/@dev/@qa — Story criada, implementada e validada.
