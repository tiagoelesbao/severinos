# AGENTS.md - Synkra AIOS (Codex CLI)

Este arquivo define as instrucoes do projeto para o Codex CLI.

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga a Constitution em `.aiox-core/constitution.md`
2. Priorize `CLI First -> Observability Second -> UI Third`
3. Trabalhe por stories em `docs/stories/`
4. Nao invente requisitos fora dos artefatos existentes
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- Rode `npm run lint`
- Rode `npm run typecheck`
- Rode `npm test`
- Atualize checklist e file list da story antes de concluir
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Core framework: `.aiox-core/`
- CLI entrypoints: `bin/`
- Shared packages: `packages/`
- Tests: `tests/`
- Docs: `docs/`
<!-- AIOX-MANAGED-END: codebase -->

<!-- AIOX-MANAGED-START: commands -->
## Common Commands

- `npm run sync:ide`
- `npm run sync:ide:check`
- `npm run sync:skills:codex`
- `npm run sync:skills:codex:global` (opcional; neste repo o padrao e local-first)
- `npm run validate:structure`
- `npm run validate:agents`
<!-- AIOX-MANAGED-END: commands -->

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

Preferencia de ativacao no Codex CLI:
1. Use `/skills` e selecione `aiox-<agent-id>` vindo de `.codex/skills` (ex.: `aiox-architect`)
2. Se preferir, use os atalhos abaixo (`@architect`, `/architect`, etc.)

Interprete os atalhos abaixo carregando o arquivo correspondente em `.aiox-core/development/agents/` (fallback: `.codex/agents/`), renderize o greeting via `generate-greeting.js` e assuma a persona ate `*exit`:

- `@architect`, `/architect`, `/architect.md` -> `.aiox-core/development/agents/architect.md`
- `@dev`, `/dev`, `/dev.md` -> `.aiox-core/development/agents/dev.md`
- `@qa`, `/qa`, `/qa.md` -> `.aiox-core/development/agents/qa.md`
- `@pm`, `/pm`, `/pm.md` -> `.aiox-core/development/agents/pm.md`
- `@po`, `/po`, `/po.md` -> `.aiox-core/development/agents/po.md`
- `@sm`, `/sm`, `/sm.md` -> `.aiox-core/development/agents/sm.md`
- `@analyst`, `/analyst`, `/analyst.md` -> `.aiox-core/development/agents/analyst.md`
- `@devops`, `/devops`, `/devops.md` -> `.aiox-core/development/agents/devops.md`
- `@data-engineer`, `/data-engineer`, `/data-engineer.md` -> `.aiox-core/development/agents/data-engineer.md`
- `@ux-design-expert`, `/ux-design-expert`, `/ux-design-expert.md` -> `.aiox-core/development/agents/ux-design-expert.md`
- `@squad-creator`, `/squad-creator`, `/squad-creator.md` -> `.aiox-core/development/agents/squad-creator.md`
- `@squad-chief`, `/squad-chief`, `/squad-chief.md` -> `squads/squad-creator-alternative/agents/squad-chief.md`
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`

### Virals OPS Squad (Custom)
- `@virals-ops-dalio`, `/virals-ops-dalio`, `/virals-ops-dalio.md` -> `squads/virals-ops-squad/agents/dalio.md`
- `@virals-ops-wickman`, `/virals-ops-wickman`, `/virals-ops-wickman.md` -> `squads/virals-ops-squad/agents/wickman.md`
- `@virals-ops-kaushik`, `/virals-ops-kaushik`, `/virals-ops-kaushik.md` -> `squads/virals-ops-squad/agents/kaushik.md`
- `@virals-ops-hormozi-sys`, `/virals-ops-hormozi-sys`, `/virals-ops-hormozi-sys.md` -> `squads/virals-ops-squad/agents/hormozi-sys.md`
- `@virals-ops-walker-launch`, `/virals-ops-walker-launch`, `/virals-ops-walker-launch.md` -> `squads/virals-ops-squad/agents/walker-launch.md`

### Virals Marketing Squad (Custom)
- `@marketing-mrbeast-mk`, `/marketing-mrbeast-mk`, `/marketing-mrbeast-mk.md` -> `squads/virals-marketing-squad/agents/mrbeast-mk.md`
- `@marketing-garyvee-mk`, `/marketing-garyvee-mk`, `/marketing-garyvee-mk.md` -> `squads/virals-marketing-squad/agents/garyvee-mk.md`
- `@marketing-ladeira`, `/marketing-ladeira`, `/marketing-ladeira.md` -> `squads/virals-marketing-squad/agents/ladeira.md`
- `@marketing-georgi`, `/marketing-georgi`, `/marketing-georgi.md` -> `squads/virals-marketing-squad/agents/georgi.md`
- `@marketing-fishkin-mk`, `/marketing-fishkin-mk`, `/marketing-fishkin-mk.md` -> `squads/virals-marketing-squad/agents/fishkin-mk.md`
- `@marketing-perry-marshall`, `/marketing-perry-marshall`, `/marketing-perry-marshall.md` -> `squads/virals-marketing-squad/agents/perry-marshall.md`
- `@marketing-ezra-firestone`, `/marketing-ezra-firestone`, `/marketing-ezra-firestone.md` -> `squads/virals-marketing-squad/agents/ezra-firestone.md`

### Virals Vendas Squad (Custom)
- `@virals-vendas-hormozi-sales`, `/virals-vendas-hormozi-sales`, `/virals-vendas-hormozi-sales.md` -> `squads/virals-vendas-squad/agents/hormozi-sales.md`
- `@virals-vendas-belfort-sales`, `/virals-vendas-belfort-sales`, `/virals-vendas-belfort-sales.md` -> `squads/virals-vendas-squad/agents/belfort-sales.md`
- `@virals-vendas-ross-sales`, `/virals-vendas-ross-sales`, `/virals-vendas-ross-sales.md` -> `squads/virals-vendas-squad/agents/ross-sales.md`
- `@virals-vendas-blount-sales`, `/virals-vendas-blount-sales`, `/virals-vendas-blount-sales.md` -> `squads/virals-vendas-squad/agents/blount-sales.md`
- `@virals-vendas-thiago-reis`, `/virals-vendas-thiago-reis`, `/virals-vendas-thiago-reis.md` -> `squads/virals-vendas-squad/agents/thiago-reis.md`

### Virals Produto Squad (Custom)
- `@virals-produto-cagan`, `/virals-produto-cagan`, `/virals-produto-cagan.md` -> `squads/virals-produto-squad/agents/cagan-produto.md`
- `@virals-produto-torres`, `/virals-produto-torres`, `/virals-produto-torres.md` -> `squads/virals-produto-squad/agents/torres-produto.md`
- `@virals-produto-wes-bush`, `/virals-produto-wes-bush`, `/virals-produto-wes-bush.md` -> `squads/virals-produto-squad/agents/wes-bush-produto.md`
- `@virals-produto-eyal`, `/virals-produto-eyal`, `/virals-produto-eyal.md` -> `squads/virals-produto-squad/agents/eyal-produto.md`
- `@virals-produto-lincoln`, `/virals-produto-lincoln`, `/virals-produto-lincoln.md` -> `squads/virals-produto-squad/agents/lincoln-produto.md`

### Virals Projetos Squad (Custom)
- `@virals-projetos-singer`, `/virals-projetos-singer`, `/virals-projetos-singer.md` -> `squads/virals-projetos-squad/agents/singer-proj.md`
- `@virals-projetos-sutherland`, `/virals-projetos-sutherland`, `/virals-projetos-sutherland.md` -> `squads/virals-projetos-squad/agents/sutherland-proj.md`
- `@virals-projetos-catmull`, `/virals-projetos-catmull`, `/virals-projetos-catmull.md` -> `squads/virals-projetos-squad/agents/catmull-proj.md`
- `@virals-projetos-lencioni`, `/virals-projetos-lencioni`, `/virals-projetos-lencioni.md` -> `squads/virals-projetos-squad/agents/lencioni-proj.md`
- `@virals-projetos-allen`, `/virals-projetos-allen`, `/virals-projetos-allen.md` -> `squads/virals-projetos-squad/agents/allen-proj.md`
<!-- AIOX-MANAGED-END: shortcuts -->
