# EPIC-MKT-MC-2: Multi-Client Operations Pipelines

## Visão Geral
Estender a personalização por cliente, já estabelecida no `*design-creative` pelo Epic anterior **EPIC-MKT-MC**, para os outros 3 pipelines operacionais do `@marketing-chief`:

- `*daily-monitor` — Monitoramento diário multi-rede
- `*creative-benchmark` — ETL profundo dos top criativos
- `*industrialize-video` — Industrialização de vídeo (DaVinci/FCPXML)

Cada cliente passa a ter:
- **Perfis de monitoramento** próprios em `data/clients/<slug>/monitoring/` (lista de handles por rede social)
- **Workspace** segregado em `workspaces/businesses/<slug>/marketing/daily-monitoring/`
- **LUTs cinemáticas** próprias em `data/clients/<slug>/luts/` (geradas on-demand; permite calibração futura sem afetar outros clientes)

## Status: ✅ COMPLETE
**Epic ID:** MKT-MC-2
**Owner:** @marketing-chief (orchestration), @dev (implementation)
**Priority:** High
**Início:** 2026-05-23
**Conclusão:** 2026-05-23

## Contexto
O Epic anterior (MKT-MC) introduziu a estrutura `data/clients/<slug>/` para identidade de marca. Este epic completa a cobertura aplicando o mesmo padrão `--client=<slug>` aos pipelines de inteligência (monitoring, benchmark) e produção (industrialize). O perfil pessoal `@tiagoelesbao` entra com lista de perfis monitorados idêntica à Virals (cópia inicial, evoluiu independentemente depois).

## Problema
- `*daily-monitor` lê de `data/Virals-moonitoring-profiles/monitoring-profiles.yaml` (hardcoded, com typo) e escreve em `workspaces/businesses/virals/marketing/daily-monitoring/{date}/`.
- `*creative-benchmark` é colado ao mesmo workspace Virals.
- `*industrialize-video` tem LUT `virals_cinematic.cube` e accent color `#00FFAB` hardcoded, e escreve em `outputs/export-for-davinci/` sem segregação.
- Adicionar um novo cliente operacional exigia fork manual.

## Objetivo
1. Pipeline `*daily-monitor` aceita `--client=<slug>`, lê perfis e escreve workspace do cliente.
2. Pipeline `*creative-benchmark` herda o workspace do cliente do `*daily-monitor`.
3. Pipeline `*industrialize-video` aceita `--client=<slug>`, gera LUT no `data/clients/<slug>/luts/` e usa accent color do brand-config.
4. Os 3 protocolos do `@marketing-chief` ganham step 0 (seleção de cliente) antes das demais perguntas.
5. Resolver Node.js (`_client_resolver.js`) espelha a API do Python para uso pelos scripts JS.

## KPIs de Sucesso
- [ ] `node daily-monitor.js --client=tiago-elesbao --platforms=instagram` lê perfis de `clients/tiago-elesbao/monitoring/` e escreve em `workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/{date}/`.
- [ ] `node run-creative-benchmark.js --client=tiago-elesbao --date=...` processa o workspace do Tiago.
- [ ] `python export_to_davinci.py <video> --client=tiago-elesbao` gera LUT em `data/clients/tiago-elesbao/luts/cinematic.cube` e exporta para `outputs/tiago-elesbao/export-for-davinci/`.
- [ ] Os 3 comandos `*daily-monitor`, `*creative-benchmark`, `*industrialize-video` perguntam cliente como **primeiro** input.
- [ ] Sem `--client`, default = `virals` (backward compat total).

## Roadmap
- [x] **MKT-MC2-01**: Infra de monitoring + LUTs por cliente
- [x] **MKT-MC2-02**: Resolver expandido (Python + Node.js)
- [x] **MKT-MC2-03**: Refactor `daily-monitor.js` + `run-creative-benchmark.js`
- [x] **MKT-MC2-04**: Refactor `export_to_davinci.py` + step 0 nos 3 protocolos do agent

## Dependências
- **EPIC-MKT-MC (Multi-Client Design Pipeline)** — completo. Reusa `data/clients/`, `_registry.yaml` e o conceito de slug.

## Decisões
- **Workspace dir:** segue padrão `workspaces/businesses/<slug>/` (decisão do dono · 2026-05-23). Tiago entra como business mesmo sendo perfil pessoal.
- **LUT:** materializada como arquivo `.cube` por cliente (não regenerada todo run). Se o arquivo não existir, o script gera on-demand a partir do gerador da Virals. Permite que o dono substitua manualmente quando calibrar uma própria.
- **Perfis Tiago:** cópia idêntica da Virals no Day-1 (decisão do dono). Evoluem independentemente.

## Riscos
- **Typo legado** em `data/Virals-moonitoring-profiles/` — a migração corrige para `data/clients/virals/monitoring/`. Risco: referências externas perdidas. Mitigação: varredura prévia.
- **LUT binária** em `data/clients/<slug>/luts/` aumenta tamanho do repo. Mitigação: opcional adicionar ao `.gitignore` na conclusão da story.

---
*Cada cliente tem sua máquina própria. A Virals só fornece o pipeline.*
