# Configuração de projeto do Antigravity CLI (`agy`)

O **Antigravity CLI** (comando `agy`) é o sucessor do Gemini CLI. Ele reaproveita o
home `~/.gemini/` e usa esta pasta **`.agents/`** para configuração **por-workspace**.

> ⚠️ Não confundir com `.antigravity/` (plataforma agêntica / IDE) nem com `.agent/`
> (workflows do AIOX). São três coisas distintas.

## O que o `agy` lê

| Escopo | Caminho | Função |
|--------|---------|--------|
| Projeto | `.agents/mcp_config.json` | Servidores MCP por-workspace |
| Projeto | `AGENTS.md` (raiz) | Contexto/regras do projeto (formato padrão) — **já existe** |
| Projeto | `GEMINI.md` (raiz) | Contexto legado do Gemini CLI (fallback) |
| Global | `~/.gemini/GEMINI.md` | Instruções globais |
| Global | `~/.gemini/antigravity-cli/settings.json` | Settings do `agy` (tema, permissões) |
| Global | `~/.gemini/antigravity-cli/keybindings.json` | Atalhos (via `/keybindings`) |
| Global | `~/.gemini/config/mcp_config.json` | MCP global |

## Contexto do projeto

O contexto de regras vem do **`AGENTS.md`** na raiz (já mantido pelo AIOX) — o mesmo
arquivo lido pelo OpenCode/Codex. Não há pasta de regras/agentes própria do `agy` por-projeto:
ele é uma TUI leve, então a personalização por-workspace concentra-se em MCP + `AGENTS.md`.

## Segredos

Use variáveis de ambiente (`${CLICKUP_API_KEY}`) em vez de chaves em texto puro.
Defina no `.env` do projeto ou no ambiente do shell antes de rodar `agy`.

---
_Convenção confirmada em docs da comunidade (jul/2026); valide localmente com `agy /config`._
