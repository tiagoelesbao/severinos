# MKT-MC3-02: Orchestrator run_audit_benchmark.py

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um script Python que carregue o audit-config + brand-identity do cliente, itere as pastas de benchmark, chame LLM por agente aplicável ao tipo, preencha os placeholders nos Análise.md e gere summary consolidado
**Para que** a auditoria multi-agente seja um único comando executável e não 50+ chamadas manuais a agentes via Skill

## Contexto
O script é o coração do pipeline `*audit-benchmark`. Recebe `--client`, `--date`, `--platforms` e `--agents`, descobre os criativos extraídos pelo `*creative-benchmark` (Benchmark.json, Transcrição.md, Análise.md em workspaces/businesses/<slug>/...), aplica a regra `applies_to_types` para selecionar agentes por criativo, chama LLM com prompt construído da lens + brand-identity + transcrição, escreve o resultado nos placeholders do Análise.md, agrega scores ponderados.

## Tarefas (Checklist)
- [x] Reusar `_client_resolver.resolve_client()` para paths
- [x] Reusar `recast_engine.call_llm()` (multi-provider Gemini→OpenRouter:free→OpenAI)
- [x] `find_benchmark_creatives()`: itera `workspaces/businesses/<slug>/marketing/daily-monitoring/<date>/benchmark/<platform>/<rank>-<handle>-<hash>/`
- [x] `select_agents_for_creative()`: filtra via `applies_to_types` do agente vs `type`/`subtype` do Benchmark.json
- [x] `build_audit_prompt()`: persona + lens + brand-context (YAML render dos blocos `context_inject`) + creative block + output schema JSON
- [x] `run_one_audit()`: extract_json com tolerância a cercas/ruído
- [x] `compute_total_score()`: renormaliza pesos pelos agentes que efetivamente rodaram (designers ausentes não puxam média para baixo)
- [x] `classify()` + `veredito_from_score()` lêem thresholds + decision_table do audit-config
- [x] `render_agent_audit_md()`: markdown por agente com score, veredito, key_findings, sections, lexico_flags, adaptação obrigatória
- [x] `update_analise_md()`: substitui FROM marker `## 🧠 Espaço para Auditorias Especializadas` até EOF
- [x] Gera `_audit-summary-{date}.md` + `_audit-summary-{date}.json` no nível benchmark/

## Critérios de Aceite
- [x] Sintaxe Python OK (`python -c "import ast; ast.parse(...)"`)
- [x] Smoke test em batch real: tiago-elesbao 2026-05-23, 10 criativos, 10/10 sucesso, 0 falha parcial
- [x] Análise.md de cada criativo contém 3-5 auditorias por agente + Síntese Final (Chief)
- [x] Summary `.md` tem ranking ponderado + síntese estratégica + index dos criativos
- [x] Summary `.json` contém TODOS os audits dict (roundtripável para `--synthesis-only`)
- [x] Erro de 1 agente NÃO derruba o batch — o agente recebe `{"error": ...}` e o resto segue

## Out of Scope
- Endurecimento do prompt da síntese (→ MKT-MC3-03)
- Comando `*audit-benchmark` no agent (→ MKT-MC3-04)

## Referências
- Script: `squads/virals-marketing-squad/scripts/run_audit_benchmark.py`
- LLM multi-provider: `recast_engine.call_llm`
- Resolver: `_client_resolver.resolve_client`
