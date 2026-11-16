# MVC-06: `video-templates.yaml` por cliente (registry de packs hook/legenda/transição/motion)

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase A)
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @marketing-chief · 2026-06-19
**Validada por:** @po (Pax) · 2026-06-19 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-20

## Story
**Como** Marketing Chief
**Eu quero** um registry de templates de vídeo por cliente (hooks, legendas, transições, motion)
**Para que** o plano (MVC-03) recomende presets on-brand e a Fase B (app) os aplique automaticamente.

## Contexto
6ª e última story da Fase A. Espelha o `templates.yaml` dos estáticos (MKT-MC-4), mas para vídeo. Define o catálogo de presets visuais/cinéticos que conectam o plano (Frente 1) ao motor de edição (Frente 2). É a ponte entre as duas frentes.

## Decisão de arquitetura
- `squads/virals-marketing-squad/data/clients/<slug>/video-templates.yaml`.
- Seções: `hook_packs[]` (estilos de abertura: snap-zoom, whip-pan, hard-cut, texto gigante), `caption_styles[]` (word-by-word, netflix, popup — paleta do cliente), `transition_packs[]`, `motion_presets[]` (lower-third, barra de progresso, tipografia cinética), `scoring_match` (recomenda preset por `hook_type`/`bench_type`).
- Mínimo 3 opções por categoria, por cliente (Virals + Tiago Elesbão), calibrados pelo `brand-config`.
- `plan_video_creative` (MVC-03) passa a referenciar IDs deste registry no `edit_spec`.

## Tarefas (Checklist)
- [x] Schema do `video-templates.yaml` (hook_packs/caption_styles/transition_packs/motion_presets + scoring_match).
- [x] Popular Virals (navy/coral) e Tiago (preto/âmbar) — ≥3 por categoria (hook tem 4).
- [x] `scoring_match` (preset recomendado por hook_type).
- [x] MVC-03 referencia IDs do registry no `edit_spec.template_refs` (wire guardado, degrada se ausente).
- [x] Loader/CLI `video_templates.py` (`--list-video-templates --client=<slug>`) + `recommend()`.
- [x] 7 testes (carga ≥3/categoria, scoring, fallback, IDs válidos) + verificação do wire real.

## Critérios de Aceite
- [x] **AC1:** `video-templates.yaml` existe p/ Virals e Tiago, ≥3 por categoria (testado).
- [x] **AC2:** Presets referenciam paleta do cliente (`palette_ref` + cores das legendas = accent do brand-config: coral #FF3D68 / âmbar #FFB800).
- [x] **AC3:** `scoring_match` recomenda preset coerente por `hook_type` (testado: bold claim→hardcut, curiosity→whip/question).
- [x] **AC4:** `plan_video_creative` cita IDs válidos no `edit_spec.template_refs` (verificado: curiosity gap → `hook-direct-question`).
- [x] **AC5:** `--list-video-templates --client=<slug>` imprime presets por categoria (verificado).

## Escopo
**IN:** `video-templates.yaml` (×2 clientes), schema, wire no MVC-03.
**OUT:** Implementação React/Remotion dos presets (Fase B).

## Dependências
- Padrão do `templates.yaml` dos estáticos (MKT-MC-4) como referência de schema.
- `brand-config` de cada cliente (cor/tipografia).
- **Acopla com MVC-03** (wire dos IDs no `edit_spec`). Pode ser feita em paralelo a MVC-04/05. **Habilita:** Fase B (app aplica os presets).

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- **Schema** espelha o `templates.yaml` estático, mas para vídeo: `hook_packs` (pattern interrupt da abertura), `caption_styles` (word-by-word/cor), `transition_packs`, `motion_presets` + `scoring_match` (recomenda por hook_type + defaults por categoria).
- **Calibração por marca:** Virals = navy/coral, packs punchy/data (snap-zoom, coral-pop, glitch, progress-bar). Tiago = preto/âmbar, voz Hormozi/bastidor (face-snap, número-hardcut, cut-dry, founder-lower-third, big-number). Hook packs com 4 opções; demais com 3.
- **Anti-fabricação embutida:** presets de número (`hook-number-hardcut`/`motion-big-number`/`hook-data-reveal`) trazem o aviso "só com dado real da fonte" na descrição — coerente com o gate da MVC-04.
- **Loader `video_templates.py`:** `load_video_templates` (degrada p/ None se ausente), `list_for`, `recommend(hook_type)` (scoring + fallback 1º item), CLI `--list-video-templates`.
- **Wire MVC-03:** `plan_video_creative` anexa `edit_spec.template_refs` (guardado por try/except — nunca derruba o plano). Verificado: curiosity gap → `hook-direct-question`.
- **CodeRabbit:** pré-commit (WSL) NÃO executado — recomendado antes do push.

### File List
- `squads/virals-marketing-squad/data/clients/virals/video-templates.yaml` (novo)
- `squads/virals-marketing-squad/data/clients/tiago-elesbao/video-templates.yaml` (novo)
- `squads/virals-marketing-squad/scripts/video_templates.py` (novo — loader/CLI/recommend)
- `squads/virals-marketing-squad/scripts/test_video_templates.py` (novo — 7 testes, 7/7)
- `squads/virals-marketing-squad/scripts/plan_video_creative.py` (modificado — wire `template_refs`)

## QA Results

**Gate:** ✅ **PASS** · @qa (Quinn) · 2026-06-20 — **fecha a Fase A.**

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ Loader limpo (`load`/`list_for`/`recommend`); wire no MVC-03 guardado por try/except |
| 2 | Testes | ✅ 7/7 (carga ≥3/categoria, scoring, fallback, IDs válidos) + wire verificado + regressão |
| 3 | Critérios de aceite | ✅ AC1–AC5 |
| 4 | Sem regressões | ✅ MVC-03 (com wire) 7/7; Fase A inteira verde (74 testes) |
| 5 | Performance | ✅ Leitura YAML O(n) |
| 6 | Segurança | ✅ Só leitura de YAML; sem `eval`/rede/segredos |
| 7 | Documentação | ✅ Schema comentado nos 2 YAMLs + CLI |

### Verificações de integridade (Guardian)
- **`scoring_match` sem IDs órfãos** em ambos os clientes (todo ID recomendado existe no registry).
- **Registry do Tiago respeita o léxico-tabu** da brand-identity (sem "segredo"/"dica"/"mentoria"/...). Calibração de marca correta.
- **Coerência com o gate de fidelidade:** presets de número (`number-hardcut`/`big-number`/`data-reveal`) avisam "só com dado real" — alinhado à MVC-04.

### Concerns (advisory)
- **[Low · UX]** `template_refs` é gravado no brief mas **não é exibido** no `Plano-de-Criativo.md` (render da MVC-05). Hoje serve à Fase B (app); surfaceá-lo no .md ajudaria o usuário a ver os packs recomendados. Melhoria futura, não bloqueia.
- **[Info]** Presets são metadados declarativos; a implementação React/Remotion é escopo da Fase B (MVC-09).
- **[Low · processo]** CodeRabbit pré-commit não executado.

### Veredito
Registry sólido, calibrado por marca, com integridade referencial e alinhado ao gate de fidelidade. **PASS — Fase A do EPIC-MKT-Video-Creative está COMPLETA e auditada (MVC-01..06).** Push pendente → @devops.

## Change Log
- 2026-06-19 — @marketing-chief — Story criada (Draft).
- 2026-06-19 — @po (Pax) — Validada (GO 8/10); seção Dependências adicionada; Draft → Ready.
- 2026-06-20 — @dev (Dex) — Implementada: 2 `video-templates.yaml` + `video_templates.py` (loader/CLI) + wire no MVC-03; 7 testes; Ready → Ready for Review.
