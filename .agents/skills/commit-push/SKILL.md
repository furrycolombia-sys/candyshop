---
name: commit-push
description: "Commits and pushes changes using only MCP tools. Includes code review and coverage enforcement for JS/TS files. Quality checks run via git hooks. Use when Codex should follow the existing Claude workflow in `.claude/skills/commit-push/SKILL.md`. Read that source file before acting."
---

# Commit Push

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/commit-push/SKILL.md`

## Workflow

1. Read `.claude/skills/commit-push/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
