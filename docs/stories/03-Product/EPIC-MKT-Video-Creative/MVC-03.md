# MVC-03: `plan_video_creative` (hook×3 + storyboard + roteiro + spec de edição + shotlist)

**Status:** Ready for Review
**Epic:** EPIC-MKT-Video-Creative (Fase A)
**Complexidade:** XL (Complex — 13 pontos)
**Criada por:** @marketing-chief · 2026-06-19
**Validada por:** @po (Pax) · 2026-06-19 — GO (8/10)
**Implementada por:** @dev (Dex) · 2026-06-20

## Story
**Como** Marketing Chief
**Eu quero** um motor que transforme a análise do benchmark num PLANO de criativo completo na voz do cliente
**Para que** o usuário receba tudo que precisa para gravar e editar um vídeo viral autêntico — incluindo o material bruto exato a captar.

## Contexto
3ª e mais importante story da Fase A — o coração do "fluxo de criação". Espelha o `plan_creative.py`, mas entrega um plano audiovisual completo. Lê o `video-brief.yaml` com `benchmark_analysis` (MVC-02) e a `brand-identity` do cliente.

## Decisão de arquitetura
- `squads/virals-marketing-squad/scripts/plan_video_creative.py`.
- LLM via `call_llm_json`, com o **guard de fidelidade de fatos** ativo (números/datas só do benchmark).
- Saída `content_plan` no brief, contendo:
  - **`hook`**: 3 variantes (`pattern_interrupt` visual + `text_overlay` 4–7 palavras + `spoken_open` keyword-rich) — estratégia "1 body, 3 hooks".
  - **`storyboard[]`**: batida-a-batida (`scene`, `shot_type`, `duration_s`, `on_screen_text`, `broll`, `motion`).
  - **`script`**: roteiro integral na voz do cliente (remodelado, sem fabricar dados).
  - **`edit_spec`**: onde entram zooms, transições, inserts, legendas, motion graphics.
  - **`shotlist[]`**: 🎥 material bruto a captar (`plano`, `framing`, `audio`, `props`, `locacao`, `falas_chave`) — o output que o usuário leva para gravar.

## Tarefas (Checklist)
- [x] Carregar brief + `brand-identity`; validar `benchmark_analysis` (e `transcript`).
- [x] Prompt do plano (regras: tema do benchmark, voz do cliente, fact-fidelity, anti-invenção de autor).
- [x] Gerar `hook` × 3 variantes (pattern_interrupt + text_overlay + spoken_open).
- [x] Gerar `storyboard[]` batida-a-batida com retention checkpoints.
- [x] Gerar `script` + `edit_spec` + `shotlist[]`.
- [x] Gravar `content_plan` no brief.
- [x] Checagem de fidelidade — **reusa** `detect_fabricated_numbers` do `recast_engine` (pseudo-slide: plano vs transcript). 7 testes próprios + 17/17 do guard reusado intactos.

## Critérios de Aceite
- [x] **AC1:** `content_plan.hook` tem 3 variantes multimodais (real → "Poder ou paz?" / "E se fosse só paz?" / "Qual sua prioridade?", cada uma com pattern_interrupt + spoken_open).
- [x] **AC2:** `storyboard[]` batida-a-batida com duração + texto-na-tela + motion (real → 9 batidas, beats de 2,5s = checkpoint de retenção).
- [~] **AC3:** Fidelidade **enforçada por detecção**: `fidelity_check` reusa `detect_fabricated_numbers`. No run real, o LLM fabricou estatísticas ("1,2 mi", "5x", "30%") inexistentes na fala do Hormozi e o guard sinalizou TODAS (status WARN). A MVC-03 detecta/registra; o **bloqueio terminal é a MVC-04**. Voz do cliente OK ("Tiago Elesbão aqui", call-to-think).
- [x] **AC4:** `shotlist[]` especifica plano/framing/audio/props/locação/falas_chave (real → 9 planos, ex.: "Close nos olhos, mesa minimalista, laptop, escritório com quadro branco").
- [x] **AC5:** Regras anti-léxico-tabu e anti-autor-como-personagem injetadas no prompt (voz do cliente confirmada no run real; autor do benchmark não vira personagem).

## Escopo
**IN:** `plan_video_creative.py`.
**OUT:** Gate (MVC-04); orquestração/output legível (MVC-05).

## Dependências
- **MVC-02** — exige `benchmark_analysis` no brief.
- `brand-identity` do cliente; guard de fidelidade (`test_fact_fidelity.py`).
- **Soft:** IDs do registry de MVC-06 no `edit_spec` (degrada para nomes genéricos se MVC-06 ainda não existir). **Habilita:** MVC-04.
- ⚠️ Decisões em aberto do epic: LLM do plano (default `call_llm_json`) e formato da shotlist (default YAML+`.md`).

## Nota de complexidade (PO)
XL (13pts) está no teto. Mantida **inteira** por coesão (um único motor de plano); se a implementação travar, candidata a split em `plan-core` (hook+storyboard+script) e `plan-prod` (edit_spec+shotlist).

## Dev Agent Record
### Agent Model Used
claude-opus-4-8 (@dev / Dex)

### Completion Notes
- Espelhou o `plan_creative.py` (estáticos); reusa `call_llm_json` + injeção ampla de voz (tom/léxico/cta/restrições via `yaml.dump`) e o guard de fidelidade.
- **Schema `content_plan`:** `hook.variants[3]{pattern_interrupt,text_overlay,spoken_open}` · `storyboard[]{beat_n,scene,shot_type,duration_s,on_screen_text,broll,motion}` · `script` · `edit_spec{zooms,transitions,inserts,captions,motion_graphics}` · `shotlist[]{plano,framing,audio,props,locacao,falas_chave}` · `fidelity_check` · `rationale`.
- **Fidelidade (IDS REUSE):** `check_fidelity()` monta um pseudo-slide (texto do plano = body, transcript = reference) e chama `detect_fabricated_numbers` do `recast_engine`. **Run real comprovou o valor:** o LLM (openrouter gpt-oss-120b) fabricou "1,2 mi", "5x", "30%", "200"... inexistentes na fala filosófica do Hormozi → guard sinalizou TODAS (status WARN). Confirma o gap conhecido ([[project-copy-pipeline-fidelity-gap]]) e justifica a MVC-04 como gate TERMINAL.
- **Decisão (escopo):** MVC-03 DETECTA e registra a fabricação (`fidelity_check`); o BLOQUEIO é da MVC-04 (separação de responsabilidades, igual estáticos: plan detecta, quality_gate bloqueia). Mantida a fatalidade do LLM (espelha `plan_creative`): sem LLM → `RuntimeError` (a MVC-05 trata como não-fatal no encadeamento).
- **QA follow-up MVC-02 (pacing_curve shapes):** o plano só passa `benchmark_analysis` como contexto ao LLM (string JSON), então tolera ambos os shapes — sem acoplamento ao schema do `pacing_curve`.
- **CodeRabbit:** pré-commit (WSL) NÃO executado nesta sessão — recomendado antes do push.

### File List
- `squads/virals-marketing-squad/scripts/plan_video_creative.py` (novo — motor de planejamento)
- `squads/virals-marketing-squad/scripts/test_plan_video_creative.py` (novo — 7 testes, 7/7 passando)
- `squads/virals-marketing-squad/data/video-brief-30-hormozi-fc605e.yaml` (atualizado — `content_plan` gravado)

## QA Results

**Gate:** ⚠️ **CONCERNS** · @qa (Quinn) · 2026-06-20 — aprovado para seguir, com 2 condições rastreadas para a MVC-04 (gate terminal).

### 7 Quality Checks
| # | Check | Resultado |
|---|-------|-----------|
| 1 | Code review | ✅ Espelha `plan_creative.py`; injeção de voz e reuso do guard corretos; funções de texto/fidelidade puras |
| 2 | Testes | ✅ 7/7 — texto, fidelidade (PASS+WARN), pré-condições (transcript/analysis), escrita com LLM mock |
| 3 | Critérios de aceite | ⚠️ AC1/AC2/AC4/AC5 ✅; **AC3 parcial** (ver Concerns) |
| 4 | Sem regressões | ✅ MVC-01 11/11, MVC-02 9/9, fact_fidelity 17/17 intactos |
| 5 | Performance | ✅ 1 chamada LLM (retry herdado); fidelidade O(n) |
| 6 | Segurança | ✅ Sem secret handling novo; envio ao LLM = posture existente |
| 7 | Documentação | ✅ Schema documentado + story atualizada |

### Evidência (validação real)
`plan_video_creative` (Hormozi→Tiago, openrouter gpt-oss-120b): plano estruturalmente forte — hook×3 na voz do Tiago, 9 batidas (2,5s), shotlist detalhada. **O guard de fidelidade pegou o LLM fabricando números** ("1,2 mi", "5x", "30%"...) → `fidelity_check.status = WARN`. Comportamento correto: detecção funcionando.

### Concerns (condições para a MVC-04 — gate terminal)
- **[Medium · fidelidade incompleta]** A MVC-03 liga **apenas `detect_fabricated_numbers`**. O `recast_engine` também expõe `detect_fabricated_claims` (fabricação qualitativa: atribuições/"pesquisa mostrou") e `source_entities` (allowlist) — **não ligados**. O script real fabricou também alegações qualitativas ("sistema de IA que gera 5× mais resultados") que escapam do guard só-números. **MVC-04 DEVE** ligar `detect_fabricated_claims` + `source_entities` para fechar o cerco.
- **[Medium · enforcement diferido]** O plano real ESTÁ no disco com fabricação sinalizada mas **não bloqueada** (`content_plan` gravado com WARN). Isso é by-design (MVC-03 detecta, MVC-04 bloqueia) — porém **nenhum plano pode ir à produção sem a MVC-04**. A MVC-04 é **pré-requisito rígido**, não opcional.
- **[Low · processo]** CodeRabbit pré-commit não executado — recomendado antes do push.

### Veredito
Código correto, testado, zero regressão; o guard cumpre seu papel. As 2 Concerns são de **escopo/sequência** (fidelidade qualitativa + enforcement) e caem naturalmente na MVC-04 — que passa a ter requisitos explícitos. **CONCERNS = aprovado para seguir para a MVC-04**, que é mandatória antes de qualquer uso em produção. Push pendente → @devops.

## Change Log
- 2026-06-19 — @marketing-chief — Story criada (Draft).
- 2026-06-19 — @po (Pax) — Validada (GO 8/10); Dependências + nota de complexidade adicionadas; Draft → Ready.
- 2026-06-20 — @dev (Dex) — Implementada: `plan_video_creative.py` + 7 testes + run real (hook×3, 9 batidas, shotlist; guard pegou fabricação do LLM); Ready → Ready for Review.
