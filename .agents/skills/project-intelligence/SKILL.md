---
name: project-intelligence
description: "Multi-agent deep analysis of the entire project including code, AI documents, and artifacts. Researches best practices and suggests improvements. Use when Codex should follow the existing Claude workflow in `.claude/skills/project-intelligence/SKILL.md`. Read that source file before acting."
---

# Project Intelligence

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/project-intelligence/SKILL.md`

## Workflow

1. Read `.claude/skills/project-intelligence/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
