---
name: test-triage
description: Rank the functions/modules changed this session by test-worthiness and output TEST / integration-only / SKIP per symbol. Uses `aiox graph --deps` for blast radius when available, a static rubric otherwise. Use when you changed several units and are unsure which deserve a unit test, or before writing tests for a batch of new code.
---

<!-- Importado de soumatheusgomes/agentville (.claude/skills/test-triage). Apache-2.0 (c) 2026 Matheus Gomes.
     ADAPTADO: graphify trocado por `aiox graph --deps`; politica de teste apontada para a nossa. -->

# Test triage — what to test among your changes

Decide which changed units deserve a unit test. Aid, not enforcer — you still decide.
Policy = the Testing Requirements in `.claude/CLAUDE.md` plus the quality gates in
`.claude/rules/story-lifecycle.md`. This skill applies them to a batch, with objective signals.

## 1. Collect changed symbols

Take the functions / modules you created or changed this session. Confirm with:

- `git status --short` and `git diff --name-only` (uncommitted), or
- `git diff --name-only <base>...HEAD` if the work is committed.

List the concrete symbols (functions, classes, components) touched — not just files.

## 2. Score each symbol

TRIGGER first: does it have real logic (branch, loop, calculation, parser,
non-trivial condition — ~CC ≥ 2)? No logic → **SKIP** (trivial getter, wrapper,
pass-through, config, presentational UI).

If it has logic, weigh amplifiers:

- Business rule / money / security / auth → strong TEST.
- Reused / high fan-in / big blast radius → strong TEST.
- Pure presentational component, thin wrapper → SKIP or integration-only.

### With the AIOX graph (preferred here)

We do not have graphify. We have the graph dashboard, which answers the same question:

```bash
aiox graph --deps --format=json      # dependency tree of the package
aiox graph --stats                   # entity stats and cache metrics
```

- Count how many modules reach the symbol's module. Default: 3 or more callers meets the
  amplifier (tune per package).
- A module inside an import cycle carries extra risk.

### Without the graph

- Blast radius ≈ number of callers: `Grep` the repo for the symbol name.
- Judge logic + business/security by reading the code.

## 3. Output the triage table

One row per symbol:

| Symbol | Signal | Verdict | Why |
| --- | --- | --- | --- |
| `calcTax()` | affected 7, business | **TEST** | tax rule, wide blast radius |
| `Badge.tsx` | presentational | SKIP | styling-only |
| `wireRoutes()` | affected 4, no logic | integration-only | glue, cover via 1 route test |

Verdicts: **TEST** (happy + edge), **integration-only** (cover via one
higher-level test), **SKIP** (no value).

## 4. Act

Write tests only for TEST rows. State the SKIP / integration-only calls so the
user can override. Do not pad SKIP symbols with empty tests.
