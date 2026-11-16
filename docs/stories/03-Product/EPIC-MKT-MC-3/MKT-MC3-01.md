# MKT-MC3-01: Schema + per-client audit-config.yaml

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** um schema YAML que defina o painel de agentes, lentes de auditoria, scoring e contexto a injetar — diferente por cliente
**Para que** os mesmos 5 agentes (mrbeast/garyvee/ladeira/casey/sam) auditem com ÓTICAS distintas para Tiago (founder pessoa real, Herói) vs Virals (institucional, Mago)

## Contexto
A auditoria precisa ser personalizada por cliente. O mesmo criativo deve receber scores DIFERENTES quando lido sob a lente Tiago (paleta preto+âmbar, voz Hormozi-direta, léxico-tabu rígido) ou Virals (paleta navy+coral, voz GaryVee + skin-in-the-game). Sem um schema declarativo per-cliente, isso vira hardcode nos scripts.

## Tarefas (Checklist)
- [x] Definir schema com: `audit_panel` (default + designers_by_type + strategic_optional), `agents` (role, persona_summary, lens_for_client, score_dimensions, score_anchor, output_sections, applies_to_types), `scoring` (weights, classification, veredito_decision_table), `output` (placeholder marker + summary filename), `context_inject` (campos do brand-identity a injetar)
- [x] Criar `data/clients/tiago-elesbao/audit-config.yaml` com 5 lentes calibradas para founder pessoal (palavras-tabu, bordões reservados @virals proibidos, paleta preto+âmbar)
- [x] Criar `data/clients/virals/audit-config.yaml` com 5 lentes calibradas para institucional (oferta skin-in-the-game, paleta navy+coral)
- [x] `applies_to_types` por agente: casey ∈ [carousel, image, ig-carousel, ig-image]; sam ∈ [video, video_short, video_long, reel, ig-reel]
- [x] Sanity check: Python parse OK + listagem de agentes funciona

## Critérios de Aceite
- [x] `python -c "import yaml; yaml.safe_load(open('.../audit-config.yaml'))"` retorna OK para ambos os clientes
- [x] Cada cliente tem 5 agentes registrados com lens distintas (mensurável diffando os 2 YAMLs)
- [x] `scoring.weights` soma a 1.0 quando todos os agentes aplicam (designers ajustam via renormalização no orquestrador)
- [x] `context_inject.always_load_from_brand_identity` cita blocos reais do brand-identity de cada cliente (perfil/avatar/tom_de_voz/restricoes/cta_estilo p/ Tiago; oferta/avatar/tom_de_voz/restricoes p/ Virals)

## Out of Scope
- Implementação do orquestrador (→ MKT-MC3-02)
- Endurecimento da síntese do Chief (→ MKT-MC3-03)

## Referências
- `data/clients/tiago-elesbao/audit-config.yaml`
- `data/clients/virals/audit-config.yaml`
- Brand-identity como contexto: `data/clients/<slug>/brand-identity.yaml`
