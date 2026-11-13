# EPIC-MKT-MC-3: Audit Benchmark Pipeline (Multi-Client)

## Visão Geral
Introduzir o pipeline `*audit-benchmark` — auditoria multi-agente dos top criativos extraídos pelo `*creative-benchmark`, personalizada por cliente via `audit-config.yaml`. Cada agente do painel (mrbeast-mk, garyvee-mk, ladeira, casey-neistat-img, sam-kolder-vid) audita sob uma LENTE específica do cliente, com o `brand-identity.yaml` injetado como contexto rígido — vedada invenção de bordões/léxico fora da identidade.

A síntese estratégica cross-criativo do Chief tem prompt endurecido + pós-validação que descarta bullets sem citação de `creative_id` real.

## Status: ✅ COMPLETE
**Epic ID:** MKT-MC-3
**Owner:** @marketing-chief (orchestration), @dev (implementation)
**Priority:** High
**Início:** 2026-05-23
**Conclusão:** 2026-05-23

## Contexto
Antes deste epic, o único agente de auditoria automatizada existente (`run-audit-phase.js`, legado) era um stub keyword-based: dava scores fixos (6/10, 7/10) sem real raciocínio LLM e sem personalização por cliente. Quando o dono pediu "auditoria sob a lente Tiago Elesbão", ficou claro que precisava de um pipeline novo que (a) carregue `brand-identity` específico, (b) chame LLM real por agente, (c) sintetize cross-criativo com rigor, (d) preencha os placeholders nos `Análise.md` gerados pelo `*creative-benchmark`.

## Problema
- `run-audit-phase.js` é stub: scores hardcoded, sem LLM real, sem cliente
- Auditoria manual via Skill agent (`@mrbeast-mk` etc.) não escala — N criativos × M agentes vira centenas de invocações
- Síntese cross-criativo, quando feita por LLM free (gpt-oss:free), alucinou detalhes ("screenshots de dashboards", "código IA") não presentes nos criativos
- Diferentes clientes precisam de lentes DIFERENTES (Tiago = founder pessoa real; Virals = institucional skin-in-the-game) sobre os mesmos agentes

## Objetivo
1. Comando `*audit-benchmark` no `@marketing-chief` com fluxo de 3 passos (cliente → redes → painel)
2. `data/clients/<slug>/audit-config.yaml` define painel default + LENTE por agente (focos, score dimensions, output sections) específicos do cliente
3. `run_audit_benchmark.py` orquestra: lê benchmark → seleciona agentes aplicáveis ao tipo → chama LLM por agente com lens + brand-identity → preenche `Análise.md` → gera summary consolidado
4. Síntese do Chief com prompt rigoroso: cada bullet DEVE iniciar com `[<creative_id>]` ou `[cross: id1, id2, ...]`; pós-validação descarta orphans
5. Flag `--synthesis-only` permite re-rodar APENAS a síntese (carrega JSON pré-existente) — barato para iterar prompt

## KPIs de Sucesso
- [x] `python run_audit_benchmark.py --client=tiago-elesbao --date=...` audita 10/10 criativos, preenche todos os Análise.md
- [x] `audit-config.yaml` do Tiago tem painel + 5 lentes (mrbeast, garyvee, ladeira, casey, sam) com scores 1-10 + thresholds
- [x] `audit-config.yaml` do Virals existe simetricamente com voz Virals (Mago/GaryVee + skin-in-the-game)
- [x] Síntese do Chief produz 22 bullets válidos, 0 descartados, na 1ª tentativa (com prompt v2 endurecido)
- [x] `--synthesis-only` carrega JSON existente e regenera summary `.md` sem refazer auditorias
- [x] Comando `*audit-benchmark` no `@marketing-chief` com protocol completo + dependencies registradas

## Roadmap
- [x] **MKT-MC3-01**: `audit-config.yaml` schema + per-client configs (Tiago + Virals)
- [x] **MKT-MC3-02**: `run_audit_benchmark.py` orchestrator multi-cliente
- [x] **MKT-MC3-03**: Endurecimento do prompt + pós-validação da síntese do Chief
- [x] **MKT-MC3-04**: Comando `*audit-benchmark` no agente `marketing-chief`

## Dependências
- **EPIC-MKT-MC** (Multi-Client Design Pipeline) — `data/clients/` + `_registry.yaml` + `_client_resolver.py`
- **EPIC-MKT-MC-2** (Multi-Client Operations) — `workspaces/businesses/<slug>/marketing/daily-monitoring/`
- **EPIC-MKT-Creative-Intelligence** — `*creative-benchmark` gera os `Análise.md` que esse pipeline preenche

## Decisões
- **Provider LLM:** reutiliza `recast_engine.call_llm` (multi-provider Gemini → OpenRouter:free → OpenAI). NÃO usa Anthropic (constraint: free-models-only)
- **Painel default:** Core (mrbeast/garyvee/ladeira) + Designers (casey p/ imagens-carrosséis, sam p/ vídeos-reels). Strategic (perry/ezra/fishkin) opcional
- **Output:** preenche placeholders no `Análise.md` (já criado pelo `*creative-benchmark`) + gera `_audit-summary-{date}.{md,json}` no nível benchmark/
- **Validação:** retry da síntese se TODOS os bullets forem descartados pelo regex de citação (até `--max-synthesis-retries`)

## Riscos
- **Free model rate-limit** (Gemini quota 20rpm) pode estourar em batches grandes. Mitigação: orquestrador tem retry com backoff (em `recast_engine`)
- **Alucinação da síntese** (problema real visto em 1ª rodada). Mitigação implementada: regex `[<id>]` obrigatório em todo bullet + descarte automático de orphans

## Referências
- Script: `squads/virals-marketing-squad/scripts/run_audit_benchmark.py`
- Configs: `data/clients/{virals,tiago-elesbao}/audit-config.yaml`
- Agent canonical: `.claude/commands/VIRALS/agents/marketing-chief.md` → `audit_benchmark_protocol`
- Output exemplo: `workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-05-23/benchmark/_audit-summary-2026-05-23.md`

---
*Auditoria sob a lente certa do cliente — e que se sustente em dados, não em alucinação.*
