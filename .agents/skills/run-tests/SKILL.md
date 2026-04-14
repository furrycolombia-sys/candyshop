---
name: run-tests
description: "Run unit tests with Vitest. Supports running all tests, specific files, watch mode, and coverage reports. Use when Codex should follow the existing Claude workflow in `.claude/skills/run-tests/SKILL.md`. Read that source file before acting."
---

# Run Tests

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/run-tests/SKILL.md`

## Workflow

1. Read `.claude/skills/run-tests/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
