# AGENTS.md - Synkra AIOX (Codex CLI)

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
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`
<!-- AIOX-MANAGED-END: shortcuts -->

<!-- Fora dos blocos AIOX-MANAGED: escrito à mão, não é sobrescrito pelo sync:ide. -->

## Squads de negócio

Além dos agentes de engenharia acima, o repositório carrega squads de negócio em
`squads/`. Cada um tem o seu próprio `MEMORY.md`, que é a fonte dos números
medidos e das decisões já tomadas — **leia antes de propor qualquer coisa** no
domínio dele, ou você reabre investigação encerrada.

| Squad | Domínio | Entrada |
|---|---|---|
| `virals-marketing-squad` | conteúdo, tráfego, pipeline ClickUp | `/marketing-chief` |
| `oraclumtech-ai-creative-studio` | produção audiovisual local (ComfyUI) | `/studio-chief` |

### Oraclum Tech · AI Creative Studio

Regra de ouro: **o squad DIRIGE a geração; quem GERA é o humano**, no ComfyUI
local. Nenhuma task produz pixel ou áudio sozinha — elas escrevem prompts, montam
filas de job, medem o resultado e decidem o que refazer. O que roda de verdade é
`squads/oraclumtech-ai-creative-studio/assets/comfyui/run_batch.py`.

- Guia operacional completo (como rodar tudo na mão):
  `squads/oraclumtech-ai-creative-studio/docs/GUIA-MANUAL.html`
- Sem persona, passo a passo, para modelo fraco ou sessão sem contexto:
  `/pipeline-manual`
- **Uma tarefa pesada por vez.** A máquina tem 16 GB e o gargalo é RAM, não VRAM.
