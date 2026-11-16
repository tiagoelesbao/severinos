# MKT-MC2-02: Resolver expandido (Python + Node.js)

## Status
Done

## Story
**Como** Desenvolvedor dos pipelines operacionais
**Eu quero** que o resolver de cliente devolva também `monitoring_dir`, `workspace_dir` e `lut_dir`, e que exista uma versão Node.js espelhada para os scripts JS
**Para que** `daily-monitor.js`, `run-creative-benchmark.js` (JS) e `export_to_davinci.py` (Python) tenham a mesma fonte de verdade.

## Contexto
O `_client_resolver.py` (criado em MKT-MC-02) hoje só retorna `brand_identity`, `brand_config` e `output_dir`. Precisa ganhar 3 campos novos. E precisa ter par Node.js para os scripts JS (`daily-monitor.js` e `run-creative-benchmark.js`).

## Tarefas (Checklist)
- [ ] Estender `_client_resolver.py`:
  - Adicionar `monitoring_dir`, `workspace_dir`, `lut_dir` na dataclass `ClientPaths`.
  - Resolver lê do registry; valida existência mínima (`monitoring_dir` deve existir; `lut_dir` é criado on-demand).
- [ ] Criar `squads/virals-marketing-squad/scripts/_client_resolver.js`:
  - API espelhada: `resolveClient(slug)`, `extractClientArg(argv)`, `listActiveClients()`.
  - Lê o mesmo `data/clients/_registry.yaml`.
  - Retorna `{ slug, nomeExibicao, brandIdentity, brandConfig, outputDir, monitoringDir, workspaceDir, lutDir, handleInstagram }`.
- [ ] Validar via smoke test: ambos os resolvers devolvem os mesmos paths para os 2 clientes.

## Critérios de Aceite
- [ ] `python _client_resolver.py virals` e `node _client_resolver.js virals` produzem outputs equivalentes.
- [ ] `monitoring_dir` aponta para `clients/<slug>/monitoring/` (existe em disco).
- [ ] `workspace_dir` aponta para `workspaces/businesses/<slug>/marketing/`.
- [ ] `lut_dir` aponta para `clients/<slug>/luts/` (pode estar vazio).

## Dependências
- **MKT-MC2-01** (infra de pastas precisa existir).

## Referências
- `squads/virals-marketing-squad/scripts/_client_resolver.py` (versão Python existente)
