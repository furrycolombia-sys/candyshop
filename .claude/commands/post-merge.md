Switch to develop, sync with remote, and optionally delete the previous branch.

## When to Use

Run this after a PR has been merged (via GitHub UI or `/merge-pr`).

## What It Does

1. **Remember** your current branch (the one that was merged)
2. **Switch** to the `develop` branch
3. **Sync** develop with remote (fetch + pull)
4. **Ask** if you want to delete the previous branch

## Branch Deletion Options

When asked about deleting the previous branch:

- **Yes, delete both** - Delete local and remote branch
- **Local only** - Delete only the local branch
- **Remote only** - Delete only the remote branch
- **No, keep it** - Keep the branch

**Protected branches (NEVER deleted):**

- `main` - Production branch
- `develop` - Integration branch

## Instructions

1. Get current branch name and store it
2. Check for uncommitted changes (offer to stash/discard/cancel)
3. Switch to `develop` branch
4. Fetch and pull latest from origin
5. If previous branch is not protected, ask user about deletion
6. Delete branches based on user selection
7. Report results

## Usage

```
/post-merge
```

## MCP Tools

Use these MCP tools (not bash):

- `mcp__git__git_branch` - Get current branch / delete local branch
- `mcp__git__git_status` - Check for uncommitted changes
- `mcp__git__git_stash` - Stash changes if needed
- `mcp__git__git_checkout` - Switch to develop
- `mcp__git__git_fetch` - Fetch remote changes
- `mcp__git__git_pull` - Pull develop from origin
- `mcp__git__git_push` (with `delete: true`) - Delete remote branch

## Full Skill Reference

See `.claude/skills/post-merge/SKILL.md` for complete documentation.
