# MVC-11: Export & render final (mp4) + persistência; DaVinci como target opcional

**Status:** Ready
**Epic:** EPIC-MKT-Video-Creative (Fase B)
**Complexidade:** L (Standard — 8 pontos)
**Criada por:** @sm (River) · 2026-06-21
**Validada por:** @po (Pax) · 2026-06-21 — GO (9/10)

## Story
**Como** Marketing Chief
**Eu quero** exportar o criativo editado como mp4 final e salvar o projeto
**Para que** eu publique o vídeo direto do nosso app — fechando o ciclo end-to-end sem depender do DaVinci.

## Contexto
5ª e última story da Fase B — fecha o EPIC. Transforma o estado editado (MVC-10) em entregável publicável e persiste o projeto. Cumpre a promessa da epic: `export_to_davinci.py` deixa de ser o destino final e vira **target opcional**.

## Decisão de arquitetura
- **Render final:** `npx remotion render` (headless local) da composição com o timeline editado → mp4 1080×1920 em `outputs/<slug>/video-renders/<creative>/`. Opção futura Lambda/Cloud Run documentada.
- **Persistência:** salva o timeline JSON editado (`outputs/<slug>/video-projects/<creative>.json`) — reabrível no `/studio` (espelha "salvar brief" do `creative-design`).
- **Export target opcional:** botão "Exportar p/ DaVinci" reusa `export_to_davinci.py` (FCPXML) a partir do mesmo timeline — convivência, não substituição.
- API `/api/export` (render) + `/api/projects` (save/load).
- **Validação E2E:** renderizar o criativo Chase Chappell completo (6 clips + narração + FX) → mp4 publicável.

## Tarefas (Checklist)
- [ ] `/api/export` dispara `remotion render` → mp4 em `outputs/<slug>/video-renders/`.
- [ ] Botão "Renderizar mp4" no `/studio` + status/progresso.
- [ ] Persistência: salvar/carregar timeline JSON do projeto.
- [ ] Export target opcional p/ DaVinci (FCPXML via `export_to_davinci.py`).
- [ ] Render E2E do criativo Chase Chappell → mp4 válido.
- [ ] Atualizar `industrialize_video_protocol` (Fase B = app, DaVinci opcional).

## Critérios de Aceite
- [ ] **AC1:** `/studio` exporta o criativo editado como mp4 (verificável via ffprobe) em `outputs/<slug>/video-renders/`.
- [ ] **AC2:** Projeto editado salva e reabre no `/studio` preservando o estado.
- [ ] **AC3:** Export opcional p/ DaVinci gera FCPXML a partir do mesmo timeline.
- [ ] **AC4:** Render E2E do Chase Chappell produz um mp4 publicável (1080×1920, com narração + legendas + FX).
- [ ] **AC5:** `industrialize_video_protocol` reflete a Fase B (app como destino; DaVinci opcional).

## Escopo
**IN:** render mp4, persistência de projeto, export DaVinci opcional, wire final.
**OUT:** render em nuvem (Lambda/Cloud Run) — documentado como follow-up, não implementado.

## Dependências
- **MVC-10** (estado editado) + **MVC-07..09** (composição/timeline/FX).
- `export_to_davinci.py` (target opcional — já rastreado/existente).
- Fecha o EPIC-MKT-Video-Creative.

## Riscos (PO)
- **[Médio] Tempo/recurso do render headless:** `remotion render` com vídeos reais + legendas pode ser lento/pesado localmente. **Mitigação:** validar tempo no caso Chase Chappell (~38s de vídeo); se inviável local, o follow-up Lambda/Cloud Run (já fora de escopo) é o plano B documentado.
- **[Baixo] Wire do `industrialize_video_protocol`:** AC5 toca a fonte canônica do agente (`marketing-chief.md`) — mudança de doc, sem risco de código, mas precisa manter as 2 fases coerentes.

## Dev Agent Record
### File List
- `apps/video-studio/src/app/api/export/route.ts` (novo)

## QA Results
_(pendente)_

## Change Log
- 2026-06-21 — @sm (River) — Story criada (Draft).
- 2026-06-21 — @po (Pax) — Validada (GO 9/10); Riscos (perf do render, wire do protocolo); Draft → Ready.
