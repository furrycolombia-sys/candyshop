Merge a pull request for the current branch or a specified PR number.

## Merge Strategy

- **PR → develop**: Squash and merge (clean history)
- **PR → main**: Merge commit (preserve history)

## Post-Merge Actions

After merge:

1. **Switch to base branch** (e.g., `develop`) and pull latest
2. **Ask user** if they want to delete the source branch (remote and local)

**Protected branches (NEVER deleted, not even asked):**

- `main` - Production branch
- `develop` - Integration branch

## Instructions

1. If a PR number is provided as argument, use that PR
2. If no PR number, find the open PR for the current git branch
3. Check the PR's base (target) branch to determine merge method:
   - Base is `develop` → use `squash` merge
   - Base is `main` → use `merge` commit
4. Validate the PR is mergeable (no conflicts, checks passed)
5. Execute the merge using `mcp__github__merge_pull_request`
6. Switch to base branch and pull latest changes
7. Ask user if they want to delete the source branch (unless protected)
8. Report success with merge method and branch status

## Usage

```
/merge-pr [pr_number]
```

## Examples

- `/merge-pr` - Merge the PR for current branch
- `/merge-pr 42` - Merge PR #42

## MCP Tools

Use these MCP tools (not bash):

- `mcp__git__git_branch` - Get current branch / delete local branch
- `mcp__github__list_pull_requests` - Find PR for branch
- `mcp__github__get_pull_request` - Get PR details
- `mcp__github__merge_pull_request` - Execute merge with `merge_method` param
- `mcp__git__git_checkout` - Switch to base branch
- `mcp__git__git_pull` - Pull latest changes
- `mcp__git__git_push` (with `delete: true`) - Delete remote branch

## Full Skill Reference

See `.claude/skills/merge-pr/SKILL.md` for complete documentation.
