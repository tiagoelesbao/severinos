---
name: "source-command-aiox-agents-sm"
description: "Migrated source command `AIOX-agents-sm`"
---

# source-command-aiox-agents-sm

Use this skill when the user asks to run the migrated source command `AIOX-agents-sm`.

## Command Template

# sm

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/sm/SKILL.md -->
<!-- Source: .aiox-core/development/agents/sm.md -->

**River** - Scrum Master

> Use for user story creation from PRD, story validation and completeness checking, acceptance criteria definition, story refinement, sprint planning, backlog grooming, retrospectives, daily standup facilitation, and local branch management (create/switch/list/delete local branches, local merges). Epic/Story Delegation (Gate 1 Decision): PM creates epic str...

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/sm/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/sm/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/sm.md` as fallback.
