# MKT-MC2-03: Refactor `daily-monitor.js` + `run-creative-benchmark.js`

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que `*daily-monitor` e `*creative-benchmark` aceitem `--client=<slug>` e usem o resolver Node.js para carregar perfis e segregar workspaces
**Para que** o monitoramento do `@tiagoelesbao` rode sem afetar o da `@virals`.

## Contexto
- `daily-monitor.js` hoje carrega o YAML mestre de `data/Virals-moonitoring-profiles/monitoring-profiles.yaml` (hardcoded) e escreve em `workspaces/businesses/virals/marketing/daily-monitoring/{date}/` (hardcoded).
- `run-creative-benchmark.js` lê de `workspaces/businesses/virals/marketing/daily-monitoring/{date}/` (hardcoded).
- Já aceitam `--profiles=<path>` e `--output=<dir>` como overrides — esses ganchos serão usados pelo resolver, então a mudança é cirúrgica.

## Tarefas (Checklist)
- [ ] Refatorar `services/ETL/Extract/scrapers/daily-monitor.js`:
  - Importar `_client_resolver.js`.
  - Aceitar `--client=<slug>` (default `virals`).
  - Resolver `profilesYaml` via `client.monitoringDir + '/monitoring-profiles.yaml'` (a menos que `--profiles=` esteja explícito — override mantido).
  - Resolver `outputDir` via `client.workspaceDir + '/daily-monitoring/' + date` (a menos que `--output=` esteja explícito).
  - Log inicial mostra `client: {slug}` no início da execução.
- [ ] Refatorar `squads/virals-marketing-squad/scripts/run-creative-benchmark.js`:
  - Aceitar `--client=<slug>` (default `virals`).
  - Resolver `dailyDir` via `client.workspaceDir + '/daily-monitoring/' + date`.
  - Mensagem de erro "Pasta do dia não existe" mostra qual cliente foi resolvido.
- [ ] Validar regressão Virals:
  - `node daily-monitor.js --platforms=instagram --hours=36` (sem `--client`) continua escrevendo em `workspaces/businesses/virals/...`.
- [ ] Validar caminho Tiago:
  - `node daily-monitor.js --client=tiago-elesbao --platforms=instagram --hours=36` lê de `clients/tiago-elesbao/monitoring/` e escreve em `workspaces/businesses/tiago-elesbao/...`.

## Critérios de Aceite
- [ ] `--client` é opcional, default `virals` em ambos os scripts.
- [ ] Sem `--client`, comportamento idêntico ao atual (backward compat).
- [ ] Com `--client=tiago-elesbao`, paths corretos.
- [ ] Mensagens de log incluem o slug do cliente.

## Dependências
- **MKT-MC2-01, MKT-MC2-02** (infra + resolver Node.js).

## Referências
- `services/ETL/Extract/scrapers/daily-monitor.js`
- `squads/virals-marketing-squad/scripts/run-creative-benchmark.js`
