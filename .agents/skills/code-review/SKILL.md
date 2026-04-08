---
name: code-review
description: "Review code for DRY, SOLID, KISS, and architecture rule violations with actionable feedback and suggested fixes; use when asked to review code quality or principles. Use when Codex should follow the existing Claude workflow in `.claude/skills/code-review/SKILL.md`. Read that source file before acting."
---

# Code Review

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/code-review/SKILL.md`

## Workflow

1. Read `.claude/skills/code-review/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
