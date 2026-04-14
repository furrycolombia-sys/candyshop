---
name: create-release
description: "Create a production release by merging develop into main with a PR and release notes. Use when Codex should follow the existing Claude workflow in `.claude/skills/create-release/SKILL.md`. Read that source file before acting."
---

# Create Release

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/create-release/SKILL.md`

## Workflow

1. Read `.claude/skills/create-release/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
