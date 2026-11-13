# Configuração OpenCode — projeto Virals (`severinos`)

Reproduz a **dinâmica AIOX do Claude Code dentro do chat do OpenCode**:

- **`/agente`** → ativa um agente AIOX (ex.: `/marketing-chief`)
- **`*task`** → pede uma ação padronizada ao agente já ativado (ex.: `*daily-monitor`)

Regra de ouro: **NADA de lógica duplicada aqui — só ponteiros para a fonte única `squads/`.**

## Como o mapeamento funciona

No Claude Code, os agentes são **slash commands** (`/VIRALS:agents:marketing-chief`).
No OpenCode, o equivalente de `/` é o **command** — então cada agente vira um arquivo
em `.opencode/commands/`, e **não** em `.opencode/agents/` (que geraria `@`/Tab, que
não é o que queremos).

```
.opencode/commands/marketing-chief.md   →   comando  /marketing-chief
```

Esse command **injeta o arquivo core do agente** (fonte única) via `@`:

```markdown
---
description: "Ativa @marketing-chief. Depois use *daily-monitor, *creative-benchmark…"
---
A partir de AGORA, incorpore o agente AIOX abaixo. Siga as activation-instructions,
exiba o greeting e HALT aguardando meus comandos *…

@squads/virals-marketing-squad/agents/marketing-chief.md
```

O `@squads/...` embute o conteúdo do arquivo core na conversa (caminho relativo à raiz).
Como o command roda **na sessão atual** (não usa `subtask`), a persona persiste: os
comandos `*` seguintes continuam no mesmo agente — igual ao Claude Code.

## O ciclo completo (`/` → `*`)

1. Você digita `/marketing-chief` no chat do OpenCode.
2. O OpenCode injeta `squads/virals-marketing-squad/agents/marketing-chief.md` na conversa.
3. O modelo adota a persona (ACTIVATION-NOTICE + activation-instructions), mostra o
   greeting e para.
4. Você digita `*daily-monitor`. O agente resolve pela sua tabela `commands` /
   `IDE-FILE-RESOLUTION` → lê `squads/virals-marketing-squad/tasks/daily-social-discovery.md`
   e executa. **Zero config extra por task** — a definição já vive no arquivo core.

## Fonte única = `squads/`

Todo o comportamento vem de `squads/*/agents/*.md` (core) + `squads/*/{tasks|templates|…}/`
(dependências). Editar lá propaga para OpenCode, Claude, Cursor, etc. na próxima execução.
Os arquivos em `.opencode/commands/` são wrappers de ~10 linhas que só apontam.

## Estrutura

```
opencode.json                        # schema, model default, instructions(globs), permission, mcp
AGENTS.md (raiz)                     # regras do projeto — lidas nativamente
.opencode/
└─ commands/<agente>.md              # WRAPPER → @squads/*/agents/<agente>.md
```

## Comandos disponíveis hoje

| Comando | O que ativa |
|---|---|
| `/marketing-chief` | CMO da Virals — pipeline ClickUp completo |
| `/studio-chief` | Oraclum Tech · AI Creative Studio — produção audiovisual local |
| `/pipeline-manual` | **Sem persona.** Conduz o pipeline do Oraclum passo a passo, com os comandos exatos |

`/pipeline-manual` existe para o caso de fallback: modelo fraco, sessão nova sem
contexto, ou simplesmente querer o comando sem conversa. Ele aponta para o guia
`squads/oraclumtech-ai-creative-studio/docs/GUIA-MANUAL.html`, que traz o pipeline
inteiro com o porquê de cada decisão e as armadilhas já pagas.

## Escalar para os 40+ agentes

Cada agente = um `.opencode/commands/<id>.md` de ~10 linhas apontando com `@` para
`squads/<squad>/agents/<id>.md`. Candidato a ser gerado pelo `sync:ide`.

## Modelo / Provider (ação sua)

`model` default = `opencode/claude-opus-4-8` (provider **OpenCode Zen**, cobra à parte).
No teste headless o agente carregou e o modelo é válido — faltou só método de pagamento.
Para usar outra credencial: `opencode auth login` e ajuste o `model` no `opencode.json`.
