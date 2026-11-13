# Task: Briefing to ICP-C Transform

**ID:** VH-TASK-000-B
**Phase:** 0 — Preparação
**Agent:** @hunter-chief (Joe)
**Execution Type:** Worker (briefing-to-icp.js)
**Status:** template
**Depends on:** Briefing do cliente salvo em `data/icp-briefings/`

---

## Objetivo

Transformar um **briefing livre do cliente** (formato Markdown não-estruturado) nos 3 artefatos que iniciam o pipeline de hunting:

1. **ICP-C Estruturado** — Markdown padronizado (formato `templates/icp-c-template.md`)
2. **Search Criteria JSON** — Input executável para `scripts/hunt-creators.js`
3. **Readiness Report** — Validação automática contra `checklists/icp-readiness-checklist.md`

## Por que esta task existe?

O cliente envia briefings ricos mas em formato livre (como o da Juvelina Organics com 253 linhas sobre produto, compliance, hooks, formatos etc). O pipeline precisa de dados estruturados. Esta task faz a ponte.

**Antes:**
```
Cliente envia briefing (PDF/Markdown/Doc)
     ↓ (trabalho manual de horas)
ICP-C Template preenchido
     ↓ (mais trabalho manual)
Search Criteria JSON
```

**Depois:**
```
Cliente envia briefing → data/icp-briefings/
     ↓ (1 comando)
node scripts/briefing-to-icp.js --briefing ./data/icp-briefings/briefing.md
     ↓ (automático — ~3 segundos)
✅ ICP-C Structured (data/icp-structured/)
✅ Search Criteria JSON (data/search-criteria-{client}-{date}.json)
✅ Readiness Report (data/readiness-reports/)
```

## Input

- Briefing do cliente em Markdown, salvo em `data/icp-briefings/`
- O briefing pode conter (em qualquer ordem/formato):
  - Dados da marca (nome, site, redes sociais)
  - Perfil do consumidor (gênero, idade, dores, desejos)
  - Perfil ideal do creator (nichos, características, métricas)
  - Informações do produto (proposta de valor, composição)
  - Formatos de conteúdo recomendados
  - Ganchos/hooks validados
  - Diretrizes de compliance (pode/não pode)
  - Programa de parceiros (metas, recompensas)
  - Hashtags oficiais
  - Tom de voz

## Output

### 1. ICP-C Estruturado (`data/icp-structured/icp-c-{slug}-{date}.md`)
- Segue exatamente o formato de `templates/icp-c-template.md`
- Todos os campos preenchidos com dados extraídos do briefing
- Campos não encontrados marcados como default ou "a preencher"
- Seção extra com hooks, compliance e formatos do cliente

### 2. Search Criteria JSON (`data/search-criteria-{slug}-{date}.json`)
- JSON executável pelo `scripts/hunt-creators.js --criteria`
- Hashtags do briefing + hashtags enriquecidas do `data/niches-catalog.yaml`
- Demographics, follower range, engagement rate
- Red flags derivados do compliance do cliente
- Hooks e context da marca para personalização futura

### 3. Readiness Report (`data/readiness-reports/readiness-{slug}-{date}.md`)
- Checklist de validação automática
- Pass rate (% de items preenchidos)
- Gate: ≥ 75% = READY para Fase 1 | < 75% = BLOQUEADO
- Lista explícita de items faltantes

## Action Items

1. Salvar briefing do cliente em `data/icp-briefings/{nome}.md`
2. Executar o transformer:
   ```bash
   # Dry run primeiro (sem gerar arquivos):
   node scripts/briefing-to-icp.js --briefing ./data/icp-briefings/{nome}.md --dry-run

   # Executar de verdade:
   node scripts/briefing-to-icp.js --briefing ./data/icp-briefings/{nome}.md
   ```
3. Revisar readiness report
4. Se READY: avançar para Fase 1 com o criteria gerado
5. Se INCOMPLETE: completar items faltantes manualmente no ICP-C structured

## Como funciona internamente

O script `briefing-to-icp.js` opera em 6 steps:

| Step | Descrição |
|:-----|:----------|
| 1 | **Parse** — Divide o Markdown em seções via headings `##` e extrai patterns (tabelas, listas, URLs) |
| 2 | **Match niches** — Cruza nichos do briefing com `data/niches-catalog.yaml` para enrichment |
| 3 | **Validate** — Roda checklist de readiness automaticamente |
| 4 | **Generate ICP-C** — Preenche o template estruturado |
| 5 | **Generate JSON** — Cria search criteria executável |
| 6 | **Report** — Gera relatório de readiness |

## Acceptance Criteria

- [ ] Briefing salvo em `data/icp-briefings/`
- [ ] Script executado sem erros
- [ ] ICP-C structured gerado e revisado
- [ ] Search Criteria JSON válido
- [ ] Readiness Report com pass rate ≥ 75%
- [ ] JSON pronto para alimentar `node scripts/hunt-creators.js --criteria ./path`
