---
name: "source-command-aiox-agents-architect"
description: "Migrated source command `AIOX-agents-architect`"
---

# source-command-aiox-agents-architect

Use this skill when the user asks to run the migrated source command `AIOX-agents-architect`.

## Command Template

# architect

<!-- ACORE-Codex-AGENT-COMMAND: legacy-shim -->
<!-- Canonical Skill: .Codex/skills/AIOX/agents/architect/SKILL.md -->
<!-- Source: .aiox-core/development/agents/architect.md -->

**Aria** - Architect

> Use for system architecture (fullstack, backend, frontend, infrastructure), technology stack selection (technical evaluation), API design (REST/GraphQL/tRPC/WebSocket), security architecture, performance optimization, deployment strategy, and cross-cutting concerns (logging, monitoring, error handling). NOT for: Market research or competitive analysis → U...

## Compatibility Activation

This command is a legacy compatibility shim. The canonical Codex activation payload is:

`.Codex/skills/AIOX/agents/architect/SKILL.md`

When this command is invoked:

1. Read `.Codex/skills/AIOX/agents/architect/SKILL.md` in full.
2. Follow the activation instructions from that skill.
3. If the skill file is unavailable, read `.aiox-core/development/agents/architect.md` as fallback.
