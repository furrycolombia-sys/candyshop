---
name: generate-setup-guide
description: "Generate a developer setup guide by analyzing project structure and workflows. Use when Codex should follow the existing Claude workflow in `.claude/skills/generate-setup-guide/SKILL.md`. Read that source file before acting."
---

# Generate Setup Guide

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/generate-setup-guide/SKILL.md`

## Workflow

1. Read `.claude/skills/generate-setup-guide/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
