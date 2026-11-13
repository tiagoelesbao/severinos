# MKT-MC4-01: Per-client templates.yaml registry

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um registry YAML per cliente listando templates de design disponíveis por output_type (carrossel/single), com metadata e recomendações automáticas (`scoring_match`)
**Para que** o pipeline `*design-creative` ofereça ≥3 opções por output por cliente sem hardcode no script

## Contexto
Antes deste epic, `*design-creative` aceitava `--template=carousel-slide|quote-slide|single-post` (3 IDs globais). Não havia conceito de "templates do cliente". Para escalar para múltiplos clientes com identidades visuais distintas, precisava-se de um registry declarativo per cliente.

## Tarefas (Checklist)
- [x] Definir schema YAML com: `meta` (versao, cliente, status), `templates.{carousel,single}[]` (id, label, description, react_component, template_id_render, best_for_bench_types, slide_count_range, typical_use, preview_status, preview_note), `scoring_match.{carousel,single}.from_<bench_type>[]`
- [x] Criar `data/clients/tiago-elesbao/templates.yaml` com 3 templates carousel + 3 single, incluindo 2 placeholders `fase_b2_pending` (`carousel-step`, `single-data`)
- [x] Criar `data/clients/virals/templates.yaml` simetricamente (mesmos IDs, mesmas estruturas — mas adaptado para voz Virals)
- [x] `preview_status: ready | fase_b2_pending` documentado explicitamente
- [x] `scoring_match` cobre todas as combinações (output × bench_type = 2 × 3 = 6 entradas)

## Critérios de Aceite
- [x] `python -c "import yaml; yaml.safe_load(open('templates.yaml'))"` retorna OK para ambos os clientes
- [x] Cada cliente tem ≥3 templates em `templates.carousel` e ≥3 em `templates.single`
- [x] Cada template tem `id` único, `react_component` apontando para componente existente, `template_id_render` válido (renderiza algo)
- [x] `scoring_match.carousel.from_video[0]` é determinístico (define o default quando nenhum `--template` é passado)
- [x] Templates `fase_b2_pending` têm `preview_note` claro indicando qual componente vizinho renderiza por enquanto

## Out of Scope
- Atualização do `design_creative.py` para ler o registry (→ MKT-MC4-02)
- Atualização do protocol do agent (→ MKT-MC4-03)
- Build dos componentes React dedicados (→ EPIC-MKT-MC-6)

## Referências
- `data/clients/tiago-elesbao/templates.yaml`
- `data/clients/virals/templates.yaml`
- Spec dos templates Tiago: `data/clients/tiago-elesbao/templates-spec-fase-b2.md`
