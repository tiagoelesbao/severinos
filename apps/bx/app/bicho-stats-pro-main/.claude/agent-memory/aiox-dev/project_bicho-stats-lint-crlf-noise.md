---
name: bicho-stats-lint-crlf-noise
description: In bicho-stats-pro, `eslint .` reports hundreds of pre-existing prettier CRLF errors repo-wide — do not "fix" them
metadata:
  type: project
---

`npm run lint` / `eslint .` in bicho-stats-pro fails on every file with `prettier/prettier: Delete \`␍\`` — a Windows checkout artifact affecting untouched files too (e.g. `src/lib/bicho.ts` alone reports ~90). There is no `typecheck` script; use `./node_modules/.bin/tsc --noEmit` (clean) and `bun run build`.

**Why:** Running `eslint --fix` repo-wide would produce a massive line-ending-only diff unrelated to any story, polluting a repo that auto-deploys to Vercel on push.

**How to apply:** Lint only the files you touched and filter out the `Delete ␍` messages (e.g. `eslint -f json <files>` piped through a filter) to see whether you introduced real issues. Also: `bun run build` rewrites `src/routeTree.gen.ts` with a line-ending-only change — restore it with `git checkout --` instead of staging it.

Related: [[bicho-stats-canonical-dir]]
