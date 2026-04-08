---
name: fix-full-review
description: "Interactively fix issues found in /full-review reports. Use when Codex should follow the existing Claude workflow in `.claude/skills/fix-full-review/SKILL.md`. Read that source file before acting."
---

# Fix Full Review

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/fix-full-review/SKILL.md`

## Workflow

1. Read `.claude/skills/fix-full-review/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
