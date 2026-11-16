# MKT-MC4-02: design_creative.py CLI extensions + resolver

## Status
Done

## Story
**Como** dono do sistema
**Eu quero** que `design_creative.py` aceite `--bench-type`, `--bench-platform`, `--template=<id-from-registry>` e `--list-templates`, e que resolva qual `template_id_render` passar ao orquestrador
**Para que** o fluxo de 6 passos do agente possa ser disparado num único comando

## Contexto
A CLI antiga aceitava `<benchmark_dir> <single|carousel> [--image-mode] [--template] [--client]`. Faltavam:
- `--bench-type` (informacional + sinal para `scoring_match`)
- `--bench-platform` (informacional, pass-through)
- `--list-templates` (UX de descoberta)
- Resolver que (1) valida `--template` contra `templates.yaml` do cliente, (2) faz auto-pick via `scoring_match` quando `--template` é omitido, (3) traduz `template.id` → `template_id_render` esperado pelo `app/render/page.tsx`

## Tarefas (Checklist)
- [x] `_load_client_templates(slug)`: lê `data/clients/<slug>/templates.yaml`
- [x] `_list_templates_for(yaml, output_type)`: extrai array de templates do output_type
- [x] `_resolve_template_id(yaml, output_type, bench_type, explicit_id)`:
  - Se `explicit_id` ∈ registry → retorna (id, template_id_render)
  - Senão consulta `scoring_match[output_type][from_<bench_type>]` (ou `from_single` como fallback) e usa primeiro disponível
  - Último fallback: primeiro template do output_type
  - Tratamento especial para `explicit_id` legado (não no registry) → pass-through
- [x] `design_creative()` ganha 2 params: `bench_type=None`, `bench_platform=None`
- [x] Print rico antes de executar: `client`, `output_type`, `bench_type`, `bench_platform`, `image_mode`, `template input`, `template id`, `render id`
- [x] Passa `template_id_render` (não o ID do registry) ao orquestrador via `--template=<render_id>`
- [x] CLI: parser para `--bench-type`, `--bench-platform`, `--list-templates`
- [x] `_list_templates_cli(slug)`: imprime tabela com label, status badge (✅ ready / 🟡 fase_b2_pending), description
- [x] Uso helper atualizado para mostrar a nova forma completa

## Critérios de Aceite
- [x] `python design_creative.py --list-templates --client=tiago-elesbao` lista 3 carousel + 3 single com badges corretos
- [x] Resolver dispatch matrix 2×3 (output × bench_type) confirmada via teste programático (todos retornam ID válido + render_id existente)
- [x] Forma curta `python design_creative.py <dir> <ctype> [--client=...]` continua funcionando (backward compat)
- [x] Sintaxe Python OK
- [x] `--template=<id-do-registry>` é traduzido para `--template=<render_id>` antes de chegar no orquestrador

## Out of Scope
- Atualizar o protocol do agent para usar a nova CLI (→ MKT-MC4-03)

## Referências
- Script: `squads/virals-marketing-squad/scripts/design_creative.py`
- Registry consumido: `data/clients/<slug>/templates.yaml`
- Render switch consumidor do `render_id`: `apps/creative-design/src/app/render/page.tsx`
