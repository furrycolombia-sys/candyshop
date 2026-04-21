# Claude Code Tools

Scripts and MCP server wrappers used by Claude Code hooks and automation.

## MCP Server Configuration

The project uses `.mcp.json` to configure MCP (Model Context Protocol) servers. These provide Claude Code with additional capabilities like browser automation, issue tracking, and deployment management.

### Configured Servers

| Server            | Purpose                                                | Authentication         |
| ----------------- | ------------------------------------------------------ | ---------------------- |
| `shadcn`          | shadcn/ui component registry                           | None                   |
| `next-devtools`   | Next.js DevTools integration                           | None                   |
| `playwright`      | Browser automation testing                             | None                   |
| `chrome-devtools` | Chrome DevTools Protocol                               | None                   |
| `linear`          | Linear issue tracking (9 tools)                        | Token via `.env.local` |
| `github`          | Unified GitHub MCP (28 tools: 27 official + PR update) | Token via `.env.local` |
| `vercel`          | Vercel deployment management                           | Token via `.env.local` |
| `vercel-lite`     | Lightweight Vercel (10 essential tools only)           | Token via `.env.local` |
| `logrocket`       | LogRocket session replay and bug tracking (3 tools)    | Token via `.env.local` |

### Token Setup

For Linear, GitHub, Vercel, and LogRocket MCP servers, you need to provide API tokens:

1. Copy the example file:

   ```bash
   cp .claude/tools/.env.local.example .claude/tools/.env.local
   ```

2. Edit `.claude/tools/.env.local` and add your tokens:

   ```bash
   # Linear API Key
   # Get from: https://linear.app/settings/api
   LINEAR_API_KEY=lin_api_xxxxxxxxxxxx

   # GitHub Personal Access Token
   # Get from: https://github.com/settings/tokens
   # Required scopes: 'repo' (for full repository access)
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx

   # Vercel API Token
   # Get from: https://vercel.com/account/tokens
   VERCEL_TOKEN=xxxxxxxxxxxx

   # LogRocket API Key
   # Format: org_id:app_id:secret_key
   # Get from: LogRocket Settings > API Keys
   LOGROCKET_API_KEY=org_id:app_id:secret_key
   ```

3. Restart Claude Code after adding tokens.

## MCP Wrapper Scripts

All wrapper scripts are cross-platform (Windows, macOS, Linux) and automatically load tokens from environment files before starting the MCP servers.

### Custom MCP Servers

#### github-unified-mcp.mjs

**Purpose:** Unified GitHub MCP server that combines the official GitHub MCP (26 tools) with custom PR update capabilities (1 tool).

**Why it exists:** The official `@modelcontextprotocol/server-github` package provides comprehensive GitHub functionality but is missing a tool to update pull request titles, bodies, or base branches. Rather than running two separate servers, this unified server spawns the official MCP as a child process and extends it with the missing functionality.

**Architecture:**

- Spawns official GitHub MCP via npx as a child process
- Intercepts and proxies MCP protocol messages
- Adds custom `github_update_pull_request` tool to the official tool list
- Routes custom tool calls locally, forwards others to official MCP

**All tools provided (27 total):**

Official GitHub MCP tools (26):

**File Operations (3):**

- `create_or_update_file` - Create or update a single file in a repository
  - Use when: Making single file changes via API instead of git commands
- `push_files` - Push multiple files in a single commit
  - Use when: Batch updating multiple files at once
- `get_file_contents` - Read file contents from a repository
  - Use when: Inspecting files in other repos or branches without cloning

**Repository Management (4):**

- `create_repository` - Create a new GitHub repository
  - Use when: Programmatically creating repos
- `fork_repository` - Fork an existing repository
  - Use when: Contributing to external projects
- `create_branch` - Create a new branch
  - Use when: Creating feature branches via API
- `list_commits` - List commits with filters
  - Use when: Analyzing commit history, finding specific commits

**Issue Management (5):**

- `create_issue` - Create a new issue
  - Use when: Reporting bugs or creating tasks programmatically
- `list_issues` - List issues with filters (state, labels, assignee)
  - Use when: Querying issues for reporting or automation
- `update_issue` - Update issue details (title, body, state, labels, assignees)
  - Use when: Modifying existing issues
- `add_issue_comment` - Add a comment to an issue
  - Use when: Adding notes, updates, or responses to issues
- `get_issue` - Get detailed issue information
  - Use when: Retrieving full issue context

**Pull Request Operations (10):**

- `create_pull_request` - Create a new pull request
  - Use when: Opening PRs programmatically (use with `/submit-pr` skill)
- `list_pull_requests` - List PRs with filters (state, base branch, head branch)
  - Use when: Finding PRs for review or analysis
- `get_pull_request` - Get detailed PR information
  - Use when: Inspecting PR details, status, or metadata
- `get_pull_request_files` - Get list of changed files in a PR
  - Use when: Analyzing PR diff, checking which files changed
- `get_pull_request_comments` - Get PR review comments
  - Use when: Reading feedback on PRs (use with `/review-pr-comments` skill)
- `get_pull_request_reviews` - Get PR reviews and their states
  - Use when: Checking review status (approved, changes requested)
- `get_pull_request_status` - Get CI/CD checks and their results
  - Use when: Verifying build status, linting, or tests
- `create_pull_request_review` - Add a review to a PR
  - Use when: Providing code review feedback programmatically
- `merge_pull_request` - Merge a pull request
  - Use when: Automating PR merges (ensure checks pass first)
- `update_pull_request_branch` - Update PR branch with latest base
  - Use when: Syncing PR branch with main/dev (rebase/merge)

**Search (4):**

- `search_repositories` - Search for repositories
  - Use when: Finding repos by name, topic, or language
- `search_code` - Search code across repositories
  - Use when: Finding usage patterns, API examples, or implementations
- `search_issues` - Search issues and pull requests
  - Use when: Finding related issues, tracking patterns
- `search_users` - Search for GitHub users
  - Use when: Finding contributors or team members

Custom tool (1):

- `github_update_pull_request` - Update PR title, body, base branch, or state
  - Use when: Editing PR details after creation (missing from official MCP)
  - Common use cases: Fixing PR title/description, changing target branch, closing PRs

**Authentication:** Uses `GITHUB_PERSONAL_ACCESS_TOKEN` from `.env.local` or `.claude/tools/.env.local`.

**Usage example:**

```javascript
mcp__github__github_update_pull_request({
  owner: "claimangel",
  repo: "frontend",
  pull_number: 123,
  title: "Updated PR title",
  body: "Updated PR description",
  base: "dev", // Optional: change target branch
  state: "open", // Optional: open or closed
});
```

**GitHub API Reference:** https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request

**Manual execution:**

```bash
node .claude/tools/github-unified-mcp.mjs
```

#### linear-mcp.mjs

**Purpose:** Custom Linear MCP server using the official `@linear/sdk` for issue tracking and project management.

**Why it exists:** Provides token-based authentication (no browser OAuth needed) and includes specialized tools for downloading embedded images from issues and comments, which is essential for visual context when working on UI tasks.

**Tools provided (9 total):**

**Issue Operations (4):**

- `linear_get_issue` - Get detailed information about a specific Linear issue
  - Use when: Fetching task details, requirements, acceptance criteria
  - Returns: Title, description, state, assignee, labels, priority, timestamps
  - Example: `mcp__linear__linear_get_issue({ id: "CLA-4168" })`

- `linear_list_issues` - List and search issues with optional filters
  - Use when: Finding available tasks, querying by assignee or state
  - Filters: query, assigneeId, state, teamId, limit
  - Example: `mcp__linear__linear_list_issues({ assigneeId: "me", state: "Tasks in Progress" })`

- `linear_update_issue` - Update an existing Linear issue
  - Use when: Changing issue status, assignee, priority, or labels
  - Can update: title, description, stateId, assigneeId, priority
  - Example: `mcp__linear__linear_update_issue({ id: "CLA-4168", stateId: "state-id" })`

- `linear_get_issue_images` - Get issue details with embedded images downloaded
  - Use when: Analyzing screenshots or mockups in issue descriptions
  - Downloads: All markdown images from issue description to local files
  - Returns: Issue details + array of downloaded image paths with metadata
  - Example: `mcp__linear__linear_get_issue_images({ id: "CLA-4168", outputDir: ".ai-context/task-outputs/CLA-4168/images" })`

**Comment Operations (3):**

- `linear_get_comments` - Get all comments on a specific Linear issue
  - Use when: Reading discussion, clarifications, or updates on a task
  - Returns: Array of comments with author, timestamp, and body (markdown)
  - Example: `mcp__linear__linear_get_comments({ issueId: "CLA-4168" })`

- `linear_create_comment` - Add a comment to a Linear issue
  - Use when: Posting updates, asking questions, or documenting progress
  - Supports: Full markdown formatting
  - Example: `mcp__linear__linear_create_comment({ issueId: "CLA-4168", body: "Started work on this task" })`

- `linear_get_comments_images` - Get comments with embedded images downloaded
  - Use when: Analyzing screenshots or context shared in comment threads
  - Downloads: All markdown images from all comments to local files
  - Returns: Array of comments with downloaded image paths, sizes, and metadata
  - Example: `mcp__linear__linear_get_comments_images({ issueId: "CLA-4168", outputDir: ".ai-context/task-outputs/CLA-4168/comments-images" })`

**Workspace Operations (2):**

- `linear_list_projects` - List all projects in the workspace
  - Use when: Querying available projects for reporting or automation
  - Example: `mcp__linear__linear_list_projects({ limit: 20 })`

- `linear_list_teams` - List all teams in the workspace
  - Use when: Finding team IDs for filtering or organization
  - Example: `mcp__linear__linear_list_teams()`

**MCP Tool Naming Convention:**

The Linear MCP server defines tools with names like `linear_get_issue`, `linear_list_issues`, etc. When exposed through Claude Code's MCP system, these become:

```
mcp__[server-name]__[tool-name]
```

Since the server is named `"linear"` in `.mcp.json` and the tools are named `"linear_*"`, the final tool names are:

```
mcp__linear__linear_get_issue
mcp__linear__linear_list_issues
mcp__linear__linear_get_issue_images
...etc
```

**Why the double "linear"?** This is intentional to maintain consistency:

- First `linear`: The MCP server name from `.mcp.json`
- Second `linear_`: The tool name prefix in the MCP server code
- This pattern helps identify both the server source AND the tool purpose

**Authentication:** Uses `LINEAR_API_KEY` from `.env.local` or `.claude/tools/.env.local`.

**API Key Format:** `lin_api_xxxxxxxxxxxx` (Personal API Key from Linear settings)

**Usage examples:**

```javascript
// Get issue details
mcp__linear__linear_get_issue({ id: "CLA-4168" });

// Download all images from issue and comments for visual context
mcp__linear__linear_get_issue_images({
  id: "CLA-4168",
  outputDir: ".ai-context/task-outputs/CLA-4168/images",
});

mcp__linear__linear_get_comments_images({
  issueId: "CLA-4168",
  outputDir: ".ai-context/task-outputs/CLA-4168/comments-images",
});

// Update issue status
mcp__linear__linear_update_issue({
  id: "CLA-4168",
  stateId: "state-id-for-in-progress",
});

// Post a comment
mcp__linear__linear_create_comment({
  issueId: "CLA-4168",
  body: "## Status Update\n\nCompleted initial implementation. Ready for review.",
});
```

**Linear API Reference:** https://developers.linear.app/docs/graphql/working-with-the-graphql-api

**Manual execution:**

```bash
node .claude/tools/linear-mcp.mjs
```

#### vercel-lite-mcp.mjs

**Purpose:** Lightweight custom Vercel MCP server with ~10 essential tools.

**Why it exists:** The official Vercel SDK exposes 100+ tools which consumes excessive context window space. This custom server provides only the essential deployment and project management tools.

**Tools provided:**

- `vercel_list_deployments` - List recent deployments
- `vercel_get_deployment` - Get deployment details
- `vercel_get_deployment_events` - Get build logs/events
- `vercel_list_projects` - List projects
- `vercel_get_project` - Get project details
- `vercel_get_project_domains` - Get project domains
- `vercel_get_project_env` - Get environment variables (names only)
- `vercel_cancel_deployment` - Cancel a deployment
- `vercel_redeploy` - Redeploy an existing deployment
- `vercel_get_latest_deployment` - Get latest deployment for a project

**Authentication:** Uses `VERCEL_TOKEN` from `.env.local` or `.claude/tools/.env.local`.

**Manual execution:**

```bash
node .claude/tools/vercel-lite-mcp.mjs
```

#### logrocket-mcp.mjs

**Purpose:** Custom LogRocket MCP server for session replay and bug tracking integration.

**Why it exists:** LogRocket provides session replay, error tracking, and user analytics. This MCP enables Claude to query user sessions, retrieve AI-generated highlights, and update user metadata directly from the codebase.

**Tools provided (3):**

- `logrocket_get_session_highlights` - Get AI-generated summaries of user sessions with errors
  - Use when: Investigating user-reported bugs, analyzing error patterns
  - Returns: Request ID for webhook delivery of highlights
  - Note: Requires webhook URL for async results delivery

- `logrocket_export_sessions` - Export raw session data with events, errors, network requests
  - Use when: Deep debugging, analyzing session data programmatically
  - Note: **Deprecated API for SaaS customers** - may return empty results
  - Recommendation: Use Streaming Data Export service instead if available

- `logrocket_update_user` - Update user information and custom traits
  - Use when: Adding context about users (subscription tier, account type, etc.)
  - Use cases: Enriching user profiles for better debugging context

**Authentication:** Uses `LOGROCKET_API_KEY` from `.env.local` or `.claude/tools/.env.local`.

**API Key Format:** `org_id:app_id:secret_key` (e.g., `abc123:my-app:secretkey456`)

**Usage example:**

```javascript
// Get session highlights for a user
mcp__logrocket__logrocket_get_session_highlights({
  userEmail: "user@example.com",
  startMs: 1704067200000, // Unix timestamp
  endMs: 1704153600000,
  webhookURL: "https://your-webhook-url.com/highlights",
});

// Update user metadata
mcp__logrocket__logrocket_update_user({
  userId: "user-123",
  name: "John Doe",
  email: "john@example.com",
  traits: {
    subscription: "premium",
    accountType: "enterprise",
  },
});
```

**LogRocket API Reference:** https://docs.logrocket.com/reference/api-overview

**Manual execution:**

```bash
node .claude/tools/logrocket-mcp.mjs
```

### Official MCP Server Wrappers

#### vercel-mcp.mjs

Cross-platform wrapper that loads `VERCEL_TOKEN` and runs the official `@vercel/sdk` MCP server.

**Token locations checked (in order):**

1. Project root: `.env.local`
2. Script directory: `.claude/tools/.env.local`

**Features:**

- Uses the official `@vercel/sdk` package (GitHub: https://github.com/vercel/sdk)
- Provides ~95+ tools covering the full Vercel REST API
- Automatically validates token presence before starting
- Cross-platform compatibility (Windows, macOS, Linux)
- Requires Node.js v20 or greater
- Proper error handling with helpful error messages

**Manual execution:**

```bash
node .claude/tools/vercel-mcp.mjs
```

**Note:** If `VERCEL_TOKEN` is not found, the script will exit with an error message pointing you to where to get a token.

## SessionStart Hook

The `SessionStart` hook runs when Claude Code starts a new session.

### Purpose

Check if `.cursor/mcp.json` exists. If it doesn't, run `Create-McpSymlink.ps1` to create a symlink so both Claude Code and Cursor share the same MCP configuration.

### Hook Logic

```
IF .cursor/mcp.json does NOT exist
    THEN run Create-McpSymlink.ps1
    (ignore script output - script handles everything internally)
ELSE
    do nothing
```

### Configuration

In `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"if (process.platform === 'win32' && !require('fs').existsSync('.cursor/mcp.json')) { require('child_process').execSync('powershell -ExecutionPolicy Bypass -File .claude/tools/Create-McpSymlink.ps1', {stdio: 'inherit'}) }\""
          }
        ]
      }
    ]
  }
}
```

### Key Points

- Windows-only: Uses Node.js to check platform before running PowerShell
- Script output is not suppressed - let errors surface for debugging
- No `exit 0` override - if the script fails, the hook should report it

## Create-McpSymlink.ps1

Creates a symlink from `.cursor/mcp.json` to `.mcp.json` so both Claude Code and Cursor share the same MCP configuration.

### Requirements

- Windows with either:
  - Developer Mode enabled (no admin required), OR
  - Administrator privileges (UAC prompt)

### Manual Execution

```powershell
powershell -ExecutionPolicy Bypass -File .claude/tools/Create-McpSymlink.ps1
```

## File Structure

```
.claude/tools/
├── README.md                 # This file
├── CLAUDE.md                 # MCP server development guide
├── .env.local.example        # Token template (copy to .env.local)
├── .env.local                # Your tokens (gitignored)
├── github-unified-mcp.mjs    # Unified GitHub MCP (28 tools: 27 official + PR update)
├── linear-mcp.mjs            # Custom Linear MCP using @linear/sdk (9 tools)
├── vercel-mcp.mjs            # Vercel MCP wrapper script (official)
├── vercel-lite-mcp.mjs       # Lightweight Vercel MCP (custom, 10 tools)
├── logrocket-mcp.mjs         # LogRocket session replay MCP (custom, 3 tools)
├── Create-McpSymlink.ps1     # Windows symlink creation script
├── claude-launcher.sh        # Claude launcher with MSYS path fix
├── claude-env-setup.sh       # Source-able script for shell alias
├── restart-with-skill.sh     # Spawn fresh Claude session with skill
└── detect-claude-flags.sh    # Detect Claude startup flags
```

## Git Bash Path Conversion Fix

### The Problem

When using Git Bash (MINGW) on Windows, paths starting with `/` get automatically converted to Windows paths. For example:

- `/test-ascii` becomes `C:/Program Files/Git/test-ascii`
- `/submit-pr` becomes `C:/Program Files/Git/submit-pr`

This breaks slash commands typed directly in Claude Code's prompt.

### Solution 1: Source the Setup Script (Recommended)

Source the provided setup script to configure your shell:

```bash
# One-time setup - add to your ~/.bashrc
echo 'source /path/to/project/.claude/tools/claude-env-setup.sh' >> ~/.bashrc

# Or source it manually in current session
source .claude/tools/claude-env-setup.sh
```

This creates an alias that automatically disables path conversion for the `claude` command.

### Solution 2: Add Alias to ~/.bashrc

Add this to your `~/.bashrc` to launch Claude with path conversion disabled:

```bash
# Claude Code wrapper - disable MSYS path conversion
alias claude='MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*" command claude'
```

Then restart Git Bash or run `source ~/.bashrc`.

### Solution 3: Use the Launcher Script

Use the provided launcher script instead of the `claude` command directly:

```bash
# Run from project root
.claude/tools/claude-launcher.sh

# Or add an alias to your ~/.bashrc
alias claude='/path/to/project/.claude/tools/claude-launcher.sh'
```

The launcher script:

- Sets `MSYS_NO_PATHCONV=1` automatically
- Finds Claude executable reliably (handles nvm, npm global, etc.)
- Uses winpty if available for proper terminal handling

### Solution 4: Global Environment Variable

Add to your `~/.bashrc` (has side effects for other programs):

```bash
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'
```

**Warning:** This affects ALL programs, which may break tools that expect path conversion (like gVim).

### Solution 5: Use the Restart Script

The `restart-with-skill.sh` script automatically detects and fixes converted paths:

```bash
.claude/tools/restart-with-skill.sh "/test-ascii --no-restart"
# If Git Bash converts the path, the script will detect and fix it
```

### Solution 6: Use PowerShell or cmd.exe

These shells don't have MSYS path conversion:

```powershell
# PowerShell
claude "/test-ascii"
```

### Setup Files

| File                  | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `claude-launcher.sh`  | Standalone launcher script with full Claude detection |
| `claude-env-setup.sh` | Source-able script that creates an alias              |

### Technical Details

The path conversion is done by MSYS2's `msys-2.0.dll` when passing arguments to native Windows executables (like Node.js). Setting `MSYS_NO_PATHCONV=1` disables this conversion.

References:

- [MSYS2 Filesystem Paths](https://www.msys2.org/docs/filesystem-paths/)
- [Docker Path Workaround](https://gist.github.com/borekb/cb1536a3685ca6fc0ad9a028e6a959e3)
- [winpty Path Conversion Issue](https://github.com/rprichard/winpty/issues/146)

## Troubleshooting

### MCP Server Not Connecting

1. Check if the token is set correctly in `.claude/tools/.env.local`
2. Verify the token has the required permissions/scopes
3. Restart Claude Code after adding/changing tokens
4. Check Claude Code logs for specific error messages

### Linear MCP Issues

- API key must be a Personal API Key from https://linear.app/settings/api
- Key format: `lin_api_xxxxxxxxxxxx`
- Token must not be expired
- If you see "LINEAR_API_KEY not found" error, ensure the token is set in either:
  - Project root `.env.local`, or
  - `.claude/tools/.env.local`
- Token can be quoted or unquoted in `.env.local` files (both formats are supported)
- Image download requires proper authentication - Linear uses API key WITHOUT "Bearer" prefix in headers
- If `linear_get_comments_images` returns no images but you see them in Linear:
  - Verify images are embedded as markdown: `![alt](url)`
  - Check image URLs are accessible (not private attachments)
  - Linear image URLs should be from `uploads.linear.app` domain

### GitHub MCP Issues

- Ensure token has `repo` scope for full repository access
- Token must not be expired
- For fine-grained tokens, ensure repository access is configured
- Token can be quoted or unquoted in `.env.local` files (both formats are supported)
- Script automatically handles Windows `.cmd` file execution

### Vercel MCP Issues

- Token must be valid and not expired
- Check team/account permissions if accessing team resources
- Requires Node.js v20 or greater
- If you see "VERCEL_TOKEN not found" error, ensure the token is set in either:
  - Project root `.env.local`, or
  - `.claude/tools/.env.local`
- Token can be quoted or unquoted in `.env.local` files

### LogRocket MCP Issues

- API key must be in format: `org_id:app_id:secret_key`
  - Example: `abc123:my-app:secretkey456`
- Get API key from LogRocket Settings > API Keys
- If using `logrocket_export_sessions` and getting empty results:
  - This API is deprecated for SaaS customers
  - Use Streaming Data Export service instead
  - See: https://docs.logrocket.com/docs/streaming-data-export
- Token can be quoted or unquoted in `.env.local` files

### Slash Commands Converted to Windows Paths

**Symptom:** When typing `/skill-name` in Claude Code, it appears as `C:/Program Files/Git/skill-name`.

**Cause:** Git Bash's MSYS path conversion automatically converts paths starting with `/` to Windows paths.

**Solutions:**

1. **Add wrapper to ~/.bashrc** (recommended):

   ```bash
   claude() { MSYS_NO_PATHCONV=1 command claude "$@"; }
   ```

2. **Use restart script** - it auto-detects and fixes converted paths:

   ```bash
   .claude/tools/restart-with-skill.sh "/skill-name"
   ```

3. **Use PowerShell or cmd.exe** instead of Git Bash

See "Git Bash Path Conversion Fix" section above for more details.
