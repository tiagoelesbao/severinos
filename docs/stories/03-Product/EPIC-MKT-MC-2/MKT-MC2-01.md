# MKT-MC2-01: Infra de monitoring + LUTs por cliente

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que cada cliente em `data/clients/<slug>/` tenha sua própria pasta `monitoring/` (perfis sociais por rede) e `luts/` (look cinemático)
**Para que** os pipelines `*daily-monitor`, `*creative-benchmark` e `*industrialize-video` carreguem configurações específicas do cliente sem hardcode.

## Contexto
Hoje os perfis monitorados da Virals vivem em `data/Virals-moonitoring-profiles/` (note o typo "moonitoring") com 5 YAMLs (`monitoring-profiles.yaml`, `monitoring-config.yaml`, `monitoring-instagram.yaml`, `monitoring-tiktok.yaml`, `monitoring-youtube.yaml`). O LUT cinemático é gerado em runtime por `tools/generate_lut.py` e gravado em `outputs/export-for-davinci/virals_cinematic.cube` (path único).

## Tarefas (Checklist)
- [ ] Criar `data/clients/virals/monitoring/` e mover os 5 YAMLs de `data/Virals-moonitoring-profiles/` (typo corrigido).
- [ ] Criar `data/clients/tiago-elesbao/monitoring/` com cópia idêntica dos 5 YAMLs (decisão do dono · 2026-05-23 — perfis Tiago = perfis Virals no Day-1).
- [ ] Criar `data/clients/virals/luts/` e `data/clients/tiago-elesbao/luts/` (vazios; LUTs geradas on-demand pelo script).
- [ ] Estender `data/clients/_registry.yaml` com 3 novos campos por cliente:
  - `monitoring_dir`: path da pasta de perfis monitorados
  - `workspace_dir`: path-base do workspace (daily-monitoring/, benchmark/, etc.)
  - `lut_dir`: path da pasta de LUTs (.cube)
- [ ] Manter a pasta legada `data/Virals-moonitoring-profiles/` intacta até a conclusão do Epic (deleção será feita na MKT-MC2-04).

## Critérios de Aceite
- [ ] `data/clients/virals/monitoring/` contém 5 YAMLs idênticos aos atuais.
- [ ] `data/clients/tiago-elesbao/monitoring/` contém os mesmos 5 YAMLs (cópia byte-a-byte da Virals).
- [ ] `data/clients/virals/luts/` e `data/clients/tiago-elesbao/luts/` existem (podem estar vazios — LUTs ficam em `.gitignore` opcional).
- [ ] `_registry.yaml` tem `monitoring_dir`, `workspace_dir`, `lut_dir` corretamente preenchidos para os 2 clientes.

## Out of Scope
- Refactor de scripts (MKT-MC2-02 / MKT-MC2-03).
- Deleção do path legado (MKT-MC2-04).

## Referências
- `data/Virals-moonitoring-profiles/` (origem da migração)
- `squads/virals-marketing-squad/tools/generate_lut.py` (gerador on-demand)
- `data/clients/_registry.yaml` (a estender)
