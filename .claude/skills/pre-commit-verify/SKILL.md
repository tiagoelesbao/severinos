---
name: pre-commit-verify
description: Full verification gate before a commit or PR — typecheck, lint, and tests must all pass. Use before committing, opening a PR, or claiming work complete.
---

<!-- Importado de soumatheusgomes/agentville (.claude/skills/pre-commit-verify). Apache-2.0 (c) 2026 Matheus Gomes.
     ADAPTADO: comandos e escopo por pacote ajustados a este monorepo. -->

# Pre-commit verification

Run, in order, **inside each package the change actually touches** — not at the repo root, which
has no build:

1. **Typecheck** — `npm run typecheck`
2. **Lint** — `npm run lint`
3. **Tests** — `npm test`

Stop at the first failure, report the actual output, and fix it before continuing. Only report
success once every step has passed with output you have seen.

## Which package

Match changed paths to the app:

| Mudou em | Rode dentro de |
|---|---|
| `apps/<nome>/**` | `apps/<nome>` |
| `services/clickup/**` | `services/clickup` |
| `squads/**`, `docs/**`, `.claude/**` | nada a rodar — diga isso em uma linha |

## A missing script is not a pass

If a package has test files but no `test` script, that is a defect: wire the script, run it, and
include that in the change. Two apps here had 222 passing tests that nothing ever ran, for exactly
this reason.

Python surfaces (`apps/canal-*`, `apps/infra`, `services/ETL`) have no unified runner. Run what
exists and state plainly when there is nothing to run.

Do not commit on the user's behalf unless they explicitly ask. Pushing is `@devops` only.
