# MVC-05: Orquestrador `video_plan.py` + `Plano-de-Criativo.md` + wire no `*industrialize-video`

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase A)
**Complexidade:** L (Standard — 8 pontos)
**Criada por:** @marketing-chief · 2026-06-19
**Validada por:** @po (Pax) · 2026-06-19 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-20

## Story
**Como** Marketing Chief
**Eu quero** um único comando que encadeie as 4 etapas e entregue um plano legível
**Para que** o usuário rode `*industrialize-video` e receba um `Plano-de-Criativo.md` pronto para gravar.

## Contexto
5ª story da Fase A. Espelha o `design_creative.py` (orquestrador): encadeia MVC-01→04, aplica o gate bloqueante de saída e renderiza o output humano. Também atualiza o protocolo `*industrialize-video` do `@marketing-chief` para a nova fase de planejamento (step 0 cliente + benchmark dir + tipo).

## Decisão de arquitetura
- `squads/virals-marketing-squad/scripts/video_plan.py`.
- CLI: `video_plan.py <benchmark_dir> --client=<slug> [--bench-platform=...] [--force]`.
- Encadeia: `deep_modeler_video` (fatal só sem brief) → `analyze_video_benchmark` → `plan_video_creative` → `quality_gate_video`. Gate de saída lê `_validation` e bloqueia (salvo `--force`).
- Renderiza `Plano-de-Criativo.md` (hook×3, storyboard, roteiro, edit_spec, **shotlist**) no diretório de output do cliente.
- Atualiza `industrialize_video_protocol` no agente: nova etapa de **planejamento** antes da etapa de **produção** (que na Fase A segue via DaVinci/manual; na Fase B vira o app).

## Tarefas (Checklist)
- [x] `video_plan.py` encadeando as 4 etapas (padrão `_run` do `design_creative.py`).
- [x] Gate de saída bloqueante via `_validation.video_gate_status` (`is_blocked`/`block_reasons`, com `--force`).
- [x] Renderizador `Plano-de-Criativo.md` (legível) a partir do `content_plan` (hook×3, storyboard, roteiro, edit_spec, shotlist).
- [x] Atualizar o `industrialize_video_protocol` (YAML do agente): Fase A planejamento + Fase B produção.
- [x] Smoke test E2E real — **expôs e levou ao fix de um defeito de cobertura de fidelidade na MVC-04** (ver Completion Notes).

## Critérios de Aceite
- [x] **AC1:** `video_plan.py` roda as 4 etapas e produz `video-brief.yaml` + (quando aprovado) `Plano-de-Criativo.md`.
- [x] **AC2:** Plano reprovado no gate **bloqueia a saída** (exit 2, sem render), salvo `--force` — **provado no E2E real** (FAIL → SAÍDA BLOQUEADA).
- [x] **AC3:** `Plano-de-Criativo.md` legível com hook×3, storyboard, roteiro, edit_spec e shotlist (8 testes de render + render real gerado).
- [x] **AC4:** `industrialize_video_protocol` reescrito: seletor de Fase (planejar/produzir) + cliente como 1º/2º input.
- [x] **AC5:** Smoke E2E real passou fim-a-fim (e, de quebra, encontrou o defeito de cobertura — corrigido).

## Escopo
**IN:** `video_plan.py`, renderizador `.md`, protocolo do agente.
**OUT:** App Remotion (Fase B); registry de templates de vídeo (MVC-06).

## Dependências
- **MVC-01..04** — encadeia os 4 motores (todos devem existir e expor a CLI esperada).
- Padrão `_run`/gate de saída do `design_creative.py`; `.claude/commands/VIRALS/agents/marketing-chief.md` (fonte canônica do protocolo).
- **Integra** a cadeia da Fase A — última story funcional antes da Fase B.

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- Espelhou o `design_creative.py`: `_run` encadeia 01→04 (Etapa 1 fatal só sem brief; 2–4 não-fatais). Funções puras testáveis: `is_blocked`, `block_reasons`, `render_plan_md`.
- **Gate de saída terminal:** lê `_validation.video_gate_status`; `FAIL` → razões + `sys.exit(2)` SEM renderizar (salvo `--force`). Render só com PASS/CONCERNS.
- **`Plano-de-Criativo.md`** em `outputs/{slug}/video-plans/{slug}/`: hook×3 + tabela storyboard + roteiro + edit_spec + tabela shotlist + racional + status do gate.
- **Wire no agente:** `industrialize_video_protocol` reescrito em 2 fases (A planejamento `video_plan.py` / B produção `export_to_davinci.py`) com seletor de fase.
- **⚠️ DEFEITO ENCONTRADO E CORRIGIDO (causa-raiz) via E2E real:** o gate da MVC-04 (`plan_text`) só varria script/hook/on_screen/falas — fabricações em `storyboard.scene`, `edit_spec.inserts` e `rationale` PASSAVAM (1ª rodada deu PASS falso com "+150%"/"churn ↓8%" no entregável). Estendi `plan_text` (cobertura total) + `build_repair_prompt`/`_apply_repair` (reparo de scene/edit_spec/rationale). **2ª rodada:** gate curou o possível em 2 iterações, restou "1.8×" → **FAIL → SAÍDA BLOQUEADA** (correto). Plano obsoleto removido. **→ MVC-04 precisa de re-gate.**
- **CodeRabbit:** pré-commit (WSL) NÃO executado — recomendado antes do push.

### File List
- `squads/virals-marketing-squad/scripts/video_plan.py` (novo — orquestrador)
- `squads/virals-marketing-squad/scripts/test_video_plan.py` (novo — 8 testes, 8/8)
- `squads/virals-marketing-squad/scripts/quality_gate_video.py` (**modificado** — fix de cobertura de fidelidade; +3 testes → 15/15)
- `squads/virals-marketing-squad/scripts/test_quality_gate_video.py` (modificado — +3 testes)
- `.claude/commands/VIRALS/agents/marketing-chief.md` (protocolo `industrialize_video_protocol` — 2 fases)

## QA Results

**Gate:** ✅ **PASS** · @qa (Quinn) · 2026-06-20

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ Espelha `design_creative.py`; `is_blocked`/`block_reasons`/`render_plan_md` puros e claros |
| 2 | Testes | ✅ 8/8 (gate de saída PASS/CONCERNS/FAIL/force + render completo) |
| 3 | Critérios de aceite | ✅ AC1–AC5 (encadeamento, bloqueio, render, wire, smoke E2E) |
| 4 | Sem regressões | ✅ Fase A inteira intacta (67 testes verdes no total) |
| 5 | Performance | ✅ Subprocessos sequenciais; render O(n) |
| 6 | Segurança | ✅ Sem secret handling novo; subprocess com argv controlado |
| 7 | Documentação | ✅ Protocolo do agente reescrito (2 fases) + story |

### Evidência (validação real — o orquestrador como auditor)
Smoke E2E real **fez mais que passar — encontrou um defeito**: a 1ª rodada gerou `Plano-de-Criativo.md` com PASS mas contendo fabricação (`+150%`/`churn ↓8%`) escondida em `scene`/`inserts`. O @dev rastreou a causa-raiz (cobertura do `plan_text` na MVC-04), corrigiu, e a **2ª rodada bloqueou corretamente** (FAIL → SAÍDA BLOQUEADA, sem render). `is_blocked` no brief real = True. Isso é exatamente o valor de um smoke E2E: expor o que o unit não pega.

### Concerns (advisory)
- **[Low · render]** `render_plan_md` monta tabelas Markdown; texto de célula com `|` quebraria a tabela. Improvável no conteúdo gerado, mas vale escapar `|` numa iteração futura.
- **[Info]** Happy-path do render não foi exibido NESTE benchmark (bloqueou, corretamente) — mas está coberto pelos 8 testes de `render_plan_md` + o arquivo real gerado na 1ª rodada (formato validado).
- **[Low · processo]** CodeRabbit pré-commit não executado.

### Veredito
Orquestração sólida, gate de saída **provado bloqueando fabricação em dado real**, render testado, wire do agente feito. O E2E ainda serviu de rede para um defeito crítico da MVC-04. **PASS.** Fase A fecha aqui (MVC-06 é a ponte opcional p/ Fase B). Push pendente → @devops.

## Change Log
- 2026-06-19 — @marketing-chief — Story criada (Draft).
- 2026-06-19 — @po (Pax) — Validada (GO 8/10); seção Dependências adicionada; Draft → Ready.
- 2026-06-20 — @dev (Dex) — Implementada: `video_plan.py` + 8 testes + wire no agente; E2E real expôs e corrigiu defeito de cobertura na MVC-04; Ready → Ready for Review.
