---
name: "source-command-aiox-agents-devops"
description: "Migrated source command `AIOX-agents-devops`"
---

# source-command-aiox-agents-devops

Use this skill when the user asks to run the migrated source command `AIOX-agents-devops`.

## Command Template

# devops

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/devops/SKILL.md -->
<!-- Source: .aiox-core/development/agents/devops.md -->

**Gage** - GitHub Repository Manager & DevOps Specialist

> Use for repository operations, version management, CI/CD, quality gates, and GitHub push operations. ONLY agent authorized to push to remote repository.

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/devops/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/devops/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/devops.md` as fallback.
