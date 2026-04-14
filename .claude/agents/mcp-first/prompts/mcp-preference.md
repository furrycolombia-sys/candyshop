---
name: mcp-preference
description: Prompt template for MCP-first agent
---

# MCP-First Preference Prompt

This prompt template reinforces MCP tool preference in all interactions.

## Core Directive

Before executing ANY of the following operations, ALWAYS check if an MCP tool is available and use it instead of bash commands:

### Git Operations

**ALWAYS use `mcp__git__*` tools instead of `git` bash commands:**

| Instead of     | Use                      |
| -------------- | ------------------------ |
| `git status`   | `mcp__git__git_status`   |
| `git diff`     | `mcp__git__git_diff`     |
| `git add`      | `mcp__git__git_add`      |
| `git commit`   | `mcp__git__git_commit`   |
| `git push`     | `mcp__git__git_push`     |
| `git pull`     | `mcp__git__git_pull`     |
| `git checkout` | `mcp__git__git_checkout` |
| `git branch`   | `mcp__git__git_branch`   |
| `git merge`    | `mcp__git__git_merge`    |
| `git log`      | `mcp__git__git_log`      |
| `git fetch`    | `mcp__git__git_fetch`    |
| `git stash`    | `mcp__git__git_stash`    |
| `git reset`    | `mcp__git__git_reset`    |
| `git clone`    | `mcp__git__git_clone`    |
| `git init`     | `mcp__git__git_init`     |
| `git tag`      | `mcp__git__git_tag`      |

### GitHub Operations

**ALWAYS use `mcp__github__*` tools instead of `gh` CLI commands:**

| Instead of        | Use                                |
| ----------------- | ---------------------------------- |
| `gh pr create`    | `mcp__github__create_pull_request` |
| `gh pr list`      | `mcp__github__list_pull_requests`  |
| `gh pr view`      | `mcp__github__get_pull_request`    |
| `gh pr merge`     | `mcp__github__merge_pull_request`  |
| `gh issue create` | `mcp__github__create_issue`        |
| `gh issue list`   | `mcp__github__list_issues`         |
| `gh issue view`   | `mcp__github__get_issue`           |
| `gh search code`  | `mcp__github__search_code`         |
| `gh repo list`    | `mcp__github__search_repositories` |

### Browser Operations

**ALWAYS use `mcp__chrome-devtools__*` tools for browser automation:**

| For              | Use                                           |
| ---------------- | --------------------------------------------- |
| Navigate to URL  | `mcp__chrome-devtools__navigate_page`         |
| Take screenshot  | `mcp__chrome-devtools__take_screenshot`       |
| Get DOM snapshot | `mcp__chrome-devtools__take_snapshot`         |
| Click element    | `mcp__chrome-devtools__click`                 |
| Fill input       | `mcp__chrome-devtools__fill`                  |
| View console     | `mcp__chrome-devtools__list_console_messages` |
| View network     | `mcp__chrome-devtools__list_network_requests` |

## Decision Template

Before each action, internally process:

```
Operation: [describe the operation]
Type: [git|github|browser|file|other]
MCP Available: [yes/no]
MCP Tool: [tool name if available]
Action: [MCP call | native tool | bash with reason]
```

## Priority Order

1. **MCP Tools** - Always first choice when available
2. **Native Claude Tools** - For file operations (Read, Write, Edit, Glob, Grep)
3. **Bash Commands** - Only when no alternative exists

## Allowed Bash Commands

Only use bash for operations without MCP alternatives:

- `npm install`, `npm run`, `npm test`
- `yarn add`, `yarn build`
- `node`, `npx`
- `python`, `pip`
- `mkdir` (no MCP for directory creation)
- `rm` (use with caution, no MCP alternative)

## Enforcement

This directive takes precedence over convenience. Even if bash would be "faster" or "simpler", prefer MCP tools for:

- **Consistency** - Same behavior across all interactions
- **Error handling** - MCP provides structured errors
- **Response data** - MCP returns rich, structured data
- **Integration** - MCP tools integrate with Claude Code ecosystem

## Validation

When uncertain about MCP availability:

1. Check the MCP tool reference in AGENT.md
2. Run `/audit --mcp` to see available tools
3. Default to MCP if a tool name matches the operation
4. Document fallback reason if using bash
