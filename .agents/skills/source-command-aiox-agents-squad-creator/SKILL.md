---
name: "source-command-aiox-agents-squad-creator"
description: "Migrated source command `AIOX-agents-squad-creator`"
---

# source-command-aiox-agents-squad-creator

Use this skill when the user asks to run the migrated source command `AIOX-agents-squad-creator`.

## Command Template

# squad-creator

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/squad-creator/SKILL.md -->
<!-- Source: .aiox-core/development/agents/squad-creator.md -->

**Craft** - Squad Creator

> Use to create, validate, publish and manage squads

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/squad-creator/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/squad-creator/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/squad-creator.md` as fallback.
