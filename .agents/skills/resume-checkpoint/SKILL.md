---
name: resume-checkpoint
description: "Resume work from a saved checkpoint. Detects current branch, reads checkpoint file, and restores context. Use when Codex should follow the existing Claude workflow in `.claude/skills/resume-checkpoint/SKILL.md`. Read that source file before acting."
---

# Resume Checkpoint

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/resume-checkpoint/SKILL.md`

## Workflow

1. Read `.claude/skills/resume-checkpoint/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
