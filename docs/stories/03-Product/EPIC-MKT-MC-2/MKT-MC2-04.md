# MKT-MC2-04: Refactor `export_to_davinci.py` + step 0 cliente nos 3 protocolos do agent

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que `*industrialize-video` aceite `--client=<slug>` (gerando LUT específica do cliente e exportando para `outputs/<client>/export-for-davinci/`), e que os 3 protocolos do agent (`*daily-monitor`, `*creative-benchmark`, `*industrialize-video`) ganhem **step 0** de seleção de cliente
**Para que** o pipeline operacional inteiro fique cliente-aware com zero hardcode.

## Contexto
- `export_to_davinci.py` tem `EXPORT_DIR = "outputs/export-for-davinci"` hardcoded, gera LUT em path fixo, e usa accent `#00FFAB` literal no briefing.json.
- Os 3 protocolos no `marketing-chief.md` (`daily_monitor_protocol`, `creative_benchmark_protocol`, `industrialize_video_protocol`) hoje começam pedindo redes/path do vídeo — não cliente.

## Tarefas (Checklist)
- [ ] Refatorar `squads/virals-marketing-squad/scripts/export_to_davinci.py`:
  - Aceitar `--client=<slug>` (default `virals`).
  - Carregar `_client_resolver` + brand-config do cliente.
  - `EXPORT_DIR` resolvido como `outputs/<client_slug>/export-for-davinci/`.
  - LUT resolvida como `client.lut_dir + '/cinematic.cube'`; se não existir, gera on-demand via `generate_virals_cube_lut(lut_path)`.
  - `briefing.json` lê `accentColor` do brand-config (`#E94560` Virals, `#FFB800` Tiago).
- [ ] Atualizar `.claude/commands/VIRALS/agents/marketing-chief.md`:
  - Adicionar `step 0` (AskUserQuestion cliente) em `daily_monitor_protocol.flow`.
  - Adicionar `step 0` em `creative_benchmark_protocol.flow`.
  - Adicionar `step 0` em `industrialize_video_protocol.flow`.
  - Propagar `--client={slug}` nos respectivos bash commands.
  - Atualizar `no_friction_rule` de cada protocolo (uma pergunta a mais agora).
  - Atualizar a seção markdown "Guia" (Pré-requisitos e Erros comuns) — listar cliente como pré-requisito.
- [ ] Sincronizar 3 mirrors: `squads/.../agents/marketing-chief.md`, `.antigravity/agents/marketing-chief.md`, `.antigravity/rules/agents/marketing-chief.md`, `.gemini/rules/AIOX/agents/virals-marketing-chief.md`.
- [ ] **Cleanup**: deletar `data/Virals-moonitoring-profiles/` (já migrado em MKT-MC2-01) após validar que zero refs vivas restam.
- [ ] Atualizar `squad.yaml` e `README.md` se mencionarem o path legado.

## Critérios de Aceite
- [ ] `python export_to_davinci.py <video> --client=tiago-elesbao` exporta para `outputs/tiago-elesbao/export-for-davinci/` e gera/usa LUT em `data/clients/tiago-elesbao/luts/cinematic.cube`.
- [ ] Rodando `*daily-monitor`, o primeiro input é "Cliente?", depois "Redes?".
- [ ] Rodando `*creative-benchmark`, primeiro input é "Cliente?", depois "Redes?", depois "Top N".
- [ ] Rodando `*industrialize-video`, primeiro input é "Cliente?", depois path do vídeo.
- [ ] `data/Virals-moonitoring-profiles/` não existe mais; `grep "Virals-moonitoring-profiles"` retorna apenas docs/históricos.

## Dependências
- **MKT-MC2-01, MKT-MC2-02, MKT-MC2-03** (toda a base).

## Referências
- `squads/virals-marketing-squad/scripts/export_to_davinci.py`
- `squads/virals-marketing-squad/tools/generate_lut.py`
- `.claude/commands/VIRALS/agents/marketing-chief.md`
