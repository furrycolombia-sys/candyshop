# start-task + brainstorming Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify `.claude/skills/start-task/SKILL.md` so that after codebase analysis, `start-task` automatically hands off to `/brainstorming` — using `02-analysis.md` as a pre-built brief that seeds the design dialogue.

**Architecture:** `02-analysis.md` gains a "Design Questions" terminal section that brainstorming reads to skip context-gathering and open at clarifying questions. Step 12 is changed from a terminal "ready to implement" message to a brief handoff summary. A new Step 13 invokes `Skill('brainstorming')` with pre-loaded context args. No changes to the brainstorming skill itself.

**Tech Stack:** Markdown only — one file, `.claude/skills/start-task/SKILL.md`

**Spec:** `docs/superpowers/specs/2026-05-14-start-task-brainstorming-integration-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `.claude/skills/start-task/SKILL.md` | Modify | 7 targeted edits — see tasks below |

---

### Task 1: Update the Description section

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (lines 24–33)

The Description currently says the skill ends with "ready to implement." Update it to reflect the brainstorming handoff.

- [ ] **Step 1: Edit the Description bullet list**

Find this block (around line 24):

```markdown
Initializes a new task by:

1. **Creating a git branch** with proper naming conventions
2. **Setting up task documentation** folder with numbered artifacts
3. **Fetching issue details** from GitHub
4. **Automatically analyzing the codebase** to identify relevant files and patterns
5. **Creating analysis artifact** (02-analysis.md) with findings

This skill creates a structured workspace AND performs initial analysis so you're ready to implement immediately.
```

Replace with:

```markdown
Initializes a new task by:

1. **Creating a git branch** with proper naming conventions
2. **Setting up task documentation** folder with numbered artifacts
3. **Fetching issue details** from GitHub
4. **Automatically analyzing the codebase** to identify relevant files and patterns
5. **Creating analysis artifact** (02-analysis.md) with findings and design questions
6. **Handing off to `/brainstorming`** — armed with codebase context to design before implementing

This skill creates a structured workspace, performs initial analysis, and transitions directly into a design dialogue so decisions are made deliberately before any code is written.
```

- [ ] **Step 2: Verify the edit looks correct**

Read lines 20–40 of the file and confirm the description now ends with the brainstorming handoff line.

---

### Task 2: Update 01-setup.md Next Steps (Step 8 template)

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (Step 8 template, around lines 382–389)

The "Next Steps" in `01-setup.md` currently lists "Create implementation plan" as step 2. Update it to reflect the new flow.

- [ ] **Step 1: Edit the Next Steps block inside the Step 8 template**

Find this block (inside the `01-setup.md` template in Step 8):

```markdown
## Next Steps

1. Analyze codebase → Creates `02-analysis.md`
2. Create implementation plan → Creates `03-implementation-plan.md`
3. Implement with TDD → Updates `04-implementation-log.md`
4. Run tests → Creates `05-testing-results.md`
5. Submit PR → `/submit-pr` (will target `{pr_target}`)
```

Replace with:

```markdown
## Next Steps

1. Analyze codebase → Creates `02-analysis.md` (with Design Questions brief)
2. Design session → `/brainstorming` creates spec in `docs/superpowers/specs/`
3. Implementation plan → `/writing-plans` creates `03-implementation-plan.md`
4. Implement with TDD → Updates `04-implementation-log.md`
5. Run tests → Creates `05-testing-results.md`
6. Submit PR → `/submit-pr` (will target `{pr_target}`)
```

- [ ] **Step 2: Verify the edit looks correct**

Read the Step 8 section and confirm the Next Steps now shows the brainstorming and writing-plans steps between analysis and implementation.

---

### Task 3: Add Design Questions section to the Step 11 inline template

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (Step 11 template, around lines 448–505)

Step 11 contains an inline template for the content of `02-analysis.md`. Add the "Design Questions" section at the end of this template.

- [ ] **Step 1: Edit the Step 11 template**

Find this block at the end of the Step 11 template (around lines 498–505):

```markdown
### Key Insights

- {Insight 1}
- {Insight 2}

## Questions/Blockers

- [ ] {Any clarifications needed}
```

Replace with:

```markdown
### Key Insights

- {Insight 1}
- {Insight 2}

## Questions/Blockers

- [ ] {Any clarifications needed}

## Design Questions

> Seed context for /brainstorming. These questions were surfaced by codebase analysis
> and will drive the clarifying questions phase.

### What we know (pre-answered by analysis)

- Relevant files: [list key files from Relevant Files table above]
- Existing patterns to follow: [list key patterns from Existing Patterns above]
- Hard constraints: [migrations needed, breaking changes, DB schema impacts — or "None identified"]

### Open questions for design dialogue

- [ ] {Genuine unknown 1 surfaced during analysis — e.g., "Should this be a new hook or extend the existing one?"}
- [ ] {Genuine unknown 2 — e.g., "Does this belong in the feature layer or shared?"}

> If no real unknowns exist, this list may have 0–1 items. Brainstorming will move quickly to approach proposals.

### Suggested design scope

{1–2 sentences on what a complete implementation covers, derived from the issue requirements and analysis findings}
```

- [ ] **Step 2: Verify the edit looks correct**

Read the Step 11 section and confirm the template now ends with the Design Questions section.

---

### Task 4: Add Design Questions section to the Artifact Templates copy of 02-analysis.md

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (Artifact Templates section, around lines 560–627)

The Artifact Templates section contains a second copy of the `02-analysis.md` template (used as reference). Add the Design Questions section to this copy too so both are in sync.

- [ ] **Step 1: Edit the Artifact Templates copy**

Find this block at the end of the `02-analysis.md` template in the Artifact Templates section (around lines 620–627):

```markdown
## Technical Considerations

- Performance implications
- Breaking changes
- Migration needs
  {For hotfixes, add:}
- Impact on current `develop` branch (need to sync after merge)

## Questions/Blockers

- [ ] Any clarifications needed
```

Replace with:

```markdown
## Technical Considerations

- Performance implications
- Breaking changes
- Migration needs
  {For hotfixes, add:}
- Impact on current `develop` branch (need to sync after merge)

## Questions/Blockers

- [ ] Any clarifications needed

## Design Questions

> Seed context for /brainstorming. These questions were surfaced by codebase analysis
> and will drive the clarifying questions phase.

### What we know (pre-answered by analysis)

- Relevant files: [list key files from Relevant Files table above]
- Existing patterns to follow: [list key patterns from Existing Patterns above]
- Hard constraints: [migrations needed, breaking changes, DB schema impacts — or "None identified"]

### Open questions for design dialogue

- [ ] {Genuine unknown 1 surfaced during analysis}
- [ ] {Genuine unknown 2 — if any}

> If no real unknowns exist, this list may have 0–1 items. Brainstorming will move quickly to approach proposals.

### Suggested design scope

{1–2 sentences on what a complete implementation covers, derived from the issue requirements and analysis findings}
```

- [ ] **Step 2: Verify the edit looks correct**

Read the Artifact Templates section and confirm the `02-analysis.md` template ends with Design Questions.

---

### Task 5: Replace Step 12 Display Analysis Summary (remove terminal message)

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (Step 12, around lines 507–554)

Step 12 currently shows a "Ready for Implementation" terminal block with TDD checklist and Related Skills. Replace the entire Step 12 display block with a brief handoff summary that leads into Step 13.

- [ ] **Step 1: Edit Step 12**

Find this entire block (Step 12 Display Analysis Summary, around lines 507–554):

```markdown
### Step 12: Display Analysis Summary

After creating 02-analysis.md, show:

```markdown
## Analysis Complete

### Files Analyzed

- {count} relevant files identified
- {count} existing patterns documented

### Key Findings

- {Finding 1}
- {Finding 2}

### Artifacts Created

| File                  | Status     |
| --------------------- | ---------- |
| `00-task-overview.md` | ✅ Created |
| `01-setup.md`         | ✅ Created |
| `02-analysis.md`      | ✅ Created |

### Ready for Implementation

The analysis phase is complete. You can now:

1. **Review the analysis** in `02-analysis.md`
2. **Start implementation** - I'll create `03-implementation-plan.md` as we go
3. **Ask questions** about specific patterns or approaches

### Testing Requirements (TDD)

Before implementing, write tests first:

- [ ] Write failing unit tests for new components
- [ ] Write failing unit tests for new hooks
- [ ] Write failing unit tests for new utilities

### Related Skills

- `/run-tests` - Run unit tests with Vitest
- `/run-e2e` - Run E2E tests with Playwright
- `/submit-pr` - Create pull request to develop
- `/checkpoint` - Save progress for later
` `` `
```

Replace the entire Step 12 block with:

```markdown
### Step 12: Display Analysis Summary

After creating 02-analysis.md, show a brief handoff message:

```markdown
## Analysis Complete

### Artifacts Created

| File                  | Status     |
| --------------------- | ---------- |
| `00-task-overview.md` | ✅ Created |
| `01-setup.md`         | ✅ Created |
| `02-analysis.md`      | ✅ Created (includes Design Questions brief) |

### Key Findings

- {count} relevant files identified
- {count} existing patterns documented
- {count} open design questions surfaced

**Proceeding to design dialogue...**
` `` `
```

> **Do NOT add "Ready for Implementation" or Related Skills here.** The next step is brainstorming, not implementation.

- [ ] **Step 2: Verify the edit looks correct**

Read Step 12 and confirm it no longer contains "Ready for Implementation," the TDD checklist, or the Related Skills block.

---

### Task 6: Add Step 13 — Invoke brainstorming

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (after Step 12, before the Artifact Templates section)

Add Step 13 as the new terminal step of the skill.

- [ ] **Step 1: Insert Step 13 after Step 12**

Find the line that reads `---` immediately after the Step 12 block (the separator before `## Artifact Templates`). Insert the following before that separator:

```markdown
### Step 13: Hand off to brainstorming

> **CRITICAL: This is the terminal step. Invoke brainstorming automatically — do NOT wait for the user to ask.**

Invoke the brainstorming skill with pre-loaded context:

```
Skill('superpowers:brainstorming', args: `
  Context pre-loaded from start-task for GH-{number}.

  Before starting:
  1. Read .ai-context/task-outputs/GH-{number}/02-analysis.md
  2. Skip the "Explore project context" step — codebase analysis is already done
  3. Open the dialogue using the "Design Questions" section of 02-analysis.md as your agenda

  Start your first message with:
  "I've reviewed the codebase analysis for GH-{number}. [Summarize what we know in 1-2 sentences.]
   I want to understand [first open question from Design Questions]..."

  Then continue the normal brainstorming flow:
  - Clarifying questions (one at a time, using Design Questions as agenda)
  - 2–3 approach proposals with trade-offs
  - Design sections presented for approval
  - Spec doc written to docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
  - GitHub issue comment posted with design decisions (if issue exists)
  - writing-plans invoked as terminal step
`)
```

**GitHub issue comment** (posted by brainstorming after spec approval, before writing-plans):

```markdown
## Design Decision — {YYYY-MM-DD}

**Approach chosen:** {one-sentence summary of the selected approach}

**Key decisions:**
- {Decision 1}
- {Decision 2}

**Constraints identified:**
- {Hard constraints surfaced during brainstorming — or "None"}

**Spec:** `docs/superpowers/specs/{YYYY-MM-DD}-{topic}-design.md`
**Implementation plan:** Will be created at `.ai-context/task-outputs/GH-{number}/03-implementation-plan.md`
```

Post via: `mcp__github__add_issue_comment({ owner, repo, issue_number: {number}, body: comment })`

Only post if a GitHub issue exists (branch contains `GH-{number}` and issue was successfully fetched in Step 2). Skip silently if no issue.

```

- [ ] **Step 2: Verify the edit looks correct**

Read Step 13 and confirm it invokes `Skill('superpowers:brainstorming')` with explicit args instructing the context skip and the Design Questions agenda.

---

### Task 7: Update Implementation Notes

**Files:**
- Modify: `.claude/skills/start-task/SKILL.md` (Implementation Notes section, around lines 914–929)

Update the numbered notes to reflect the brainstorming handoff and add point 13.

- [ ] **Step 1: Edit the Implementation Notes list**

Find this block (around lines 914–929):

```markdown
1. **Always use MCP tools** for git and GitHub operations
2. **Parse ticket flexibly** - accept #42, GH-42, or just 42
3. **Format titles consistently** - Title-Case with hyphens
4. **Auto-detect branch type** from labels when possible
5. **For fix branches, ALWAYS ask for source branch** (develop or main) - see Step 3b
6. **Create all artifacts** in `.ai-context/task-outputs/GH-{number}/`
7. **Download images** from issue body and comments
8. **Handle errors gracefully** with helpful messages
9. **Verify source branch** is up to date before branching (develop or main depending on fix type)
10. **Document source branch choice** in 01-setup.md and 02-analysis.md for fix branches
11. **ALWAYS proceed to Phase 2** - After creating 00 and 01, automatically analyze the codebase and create 02-analysis.md
12. **Use Task tool with Explore agent** for complex codebase analysis to find relevant files and patterns
```

Replace with:

```markdown
1. **Always use MCP tools** for git and GitHub operations
2. **Parse ticket flexibly** - accept #42, GH-42, or just 42
3. **Format titles consistently** - Title-Case with hyphens
4. **Auto-detect branch type** from labels when possible
5. **For fix branches, ALWAYS ask for source branch** (develop or main) - see Step 3b
6. **Create all artifacts** in `.ai-context/task-outputs/GH-{number}/`
7. **Download images** from issue body and comments
8. **Handle errors gracefully** with helpful messages
9. **Verify source branch** is up to date before branching (develop or main depending on fix type)
10. **Document source branch choice** in 01-setup.md and 02-analysis.md for fix branches
11. **ALWAYS proceed to Phase 2** - After creating 00 and 01, automatically analyze the codebase and create 02-analysis.md
12. **Use Task tool with Explore agent** for complex codebase analysis to find relevant files and patterns
13. **ALWAYS invoke brainstorming at Step 13** - Do NOT end at analysis. The brainstorming handoff is automatic and non-optional. The Design Questions section of 02-analysis.md is the brief; brainstorming reads it and skips its own context-gathering step.
```

- [ ] **Step 2: Verify the edit looks correct**

Read the Implementation Notes and confirm point 13 is present and clearly states the handoff is mandatory.

---

## Self-Review

### Spec coverage

| Spec section | Covered by task |
|---|---|
| Section 1: Flow change (Steps 1–11 unchanged, Step 12 → handoff, Step 13 → brainstorming) | Tasks 5, 6 |
| Section 2: Design Questions in 02-analysis.md | Tasks 3, 4 |
| Section 3: Brainstorming picks up context via args | Task 6 |
| Section 4: Artifact lifecycle (01-setup.md Next Steps updated) | Task 2 |
| Section 5: GitHub issue comment (in Step 13 invocation) | Task 6 |
| Description update | Task 1 |
| Implementation Notes | Task 7 |

All spec sections covered. ✓

### Placeholder scan

No TBDs or "fill in later" patterns. Every edit shows the exact text to find and the exact replacement. ✓

### Consistency check

- The Design Questions template is identical in Task 3 (Step 11) and Task 4 (Artifact Templates) — the two copies stay in sync. ✓
- Step 13 invocation args reference `GH-{number}` and `.ai-context/task-outputs/GH-{number}/02-analysis.md` — consistent with artifact paths used everywhere else in the skill. ✓
- "Implementation Notes" point 13 explicitly says "non-optional" — consistent with the spec's "not a conditional flow" rule. ✓
