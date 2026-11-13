---
name: "source-command-aiox-agents-dev"
description: "Migrated source command `AIOX-agents-dev`"
---

# source-command-aiox-agents-dev

Use this skill when the user asks to run the migrated source command `AIOX-agents-dev`.

## Command Template

# dev

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/dev/SKILL.md -->
<!-- Source: .aiox-core/development/agents/dev.md -->

**Dex** - Full Stack Developer

> Use for code implementation, debugging, refactoring, and development best practices

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/dev/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/dev/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/dev.md` as fallback.
