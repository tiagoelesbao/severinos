# MKT-MC4-06: Pipeline Trace JSON (auditabilidade por run)

## Status
Done

## Story
**Como** dono do sistema
**Eu quero** que cada execução de `*design-creative` grave um `_pipeline-trace.json` no dir de output contendo TODOS os artefatos consumidos (paths + SHA-256), os modelos LLM usados em cada etapa, a paleta efetivamente injetada e o cliente resolvido
**Para que** EU CONSIGA, depois do run, verificar OBJETIVAMENTE se o pipeline carregou o brand-identity correto, qual LLM rodou cada análise, se houve drift entre runs (hash dos YAMLs) e se a paleta visual veio do brief certo

## Contexto
Durante o teste de Tiago, o dono levantou: *"não tenho como auditar e ter certeza se análise dos agentes sobre benchmark e elaboração dos posts a partir do benchmark foi com especificações técnicas YAML de tiago elesbão"*. O pipeline tinha rastros (client_slug no brief, brand_tokens, etc.) mas não havia **um único ponto** onde conferir tudo de uma vez. Faltava transparência.

## Tarefas (Checklist)
- [x] Função `_sha256_of_file(path)` em `orchestrate_carousel.py` — hash SHA-256 primeiros 16 chars (suficiente para drift detection sem inflar JSON)
- [x] Função `_build_pipeline_trace(...)` que constrói o trace com:
  - `client`: slug + display name + handle_instagram (do registry)
  - `brief_path`: caminho absoluto do brief carregado
  - `yamls_consumed`: brand_identity + brand_config + audit_config + templates (paths reais)
  - `yaml_hashes_sha256_short`: hash de cada YAML + do próprio brief (drift detection)
  - `llm_models_used`: dict com `analyze_benchmark`, `plan_creative`, `recast_engine`, `quality_gate` (extraídos do brief: `benchmark_analysis.model`, `personalization.recast_model`, etc.)
  - `render_inputs`: template_id_render + signature_handle + footer_text + palette_injected (exatamente o que foi enviado aos templates)
  - `brand_tokens_from_brief`: paleta completa do brand-config (cross-check com palette_injected)
  - `audit_provenance_note`: aponta para `_audit-summary-{date}.json` em `workspaces/.../benchmark/` (onde cada audit por agente tem `_model` + citação obrigatória de creative_id, MKT-MC3-03)
- [x] Após o ZIP, gravar `_pipeline-trace.json` no `output_dir`
- [x] Tratamento de erro: se falhar gerar o trace, NÃO derrubar o pipeline — apenas warn `⚠️  Não foi possível gerar pipeline-trace`
- [x] Resolução de cliente via `_client_resolver.resolve_client` (mesma fonte de verdade dos outros pipelines)

## Critérios de Aceite
- [x] `_pipeline-trace.json` gerado em todo run bem-sucedido
- [x] Smoke test: trace de Tiago mostra `client.slug=tiago-elesbao` + `client.handle=@tiagoelesbao` + 4 YAMLs do Tiago em `yamls_consumed`
- [x] Hashes SHA-256 presentes e estáveis entre runs sem mudança de YAML
- [x] `render_inputs.palette_injected` confere com `brand_tokens_from_brief.palette` (mesmo conteúdo, fontes diferentes — cross-check)
- [x] `llm_models_used` lista os modelos free reais usados (ex.: `openrouter:openai/gpt-oss-120b:free`)
- [x] `audit_provenance_note` aponta para o JSON do `*audit-benchmark` correto

## Out of Scope
- Trace para `orchestrate_post_single.py` (legacy single post via SinglePostTemplate — fora do escopo deste fix). Pode entrar em iteração futura
- Centralizar traces em um log global (`outputs/_traces/index.json`) — hoje cada run grava localmente, suficiente

## Referências
- Implementação: `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` (`_build_pipeline_trace`, `_sha256_of_file`)
- Output exemplo: `outputs/tiago-elesbao/carousels/v5-precision-06-publicitarioscriativos-2a6dbb/tiago-step__<ts>/_pipeline-trace.json`
- Audit provenance complementar: `workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-05-23/benchmark/_audit-summary-2026-05-23.json`
