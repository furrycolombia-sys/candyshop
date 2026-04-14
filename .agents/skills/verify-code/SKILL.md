---
name: verify-code
description: "Run all quality gates (format, lint, typecheck, tests, coverage, build, smoke) and fix failures. No skipping, no exceptions. Use when Codex should follow the existing Claude workflow in `.claude/skills/verify-code/SKILL.md`. Read that source file before acting."
---

# Verify Code

<!-- generated-by: scripts/export_claude_to_codex.py -->

Use the Claude-authored source file as the canonical workflow for this Codex skill.

## Source

- `.claude/skills/verify-code/SKILL.md`

## Workflow

1. Read `.claude/skills/verify-code/SKILL.md` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
