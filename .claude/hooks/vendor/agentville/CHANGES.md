# Alterações feitas nos arquivos vendorizados

A Seção 4(c) da Apache License 2.0 exige aviso proeminente de quais arquivos foram alterados.
Esta é a lista completa. O `NOTICE` e o `LICENSE` originais estão preservados neste diretório.

Origem: <https://github.com/soumatheusgomes/agentville> · Apache-2.0 © 2026 Matheus Gomes.

| Arquivo | Alterado? | O que mudou |
|---|---|---|
| `secret-scan.mjs` | **não** | Idêntico ao original. |
| `large-file-warning.mjs` | **não** | Idêntico ao original. Depende de `session-scratch.mjs`. |
| `validate-settings-schema.mjs` | **não** | Idêntico ao original. Depende de `session-scratch.mjs`. |
| `subagent-model-guard.mjs` | **não** | Idêntico ao original. |
| `session-scratch.mjs` | **não** | Idêntico ao original. Vendorizado porque é dependência dos dois hooks acima. |
| `guard-build-artifacts.mjs` | **SIM** | A lista de artefatos protegidos foi substituída. O original guardava uma extensão de VS Code (`dist/` e `*.vsix`). Aqui ela guarda as árvores geradas deste monorepo: `dist/`, `build/`, `out/`, `.next/`, `storybook-static/`, `node_modules/`, `__pycache__/`, `.pytest_cache/`, `coverage/`, `outputs/`, `apps/creative-design/public/render-assets/`, `*.vsix`, `*.pyc`. Também passou a normalizar separador de caminho do Windows. A mensagem de negação foi reescrita para refletir a nova lista. |

## Estado de ativação

| Hook | Ligado? | Evento |
|---|---|---|
| `secret-scan.mjs` | **sim** | `PreToolUse` · matcher `Edit|Write|MultiEdit` |
| `guard-build-artifacts.mjs` | não | `PreToolUse` · matcher `Edit|Write|MultiEdit` |
| `large-file-warning.mjs` | não | `PostToolUse` (advisory) ou `Stop` (bloqueante) |
| `validate-settings-schema.mjs` | não | `PostToolUse` |
| `subagent-model-guard.mjs` | não | `PreToolUse` · matcher `Agent` |

A decisão de ligar só o `secret-scan` foi do founder: é o único que previne dano irreversível
(um segredo escrito em arquivo e depois commitado). O snippet para ligar os outros está em
`docs/guides/BIBLIA-SEVERINOS.md`.

### Cuidado com o `subagent-model-guard`

Ele força `model: sonnet` em qualquer dispatch de subagente sem modelo explícito. Os 10 agentes
`aiox-*` em `.claude/agents/` **declaram** `model:` no frontmatter, então a regra 2 do hook os
respeita. O risco está em dispatch `general-purpose` ad hoc: ligá-lo rebaixa silenciosamente
esses para sonnet. Ligue só se isso for o que você quer.

### Cuidado com o `large-file-warning` em modo `Stop`

Teto de 350 linhas. Neste monorepo há arquivos de pipeline bem maiores que isso e ligá-lo em modo
bloqueante travaria o encerramento de sessão até refatorar. Se quiser adotar, comece em
`PostToolUse` (advisory).
