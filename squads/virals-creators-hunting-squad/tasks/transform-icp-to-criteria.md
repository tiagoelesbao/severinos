# Task: Transform ICP-C → Critérios de Busca

**ID:** VH-TASK-000
**Phase:** 0 — Preparação
**Agent:** @hunter-chief (Joe)
**Execution Type:** Agent
**Status:** template

---

## Objetivo

Receber o ICP-C (Ideal Creator Profile) do cliente e transformá-lo em critérios de busca executáveis para a Fase 1 (Identificação).

## Input

- ICP-C preenchido (templates/icp-c-template.md)
- Checklist de readiness validada (checklists/icp-readiness-checklist.md)

## Output

Arquivo JSON de critérios de busca:

```json
{
  "client": "{nome_marca}",
  "search_criteria": {
    "hashtags": ["#tag1", "#tag2"],
    "platforms": ["tiktok", "instagram"],
    "follower_range": { "min": 1000, "max": 50000 },
    "engagement_rate_min": 3,
    "niche": "fitness",
    "sub_niches": ["wellness", "yoga"],
    "demographics": {
      "gender": "any",
      "age_range": "18-35",
      "location": "BR"
    },
    "content_requirements": {
      "face_required": true,
      "tone": "autêntico",
      "type": ["UGC", "review"]
    },
    "red_flags": ["100% branded", "concorrente X"],
    "reference_creators": ["@sendyqueiroz", "@thai.neri"],
    "competitor_brands": ["marca_x", "marca_y"]
  }
}
```

## Action Items

1. Ler ICP-C do cliente
2. Validar contra icp-readiness-checklist
3. Extrair hashtags do ICP-C + enriquecer com niches-catalog.yaml
4. Definir follower range e engagement rate mínimo
5. Mapear demographics (gênero, idade, localização)
6. Listar creators de referência para lookalike search
7. Listar marcas concorrentes para monitor
8. Gerar JSON de critérios
9. Salvar em `data/search-criteria-{client}-{date}.json`

## Acceptance Criteria

- [ ] JSON de critérios gerado e válido
- [ ] Todas as dimensões do ICP-C representadas
- [ ] Hashtags enriquecidas com niches-catalog
- [ ] Pronto para alimentar hunt-creators.js
