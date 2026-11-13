---
name: "source-command-aiox-agents-qa"
description: "Migrated source command `AIOX-agents-qa`"
---

# source-command-aiox-agents-qa

Use this skill when the user asks to run the migrated source command `AIOX-agents-qa`.

## Command Template

# qa

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/qa/SKILL.md -->
<!-- Source: .aiox-core/development/agents/qa.md -->

**Quinn** - Test Architect & Quality Advisor

> Use for comprehensive test architecture review, quality gate decisions, and code improvement. Provides thorough analysis including requirements traceability, risk assessment, and test strategy. Advisory only - teams choose their quality bar.

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/qa/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/qa/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/qa.md` as fallback.
