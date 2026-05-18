# Design Spec: enhanced `/code-review` skill

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Replace the existing `/code-review` (single-pass checklist) with a multi-agent, branch-scoped review that includes deterministic security scanning, persistent per-agent outputs for crash-recovery, and PR-comment delivery. Absorbs and deprecates `/full-review`.

---

## Problem

The two existing review skills don't fit the day-to-day need:

- **`/code-review`** is a fast single-pass checklist over a path the user types. It has no security scanning, no persistence, and no notion of "what changed on this branch."
- **`/full-review`** is a 11-agent parallel review with persistence and auto-issue creation, but it runs over the whole repo every time — token-expensive, slow, and noisy with findings from code the developer isn't touching.

Neither skill answers the most common question: *"Review what I'm about to ship on this branch."* That gap forces developers to either (a) skip review entirely, (b) run `/full-review` and ignore most of the output, or (c) hand-pick a path argument and miss cross-cutting concerns.

The new `/code-review` answers that question by default while remaining able to scale up to a full-repo audit on demand.

---

## Goals

1. **Branch-scoped by default.** No flags needed for the common case.
2. **Maximum coverage on a smaller surface.** All 12 agents always run; the smaller scope makes per-agent token cost tractable.
3. **Deterministic + LLM security in one pass.** Semgrep + Aikido scanners produce ground-truth findings; an LLM security agent triages them and adds context-only findings the scanners can't catch.
4. **Resilient to failure.** Every artifact is persisted atomically; a crashed run is resumable from the last known good state.
5. **Findings land where the work happens.** Inline review comments on the open PR when one exists; file-only otherwise.
6. **Whole-repo audit stays possible but never accidental.** `--all` requires a typed-phrase confirmation.

---

## Section 1: Identity and migration

`/code-review` replaces `/full-review` as the canonical review entry point.

| Old skill | New behavior |
| --- | --- |
| `/code-review` | The new multi-agent skill specified in this document. |
| `/full-review` | Thin alias that prints a deprecation note and forwards to `/code-review --all`. Retained so existing automations don't break. |
| `/fix-full-review` | Updated to also accept reports from `.ai-context/code-reviews/` (in addition to the existing `.ai-context/reviews/`). |

The single-pass checklist semantics of the old `/code-review` are gone. Users who want a quick checklist for a single file can pass `--agent <name>` to run one specific agent.

---

## Section 2: Scope resolution

### Default mode (no flags)

```
review_scope = diff(working_tree, merge-base(HEAD, base_ref))
```

Where:

- **`base_ref`** is determined by branch-name routing:

  | Current branch prefix | `base_ref` |
  | --- | --- |
  | `release/*` | `origin/main` |
  | `feat/`, `chore/`, `refactor/`, `docs/`, `fix/` | `origin/develop` |
  | anything else | `origin/develop` (with a warning) |

  Documented in `.claude/rules/git-workflow.md`. `fix/*` historically can target either; default to `origin/develop` and let `--base origin/main` override.

- **`working_tree`** = committed code + staged changes + unstaged changes + untracked files (matching the project's gitignore rules).

- **`merge-base(HEAD, base_ref)`** is computed via `git merge-base HEAD <base_ref>`. This is the divergence point: the most recent commit shared between the branch and its parent.

### Scope variants

| Flag | What's reviewed |
| --- | --- |
| (default) | working tree vs `merge-base(HEAD, base_ref)` |
| `--committed-only` | `HEAD` vs `merge-base(HEAD, base_ref)`. Ignores uncommitted edits. |
| `--staged` | `git diff --cached` only. For pre-commit hooks. |
| `--base <ref>` | Override `base_ref` (e.g., `--base origin/main`, `--base v2026.05.01`, `--base abc1234`). |
| `--all` | Whole repo. Bypasses all diff logic. Requires typed-phrase confirmation. |

### Filtering

Before agents run, the file list is filtered:

1. **Deleted files** — excluded; orchestrator notes them in the manifest but no agent runs.
2. **Renamed files** — treated as the new path; rename is noted in the manifest.
3. **Generated files** — excluded per `.claude/rules/generated-code-policy.md` (files under `generated/`, `__generated__/`, or with an "auto-generated" / "DO NOT EDIT" header).
4. **`.code-reviewignore`** — gitignore-syntax file at the repo root. Matching files are skipped by both LLM agents and scanners. Useful for vendored code, large fixtures, etc.
5. **Binary files** — excluded.

### Pre-flight summary

Before any agent or scanner starts, the orchestrator prints:

```
Code review scope
─────────────────────────────────────
Branch:      feat/GH-319_Seller-Card
Base:        origin/develop @ abc1234
Mode:        working tree (uncommitted included)
Files:       14 (2 deleted, 1 renamed, 1 ignored)
Agents:      12
Scanners:    semgrep + aikido
─────────────────────────────────────
```

This is the user's confirmation that the scope is what they expected. They can `Ctrl-C` here without cost.

---

## Section 3: Agent set

All 12 agents run on every invocation (branch-scoped or `--all`). The branch-scoped surface keeps per-agent cost low; the 12-agent coverage maximizes the chance of catching the issue.

| # | Agent | Source rules |
| --- | --- | --- |
| 1 | architecture | `.claude/rules/architecture.md` |
| 2 | SOLID | `.claude/rules/solid-principles.md` |
| 3 | DRY | `.claude/rules/dry-principle.md` |
| 4 | component-patterns | `.claude/rules/component-patterns.md` |
| 5 | naming-conventions | `.claude/rules/naming-conventions.md` |
| 6 | bug-detection | `.claude/rules/code-review-standards.md#bug-detection-standards` |
| 7 | tailwind / styling | `.claude/rules/tailwind.md`, `css-consistency.md` |
| 8 | testing | `.claude/rules/testing.md` |
| 9 | performance | `.claude/rules/code-review-standards.md#performance-standards` |
| 10 | pattern-discovery | (no fixed rule — finds undocumented patterns / anti-patterns) |
| 11 | security (LLM) | `.claude/rules/code-review-standards.md#security-standards` |
| 12 | **rules-drift** (new) | This section |

### The new `rules-drift` agent

Codebase-specific agent that catches the bug class we hunted today: enum-style hardcoded lists that drift from their SSOT.

It cross-checks the diff against this repo's SSOT patterns:

- **Status / currency literal drift.** New string literal matching a domain enum (e.g., `"approved"`, `"USD"`) used in a place that should derive from `ORDER_STATUS_LIST` (`packages/shared/src/constants/orders.ts`) or `POPULAR_CURRENCIES` (`packages/shared/src/utils/currencies.ts`).
- **Type union hardcoding.** A new `type X = "a" | "b" | "c"` where the project pattern is `as const` array + `(typeof ARR)[number]`. Flagged with a suggestion to switch to the derived pattern.
- **Magic value drift.** Hardcoded API URL, port, or magic number where an env var or SSOT constant already exists.
- **Enum-string in unguarded route.** Direct `payment_status === "approved"` style comparisons in API routes that bypass the validated allowlist.

The agent reads `.claude/rules/single-source-of-truth.md` and `.claude/rules/no-hardcoding.md` as its rule source.

### What each agent reads

Each agent receives, for each file in scope:

- **Full file content** (for context).
- **The diff hunks** (so the agent knows what changed).
- **The file's path** and (where useful) the rename source.

Each agent is instructed: *report findings only on lines that appear in the diff (added or modified). Do not flag pre-existing issues in unchanged hunks.* This keeps signal high — branch reviews aren't legacy audits.

### Severity levels

Inherited from `.claude/rules/code-review-standards.md`:

| Level | Used for inline PR comments? |
| --- | --- |
| **Critical** | Yes (default threshold) |
| **Warning** | Yes |
| **Suggestion** | No — appears in summary body only |
| **Info** | No — appears in summary body only |

`--threshold <level>` overrides the inline-comment cutoff.

---

## Section 4: Security scanning

Three components run for security:

### 4.1 Deterministic SAST (Semgrep)

Runs `semgrep --config=auto` against the scoped file list. Output is parsed and persisted to `.ai-context/code-reviews/scanners/{review_id}_semgrep.json`.

Semgrep is essentially free (no LLM tokens). It catches:

- Hardcoded secrets / JWT / API keys.
- Command injection patterns.
- Unsafe deserialization.
- Path traversal.
- Well-known OWASP patterns.

### 4.2 Cloud security scan (Aikido)

Runs `aikido_full_scan` on the file list via the Aikido MCP. Output persisted to `.ai-context/code-reviews/scanners/{review_id}_aikido.json`.

Aikido catches:

- Supply-chain vulnerabilities in dependencies referenced by changed `package.json` lines.
- Secrets the local Semgrep ruleset doesn't cover.
- Broader CWE patterns.

### 4.3 LLM security agent (triage + context)

After scanners finish, the security agent receives:

- All semgrep findings.
- All aikido findings.
- The full file content for each flagged file.
- The diff hunks.

It produces three categories of findings:

| Category | Source | Output |
| --- | --- | --- |
| `scanner-confirmed` | A scanner finding that the LLM judged as a real issue. | Inline finding with the scanner's rule ID + the LLM's explanation. |
| `scanner-but-FP` | A scanner finding the LLM judged as a false positive. | Suppressed from the report. Logged in the manifest for audit. |
| `llm-found` | A real risk the scanners couldn't catch (e.g., logic-level data exposure, broken authz, dangerous response shape). | Inline finding with the LLM's reasoning. |

### 4.4 Critical-finding interrupt

If **any** scanner produces a `CRITICAL` finding (e.g., hardcoded secret committed), the orchestrator pauses **before** the LLM agents run and prompts:

```
⚠  Critical finding from semgrep:
   apps/admin/src/app/api/foo/route.ts:42
   Hardcoded JWT token detected

   [c] Cancel review and fix this first
   [F] Continue with the review anyway
```

Default is "Cancel." Continuing without fixing is the loud-and-explicit choice, not the silent default.

---

## Section 5: Orchestration and persistence

### Directory layout

```
.ai-context/code-reviews/
├── {review_id}_manifest.json
├── agents/
│   └── {review_id}_{agent}.json
├── scanners/
│   ├── {review_id}_semgrep.json
│   └── {review_id}_aikido.json
├── cache/
│   └── {sha256_of_file_content}_{agent}.json
└── {review_id}_review.md
```

**`{review_id}` format:** `YYYY-MM-DDTHH-MM-SS` (e.g., `2026-05-18T14-30-00`).

### Manifest

`{review_id}_manifest.json` is the source of truth for "is this run resumable?" and "what did it cover?":

```json
{
  "review_id": "2026-05-18T14-30-00",
  "branch": "feat/GH-319_Seller-Card",
  "base_ref": "origin/develop",
  "base_sha": "abc1234567890",
  "head_sha": "def5678901234",
  "mode": "working_tree",
  "started_at": "2026-05-18T14:30:00Z",
  "completed_at": null,
  "status": "in_progress",
  "files": [
    { "path": "apps/admin/src/...", "status": "modified" },
    { "path": "apps/admin/e2e/...", "status": "added" }
  ],
  "ignored_files": ["..."],
  "deleted_files": ["..."],
  "agents": {
    "architecture": "complete",
    "solid": "complete",
    "dry": "in_progress",
    "...": "..."
  },
  "scanners": {
    "semgrep": "complete",
    "aikido": "complete"
  }
}
```

### Atomic writes

Every JSON artifact (agent, scanner, manifest) is written via the `tmp` + rename pattern:

1. Write to `{name}.tmp.json`.
2. `fsync`.
3. `rename` to `{name}.json`.

This guarantees no half-written files on crash. Files either exist completely or not at all.

### Resume flow

When `/code-review` is invoked (with no `--fresh`):

1. Look for a state pointer: `.ai-context/code-reviews/.in-flight.json` containing `{review_id, base_sha, head_sha}`.
2. Compute current `base_sha` and `head_sha` from the working tree.
3. If they match the in-flight pointer → prompt:

   ```
   Found in-flight review 2026-05-18T14-30-00 (8/12 agents complete).
   Resume? [Y/n]
   ```

4. On resume: skip agents whose JSON already exists, run only missing ones, then aggregate.
5. If SHAs **don't** match (branch switched, rebase, new commit) → state is stale; start a fresh run. Old manifest stays for history.

`--resume <id>` bypasses the auto-detect and forces resume of a specific ID. `--fresh` forces a new run regardless of in-flight state.

### Cache

`.ai-context/code-reviews/cache/{sha256(file_content)}_{agent}.json` stores per-file, per-agent findings keyed by **file content hash** (not path).

On every agent run, for each file in scope:

1. Compute `sha256(file_content)`.
2. Check cache for `{hash}_{agent}.json`.
3. If hit → reuse the cached findings.
4. If miss → run the agent on the file, write to cache.

A file modified since the last review gets a new hash → cache miss → re-reviewed. A file unchanged across reviews → cache hit → instant. This makes "fix one thing then re-run" cheap.

Cache is shared across review runs (it's keyed on content, not run ID).

### Failure modes

| Failure | Behavior |
| --- | --- |
| Single agent times out / crashes | No JSON written. Manifest marks it `failed`. Orchestrator finishes other agents and aggregates what's there. Report flags the missing agent. Resume re-runs only the missing agent. |
| Scanner unavailable (no network, MCP down) | Logged warning. Skipped. LLM security agent runs without that input. Manifest records `scanner: skipped`. |
| Orchestrator killed mid-run | Atomic writes mean no corruption. Re-invoking detects the in-flight pointer and resumes. |
| Working tree changes during a run | Detected via `head_sha` recomputation. Manifest flags `head_sha_changed`. Findings still aggregated but flagged as possibly stale. |
| No PR exists and `--issue` not set | File-only output. No GitHub API call. |

---

## Section 6: Output and delivery

### Final report file

`{review_id}_review.md` is always written, regardless of GitHub delivery. Structure:

```markdown
# Code Review — {branch} — {review_id}

**Base:** {base_ref} @ {base_sha}
**Mode:** working_tree | committed_only | staged | all
**Files reviewed:** N (+ list)
**Status:** complete | partial (X/12 agents)

## Summary
| Severity | Count |
| --- | --- |
| 🔴 Critical | X |
| 🟠 Warning | X |
| 🟡 Suggestion | X |
| ℹ️ Info | X |
| 🛡️ Security | X (scanner: X, llm: X) |

## Critical Findings
[list]

## Warnings
[list]

## Suggestions
[list]

## Security Findings
[list]

## Pattern Discovery
[list]

## Rule-Drift Findings
[list]

## Failed Agents
[only present if status=partial]
```

### PR delivery

If `gh pr view --json number` succeeds for the current branch, the orchestrator posts findings to that PR:

1. **Inline review comments** for findings at `severity >= threshold` (default `warning+`). Each comment includes:
   - Finding ID (hidden HTML comment for dedup).
   - Severity icon.
   - Agent name.
   - Rule reference link.
   - Brief description + suggested fix.
2. **Summary body** as the PR review body — full report content, including suggestions/info.
3. **Re-run dedup.** Each finding has a stable ID: `sha256(agent + file + line_range + rule_id)`. On re-run:
   - Findings with the same ID → update existing comment (no duplicate).
   - Findings absent from new run but present in old → resolution depends on whether the existing thread contains a `#noresolve` marker (see 4 below):
     - **No `#noresolve` marker** → comment is **resolved** via the GitHub API (`PATCH /repos/.../pulls/.../comments/{id}` setting `resolved=true`). The body is preserved for audit; no new comment is posted.
     - **`#noresolve` marker present** → comment is left in its current state (not resolved, not deleted). The skill logs it as a "deferred finding" in the manifest.
   - New findings → added as new inline comments.

4. **Deferring resolution with `#noresolve`.** When a finding can't or won't be fixed (false positive, intentional design, blocked on something external), the developer leaves a reply on the inline thread containing the literal token `#noresolve` plus a short reason. Example:

   ```
   #noresolve  intentional — this route is admin-only and the early-return is
   guarded by getAuthorizedAdmin(). Semgrep can't see the auth wrapper.
   ```

   The skill scans every existing inline thread for `#noresolve` before deciding to resolve. The marker prevents auto-resolution on **all future re-runs** until the reply is deleted/edited or the finding is fixed in code (which makes the finding's ID disappear naturally).

5. **Re-reviewing deferred findings.** Sometimes deferred findings need a second look — the surrounding code changed, the dependency the deferral hinged on was upgraded, or it's been a while and we want to see if the situation still holds. The `--review-deferred` flag does exactly that:

   - Fetches all open inline comments on the PR carrying `#noresolve`.
   - Builds a focused review scope from those comments' files + line ranges.
   - Runs only the originating agents on that scope.
   - Produces a `{review_id}_deferred-review.md` report listing each deferred finding with the agent's fresh verdict: *still valid* / *no longer applies* / *changed materially — see details*.
   - Does **not** modify the existing comments. The developer reads the report and decides whether to remove the `#noresolve` marker (which re-arms the comment for resolution on the next regular run) or leave it as is.

### File-only delivery

If no PR exists and `--issue` not set: write the report to `.ai-context/code-reviews/{review_id}_review.md` and stop. Print the path so the user can open it.

### `--issue` flag

Forces creation of a GitHub issue (matches the old `/full-review` behavior). Useful for `--all` runs that aren't tied to a PR.

---

## Section 7: `--all` mode

When the user passes `--all`:

1. Orchestrator computes the full repo file list (respecting `.gitignore` + `.code-reviewignore`).
2. Estimates: `tokens ≈ file_count × avg_tokens_per_file × 12_agents`, where `avg_tokens_per_file` is sampled from the actual file list (read first 5 files, measure, extrapolate). Duration and cost are derived from token count using the orchestrator's current model pricing table.
3. Prompts with a typed-phrase confirmation:

   ```
   ⚠  /code-review --all will review the entire codebase.

      Files to review:    2,341
      Agents:             12
      Estimated tokens:   ~{computed_tokens}
      Estimated duration: ~{computed_minutes} min
      Estimated cost:     ~${computed_cost}

      This is a token-intensive operation.
      To proceed, type "review everything" exactly:
   ```

4. Only the exact phrase `review everything` proceeds. Anything else aborts.
5. Once running, persistence + resume + cache work identically to branch-scoped mode.

---

## Section 8: Flag reference

| Flag | Default | Effect |
| --- | --- | --- |
| (none) | — | Branch-scoped, working-tree mode, all 12 agents, scanners on, PR delivery if PR exists. |
| `--all` | off | Whole-repo. Typed-phrase confirmation. |
| `--base <ref>` | branch-name routed | Override base ref. |
| `--committed-only` | off | Diff = HEAD vs base. |
| `--staged` | off | Diff = `git diff --cached`. |
| `--resume <id>` | auto-detect | Resume specific run. |
| `--fresh` | off | Ignore any in-flight run. |
| `--agent <name>` | run all | Run a single agent. |
| `--threshold <level>` | `warning` | Inline-comment severity threshold. |
| `--no-security` | off | Skip the LLM security agent. |
| `--no-scanners` | off | Skip semgrep + aikido. |
| `--issue` | off | Also create a GitHub issue. |
| `--review-deferred` | off | Re-investigate only the inline comments carrying `#noresolve` on the open PR. |

---

## Section 9: File-level changes

### New files

- `.claude/skills/code-review/SKILL.md` — full skill spec (replaces existing).
- `.claude/skills/code-review/agents/index.md` — agent registry.
- `.claude/skills/code-review/agents/rules-drift.md` — new rules-drift agent.
- `.claude/skills/code-review/orchestrator.md` — orchestration logic (scope resolution, persistence, resume, delivery).
- `.code-reviewignore` (repo root) — initial empty file with documentation comment.
- `docs/superpowers/specs/2026-05-18-code-review-skill-design.md` — this spec.

### Modified files

- `.claude/skills/full-review/SKILL.md` — replaced with a thin alias / deprecation note.
- `.claude/skills/fix-full-review/SKILL.md` — updated to also read `.ai-context/code-reviews/`.
- `.claude/skills/full-review/agents/*.md` — moved into `.claude/skills/code-review/agents/` (the new home); old paths kept as redirects.

### Unchanged but referenced

- `.claude/rules/git-workflow.md` (branch-name routing source).
- `.claude/rules/code-review-standards.md` (severity scale, security standards, performance standards).
- `.claude/rules/multi-agent-persistence.md` (atomic-write pattern, manifest pattern).
- `.claude/rules/generated-code-policy.md` (file filtering).
- `.claude/rules/single-source-of-truth.md` + `no-hardcoding.md` (rules-drift agent's rule source).

---

## Section 10: Out of scope

- **Auto-fix mode.** The skill reports findings; it does not edit code. `/fix-full-review` (renamed/updated separately) handles that.
- **Cross-repo review.** This skill operates on the current repo only.
- **Linter/formatter integration.** `/verify-code` already covers that; not duplicated here.
- **Hot-watch / continuous review.** The skill is invoked explicitly. Auto-runs (pre-commit, CI) are a separate composition concern.

---

## Open questions

None. Awaiting user spec review before transitioning to writing-plans.
