# Design Spec: start-task + brainstorming Integration

**Date:** 2026-05-14
**Status:** Approved
**Scope:** Modify `/start-task` to hand off to `/brainstorming` after codebase analysis, using `02-analysis.md` as a pre-built brainstorming brief.

---

## Problem

`/start-task` ends at codebase analysis and tells you to "start implementing." There is no structured design step before implementation begins, which means:

- Design decisions happen ad-hoc during implementation
- There's no record of *why* a particular approach was chosen
- The GitHub issue has no trace of design discussions that happened in the editor

---

## Approach: Option C — Brainstorming as handoff at the end (Approach 3)

After `start-task` completes branch setup and codebase analysis, it automatically hands off to `/brainstorming`. Brainstorming is armed with the already-fetched issue details and the codebase analysis (`02-analysis.md`), so it skips its own context-gathering phase and opens directly at clarifying questions.

`02-analysis.md` is restructured to double as a brainstorming brief — it ends with a "Design Questions" section that seeds the brainstorming dialogue.

---

## Section 1: Flow change to start-task

### Before

```
Steps 1–12: setup + analysis
Step 12: Display "Analysis Complete — ready to implement" (terminal)
```

### After

```
Steps 1–11: setup + analysis (unchanged)
Step 12:    Create 02-analysis.md (restructured — see Section 2)
Step 12b:   Display brief analysis summary (not "ready to implement")
Step 13:    Invoke Skill('brainstorming') with context args (new terminal step)
```

The "Related Skills" block at the end of Step 12 is removed. The `start-task` skill no longer ends by listing `/run-tests`, `/submit-pr`, etc. — those belong in the writing-plans output.

---

## Section 2: Restructured 02-analysis.md — the brainstorming brief

All existing sections are preserved. A new terminal section is added:

```markdown
## Design Questions

> Seed context for /brainstorming. These questions were surfaced by codebase analysis
> and will drive the clarifying questions phase.

### What we know (pre-answered by analysis)
- Relevant files: [list from analysis above]
- Existing patterns to follow: [from analysis above]
- Hard constraints: [migrations needed, breaking changes, DB schema impacts, etc.]

### Open questions for design dialogue
- [ ] {Question 1 — e.g., "Should this be a new hook or extend the existing one?"}
- [ ] {Question 2 — e.g., "Does this belong in the feature layer or shared?"}
- [ ] {Question 3 — anything ambiguous from the issue or codebase}

### Suggested design scope
{1–2 sentences on what a complete implementation covers, derived from the issue + analysis}
```

**Rules for generating the Design Questions section:**
- Open questions are genuine unknowns surfaced during analysis — not invented
- If the task is clear and there are no real unknowns, the list is short (0–1 items) and brainstorming moves quickly to approach proposals
- The "What we know" block summarizes findings already in the analysis — it does not duplicate detail, just points back to the sections above

---

## Section 3: How brainstorming picks up the context

When `start-task` invokes `Skill('brainstorming')`, it passes args that instruct brainstorming to:

1. Read `.ai-context/task-outputs/GH-{number}/02-analysis.md` as its starting context
2. Skip the "Explore project context" step (Step 1 of the brainstorming checklist) — that work is already done
3. Open the dialogue using the Design Questions section as its agenda

Brainstorming's first user-facing message becomes:

> "I've reviewed the codebase analysis for GH-{number}. I want to understand [first open question]..."

The rest of the brainstorming flow is unchanged:
- Clarifying questions (one at a time)
- 2–3 approach proposals with trade-offs
- Design sections presented for approval
- Spec doc written to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- GitHub issue comment posted (see Section 5)
- `writing-plans` invoked as terminal step

**No changes are made to the brainstorming skill file itself.** The context skip is communicated through invocation args.

---

## Section 4: Artifact lifecycle

```
start-task creates:
  .ai-context/task-outputs/GH-{number}/
    00-task-overview.md     ← issue details, acceptance criteria
    01-setup.md             ← branch info, PR target, environment
    02-analysis.md          ← codebase analysis + Design Questions brief

brainstorming creates:
  docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md   ← approved spec

writing-plans creates (invoked by brainstorming as its terminal step):
  .ai-context/task-outputs/GH-{number}/
    03-implementation-plan.md   ← concrete steps, references the spec
```

- Artifact numbers 00–06 do not change
- The spec doc lives in `docs/superpowers/specs/` (brainstorming's standard location)
- `03-implementation-plan.md` is produced by writing-plans reading both `02-analysis.md` and the spec — no conflict, they serve different roles:
  - `02-analysis.md` = "what exists in the codebase"
  - spec doc = "what we decided to build"

---

## Section 5: GitHub issue comment with brainstorming outcome

After the spec is written and approved, and before brainstorming invokes `writing-plans`, a comment is posted to the GitHub issue via `mcp__github__add_issue_comment`.

**Comment format:**

```markdown
## Design Decision — YYYY-MM-DD

**Approach chosen:** [one-sentence summary of the selected approach]

**Key decisions:**
- [Decision 1]
- [Decision 2]
- [Decision 3]

**Constraints identified:**
- [Hard constraints surfaced during brainstorming]

**Spec:** `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
**Implementation plan:** Will be created at `.ai-context/task-outputs/GH-{number}/03-implementation-plan.md`
```

**Rules:**
- Only posted if a GitHub issue exists (branch name contains `GH-{number}` and issue was successfully fetched in start-task)
- Posted once — after spec approval, before writing-plans
- Not updated later

---

## Files to modify

| File | Change |
|------|--------|
| `.claude/skills/start-task/SKILL.md` | Add Step 13 (invoke brainstorming); restructure Step 12 to remove terminal message; update 02-analysis.md template to include Design Questions section |
| `.claude/skills/brainstorming/` | No changes — context skip is handled via invocation args |

## Files to leave unchanged

- All artifact templates (00–06)
- `docs/superpowers/plans/` structure
- `writing-plans` skill
- `submit-pr`, `merge-pr`, `create-release` skills

---

## What this is NOT

- Not a conditional flow — brainstorming always runs after start-task
- Not a new artifact number — spec lives in `docs/superpowers/specs/`, not the task-outputs folder
- Not a change to how brainstorming or writing-plans work internally
