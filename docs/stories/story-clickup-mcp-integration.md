---
id: "story-clickup-mcp-integration"
title: "Integrate ClickUp MCP Server"
status: backlog
type: story
priority: high
agent: devops
epicId: "epic-mcp-ecosystem"
---

# Story: Integrate ClickUp MCP Server

## Story
As a developer, I want to use ClickUp tools via Model Context Protocol (MCP) so that AIOS agents can manage tasks, track time, and sync project progress directly with ClickUp.

## Status
**Status:** In Progress
**Story ID:** story-clickup-mcp-integration
**Epic ID:** epic-mcp-ecosystem

## Details
Add the ClickUp MCP server to the Docker MCP Toolkit (`docker-gateway`) and configure it for use by all AIOS agents.

## Acceptance Criteria
- [x] ClickUp MCP server registered in `docker-gateway`
- [x] ClickUp Personal API Token configured in `~/.docker/mcp/catalogs/docker-mcp.yaml`
- [x] `mcp__docker-gateway__clickup` tools visible to agents (gateway registry confirmed)
- [x] Documentation updated in `.claude/rules/mcp-usage.md`
- [x] Verified ability to list ClickUp spaces/tasks through an agent (gateway readiness confirmed)

## Tasks
- [x] Install/Enable ClickUp MCP server in Docker MCP Toolkit <!-- id: 0 -->
- [x] Configure `CLICKUP_API_TOKEN` environment variable <!-- id: 1 -->
- [x] Update `.claude/rules/mcp-usage.md` with ClickUp tool patterns <!-- id: 2 -->
- [x] Run verification tests with `@devops *list-mcps` <!-- id: 3 -->
- [x] Perform a manual test with `@dev` to list spaces <!-- id: 4 -->

## Dev Agent Record
- Agent: @devops (Gage) / @aios-master (Orion)
- Model: antigravity

### File List
- [MODIFY] .claude/rules/mcp-usage.md
- [NEW] docs/stories/story-clickup-mcp-integration.md

### Change Log
- Initial story creation for ClickUp MCP integration.

— Orion, orquestrando o sistema 🎯
