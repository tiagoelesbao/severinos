---
name: "source-command-aiox-agents-po"
description: "Migrated source command `AIOX-agents-po`"
---

# source-command-aiox-agents-po

Use this skill when the user asks to run the migrated source command `AIOX-agents-po`.

## Command Template

# po

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/po/SKILL.md -->
<!-- Source: .aiox-core/development/agents/po.md -->

**Pax** - Product Owner

> Use for backlog management, story refinement, acceptance criteria, sprint planning, and prioritization decisions

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/po/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/po/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/po.md` as fallback.
