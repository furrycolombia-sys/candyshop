Review PR comments and address approved feedback for the current branch or specified PR.

## Critical Rule

**NEVER automatically fix PR comments.** Always present the summary first and wait for explicit user approval before making any code changes.

## Instructions

1. **Identify the PR**:
   - If PR number provided in arguments, use it
   - Otherwise, get current branch and find associated PR

2. **Check for existing review tracking**:
   - Look for `.ai-context/task-outputs/GH-XXXX/08-pr-review-tracking.md`
   - Note any previously addressed comments to avoid cyclical fixes

3. **Fetch all comments using GitHub MCP tools**:
   - `mcp__git__git_branch` - Get current branch
   - `mcp__git__git_remote` - Get repository URL
   - `mcp__github__list_pull_requests` - Find PR by branch
   - `mcp__github__get_pull_request_comments` - Get inline review comments
   - `mcp__github__get_pull_request_reviews` - Get overall reviews

4. **Present summary to user** with severity-based categorization:
   - 🔴 Critical: Security issues, credentials, breaking bugs
   - 🟡 Medium: Logic errors, missing error handling
   - 🟢 Low: Style suggestions, minor improvements
   - Group comments in tables by severity
   - Include detailed explanations with file locations

5. **WAIT for user approval** - Do NOT make any changes until user specifies which comments to address

6. **Address only approved comments**:
   - Make code changes as needed
   - Run quality checks
   - Update review tracking document
   - Commit and push changes

7. **Report results** with summary of what was done

## Usage

```
/review-pr-comments [pr_number]
```

## Examples

- `/review-pr-comments` - Review comments on PR for current branch
- `/review-pr-comments 42` - Review comments on PR #42

## Full Skill Reference

See `.claude/skills/review-pr-comments/SKILL.md` for complete documentation.
