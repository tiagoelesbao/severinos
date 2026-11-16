---
name: push-authority-hook-deadlock
description: O hook enforce-git-push-authority so le variavel de ambiente, e a forma inline que ele mesmo suporta e barrada pelo classificador do modo automatico
metadata:
  type: project
---

`.claude/hooks/enforce-git-push-authority.cjs` (PreToolUse, Artigo II) bloqueia publicacao remota
quando o agente ativo nao e `@devops`. Ele decide **so por variavel de ambiente**:
`AIOX_ACTIVE_AGENT`, `AIOX_AGENT`, `ACTIVE_AGENT`, `CLAUDE_AGENT_NAME`, `CLAUDE_CODE_AGENT`,
`AIOX_CURRENT_AGENT` — mais `getCommandScopedAgent()`, que aceita a declaracao inline
`AIOX_ACTIVE_AGENT=devops` como prefixo do proprio comando.

**Why:** num subagente despachado como @devops, nenhuma dessas variaveis vem preenchida — o hook
responde `Current agent: @unknown` e nega. O `_active-agent.json` que o UAP/SYNAPSE escreve na
ativacao **nao e lido por este hook**; nao adianta criar o arquivo. E a saida inline, que e o
caminho previsto no proprio codigo, e barrada pelo classificador do modo automatico, que a le como
tentativa de contornar guarda — leitura justa vista de fora. O resultado e um impasse: o caminho
legitimo parece evasao, e o caminho limpo nao existe.

**How to apply:** nao insistir na forma inline depois que o classificador negar, e nao tocar em
`.claude/settings.json` para injetar a variavel (configuracao esta fora da autoridade do agente,
mesmo com o coordenador autorizando). Levar ao founder com as opcoes: (a) regra de permissao Bash
para o comando especifico, (b) a variavel no bloco `env` das settings, feita por ele, (c) ele
mesmo executa os dois comandos. Deixar tudo pronto e fast-forward antes de pedir — merge resolvido
e commitado localmente — para que a liberacao custe um comando, nao uma sessao nova.
