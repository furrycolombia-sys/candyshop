Create a production release by merging develop into main.

## Release Naming Convention

**Format:** `release YYYY.MM.DD.N`

- First release of the day: `release 2025.01.09.1`
- Second release same day: `release 2025.01.09.2`

## Instructions

1. Verify develop is up to date and clean
2. Check develop has commits ahead of main
3. Determine release number (check for existing releases today)
4. Create release PR (develop → main)
5. Confirm with user before merging
6. Merge using merge commit (NOT squash)
7. Report results

## Usage

```
/create-release
```

## Merge Strategy

**Always use merge commit** (not squash) to preserve full commit history for releases.

## MCP Tools

Use these MCP tools (not bash):

- `mcp__git__git_checkout` - Switch branches
- `mcp__git__git_pull` - Update branches
- `mcp__git__git_status` - Verify clean state
- `mcp__git__git_log` - Get commits to release
- `mcp__git__git_remote` - Get repo owner/name
- `mcp__github__list_pull_requests` - Check existing releases
- `mcp__github__create_pull_request` - Create release PR
- `mcp__github__merge_pull_request` - Merge with merge commit

## Full Skill Reference

See `.claude/skills/create-release/SKILL.md` for complete documentation.
