---
name: aiox-commit
description: >
  Create a local conventional commit for AIOX work, after a verification gate. Never pushes.
  Use when: committing, /aiox-commit, or local git commit.
user-invocable: true
---

# AIOX Local Commit

## 1. Verification gate — before staging anything

Run, in this order, **only for the packages the change actually touches**. Stop at the first
failure, show the real output, and fix it before continuing. Never report success for a step you
did not run and read.

| Ordem | Comando | Pular quando |
|---|---|---|
| 1 | `npm run typecheck` | o pacote não define o script |
| 2 | `npm run lint` | o pacote não define o script |
| 3 | `npm test` | o pacote não define o script |

Which package: match the changed paths to the app. `apps/video-studio/**` → run inside
`apps/video-studio`. Changes in `squads/`, `docs/`, `.claude/` or `services/` have no build and
skip the gate — say so in one line instead of pretending it ran.

**A missing script is not a pass.** If a package has test files but no `test` script, that is a
defect: wire the script, run it, and commit that too. This is exactly how 222 tests sat invisible
in `video-studio` and `creative-design`.

> Python surfaces (`apps/canal-*`, `apps/infra`, `services/ETL`, squad scripts) have no unified
> runner today. Run what exists (`python -m pytest` where there are tests) and state plainly when
> there is nothing to run.

## 2. Commit

1. `git status` and `git diff` (and `git diff --staged`).
2. Stage only relevant files. **Never force-add a secret**; `.env`, `*.key`, `*.pem`, cookies and
   `config/business.json` stay out.
3. One commit per coherent change. Do not mix a framework migration, a new feature and a fix in
   the same commit — the history is how the next person reconstructs intent.
4. Conventional message + story id when known:

```text
feat: short description [Story X.Y]
fix: short description [Story X.Y]
docs: ...
test: ...
chore: ...
```

## 3. Stop

Do **NOT** push. Tell the user to activate `@devops` for push, PR and merge — it is exclusive by
the Constitution (Article II) and enforced by `enforce-git-push-authority.cjs`.

## Forbidden

- Pushing to the remote, `--force`, or `git commit --no-verify` to bypass gates
- Amending published commits without explicit user request
- Reporting the gate as passed when a step was skipped
