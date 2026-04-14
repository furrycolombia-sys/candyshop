# Project Guidance

Use [CLAUDE.md](/Z:/Github/candystore/CLAUDE.md) as the canonical project overview for this repository. It already captures the monorepo structure, architecture rules, stack, ports, and workflow conventions.

## Codex Skills

Codex-discoverable wrappers live in `.agents/skills/`. Most of them are generated bridges that point back to the original Claude-authored source files under `.claude/skills/` or `.claude/commands/`.

When a generated Codex skill triggers:

1. Read the referenced `.claude` source file first.
2. Treat `.claude` as the source of truth for workflow details.
3. Adapt Claude-only slash commands or MCP assumptions to the current Codex toolset.

## Rules

Project rules still live under `.claude/rules/`. Use them directly when you need detailed guidance on architecture, testing, git workflow, CSS, i18n, or review standards.

High-value references:

- `.claude/rules/architecture.md`
- `.claude/rules/monorepo-architecture.md`
- `.claude/rules/testing.md`
- `.claude/rules/git-safety.md`
- `.claude/rules/build-checks.md`

## Role Prompts

Claude role prompts still live under `.claude/agents/`. Codex does not auto-discover those files as native agents, but they remain useful references when you want to shape a spawned sub-agent or keep a review/design persona consistent.

## MCP Tooling

Project MCP configuration remains in `.mcp.json`. Local wrapper scripts live in `.claude/tools/`.
