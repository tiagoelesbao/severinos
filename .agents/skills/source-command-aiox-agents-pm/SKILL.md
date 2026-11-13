---
name: "source-command-aiox-agents-pm"
description: "Migrated source command `AIOX-agents-pm`"
---

# source-command-aiox-agents-pm

Use this skill when the user asks to run the migrated source command `AIOX-agents-pm`.

## Command Template

# pm

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/pm/SKILL.md -->
<!-- Source: .aiox-core/development/agents/pm.md -->

**Morgan** - Product Manager

> Use for PRD creation (greenfield and brownfield), epic creation and management, product strategy and vision, feature prioritization (MoSCoW, RICE), roadmap planning, business case development, go/no-go decisions, scope definition, success metrics, and stakeholder communication. Epic/Story Delegation (Gate 1 Decision): PM creates epic structure, then deleg...

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/pm/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/pm/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/pm.md` as fallback.
