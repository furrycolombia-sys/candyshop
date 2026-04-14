---
name: run-e2e
description: "Run end-to-end tests with Playwright. Supports running all tests, specific files, UI mode, and multiple browsers. Use when Codex should follow the existing Claude workflow in `.claude/skills/run-e2e/SKILL.md`. Read that source file before acting."
---

# Run E2E

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/run-e2e/SKILL.md`

## Workflow

1. Read `.claude/skills/run-e2e/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
