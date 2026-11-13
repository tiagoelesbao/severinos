# MKT-MC3-03: Chief Synthesis Rigor (prompt v2 + pós-validação)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que a síntese estratégica cross-criativo gere bullets verificáveis (cada um citando `creative_id` real) e que itens inventados sejam descartados automaticamente
**Para que** o relatório do Chief reflita o que realmente está nos dados, não invenções do LLM free-tier

## Contexto
Na 1ª rodada de auditoria (tiago-elesbao 2026-05-23), o LLM `gpt-oss-120b:free` produziu uma síntese que parecia plausível mas inventou detalhes ("screenshots de dashboards", "código IA", "versões adaptadas por @casey-neistat-img") que NÃO existem nos dados das auditorias per-agente. Como constraint é "só modelos free", a solução não pode ser trocar para Anthropic — tem que vir de prompt + validação.

## Tarefas (Checklist)
- [x] Reescrever `build_chief_synthesis_prompt()`:
  - Bloco "REGRAS INEGOCIÁVEIS" no topo (5 itens: zero invenção, citação obrigatória, ids permitidos enumerados, palavras-tabu específicas, proibição de "versões adaptadas por")
  - Bloco "DADOS DA AUDITORIA (ÚNICA FONTE DE VERDADE)" com agent_lines + key_findings (2 por agente) por criativo
  - Schema JSON com instruções explícitas (cada bullet de lista textual DEVE começar com `[<id>]` ou `[cross: id1, id2, ...]`)
  - Critérios numéricos para listas de criativos (modelar/inspirar/ignorar) atrelados a `score_total` + `veredito_dominante`
  - 1 exemplo VÁLIDO e 1 exemplo INVÁLIDO em texto
- [x] Implementar `validate_synthesis(synthesis, valid_ids)`:
  - Regex `^\s*\[(?:cross:\s*)?([A-Za-z0-9_\-,\s]+)\]` extrai citação
  - Para `padroes_cross_criativo` + `leituras_estrategicas`: exige ≥2 ids citados e todos pertencem a `valid_ids`
  - Para `proximos_passos`: exige ≥1 id válido
  - Para listas de creative_id puras: normaliza e descarta orphans + duplicatas
  - Retorna `(synthesis_filtrada, warnings)` para reporte transparente
- [x] Loop de retry no `main()`: se a 1ª tentativa zerar todos os bullets, retenta até `--max-synthesis-retries`
- [x] `render_chief_strategic_md()` exibe `<details>` colapsado com `validation_warnings` (transparência sobre o que foi descartado)
- [x] Smoke test re-roda síntese com `--synthesis-only`

## Critérios de Aceite
- [x] Síntese regenerada produz 22 bullets válidos, 0 descartados, na 1ª tentativa
- [x] Cada item de `padroes_cross_criativo` cita ≥2 creative_ids reais entre colchetes
- [x] Listas de creative_ids puras contêm apenas ids de `valid_ids`
- [x] `_audit-summary-{date}.json` contém `validation_warnings` (vazio quando 0 descartado)
- [x] Diff entre síntese v1 (com invenções) e v2 (rigorosa) mostra mudança qualitativa visível

## Out of Scope
- Mudar o LLM provider (constraint: free-only)
- Refinar wording dos padrões para distinguir patterns de FAILURE vs SUCCESS (anotado para iteração futura)

## Referências
- Função: `build_chief_synthesis_prompt`, `validate_synthesis` em `run_audit_benchmark.py`
- Output v2: `_audit-summary-2026-05-23.md` (regerado com `--synthesis-only`)
