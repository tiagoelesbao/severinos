# EPIC-MKT-Runtime-Conformity — Conformidade Multi-Runtime dos Agentes Virals Marketing

**Status:** Executado · 2026-05-19 (6 stories Done; RTC-06 com validação operacional dependente dos runtimes externos)
**Autor:** @marketing-chief + @architect
**Epic irmão:** EPIC-MKT-Creative-AIOX-Alignment (estrutura interna do squad)

## Problema
As definições dos agentes do squad Virals Marketing **divergem entre os 3 runtimes**
(Claude Code, Antigravity, Gemini). Os 3 pipelines do `@marketing-chief` —
`*daily-monitor`, `*creative-benchmark`, `*design-creative` — só estão garantidos
atualizados no Claude. Antigravity e Gemini estão incompletos/desatualizados.

## Matriz de divergência (marketing)

| Agente | `.claude` (canônico) | `squads/.../agents/` | `.antigravity/agents+rules/` | `.gemini/commands+rules/` |
|---|---|---|---|---|
| marketing-chief | ✅ atual (6-etapas) | ✅ (verificar conteúdo) | ❌ **ausente** | ✅ (verificar protocolos) |
| casey-neistat-img | ✅ | ✅ | ❌ **ausente** | ❌ **ausente** |
| sam-kolder-vid | ✅ | ✅ | ❌ **ausente** | ❌ **ausente** |
| ezra · fishkin · garyvee · georgi · ladeira · mrbeast · perry | ✅ | ✅ | ⚠️ existe (conteúdo pode divergir) | ⚠️ existe (conteúdo pode divergir) |

**6 locações de definição:** `.claude/commands/VIRALS/agents/` (canônico) ·
`squads/virals-marketing-squad/agents/` (lido pelo Gemini) ·
`.antigravity/agents/` + `.antigravity/rules/agents/` ·
`.gemini/commands/*.toml` + `.gemini/rules/AIOX/agents/`.

## Objetivo
Paridade funcional dos agentes de marketing nos 3 runtimes — para que o fluxo
completo `*daily-monitor` → `*creative-benchmark` → `*design-creative` rode
identicamente via Claude Code, Antigravity e Gemini.

## Princípios
1. **Fonte canônica única:** `.claude/commands/VIRALS/agents/*.md` (já definido no CLAUDE.md).
2. As demais locações são **derivadas** — nunca editadas à mão como fonte.
3. Sincronização preferencialmente **automatizada** (script), não manual.
4. Conformidade = mesma persona + mesmos comandos + mesmos protocolos em todo runtime.

## Stories

| Story | Entrega |
|---|---|
| **RTC-01** | Matriz de divergência completa + fonte canônica formalizada |
| **RTC-02** | Protocolo e script de sincronização de agentes (canônico → derivados) |
| **RTC-03** | Conformidade `.antigravity` (add chief/casey/sam; atualizar os 7; naming) |
| **RTC-04** | Conformidade `.gemini` (add casey/sam em commands+rules; atualizar protocolos) |
| **RTC-05** | Conformidade `squads/virals-marketing-squad/agents/` (cópias do squad) |
| **RTC-06** | Validação dos 3 fluxos × 3 runtimes |

## Riscos
- **R1:** Formatos distintos — `.md` (Claude/Antigravity), `.toml` + rules `.md` (Gemini).
  O script de sync precisa gerar cada formato.
- **R2:** Naming inconsistente no `.antigravity` (ex.: `dalio.md` vs `virals-ops-dalio.md`).
- **R3:** As cópias podem ter divergido em conteúdo — não só ausência de arquivo.
- **R4:** Greeting/activation: o Gemini renderiza greeting via script Node — confirmar paridade.

## Dependências
- `*design-creative` estável (EPIC-MKT-Creative-Intelligence + Editor + AIOX-Alignment). ✔
- Idealmente após EPIC-MKT-Creative-AIOX-Alignment (paths AIOX estáveis antes de propagar).

## Estimativa
6 stories · epic de porte M · sem risco de produto (sincronização de definições).
