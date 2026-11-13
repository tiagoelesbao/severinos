# Divergence Matrix — Agentes Virals Marketing × Runtimes

> **Artefato de RTC-01.** Snapshot do estado dos 10 agentes do squad nos 3 runtimes
> e 6 locações de definição. Atualizado em 2026-05-19.
>
> **Fonte canônica formal:** `.claude/commands/VIRALS/agents/*.md`
> (já formalizado no `.claude/CLAUDE.md` → seção "Fontes de Definição").
> As demais locações são DERIVADAS — nunca editar como fonte.

## Locações inventariadas (6)

| # | Path | Runtime | Formato |
|---|---|---|---|
| L1 | `.claude/commands/VIRALS/agents/marketing-*.md` | Claude Code | `.md` (canônico) |
| L2 | `squads/virals-marketing-squad/agents/*.md` | Squad (lido pelo Gemini) | `.md` |
| L3 | `.antigravity/agents/marketing-*.md` | Antigravity | `.md` |
| L4 | `.antigravity/rules/agents/marketing-*.md` | Antigravity (rules) | `.md` |
| L5 | `.gemini/commands/virals-marketing-*.toml` | Gemini (slash) | `.toml` (shim) |
| L6 | `.gemini/rules/AIOX/agents/virals-marketing-*.md` | Gemini (rules) | `.md` |

## Matriz agente × runtime

Legenda: ✅ OK (existe + conteúdo atual) · ⚠️ defasado · ❌ ausente

| Agente | L1 (.claude) | L2 (squad) | L3 (.antigravity/agents) | L4 (.antigravity/rules) | L5 (.gemini/cmds) | L6 (.gemini/rules) |
|---|---|---|---|---|---|---|
| marketing-chief | ✅ atual (3 protocolos: monitor/benchmark/design) | ⚠️ design-creative path sincronizado em AIOX-06; falta validar tudo | ❌ ausente | ❌ ausente | ⚠️ falta `*design-creative` (verificado) | ⚠️ falta `*design-creative` e `*creative-benchmark` (verificado) |
| mrbeast-mk | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |
| garyvee-mk | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |
| ladeira | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |
| georgi | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |
| casey-neistat-img | ✅ | ✅ | ❌ ausente | ❌ ausente | ❌ ausente | ❌ ausente |
| sam-kolder-vid | ✅ | ✅ | ❌ ausente | ❌ ausente | ❌ ausente | ❌ ausente |
| perry-marshall | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |
| ezra-firestone | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |
| fishkin-mk | ✅ | ✅ (verificar) | ✅ (verificar conteúdo) | ✅ (verificar conteúdo) | ✅ | ✅ |

### Naming observado por runtime

| Runtime | Convenção |
|---|---|
| `.claude/commands/VIRALS/agents/` | `marketing-{slug}.md` (ex.: `marketing-chief.md`, `marketing-mrbeast-mk.md`) |
| `squads/virals-marketing-squad/agents/` | `{slug}.md` (sem prefixo `marketing-`) — divergência de naming a resolver em RTC-05 |
| `.antigravity/agents/` e `.antigravity/rules/agents/` | `marketing-{slug}.md` |
| `.gemini/commands/` | `virals-marketing-{slug}.toml` |
| `.gemini/rules/AIOX/agents/` | `virals-marketing-{slug}.md` |

## Gaps Críticos

1. **`marketing-chief.md` ausente no Antigravity** (L3 e L4). O orquestrador do squad não roda via Antigravity hoje.
2. **`casey-neistat-img.md` e `sam-kolder-vid.md` ausentes em Antigravity e Gemini** (L3-L6). Não é possível invocar `@casey-neistat-img` ou `@sam-kolder-vid` fora do Claude Code.
3. **Protocolos `*design-creative` e `*creative-benchmark` ausentes em todas as cópias do chief fora do Claude** (verificado por `grep` em `.antigravity/` e `.gemini/`).
4. **Naming inconsistente entre L1 e L2** — L1 usa prefixo `marketing-`; L2 omite (verificar shims do Gemini).

## Conteúdo "OK (verificar)"

As linhas marcadas como `(verificar)` indicam que o arquivo existe mas o conteúdo
NÃO foi byte-comparado com o canônico nesta story. O script `sync-agents` (RTC-02)
fornecerá o modo `--check` que detecta divergência sem alterar arquivos.

## Próximos passos

- **RTC-02:** script `sync-agents` (deriva todas as cópias a partir de L1).
- **RTC-03:** Adicionar chief/casey/sam em L3+L4 (Antigravity).
- **RTC-04:** Adicionar casey/sam em L5+L6 (Gemini) + atualizar protocolos do chief.
- **RTC-05:** Sincronizar L2 (squad copies) e resolver naming.
- **RTC-06:** Validação ponta-a-ponta dos 3 fluxos × 3 runtimes.

## Princípios formalizados (CLAUDE.md → "Fontes de Definição")

> `.claude/commands/VIRALS/agents/*.md` é a fonte canônica dos agentes Virals — editar SEMPRE aqui. Os arquivos em `squads/*/agents/`, `.antigravity/agents/` e `.aiox-core/development/agents/` são cópias secundárias e podem divergir; não são autoridade.

**Estendendo a fonte canônica para os runtimes Gemini/Antigravity adicionados nesta
matriz:** `.gemini/commands/*.toml`, `.gemini/rules/AIOX/agents/*.md`,
`.antigravity/rules/agents/*.md` também são DERIVADAS, geradas a partir de L1.
