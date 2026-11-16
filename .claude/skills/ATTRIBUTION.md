# Procedência das skills de terceiros

Este arquivo registra a origem e a licença de todo material de terceiros instalado em
`.claude/skills/`. Skills sem entrada aqui são autorais da Virals/Severinos.

## mattpocock/skills — MIT © 2026 Matt Pocock

Fonte: <https://github.com/mattpocock/skills>

Importadas (18), em `.claude/skills/`:

| Skill | Origem no repo | Alteração nossa |
|---|---|---|
| `grilling` | `skills/productivity/grilling` | — |
| `grill-me` | `skills/productivity/grill-me` | — |
| `grill-with-docs` | `skills/engineering/grill-with-docs` | — |
| `domain-modeling` | `skills/engineering/domain-modeling` | — |
| `codebase-design` | `skills/engineering/codebase-design` | — |
| `tdd` | `skills/engineering/tdd` | — |
| `diagnosing-bugs` | `skills/engineering/diagnosing-bugs` | — |
| `code-review-2axis` | `skills/engineering/code-review` | **Renomeada** (colide com a skill nativa `code-review` do Claude Code); ponteiro de setup trocado por `docs/agents/issue-tracker.md` |
| `pr` | `skills/engineering/pr` | — |
| `prototype` | `skills/engineering/prototype` | — |
| `retro` | `skills/engineering/retro` | — |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` | — |
| `wizard` | `skills/engineering/wizard` | — |
| `wayfinder` | `skills/engineering/wayfinder` | Ponteiro de setup trocado por `docs/agents/issue-tracker.md` |
| `teach` | `skills/productivity/teach` | — |
| `to-questionnaire` | `skills/productivity/to-questionnaire` | — |
| `wait-what` | `skills/productivity/wait-what` | — |
| `writing-for-agents` | `skills/productivity/writing-for-agents` | — |
| `writing-shape` | `skills/in-progress/writing-shape` | — (importada na 2ª rodada, 2026-11-12) |

**Deliberadamente NÃO importadas** e por quê — ver `docs/guides/BIBLIA-SEVERINOS.md`, seção
"Mapa de equivalências":

| Não importada | Motivo | Equivalente nosso |
|---|---|---|
| `to-spec` | duplicaria o ciclo de story do AIOX | `@pm` spec pipeline |
| `to-tickets` | idem | `@sm *draft` / `@pm *create-epic` |
| `implement` | idem | `/develop-story` |
| `implement-spec` | idem | `/wave-execute` |
| `triage` | idem (e nosso tracking de negócio vive no ClickUp) | `@po` backlog |
| `research` | sobreposição total | `/tech-search` |
| `handoff` | já coberto por regra | `.claude/rules/agent-handoff.md` |
| `ask-matt` | roteador do catálogo dele | adaptado como `skill-router` (autoral) |
| `setup-matt-pocock-skills` | executado manualmente uma vez | `docs/agents/issue-tracker.md` + `docs/agents/domain.md` |
| `misc/*`, `in-progress/*` | congeladas/experimentais ou não aplicáveis | — |

## ag-kit (via agentville) — MIT © vudovn

Fonte: <https://github.com/vudovn/ag-kit>, redistribuído por
<https://github.com/soumatheusgomes/agentville>.

| Skill | Alteração nossa |
|---|---|
| `powershell-windows` | — (cabeçalho de procedência original preservado) |

## agentville — Apache License 2.0 © 2026 Matheus Gomes

Fonte: <https://github.com/soumatheusgomes/agentville>

Hooks vendorizados em `.claude/hooks/vendor/agentville/`. A §4 da licença exige preservar o
`NOTICE` — ele está em `.claude/hooks/vendor/agentville/NOTICE`.

Skills importadas na segunda rodada (2026-11-12), em `.claude/skills/`:

| Skill | Alteração nossa |
|---|---|
| `test-triage` | **Adaptada** — `graphify` trocado por `aiox graph --deps`; política de teste apontada para `.claude/CLAUDE.md` + `story-lifecycle.md` |
| `pre-commit-verify` | **Adaptada** — comandos por pacote deste monorepo; regra "script ausente não é aprovação" |
| `setup-testing` | **Adaptada** — tabela de stacks reduzida aos nossos quatro; aviso para procurar teste existente antes de instalar |

## Framework 5P — Matheus Gomes (sem arquivo de licença no repo de origem)

Fonte: <https://github.com/soumatheusgomes/framework-5p>

A skill `oferta-5p` é **nossa adaptação** do método, com atribuição. O prompt original está
vendorizado como referência em `docs/reference/framework-5p/`, com a ressalva de licença
registrada lá.

## Pacotes "Manual de Processo" e "Proposta Comercial" — autor não declarado no pacote

Distribuídos como pacotes de instalação prontos. Skills `manual-de-processo` e
`proposta-comercial` importadas com o conteúdo original e nota de procedência.
Ver `docs/reference/PROCEDENCIA.md`.
