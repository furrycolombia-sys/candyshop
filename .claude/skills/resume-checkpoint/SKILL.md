---
name: resume-checkpoint
description: Resume work from a saved checkpoint. Detects current branch, reads checkpoint file, and restores context.
---

# Resume Checkpoint

## Description

Resumes work from a previously saved checkpoint. Automatically detects the current git branch, finds the corresponding checkpoint in `.ai-context/checkpoints/{branch}/RESUME.md`, and restores full context.

## Usage

```
/resume-checkpoint
```

Or natural language:

```
Resume my work
Continue from checkpoint
Pick up where I left off
Restore my session
```

## Parameters

None - automatically detects branch and finds checkpoint.

---

## Execution Steps

### Step 0: Set Git Working Directory

**REQUIRED before any git MCP operations.**

```
mcp__git__git_set_working_dir({
  path: "{project_root_directory}",
  validateGitRepo: true,
  includeMetadata: true
})
```

This prevents the error: "No session working directory set. Please specify a 'path' or use 'git_set_working_dir' first."

### Step 1: Detect Current Branch

Get the current git branch:

```
mcp__git__git_branch({ operation: "show-current" })
```

Convert branch name to folder-safe format:

- Replace `/` with `-`
- Keep other characters

### Step 2: Check for Checkpoint File

Build checkpoint path:

```
.ai-context/checkpoints/{safe-branch-name}/RESUME.md
```

Read the checkpoint file:

```
Read({ file_path: "{project_root}/.ai-context/checkpoints/{safe-branch}/RESUME.md" })
```

**If file not found:**

```markdown
## No Checkpoint Found

No checkpoint exists for branch `{branch}`.

**Checked:** `.ai-context/checkpoints/{safe-branch}/RESUME.md`

To create a checkpoint, use:
```

/checkpoint [summary]

```

```

**If file found:** Continue to Step 3.

### Step 3: Parse Checkpoint Data

Extract from RESUME.md:

- Current work summary
- Git state (branch, last commit, uncommitted changes)
- Tasks (completed, in-progress, pending)
- Next steps
- Context (key files, MCP servers, repository info)

### Step 4: Verify Git State

Compare checkpoint state with current state:

```
mcp__git__git_status()
mcp__git__git_log({ maxCount: 1, oneline: true })
```

Check for discrepancies:

- Branch matches? (should, since we used it to find checkpoint)
- New commits since checkpoint?
- Different uncommitted changes?

### Step 5: Restore Task List

Create TodoWrite with tasks from checkpoint:

```
TodoWrite({
  todos: [
    // Mark completed tasks as completed
    { content: "Completed task", status: "completed", activeForm: "..." },
    // Set first pending task as in_progress
    { content: "First pending", status: "in_progress", activeForm: "..." },
    // Rest as pending
    { content: "Other tasks", status: "pending", activeForm: "..." }
  ]
})
```

### Step 6: Read Context Files

If the checkpoint mentions key files, read them:

- Rule files mentioned in Context section
- CLAUDE.md for project conventions
- Any other critical files

### Step 7: Display Restoration Summary

```markdown
## Session Restored

**Branch:** `{branch}`
**Checkpoint:** {timestamp}

### Current Work

{summary from checkpoint}

### Git State

- **Last Commit:** `{hash}` - {message}
- **Status:** {clean | X uncommitted changes}
  {if changes differ from checkpoint: ⚠️ Note: Git state has changed since checkpoint}

### Tasks Restored

- ✅ {N} completed
- 🔄 {N} in progress
- ⏳ {N} pending

### Next Steps

{next steps from checkpoint}

---

Ready to continue. What would you like to work on?
```

---

## Examples

### Example 1: Successful Resume

```
/resume-checkpoint
```

**On branch:** `feat/GH-42_User-Auth`

**Output:**

```markdown
## Session Restored

**Branch:** `feat/GH-42_User-Auth`
**Checkpoint:** 2026-01-08 14:30

### Current Work

Implementing login form with validation

### Git State

- **Last Commit:** `abc1234` - feat: add login form component
- **Status:** 2 uncommitted changes

### Tasks Restored

- ✅ 3 completed
- 🔄 1 in progress: Adding form validation
- ⏳ 2 pending

### Next Steps

1. Complete Yup validation schema
2. Add error display
3. Test form submission

---

Ready to continue. What would you like to work on?
```

### Example 2: No Checkpoint Found

```
/resume-checkpoint
```

**On branch:** `main`

**Output:**

```markdown
## No Checkpoint Found

No checkpoint exists for branch `main`.

**Checked:** `.ai-context/checkpoints/main/RESUME.md`

To create a checkpoint, use:
```

/checkpoint [summary]

```

```

### Example 3: Git State Changed

```
/resume-checkpoint
```

**On branch:** `ai-structure`
**Checkpoint shows:** Last commit `6afde30`
**Current state:** Last commit `789xyz` (newer)

**Output:**

```markdown
## Session Restored

**Branch:** `ai-structure`
**Checkpoint:** 2026-01-08 16:00

### Current Work

Setting up GitHub repository infrastructure

### Git State

- **Last Commit:** `789xyz` - feat: new commit since checkpoint
- **Status:** Clean

⚠️ **Note:** 1 new commit(s) since checkpoint was saved.

### Tasks Restored

...
```

---

## Automatic Resume Detection

When starting a new Claude session, Claude should:

1. **Check current branch:**

   ```
   mcp__git__git_branch({ operation: "show-current" })
   ```

2. **Check for checkpoint:**

   ```
   Read(".ai-context/checkpoints/{branch}/RESUME.md")
   ```

3. **If found, offer to resume:**

   ```
   I found a checkpoint for branch `{branch}`:

   **Summary:** {summary}
   **Last Updated:** {timestamp}
   **Pending:** {count} tasks

   Would you like to resume from this checkpoint?
   - Type `/resume-checkpoint` to restore full context
   - Or start fresh and I'll work from the current state
   ```

---

## Edge Cases

### Branch Name with Slashes

```
Branch: feat/GH-42/sub-feature
Folder: feat-GH-42-sub-feature
Path: .ai-context/checkpoints/feat-GH-42-sub-feature/RESUME.md
```

### Multiple Checkpoints

Each branch has its own checkpoint. Switching branches means:

- Previous branch's checkpoint stays
- New branch may or may not have a checkpoint
- `/resume-checkpoint` always uses current branch's checkpoint

### Stale Checkpoint

If checkpoint is very old or context has significantly changed:

- Claude should note the age of checkpoint
- Suggest creating a fresh checkpoint after catching up
- Use judgment on what context is still relevant

---

## Related

- [Checkpoint](../checkpoint/SKILL.md) - `/checkpoint` to save work state
- [Start Task](../start-task/SKILL.md) - `/start-task` to begin new work
- [Submit PR](../submit-pr/SKILL.md) - `/submit-pr` to finish work
- [AI Context README](../../../.ai-context/README.md) - Folder structure
