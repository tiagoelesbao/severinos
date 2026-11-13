# Task: Otimização da Fase de Mineração (Fase 1)

**ID:** VH-TASK-106
**Phase:** 1 — Mineração (Fase 1)
**Agent:** @hunter-scout (Mae)
**Execution Type:** Worker (pipeline-miner.js)
**Status:** active

---

## Objetivo

Unificar o fluxo de mineração avançada em uma única operação definitiva da **Fase 1**. Este Pipeline consome *diretamente* o `search-criteria-*.json` (gerado na Fase 0) para realizar a extração via Hashtags e o Sniper de Comentários em concorrentes, classificando os resultados pelo **Viral Score** e gerando o **Dossier de Mineração Avançada** final.

## Input

- Nome/Slug do cliente (ex: `juvelina-organics`) para buscar automaticamente os dados em `data/search-criteria/`.

## Output

- **Dossier de Mineração Avançada** estruturado em `data/miners/dossier-{cliente}-{date}.md` (artefato único que atesta o fim da Fase 1).

## Action Items

1. Iniciar pipeline de Fase 1 via terminal chamando o executor integrado com o argumento do cliente:
   ```bash
   node squads/virals-creators-hunting-squad/scripts/pipeline-miner.js {cliente}
   ```
   *Ou usar o comando nativo `@hunter-scout *mine-all {cliente}`.
2. O script resgata as hashtags mais adequadas do `search-criteria`.
3. Ocorre o **Discovery** por Hashtags nas plataformas sociais.
4. Roda o **Sniper** para monitorar concorrentes extraídos do JSON.
5. O script processa e gera a Shortlist para a tabela do **Ranking Viral (Foco Conversão BR)**.
6. Entrega o Dossier limpo sem referências desnecessárias a blocos globais.

## Acceptance Criteria

- [ ] A mineração opera baseada no `search-criteria-*.json` em vez de pools antigos.
- [ ] O Ranking concentra-se apenas nos resultados úteis baseados no geo foco da buyer persona.
- [ ] O Dossier final está gerado com sucesso englobando todos os *prospects* na `data/miners/`.
