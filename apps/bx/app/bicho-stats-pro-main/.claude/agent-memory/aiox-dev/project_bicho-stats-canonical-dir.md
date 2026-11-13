---
name: bicho-stats-canonical-dir
description: For the bicho-stats-pro app, the canonical working dir is app/bicho-stats-pro (real git clone), NOT app/bicho-stats-pro-main
metadata:
  type: project
---

Two sibling folders exist under `C:\Users\Pichau\Desktop\bx\app\`: `bicho-stats-pro` and `bicho-stats-pro-main`. Only **`bicho-stats-pro`** is a real git clone of `tiagoelesbao/bicho-stats-pro` (carries the Lovable history and the `origin` remote). `bicho-stats-pro-main` is often the session cwd but is not the repo to commit into.

**Why:** The app is deployed on Vercel with auto-deploy on push to `main`, so commits must land in the real clone with intact history. Never `git init` or rewrite history in it.

**How to apply:** When a task mentions bicho-stats-pro, use absolute paths into `app\bicho-stats-pro\` for every read/edit/git call, even though the Bash cwd may reset to `bicho-stats-pro-main`. Push stays exclusive to @devops.

Related: [[bicho-stats-lint-crlf-noise]]
