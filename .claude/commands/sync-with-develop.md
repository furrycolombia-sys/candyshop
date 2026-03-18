Sync your feature branch with the latest develop branch changes.

## When to Use

- Before creating a PR
- Daily during active development
- After major changes merged to develop
- When conflicts are likely

## Instructions

1. Check current branch is a feature branch (not develop/main)
2. Handle uncommitted changes (commit or stash)
3. Fetch latest from origin
4. Update local develop branch
5. Merge develop into feature branch
6. Handle conflicts if any
7. Run quality checks
8. Push updated branch
9. Report results

## Usage

```
/sync-with-develop
```

## MCP Tools

Use these MCP tools (not bash):

- `mcp__git__git_branch` - Get current branch
- `mcp__git__git_status` - Check for uncommitted changes
- `mcp__git__git_stash` - Stash/pop changes
- `mcp__git__git_fetch` - Fetch remote changes
- `mcp__git__git_checkout` - Switch branches
- `mcp__git__git_pull` - Pull develop changes
- `mcp__git__git_merge` - Merge develop into feature
- `mcp__git__git_log` - Check commits behind
- `mcp__git__git_push` - Push updated branch

## Full Skill Reference

See `.claude/skills/sync-with-develop/SKILL.md` for complete documentation.
