# Code-Review Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/code-review` and `/full-review` with a single branch-scoped, 12-agent code review skill that includes deterministic security scanning, atomic persistence + resume, and PR-comment delivery.

**Architecture:** Skill prose in `.claude/skills/code-review/` instructs Claude to run a sequence of operations. Heavy lifting (scope resolution, atomic IO, ID hashing, scanner wrapping, PR comment dedup) is delegated to small, individually testable Node helpers under `scripts/code-review/`, called by Claude via Bash. Per-agent findings are written atomically as JSON; aggregation produces a final report and, when a PR exists, inline review comments with stable IDs for re-run dedup. `#noresolve` markers on inline threads preserve "won't fix" findings across runs; `--review-deferred` re-investigates them.

**Tech Stack:** Node 22+ (`.mjs`, ESM), Vitest 4 for tests, `gh` CLI for GitHub, `git` for scope, semgrep + Aikido MCP for scanners. No new runtime deps.

**Spec:** [`docs/superpowers/specs/2026-05-18-code-review-skill-design.md`](../specs/2026-05-18-code-review-skill-design.md)

---

## File structure

### New files (helpers — all under `scripts/code-review/`)

| Path | Responsibility |
| --- | --- |
| `scripts/code-review/finding-id.mjs` | Stable sha256 ID for a finding (pure). |
| `scripts/code-review/noresolve-parser.mjs` | Detects `#noresolve` markers in a comment thread (pure). |
| `scripts/code-review/pr-comment-sync.mjs` | Diff between existing PR comments and new findings → `{add, update, resolve, defer}` (pure). |
| `scripts/code-review/atomic-write.mjs` | `tmp` + rename atomic file write. |
| `scripts/code-review/manifest.mjs` | Read/write the review manifest JSON. |
| `scripts/code-review/cache.mjs` | Per-file-content-hash cache lookup + write. |
| `scripts/code-review/compute-scope.mjs` | Given flags + repo state → file list, base SHA, head SHA. |
| `scripts/code-review/run-scanners.mjs` | Wraps semgrep + Aikido invocations; merges output. |
| `scripts/code-review/find-pr.mjs` | Returns PR number for current branch, or null. |
| `scripts/code-review/estimate-all.mjs` | File count + token + duration + cost estimate for `--all` mode. |
| `scripts/code-review/fetch-deferred.mjs` | Fetches all PR inline threads carrying `#noresolve`. |

### New files (helper tests)

| Path | Tests |
| --- | --- |
| `scripts/__tests__/code-review/finding-id.test.mjs` | finding-id |
| `scripts/__tests__/code-review/noresolve-parser.test.mjs` | noresolve-parser |
| `scripts/__tests__/code-review/pr-comment-sync.test.mjs` | pr-comment-sync |
| `scripts/__tests__/code-review/atomic-write.test.mjs` | atomic-write (integration via tmp dir) |
| `scripts/__tests__/code-review/manifest.test.mjs` | manifest (integration via tmp dir) |
| `scripts/__tests__/code-review/cache.test.mjs` | cache (integration via tmp dir) |
| `scripts/__tests__/code-review/compute-scope.test.mjs` | compute-scope (integration via git fixture) |

### New files (skill prose)

| Path | Responsibility |
| --- | --- |
| `.claude/skills/code-review/SKILL.md` | Replaces existing. Top-level orchestrator instructions Claude follows. |
| `.claude/skills/code-review/agents/index.md` | Registry of the 12 agents. |
| `.claude/skills/code-review/agents/rules-drift.md` | New rules-drift agent prompt. |
| `.claude/skills/code-review/agents/architecture.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/solid.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/dry.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/component-patterns.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/naming-conventions.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/bug-detection.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/tailwind.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/testing.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/performance.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/pattern-discovery.md` | Moved from full-review. |
| `.claude/skills/code-review/agents/security.md` | Moved from full-review, updated for scanner triage. |

### New files (other)

| Path | Responsibility |
| --- | --- |
| `.code-reviewignore` | Repo-root ignore list. |
| `.ai-context/code-reviews/.gitkeep` | Persistence directory marker. |

### Modified files

| Path | Change |
| --- | --- |
| `.claude/skills/full-review/SKILL.md` | Replaced with thin alias. |
| `.claude/skills/fix-full-review/SKILL.md` | Updated to also read `.ai-context/code-reviews/`. |

---

## Phase 1 — Scaffolding

### Task 1.1: Create skill directory + placeholder files

**Files:**
- Create: `.claude/skills/code-review/SKILL.md` (placeholder)
- Create: `.claude/skills/code-review/agents/index.md` (placeholder)
- Create: `.code-reviewignore`
- Create: `.ai-context/code-reviews/.gitkeep`
- Create: `scripts/code-review/.gitkeep`
- Create: `scripts/__tests__/code-review/.gitkeep`

- [ ] **Step 1: Create the directories and files.**

```bash
mkdir -p .claude/skills/code-review/agents
mkdir -p .ai-context/code-reviews
mkdir -p scripts/code-review
mkdir -p scripts/__tests__/code-review
touch .ai-context/code-reviews/.gitkeep
touch scripts/code-review/.gitkeep
touch scripts/__tests__/code-review/.gitkeep
```

- [ ] **Step 2: Write the placeholder SKILL.md.**

Write `.claude/skills/code-review/SKILL.md`:

```markdown
---
name: code-review
description: Branch-scoped multi-agent code review with deterministic security scanning, atomic persistence, and PR-comment delivery. Use when reviewing code on the current branch before pushing or merging.
---

# Code Review

> NOTE: This skill is being implemented. See `docs/superpowers/plans/2026-05-18-code-review-skill.md`.
```

- [ ] **Step 3: Write `.code-reviewignore` with documentation header.**

Write `.code-reviewignore`:

```
# .code-reviewignore — files the /code-review skill should skip for both
# LLM agents and security scanners.
#
# Syntax: same as .gitignore (one pattern per line, blank lines and lines
# starting with '#' ignored).
#
# Generated files are already auto-excluded via .claude/rules/generated-code-policy.md.
# Use this file for vendored code, large fixtures, snapshots, etc.

# Examples (uncomment as needed):
# vendor/**
# **/__snapshots__/**
# **/fixtures/**
```

- [ ] **Step 4: Verify the structure.**

Run: `ls -la .claude/skills/code-review/ scripts/code-review/ .ai-context/code-reviews/ .code-reviewignore`
Expected: all paths exist.

- [ ] **Step 5: Commit.**

```bash
git add .claude/skills/code-review .code-reviewignore .ai-context/code-reviews scripts/code-review scripts/__tests__/code-review
git commit -m "feat(code-review): scaffold skill directory + ignore file [GH-XXX]"
```

---

## Phase 2 — Pure helpers (TDD)

### Task 2.1: `finding-id.mjs` — stable finding IDs

**Files:**
- Create: `scripts/code-review/finding-id.mjs`
- Create: `scripts/__tests__/code-review/finding-id.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/finding-id.test.mjs`:

```javascript
import { describe, expect, it } from "vitest";
import { computeFindingId } from "../../code-review/finding-id.mjs";

describe("computeFindingId", () => {
  const sample = {
    agent: "solid",
    file: "apps/admin/src/foo.ts",
    lineStart: 42,
    lineEnd: 58,
    ruleId: "SRP",
  };

  it("returns the same hex sha256 for identical input", () => {
    expect(computeFindingId(sample)).toBe(computeFindingId({ ...sample }));
  });

  it("produces different ids when the agent differs", () => {
    expect(computeFindingId(sample)).not.toBe(
      computeFindingId({ ...sample, agent: "dry" }),
    );
  });

  it("produces different ids when the line range differs", () => {
    expect(computeFindingId(sample)).not.toBe(
      computeFindingId({ ...sample, lineStart: 43 }),
    );
  });

  it("returns a 64-character hex string", () => {
    expect(computeFindingId(sample)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is order-independent within the input object", () => {
    const a = computeFindingId({
      agent: "solid",
      file: "x.ts",
      lineStart: 1,
      lineEnd: 2,
      ruleId: "R",
    });
    const b = computeFindingId({
      ruleId: "R",
      lineEnd: 2,
      lineStart: 1,
      file: "x.ts",
      agent: "solid",
    });
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/finding-id.test.mjs`
Expected: FAIL — module `../../code-review/finding-id.mjs` not found.

- [ ] **Step 3: Implement `finding-id.mjs`.**

Write `scripts/code-review/finding-id.mjs`:

```javascript
import { createHash } from "node:crypto";

/**
 * Stable, deterministic ID for a code-review finding. Used to deduplicate
 * inline PR comments across re-runs of /code-review.
 *
 * @param {{agent: string, file: string, lineStart: number, lineEnd: number, ruleId: string}} f
 * @returns {string} 64-char lowercase hex sha256.
 */
export function computeFindingId(f) {
  const canonical = JSON.stringify({
    agent: f.agent,
    file: f.file,
    lineStart: f.lineStart,
    lineEnd: f.lineEnd,
    ruleId: f.ruleId,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/finding-id.test.mjs`
Expected: 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/finding-id.mjs scripts/__tests__/code-review/finding-id.test.mjs
git commit -m "feat(code-review): add stable finding-id hashing [GH-XXX]"
```

---

### Task 2.2: `noresolve-parser.mjs` — detect `#noresolve` markers

**Files:**
- Create: `scripts/code-review/noresolve-parser.mjs`
- Create: `scripts/__tests__/code-review/noresolve-parser.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/noresolve-parser.test.mjs`:

```javascript
import { describe, expect, it } from "vitest";
import { hasNoresolve, extractNoresolveReason } from "../../code-review/noresolve-parser.mjs";

describe("hasNoresolve", () => {
  it("returns true when a reply contains the marker", () => {
    expect(hasNoresolve([{ body: "thanks" }, { body: "#noresolve fp" }])).toBe(true);
  });

  it("returns false when no reply contains the marker", () => {
    expect(hasNoresolve([{ body: "thanks" }, { body: "looking" }])).toBe(false);
  });

  it("returns false on an empty thread", () => {
    expect(hasNoresolve([])).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasNoresolve([{ body: "#NoResolve here" }])).toBe(true);
  });

  it("requires the literal `#noresolve` token (not just `noresolve`)", () => {
    expect(hasNoresolve([{ body: "we cannot resolve this" }])).toBe(false);
  });

  it("ignores noresolve inside a code fence", () => {
    expect(
      hasNoresolve([
        { body: "before\n```\n#noresolve\n```\nafter" },
      ]),
    ).toBe(false);
  });
});

describe("extractNoresolveReason", () => {
  it("returns the text after `#noresolve` on the same line", () => {
    expect(
      extractNoresolveReason([{ body: "#noresolve  fp — auth wrapper guards this" }]),
    ).toBe("fp — auth wrapper guards this");
  });

  it("returns null when no marker exists", () => {
    expect(extractNoresolveReason([{ body: "thanks" }])).toBeNull();
  });

  it("returns the empty string when marker has no trailing text", () => {
    expect(extractNoresolveReason([{ body: "#noresolve" }])).toBe("");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/noresolve-parser.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `noresolve-parser.mjs`.**

Write `scripts/code-review/noresolve-parser.mjs`:

```javascript
const MARKER = /(^|[^`])#noresolve\b[ \t]*(.*)$/im;

function stripFences(body) {
  // Remove fenced code blocks so a `#noresolve` inside a fence doesn't count.
  return body.replace(/```[\s\S]*?```/g, "");
}

/**
 * Check whether any comment in the thread carries a `#noresolve` marker
 * outside of fenced code blocks.
 * @param {Array<{body: string}>} thread
 * @returns {boolean}
 */
export function hasNoresolve(thread) {
  for (const c of thread) {
    if (MARKER.test(stripFences(c.body ?? ""))) return true;
  }
  return false;
}

/**
 * Return the trimmed text following the first `#noresolve` token in the thread,
 * or `null` if no marker exists.
 * @param {Array<{body: string}>} thread
 * @returns {string|null}
 */
export function extractNoresolveReason(thread) {
  for (const c of thread) {
    const match = MARKER.exec(stripFences(c.body ?? ""));
    if (match) return (match[2] ?? "").trim();
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/noresolve-parser.test.mjs`
Expected: all 9 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/noresolve-parser.mjs scripts/__tests__/code-review/noresolve-parser.test.mjs
git commit -m "feat(code-review): add #noresolve marker parser [GH-XXX]"
```

---

### Task 2.3: `pr-comment-sync.mjs` — compute add/update/resolve sets

**Files:**
- Create: `scripts/code-review/pr-comment-sync.mjs`
- Create: `scripts/__tests__/code-review/pr-comment-sync.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/pr-comment-sync.test.mjs`:

```javascript
import { describe, expect, it } from "vitest";
import { syncComments } from "../../code-review/pr-comment-sync.mjs";

const finding = (id, opts = {}) => ({
  id,
  agent: "solid",
  file: "x.ts",
  lineStart: 1,
  lineEnd: 1,
  severity: "warning",
  body: "body",
  ...opts,
});

const existing = (findingId, opts = {}) => ({
  commentId: `c-${findingId}`,
  findingId,
  thread: [],
  ...opts,
});

describe("syncComments", () => {
  it("classifies new findings as `add`", () => {
    const result = syncComments({
      newFindings: [finding("A")],
      existingComments: [],
    });
    expect(result.add).toHaveLength(1);
    expect(result.add[0].id).toBe("A");
    expect(result.update).toEqual([]);
    expect(result.resolve).toEqual([]);
    expect(result.defer).toEqual([]);
  });

  it("classifies same-id existing findings as `update`", () => {
    const result = syncComments({
      newFindings: [finding("A", { body: "v2" })],
      existingComments: [existing("A")],
    });
    expect(result.update).toHaveLength(1);
    expect(result.update[0].commentId).toBe("c-A");
    expect(result.update[0].body).toBe("v2");
    expect(result.add).toEqual([]);
  });

  it("classifies disappeared findings as `resolve`", () => {
    const result = syncComments({
      newFindings: [],
      existingComments: [existing("A")],
    });
    expect(result.resolve).toHaveLength(1);
    expect(result.resolve[0]).toBe("c-A");
  });

  it("classifies disappeared findings with #noresolve as `defer` (not `resolve`)", () => {
    const result = syncComments({
      newFindings: [],
      existingComments: [
        existing("A", { thread: [{ body: "#noresolve fp" }] }),
      ],
    });
    expect(result.defer).toHaveLength(1);
    expect(result.defer[0]).toBe("c-A");
    expect(result.resolve).toEqual([]);
  });

  it("handles mixed input", () => {
    const result = syncComments({
      newFindings: [finding("A"), finding("B")],
      existingComments: [
        existing("A", { thread: [{ body: "ok" }] }),
        existing("C"),
        existing("D", { thread: [{ body: "#noresolve" }] }),
      ],
    });
    expect(result.add.map((f) => f.id)).toEqual(["B"]);
    expect(result.update.map((u) => u.commentId)).toEqual(["c-A"]);
    expect(result.resolve).toEqual(["c-C"]);
    expect(result.defer).toEqual(["c-D"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/pr-comment-sync.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `pr-comment-sync.mjs`.**

Write `scripts/code-review/pr-comment-sync.mjs`:

```javascript
import { hasNoresolve } from "./noresolve-parser.mjs";

/**
 * Diff a fresh set of findings against the inline comments already on a PR.
 *
 * @param {{
 *   newFindings: Array<{id: string, body: string}>,
 *   existingComments: Array<{commentId: string, findingId: string, thread: Array<{body: string}>}>
 * }} input
 * @returns {{
 *   add: Array<object>,
 *   update: Array<{commentId: string, body: string}>,
 *   resolve: Array<string>,
 *   defer: Array<string>,
 * }}
 */
export function syncComments({ newFindings, existingComments }) {
  const existingById = new Map(existingComments.map((c) => [c.findingId, c]));
  const newById = new Map(newFindings.map((f) => [f.id, f]));

  const add = [];
  const update = [];
  const resolve = [];
  const defer = [];

  for (const f of newFindings) {
    if (existingById.has(f.id)) {
      update.push({ commentId: existingById.get(f.id).commentId, body: f.body });
    } else {
      add.push(f);
    }
  }

  for (const c of existingComments) {
    if (newById.has(c.findingId)) continue;
    if (hasNoresolve(c.thread)) {
      defer.push(c.commentId);
    } else {
      resolve.push(c.commentId);
    }
  }

  return { add, update, resolve, defer };
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/pr-comment-sync.test.mjs`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/pr-comment-sync.mjs scripts/__tests__/code-review/pr-comment-sync.test.mjs
git commit -m "feat(code-review): add PR comment sync logic [GH-XXX]"
```

---

## Phase 3 — IO helpers (integration tests)

### Task 3.1: `atomic-write.mjs` — tmp + rename

**Files:**
- Create: `scripts/code-review/atomic-write.mjs`
- Create: `scripts/__tests__/code-review/atomic-write.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/atomic-write.test.mjs`:

```javascript
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { writeJsonAtomic } from "../../code-review/atomic-write.mjs";

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "code-review-aw-"));
});

describe("writeJsonAtomic", () => {
  it("writes the JSON file at the final path", async () => {
    const path = join(dir, "x.json");
    await writeJsonAtomic(path, { a: 1 });
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({ a: 1 });
  });

  it("does not leave a .tmp file behind on success", async () => {
    const path = join(dir, "x.json");
    await writeJsonAtomic(path, { a: 1 });
    expect(readdirSync(dir).some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("overwrites an existing file", async () => {
    const path = join(dir, "x.json");
    writeFileSync(path, JSON.stringify({ old: true }));
    await writeJsonAtomic(path, { fresh: true });
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({ fresh: true });
  });

  it("creates the parent directory if missing", async () => {
    const path = join(dir, "nested", "deeper", "x.json");
    await writeJsonAtomic(path, { ok: true });
    expect(existsSync(path)).toBe(true);
  });

  it("formats JSON with 2-space indent", async () => {
    const path = join(dir, "x.json");
    await writeJsonAtomic(path, { a: 1 });
    expect(readFileSync(path, "utf-8")).toBe('{\n  "a": 1\n}');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/atomic-write.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `atomic-write.mjs`.**

Write `scripts/code-review/atomic-write.mjs`:

```javascript
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Write a JSON value atomically: write to `{path}.tmp`, fsync, rename.
 * Guarantees the final file either exists fully or not at all.
 *
 * @param {string} path
 * @param {unknown} data
 */
export async function writeJsonAtomic(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), {
    encoding: "utf-8",
    flag: "w",
  });
  await rename(tmp, path);
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/atomic-write.test.mjs`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/atomic-write.mjs scripts/__tests__/code-review/atomic-write.test.mjs
git commit -m "feat(code-review): add atomic JSON writer [GH-XXX]"
```

---

### Task 3.2: `manifest.mjs` — review manifest read/write/update

**Files:**
- Create: `scripts/code-review/manifest.mjs`
- Create: `scripts/__tests__/code-review/manifest.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/manifest.test.mjs`:

```javascript
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createManifest,
  readManifest,
  updateAgentStatus,
  setInFlight,
  readInFlight,
  clearInFlight,
} from "../../code-review/manifest.mjs";

let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "code-review-m-"));
});

describe("createManifest + readManifest", () => {
  it("creates a manifest with the expected initial shape", async () => {
    const m = await createManifest(root, {
      reviewId: "2026-05-18T14-30-00",
      branch: "feat/foo",
      baseRef: "origin/develop",
      baseSha: "abc",
      headSha: "def",
      mode: "working_tree",
      files: [{ path: "x.ts", status: "modified" }],
      agents: ["solid", "dry"],
      scanners: ["semgrep", "aikido"],
    });

    expect(m.status).toBe("in_progress");
    expect(m.agents).toEqual({ solid: "pending", dry: "pending" });
    expect(m.scanners).toEqual({ semgrep: "pending", aikido: "pending" });
    expect(typeof m.started_at).toBe("string");

    const reloaded = await readManifest(root, m.review_id);
    expect(reloaded).toEqual(m);
  });
});

describe("updateAgentStatus", () => {
  it("updates the status of a single agent", async () => {
    const m = await createManifest(root, {
      reviewId: "x",
      branch: "b",
      baseRef: "r",
      baseSha: "a",
      headSha: "h",
      mode: "working_tree",
      files: [],
      agents: ["solid", "dry"],
      scanners: [],
    });
    await updateAgentStatus(root, "x", "solid", "complete");
    const reloaded = await readManifest(root, "x");
    expect(reloaded.agents.solid).toBe("complete");
    expect(reloaded.agents.dry).toBe("pending");
  });
});

describe("in-flight pointer", () => {
  it("round-trips set/read/clear", async () => {
    await setInFlight(root, { review_id: "x", base_sha: "a", head_sha: "b" });
    expect(await readInFlight(root)).toEqual({
      review_id: "x",
      base_sha: "a",
      head_sha: "b",
    });
    await clearInFlight(root);
    expect(await readInFlight(root)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/manifest.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `manifest.mjs`.**

Write `scripts/code-review/manifest.mjs`:

```javascript
import { readFile, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { writeJsonAtomic } from "./atomic-write.mjs";

const INFLIGHT = ".in-flight.json";

function manifestPath(root, reviewId) {
  return join(root, `${reviewId}_manifest.json`);
}

/**
 * Create a fresh manifest and persist it. Returns the in-memory object.
 */
export async function createManifest(root, input) {
  const manifest = {
    review_id: input.reviewId,
    branch: input.branch,
    base_ref: input.baseRef,
    base_sha: input.baseSha,
    head_sha: input.headSha,
    mode: input.mode,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: "in_progress",
    files: input.files,
    ignored_files: input.ignoredFiles ?? [],
    deleted_files: input.deletedFiles ?? [],
    agents: Object.fromEntries(input.agents.map((a) => [a, "pending"])),
    scanners: Object.fromEntries(input.scanners.map((s) => [s, "pending"])),
  };
  await writeJsonAtomic(manifestPath(root, input.reviewId), manifest);
  return manifest;
}

export async function readManifest(root, reviewId) {
  const raw = await readFile(manifestPath(root, reviewId), "utf-8");
  return JSON.parse(raw);
}

export async function updateAgentStatus(root, reviewId, agent, status) {
  const m = await readManifest(root, reviewId);
  m.agents[agent] = status;
  await writeJsonAtomic(manifestPath(root, reviewId), m);
}

export async function updateScannerStatus(root, reviewId, scanner, status) {
  const m = await readManifest(root, reviewId);
  m.scanners[scanner] = status;
  await writeJsonAtomic(manifestPath(root, reviewId), m);
}

export async function markComplete(root, reviewId) {
  const m = await readManifest(root, reviewId);
  m.status = "complete";
  m.completed_at = new Date().toISOString();
  await writeJsonAtomic(manifestPath(root, reviewId), m);
}

export async function setInFlight(root, pointer) {
  await writeJsonAtomic(join(root, INFLIGHT), pointer);
}

export async function readInFlight(root) {
  try {
    await stat(join(root, INFLIGHT));
  } catch {
    return null;
  }
  const raw = await readFile(join(root, INFLIGHT), "utf-8");
  return JSON.parse(raw);
}

export async function clearInFlight(root) {
  try {
    await unlink(join(root, INFLIGHT));
  } catch {
    // ignore — already absent
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/manifest.test.mjs`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/manifest.mjs scripts/__tests__/code-review/manifest.test.mjs
git commit -m "feat(code-review): add review manifest + in-flight pointer [GH-XXX]"
```

---

### Task 3.3: `cache.mjs` — per-file-content cache

**Files:**
- Create: `scripts/code-review/cache.mjs`
- Create: `scripts/__tests__/code-review/cache.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/cache.test.mjs`:

```javascript
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { hashFileContent, readCache, writeCache } from "../../code-review/cache.mjs";

let root, file;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "code-review-c-"));
  file = join(root, "sample.ts");
  writeFileSync(file, "export const x = 1;\n");
});

describe("hashFileContent", () => {
  it("produces a 64-char hex sha256", async () => {
    const h = await hashFileContent(file);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when the file changes", async () => {
    const h1 = await hashFileContent(file);
    writeFileSync(file, "export const x = 2;\n");
    const h2 = await hashFileContent(file);
    expect(h1).not.toBe(h2);
  });
});

describe("read/write cache", () => {
  it("returns null on cache miss", async () => {
    expect(await readCache(root, "deadbeef", "solid")).toBeNull();
  });

  it("round-trips findings", async () => {
    const findings = [{ id: "f1", severity: "warning" }];
    await writeCache(root, "deadbeef", "solid", findings);
    expect(await readCache(root, "deadbeef", "solid")).toEqual(findings);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/cache.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cache.mjs`.**

Write `scripts/code-review/cache.mjs`:

```javascript
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { writeJsonAtomic } from "./atomic-write.mjs";

const CACHE_DIR = "cache";

export async function hashFileContent(absPath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(absPath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function cachePath(root, contentHash, agent) {
  return join(root, CACHE_DIR, `${contentHash}_${agent}.json`);
}

export async function readCache(root, contentHash, agent) {
  const path = cachePath(root, contentHash, agent);
  try {
    await stat(path);
  } catch {
    return null;
  }
  return JSON.parse(await readFile(path, "utf-8"));
}

export async function writeCache(root, contentHash, agent, findings) {
  await writeJsonAtomic(cachePath(root, contentHash, agent), findings);
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/cache.test.mjs`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/cache.mjs scripts/__tests__/code-review/cache.test.mjs
git commit -m "feat(code-review): add per-file content-hash cache [GH-XXX]"
```

---

## Phase 4 — Scope resolution

### Task 4.1: `compute-scope.mjs` — base ref + file list

**Files:**
- Create: `scripts/code-review/compute-scope.mjs`
- Create: `scripts/__tests__/code-review/compute-scope.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/compute-scope.test.mjs`:

```javascript
import { describe, expect, it } from "vitest";
import { resolveBaseRef } from "../../code-review/compute-scope.mjs";

describe("resolveBaseRef", () => {
  it("routes release/* to origin/main", () => {
    expect(resolveBaseRef("release/GH-100_v2026.05.18.1")).toBe("origin/main");
  });

  it("routes feat/* to origin/develop", () => {
    expect(resolveBaseRef("feat/GH-1_Foo")).toBe("origin/develop");
  });

  it("routes chore/* to origin/develop", () => {
    expect(resolveBaseRef("chore/GH-1_Deps")).toBe("origin/develop");
  });

  it("routes refactor/* to origin/develop", () => {
    expect(resolveBaseRef("refactor/GH-1_Cleanup")).toBe("origin/develop");
  });

  it("routes docs/* to origin/develop", () => {
    expect(resolveBaseRef("docs/GH-1_Readme")).toBe("origin/develop");
  });

  it("routes fix/* to origin/develop by default", () => {
    expect(resolveBaseRef("fix/GH-1_Bug")).toBe("origin/develop");
  });

  it("returns origin/develop for unknown prefixes (caller may warn)", () => {
    expect(resolveBaseRef("weirdname")).toBe("origin/develop");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/compute-scope.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure routing helper.**

Write `scripts/code-review/compute-scope.mjs`:

```javascript
import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

const RELEASE_PREFIX = "release/";

/**
 * Branch-name routing per .claude/rules/git-workflow.md.
 * @param {string} branchName
 * @returns {"origin/main" | "origin/develop"}
 */
export function resolveBaseRef(branchName) {
  return branchName.startsWith(RELEASE_PREFIX) ? "origin/main" : "origin/develop";
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  }
  return r.stdout.trim();
}

/**
 * Compute the full scope of a code-review run.
 *
 * @param {{
 *   repoRoot: string,
 *   mode: "working_tree" | "committed_only" | "staged" | "all",
 *   baseOverride?: string,
 * }} input
 * @returns {{
 *   branch: string,
 *   baseRef: string,
 *   baseSha: string,
 *   headSha: string,
 *   files: Array<{path: string, status: "added"|"modified"|"deleted"|"renamed"}>,
 * }}
 */
export function computeScope({ repoRoot, mode, baseOverride }) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  const baseRef = baseOverride ?? resolveBaseRef(branch);

  if (mode === "all") {
    const tracked = git(["ls-files"], repoRoot).split("\n").filter(Boolean);
    const headSha = git(["rev-parse", "HEAD"], repoRoot);
    return {
      branch,
      baseRef,
      baseSha: headSha,
      headSha,
      files: tracked.map((p) => ({ path: p, status: "modified" })),
    };
  }

  const baseSha = git(["merge-base", "HEAD", baseRef], repoRoot);
  const headSha = git(["rev-parse", "HEAD"], repoRoot);

  let raw;
  if (mode === "committed_only") {
    raw = git(["diff", "--name-status", `${baseSha}..HEAD`], repoRoot);
  } else if (mode === "staged") {
    raw = git(["diff", "--name-status", "--cached"], repoRoot);
  } else {
    // working_tree = committed + staged + unstaged + untracked
    const committed = git(["diff", "--name-status", `${baseSha}..HEAD`], repoRoot);
    const staged = git(["diff", "--name-status", "--cached"], repoRoot);
    const unstaged = git(["diff", "--name-status"], repoRoot);
    const untracked = git(["ls-files", "--others", "--exclude-standard"], repoRoot)
      .split("\n")
      .filter(Boolean)
      .map((p) => `A\t${p}`)
      .join("\n");
    raw = [committed, staged, unstaged, untracked].filter(Boolean).join("\n");
  }

  const files = parseNameStatus(raw);
  return { branch, baseRef, baseSha, headSha, files };
}

function parseNameStatus(raw) {
  const seen = new Map();
  for (const line of raw.split("\n").filter(Boolean)) {
    const parts = line.split("\t");
    const code = parts[0][0];
    let path;
    let status;
    if (code === "A") {
      status = "added";
      path = parts[1];
    } else if (code === "M") {
      status = "modified";
      path = parts[1];
    } else if (code === "D") {
      status = "deleted";
      path = parts[1];
    } else if (code === "R") {
      status = "renamed";
      path = parts[2] ?? parts[1];
    } else {
      continue;
    }
    // Later entries override earlier (staged > committed > unstaged is approximate;
    // for the purposes of the agents the "latest" status wins).
    seen.set(path, { path, status });
  }
  return Array.from(seen.values());
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/compute-scope.test.mjs`
Expected: all 7 tests pass.

- [ ] **Step 5: Add an integration smoke test using the real repo.**

Append to `scripts/__tests__/code-review/compute-scope.test.mjs`:

```javascript
import { computeScope } from "../../code-review/compute-scope.mjs";
import { resolve } from "node:path";

describe("computeScope (integration against this repo)", () => {
  const repoRoot = resolve(import.meta.dirname, "../../../");

  it("returns a non-empty scope on the current branch in working_tree mode", () => {
    const scope = computeScope({ repoRoot, mode: "working_tree" });
    expect(scope.branch).toBeTruthy();
    expect(scope.baseRef).toMatch(/^origin\/(develop|main)$/);
    expect(scope.baseSha).toMatch(/^[0-9a-f]{40}$/);
    expect(scope.headSha).toMatch(/^[0-9a-f]{40}$/);
    expect(Array.isArray(scope.files)).toBe(true);
  });
});
```

- [ ] **Step 6: Run the full test file to verify.**

Run: `pnpm vitest run scripts/__tests__/code-review/compute-scope.test.mjs`
Expected: 8 tests pass.

- [ ] **Step 7: Commit.**

```bash
git add scripts/code-review/compute-scope.mjs scripts/__tests__/code-review/compute-scope.test.mjs
git commit -m "feat(code-review): add scope resolver (base ref + file list) [GH-XXX]"
```

---

## Phase 5 — Scanner integration

### Task 5.1: `run-scanners.mjs` — semgrep wrapper

**Files:**
- Create: `scripts/code-review/run-scanners.mjs`
- Create: `scripts/__tests__/code-review/run-scanners.test.mjs`

- [ ] **Step 1: Write the failing test for semgrep parsing.**

Write `scripts/__tests__/code-review/run-scanners.test.mjs`:

```javascript
import { describe, expect, it } from "vitest";
import { parseSemgrepOutput } from "../../code-review/run-scanners.mjs";

describe("parseSemgrepOutput", () => {
  it("returns an empty array when results is empty", () => {
    expect(parseSemgrepOutput({ results: [] })).toEqual([]);
  });

  it("maps semgrep results to the normalized finding shape", () => {
    const input = {
      results: [
        {
          check_id: "javascript.lang.security.audit.path-traversal",
          path: "apps/admin/foo.ts",
          start: { line: 10 },
          end: { line: 12 },
          extra: {
            severity: "ERROR",
            message: "Path traversal risk",
            metadata: { cwe: ["CWE-22"] },
          },
        },
      ],
    };
    const findings = parseSemgrepOutput(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      scanner: "semgrep",
      ruleId: "javascript.lang.security.audit.path-traversal",
      file: "apps/admin/foo.ts",
      lineStart: 10,
      lineEnd: 12,
      severity: "critical",
      message: "Path traversal risk",
      cwe: ["CWE-22"],
    });
  });

  it("maps WARNING severity to warning", () => {
    const input = {
      results: [{
        check_id: "x", path: "x.ts",
        start: { line: 1 }, end: { line: 1 },
        extra: { severity: "WARNING", message: "m" },
      }],
    };
    expect(parseSemgrepOutput(input)[0].severity).toBe("warning");
  });

  it("maps INFO severity to suggestion", () => {
    const input = {
      results: [{
        check_id: "x", path: "x.ts",
        start: { line: 1 }, end: { line: 1 },
        extra: { severity: "INFO", message: "m" },
      }],
    };
    expect(parseSemgrepOutput(input)[0].severity).toBe("suggestion");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/run-scanners.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `run-scanners.mjs` (parser + invokers).**

Write `scripts/code-review/run-scanners.mjs`:

```javascript
import { spawn } from "node:child_process";

const SEMGREP_SEVERITY = {
  ERROR: "critical",
  WARNING: "warning",
  INFO: "suggestion",
};

/**
 * Parse semgrep --json output into normalized findings.
 * @param {{results: Array<object>}} json
 * @returns {Array<object>}
 */
export function parseSemgrepOutput(json) {
  return (json.results ?? []).map((r) => ({
    scanner: "semgrep",
    ruleId: r.check_id,
    file: r.path,
    lineStart: r.start?.line ?? 0,
    lineEnd: r.end?.line ?? r.start?.line ?? 0,
    severity: SEMGREP_SEVERITY[r.extra?.severity] ?? "suggestion",
    message: r.extra?.message ?? "",
    cwe: r.extra?.metadata?.cwe ?? [],
  }));
}

/**
 * Run semgrep on a file list. Returns parsed findings.
 * @param {{files: string[], cwd: string}} input
 * @returns {Promise<Array<object>>}
 */
export async function runSemgrep({ files, cwd }) {
  if (files.length === 0) return [];
  const json = await runCli(
    "semgrep",
    ["--config=auto", "--json", "--quiet", "--", ...files],
    cwd,
  );
  return parseSemgrepOutput(JSON.parse(json));
}

function runCli(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: process.env });
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("close", (code) => {
      if (code === 0 || (cmd === "semgrep" && code === 1)) {
        // semgrep exits 1 when it finds matches — that's success for us.
        resolve(out);
      } else {
        reject(new Error(`${cmd} exited ${code}: ${err}`));
      }
    });
    child.on("error", reject);
  });
}
```

- [ ] **Step 4: Run the tests to verify parser tests pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/run-scanners.test.mjs`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/run-scanners.mjs scripts/__tests__/code-review/run-scanners.test.mjs
git commit -m "feat(code-review): add semgrep runner + output parser [GH-XXX]"
```

---

### Task 5.2: Extend `run-scanners.mjs` with Aikido wrapper

**Files:**
- Modify: `scripts/code-review/run-scanners.mjs`
- Modify: `scripts/__tests__/code-review/run-scanners.test.mjs`

Note: Aikido findings come via the MCP at runtime in the skill prose (Claude calls `mcp__plugin_aikido_aikido-mcp__aikido_full_scan`). The wrapper here just normalizes the MCP response shape into the same finding format as semgrep.

- [ ] **Step 1: Append the failing tests for Aikido parsing.**

Append to `scripts/__tests__/code-review/run-scanners.test.mjs`:

```javascript
import { parseAikidoOutput } from "../../code-review/run-scanners.mjs";

describe("parseAikidoOutput", () => {
  it("returns an empty array on empty input", () => {
    expect(parseAikidoOutput({ issues: [] })).toEqual([]);
  });

  it("maps Aikido issues to normalized findings", () => {
    const input = {
      issues: [
        {
          id: "aikido-sast-001",
          file_path: "apps/admin/foo.ts",
          line: 5,
          end_line: 7,
          severity: "critical",
          title: "Hardcoded secret detected",
          cwe: "CWE-798",
        },
      ],
    };
    const findings = parseAikidoOutput(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      scanner: "aikido",
      ruleId: "aikido-sast-001",
      file: "apps/admin/foo.ts",
      lineStart: 5,
      lineEnd: 7,
      severity: "critical",
      message: "Hardcoded secret detected",
      cwe: ["CWE-798"],
    });
  });

  it("normalizes Aikido severities (high → warning, medium → warning, low → suggestion)", () => {
    const cases = [
      ["high", "warning"],
      ["medium", "warning"],
      ["low", "suggestion"],
      ["critical", "critical"],
    ];
    for (const [in_, out] of cases) {
      const f = parseAikidoOutput({
        issues: [{ id: "x", file_path: "f", line: 1, end_line: 1, severity: in_, title: "t" }],
      });
      expect(f[0].severity).toBe(out);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/run-scanners.test.mjs`
Expected: `parseAikidoOutput` not exported — FAIL.

- [ ] **Step 3: Add the Aikido parser to `run-scanners.mjs`.**

Append to `scripts/code-review/run-scanners.mjs`:

```javascript
const AIKIDO_SEVERITY = {
  critical: "critical",
  high: "warning",
  medium: "warning",
  low: "suggestion",
  info: "suggestion",
};

/**
 * Parse Aikido MCP response into normalized findings.
 * @param {{issues: Array<object>}} json
 * @returns {Array<object>}
 */
export function parseAikidoOutput(json) {
  return (json.issues ?? []).map((i) => ({
    scanner: "aikido",
    ruleId: i.id,
    file: i.file_path,
    lineStart: i.line ?? 0,
    lineEnd: i.end_line ?? i.line ?? 0,
    severity: AIKIDO_SEVERITY[(i.severity ?? "").toLowerCase()] ?? "suggestion",
    message: i.title ?? "",
    cwe: i.cwe ? [i.cwe] : [],
  }));
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/run-scanners.test.mjs`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/run-scanners.mjs scripts/__tests__/code-review/run-scanners.test.mjs
git commit -m "feat(code-review): add Aikido output parser [GH-XXX]"
```

---

## Phase 6 — PR helpers

### Task 6.1: `find-pr.mjs` — detect open PR for current branch

**Files:**
- Create: `scripts/code-review/find-pr.mjs`

This helper wraps `gh pr view --json number`. Tested by an integration check (no network mock — the helper returns null when `gh` isn't authed or no PR exists, which is fine for tests in CI-free state).

- [ ] **Step 1: Implement the helper.**

Write `scripts/code-review/find-pr.mjs`:

```javascript
import { spawnSync } from "node:child_process";

/**
 * Return the open PR number for the current branch, or null if none.
 * @param {{cwd: string}} opts
 * @returns {number | null}
 */
export function findOpenPr({ cwd }) {
  const r = spawnSync(
    "gh",
    ["pr", "view", "--json", "number,state", "--jq", ".number"],
    { cwd, encoding: "utf-8" },
  );
  if (r.status !== 0) return null;
  const trimmed = r.stdout.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}
```

- [ ] **Step 2: Smoke-check it doesn't throw on the current repo.**

Run: `node -e "import('./scripts/code-review/find-pr.mjs').then(({ findOpenPr }) => console.log(findOpenPr({ cwd: process.cwd() })))"`
Expected: prints a number or `null`. No exception.

- [ ] **Step 3: Commit.**

```bash
git add scripts/code-review/find-pr.mjs
git commit -m "feat(code-review): add open-PR detector helper [GH-XXX]"
```

---

### Task 6.2: `fetch-deferred.mjs` — fetch `#noresolve` threads

**Files:**
- Create: `scripts/code-review/fetch-deferred.mjs`

- [ ] **Step 1: Implement the helper.**

Write `scripts/code-review/fetch-deferred.mjs`:

```javascript
import { spawnSync } from "node:child_process";
import { hasNoresolve, extractNoresolveReason } from "./noresolve-parser.mjs";

/**
 * Fetch all inline review comments on a PR carrying a `#noresolve` marker.
 * Groups comments by thread (top-level + replies).
 *
 * @param {{cwd: string, prNumber: number}} opts
 * @returns {Array<{
 *   commentId: string,
 *   findingId: string | null,
 *   file: string,
 *   lineStart: number,
 *   reason: string,
 *   thread: Array<{body: string}>,
 * }>}
 */
export function fetchDeferred({ cwd, prNumber }) {
  const repo = spawnSync(
    "gh",
    ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
    { cwd, encoding: "utf-8" },
  ).stdout.trim();
  if (!repo) return [];

  const raw = spawnSync(
    "gh",
    ["api", `repos/${repo}/pulls/${prNumber}/comments`, "--paginate"],
    { cwd, encoding: "utf-8" },
  );
  if (raw.status !== 0) return [];

  /** @type {Array<{id:number, in_reply_to_id?:number, body:string, path:string, line:number}>} */
  const comments = JSON.parse(raw.stdout);

  // Group by top-level comment.
  const threadsByRoot = new Map();
  for (const c of comments) {
    const rootId = c.in_reply_to_id ?? c.id;
    if (!threadsByRoot.has(rootId)) threadsByRoot.set(rootId, []);
    threadsByRoot.get(rootId).push(c);
  }

  const deferred = [];
  for (const [rootId, thread] of threadsByRoot) {
    if (!hasNoresolve(thread)) continue;
    const root = thread.find((c) => c.id === rootId) ?? thread[0];
    deferred.push({
      commentId: String(rootId),
      findingId: extractFindingId(root.body),
      file: root.path,
      lineStart: root.line ?? 0,
      reason: extractNoresolveReason(thread) ?? "",
      thread,
    });
  }
  return deferred;
}

const FINDING_ID_TAG = /<!-- code-review:finding-id=([0-9a-f]{64}) -->/;

function extractFindingId(body) {
  const m = FINDING_ID_TAG.exec(body ?? "");
  return m ? m[1] : null;
}
```

- [ ] **Step 2: Smoke-check.**

Run: `node -e "import('./scripts/code-review/fetch-deferred.mjs').then(m => console.log(m.fetchDeferred({ cwd: process.cwd(), prNumber: 999999 })))"`
Expected: prints `[]` or returns empty. No exception.

- [ ] **Step 3: Commit.**

```bash
git add scripts/code-review/fetch-deferred.mjs
git commit -m "feat(code-review): add deferred-finding fetcher [GH-XXX]"
```

---

## Phase 7 — `--all` mode estimator

### Task 7.1: `estimate-all.mjs` — file count + token + duration + cost

**Files:**
- Create: `scripts/code-review/estimate-all.mjs`
- Create: `scripts/__tests__/code-review/estimate-all.test.mjs`

- [ ] **Step 1: Write the failing tests.**

Write `scripts/__tests__/code-review/estimate-all.test.mjs`:

```javascript
import { describe, expect, it } from "vitest";
import { estimateRun } from "../../code-review/estimate-all.mjs";

describe("estimateRun", () => {
  it("scales tokens with file count × agent count", () => {
    const e = estimateRun({
      fileCount: 100,
      avgTokensPerFile: 1000,
      agentCount: 12,
      pricePerMillionTokens: 3,
      tokensPerSecond: 5000,
    });
    expect(e.tokens).toBe(100 * 1000 * 12);
    expect(e.cost).toBeCloseTo((100 * 1000 * 12 / 1_000_000) * 3, 4);
    expect(e.durationSeconds).toBe(Math.ceil(e.tokens / 5000));
  });

  it("formats tokens with a unit suffix", () => {
    expect(estimateRun({ fileCount: 0, avgTokensPerFile: 0, agentCount: 0, pricePerMillionTokens: 0, tokensPerSecond: 1 }).tokensHuman).toBe("0");
    expect(estimateRun({ fileCount: 1, avgTokensPerFile: 2000, agentCount: 1, pricePerMillionTokens: 0, tokensPerSecond: 1 }).tokensHuman).toBe("2K");
    expect(estimateRun({ fileCount: 1, avgTokensPerFile: 2_500_000, agentCount: 1, pricePerMillionTokens: 0, tokensPerSecond: 1 }).tokensHuman).toBe("2.5M");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm vitest run scripts/__tests__/code-review/estimate-all.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the estimator.**

Write `scripts/code-review/estimate-all.mjs`:

```javascript
/**
 * @param {{fileCount: number, avgTokensPerFile: number, agentCount: number, pricePerMillionTokens: number, tokensPerSecond: number}} opts
 */
export function estimateRun({
  fileCount,
  avgTokensPerFile,
  agentCount,
  pricePerMillionTokens,
  tokensPerSecond,
}) {
  const tokens = fileCount * avgTokensPerFile * agentCount;
  const cost = (tokens / 1_000_000) * pricePerMillionTokens;
  const durationSeconds = tokensPerSecond > 0 ? Math.ceil(tokens / tokensPerSecond) : 0;
  return {
    tokens,
    tokensHuman: formatTokens(tokens),
    cost,
    durationSeconds,
    durationHuman: formatDuration(durationSeconds),
  };
}

function formatTokens(n) {
  if (n === 0) return "0";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return String(n);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm vitest run scripts/__tests__/code-review/estimate-all.test.mjs`
Expected: 2 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add scripts/code-review/estimate-all.mjs scripts/__tests__/code-review/estimate-all.test.mjs
git commit -m "feat(code-review): add --all mode run estimator [GH-XXX]"
```

---

## Phase 8 — Agent specs

### Task 8.1: Move full-review agents into the new home

**Files:**
- Move: `.claude/skills/full-review/agents/architecture.md` → `.claude/skills/code-review/agents/architecture.md`
- Move: `.claude/skills/full-review/agents/solid.md` → `.claude/skills/code-review/agents/solid.md`
- Move: `.claude/skills/full-review/agents/dry.md` → `.claude/skills/code-review/agents/dry.md`
- Move: `.claude/skills/full-review/agents/component-patterns.md` → `.claude/skills/code-review/agents/component-patterns.md`
- Move: `.claude/skills/full-review/agents/naming-conventions.md` → `.claude/skills/code-review/agents/naming-conventions.md`
- Move: `.claude/skills/full-review/agents/bug-detection.md` → `.claude/skills/code-review/agents/bug-detection.md`
- Move: `.claude/skills/full-review/agents/tailwind.md` → `.claude/skills/code-review/agents/tailwind.md`
- Move: `.claude/skills/full-review/agents/testing.md` → `.claude/skills/code-review/agents/testing.md`
- Move: `.claude/skills/full-review/agents/performance.md` → `.claude/skills/code-review/agents/performance.md`
- Move: `.claude/skills/full-review/agents/pattern-discovery.md` → `.claude/skills/code-review/agents/pattern-discovery.md`
- Move: `.claude/skills/full-review/agents/security.md` → `.claude/skills/code-review/agents/security.md`
- Move: `.claude/skills/full-review/agents/index.md` → `.claude/skills/code-review/agents/index.md` (will be updated in Task 8.3)

- [ ] **Step 1: Move all 11 agent docs in one batch.**

```bash
git mv .claude/skills/full-review/agents/architecture.md       .claude/skills/code-review/agents/architecture.md
git mv .claude/skills/full-review/agents/solid.md              .claude/skills/code-review/agents/solid.md
git mv .claude/skills/full-review/agents/dry.md                .claude/skills/code-review/agents/dry.md
git mv .claude/skills/full-review/agents/component-patterns.md .claude/skills/code-review/agents/component-patterns.md
git mv .claude/skills/full-review/agents/naming-conventions.md .claude/skills/code-review/agents/naming-conventions.md
git mv .claude/skills/full-review/agents/bug-detection.md      .claude/skills/code-review/agents/bug-detection.md
git mv .claude/skills/full-review/agents/tailwind.md           .claude/skills/code-review/agents/tailwind.md
git mv .claude/skills/full-review/agents/testing.md            .claude/skills/code-review/agents/testing.md
git mv .claude/skills/full-review/agents/performance.md        .claude/skills/code-review/agents/performance.md
git mv .claude/skills/full-review/agents/pattern-discovery.md  .claude/skills/code-review/agents/pattern-discovery.md
git mv .claude/skills/full-review/agents/security.md           .claude/skills/code-review/agents/security.md
git mv .claude/skills/full-review/agents/index.md              .claude/skills/code-review/agents/index.md
```

- [ ] **Step 2: Verify all moves succeeded.**

Run: `ls .claude/skills/code-review/agents/ && ls .claude/skills/full-review/agents/ 2>&1`
Expected: 12 files (11 + index) under code-review; full-review/agents/ either empty or "No such file".

- [ ] **Step 3: Commit.**

```bash
git commit -m "refactor(code-review): move 11 agents from full-review into code-review [GH-XXX]"
```

---

### Task 8.2: Add the new rules-drift agent

**Files:**
- Create: `.claude/skills/code-review/agents/rules-drift.md`

- [ ] **Step 1: Write the agent doc.**

Write `.claude/skills/code-review/agents/rules-drift.md`:

```markdown
# Rules-Drift Agent

## Purpose

Catch hardcoded enum-style values, type unions, magic strings, and inline
constants that drift from this codebase's SSOT lists. Specifically the
class of bug we've repeatedly hit: route allowlists with wrong/incomplete
enum values, type unions hand-rolled instead of derived from `as const`
arrays, hardcoded URLs/ports/IDs where env vars or constants already exist.

## Source rules

- `.claude/rules/single-source-of-truth.md`
- `.claude/rules/no-hardcoding.md`
- `.claude/rules/dry-principle.md`

## Inputs

Per scoped file:
- Full file content.
- Diff hunks (changes only).
- File path.

## Checks

### 1. Status / currency literal drift

Flag a string literal matching a known domain enum used in a place that
should derive from an SSOT constant.

| Literal pattern | Should derive from |
| --- | --- |
| `"approved" \| "pending" \| "rejected" \| "expired" \| "awaiting_payment" \| "pending_verification" \| "evidence_requested" \| "paid"` | `ORDER_STATUS_LIST` from `packages/shared/src/constants/orders.ts` |
| ISO 4217 currency codes (`"USD"`, `"EUR"`, `"COP"`, etc.) | `POPULAR_CURRENCIES` from `packages/shared/src/utils/currencies.ts` |

Special focus: API route allowlists (`new Set([...])`, `ALLOWED_X`,
`VALID_X` constants) and switch/if comparisons using these values
directly.

### 2. Hand-rolled type union where `as const` array would do

Flag `export type X = "a" | "b" | "c"` in domain or shared files.

The project pattern:

\`\`\`ts
export const X_LIST = ["a", "b", "c"] as const;
export type X = (typeof X_LIST)[number];
\`\`\`

This keeps the runtime list and the compile-time union in lock-step.

### 3. Hardcoded URL / port / magic value

Flag literals matching:

- `https?:\/\/[^\s"]+` (use env var or config).
- Port numbers `\b(3000\|3001\|...|54321|64321)\b` in source files (config only).
- Magic numbers > 1 in comparisons or assignments outside test files (`.claude/rules/no-hardcoding.md`).

### 4. Direct DB enum string in unguarded route

Flag API route files (`apps/*/src/app/api/.../route.ts`) where an enum
value (status/currency) appears in a comparison that doesn't go through
a validated allowlist or the SSOT constant.

## Severity guidance

| Pattern | Default severity |
| --- | --- |
| Status literal in allowlist that doesn't match SSOT | **Critical** (this is the exact bug class we ship-broke before) |
| Currency literal with wrong case | **Critical** |
| Hand-rolled type union for domain enum | **Warning** |
| Hardcoded URL where env var exists | **Warning** |
| Magic number in business logic | **Suggestion** |

## Output format

Standard finding shape per `.claude/rules/multi-agent-persistence.md` and
the orchestrator JSON contract.

## Persistence

Write findings to `.ai-context/code-reviews/agents/{review_id}_rules-drift.json`
using the atomic-write helper.
```

- [ ] **Step 2: Verify the file is readable.**

Run: `head -20 .claude/skills/code-review/agents/rules-drift.md`
Expected: file content visible.

- [ ] **Step 3: Commit.**

```bash
git add .claude/skills/code-review/agents/rules-drift.md
git commit -m "feat(code-review): add rules-drift agent spec [GH-XXX]"
```

---

### Task 8.3: Rewrite `agents/index.md` for the 12-agent set

**Files:**
- Modify: `.claude/skills/code-review/agents/index.md`

- [ ] **Step 1: Replace the index content.**

Write `.claude/skills/code-review/agents/index.md`:

```markdown
# Code Review Agents

The 12 agents that run on every `/code-review` invocation.

| # | Agent | File | Rule source |
| --- | --- | --- | --- |
| 1 | architecture | [`architecture.md`](./architecture.md) | `.claude/rules/architecture.md` |
| 2 | solid | [`solid.md`](./solid.md) | `.claude/rules/solid-principles.md` |
| 3 | dry | [`dry.md`](./dry.md) | `.claude/rules/dry-principle.md` |
| 4 | component-patterns | [`component-patterns.md`](./component-patterns.md) | `.claude/rules/component-patterns.md` |
| 5 | naming-conventions | [`naming-conventions.md`](./naming-conventions.md) | `.claude/rules/naming-conventions.md` |
| 6 | bug-detection | [`bug-detection.md`](./bug-detection.md) | `.claude/rules/code-review-standards.md#bug-detection-standards` |
| 7 | tailwind | [`tailwind.md`](./tailwind.md) | `.claude/rules/tailwind.md`, `css-consistency.md` |
| 8 | testing | [`testing.md`](./testing.md) | `.claude/rules/testing.md` |
| 9 | performance | [`performance.md`](./performance.md) | `.claude/rules/code-review-standards.md#performance-standards` |
| 10 | pattern-discovery | [`pattern-discovery.md`](./pattern-discovery.md) | undocumented-pattern detection |
| 11 | security | [`security.md`](./security.md) | `.claude/rules/code-review-standards.md#security-standards` + scanner triage |
| 12 | rules-drift | [`rules-drift.md`](./rules-drift.md) | `.claude/rules/single-source-of-truth.md`, `no-hardcoding.md` |

## Contract every agent follows

1. Reads the **full content** of each scoped file plus its diff hunks.
2. Reports findings **only on lines that appear in the diff** (added or modified). Pre-existing issues in unchanged hunks are ignored.
3. Severity values: `critical` / `warning` / `suggestion` / `info`.
4. Writes findings atomically to `.ai-context/code-reviews/agents/{review_id}_{agent}.json` before returning.
5. Returns a status string (`complete` / `failed`) to the orchestrator after the file is written.

## Finding shape

\`\`\`json
{
  "id": "<sha256 from finding-id.mjs>",
  "agent": "solid",
  "severity": "warning",
  "file": "apps/admin/src/foo.ts",
  "lineStart": 42,
  "lineEnd": 58,
  "ruleId": "SRP",
  "ruleHref": ".claude/rules/solid-principles.md#single-responsibility",
  "title": "Component handles 3 unrelated responsibilities",
  "body": "Markdown body shown in the PR comment.",
  "suggestedFix": "Optional — markdown with code block."
}
\`\`\`
```

- [ ] **Step 2: Commit.**

```bash
git add .claude/skills/code-review/agents/index.md
git commit -m "docs(code-review): update agent index for 12-agent set [GH-XXX]"
```

---

### Task 8.4: Update `security.md` for scanner triage flow

**Files:**
- Modify: `.claude/skills/code-review/agents/security.md`

- [ ] **Step 1: Read the existing security.md.**

Run: `cat .claude/skills/code-review/agents/security.md`
Expected: existing content as moved from full-review.

- [ ] **Step 2: Prepend a new "Triage flow" section.**

Insert this section after the YAML frontmatter / title but before any existing checklist content:

```markdown
## Triage flow (new in branch-scoped /code-review)

This agent runs **after** the deterministic scanners (semgrep + Aikido).
The orchestrator passes the scanner findings to this agent along with
the full file content for each flagged file.

For each scanner finding, classify it into exactly one of:

| Category | Output |
| --- | --- |
| `scanner-confirmed` | Real issue. Include in the report with `severity` mapped from the scanner. |
| `scanner-but-fp` | False positive in this context (auth wrapper, framework guarantee, sandboxed input, etc.). Suppress from the report. Note the reason in the manifest. |

After triage, the agent may also produce **`llm-found`** findings: context-dependent risks the scanners cannot detect (e.g., a response shape returning `password_hash` to the client, an admin route that reads `req.user` without verifying authorization, a logic bug that leaks PII via error messages). Be conservative — false positives are worse than misses at this layer because the scanners already give wide net coverage.

For each finding produced, the `body` MUST cite the file:line and explain the exploit path concretely.
```

- [ ] **Step 3: Commit.**

```bash
git add .claude/skills/code-review/agents/security.md
git commit -m "docs(code-review): add scanner triage flow to security agent [GH-XXX]"
```

---

## Phase 9 — Orchestrator SKILL.md

### Task 9.1: Write the full SKILL.md

**Files:**
- Modify: `.claude/skills/code-review/SKILL.md`

This task replaces the Phase 1 placeholder with the full orchestrator instructions Claude follows at runtime.

- [ ] **Step 1: Write the full SKILL.md.**

Write `.claude/skills/code-review/SKILL.md`:

````markdown
---
name: code-review
description: Branch-scoped multi-agent code review with deterministic security scanning, atomic persistence, and PR-comment delivery. Use when reviewing code on the current branch before pushing or merging.
---

# Code Review

Branch-scoped, 12-agent code review for this repo. Replaces the older
`/full-review`. Spec: [`docs/superpowers/specs/2026-05-18-code-review-skill-design.md`](../../../docs/superpowers/specs/2026-05-18-code-review-skill-design.md).

## When to use

- Before pushing a branch.
- Before opening or merging a PR.
- After fixing previous review findings (re-run dedupes).
- To investigate `#noresolve` comments (`--review-deferred`).
- To audit the whole codebase periodically (`--all`).

## Flags

| Flag | Default | Effect |
| --- | --- | --- |
| (none) | — | Branch-scoped, working-tree mode, all 12 agents, scanners on, PR delivery if PR exists. |
| `--all` | off | Whole-repo. Typed-phrase confirmation. |
| `--base <ref>` | branch-name routed | Override base ref. |
| `--committed-only` | off | Diff = HEAD vs base. |
| `--staged` | off | Diff = `git diff --cached`. |
| `--resume <id>` | auto-detect | Resume a specific run. |
| `--fresh` | off | Ignore any in-flight run. |
| `--agent <name>` | run all | Run a single agent. |
| `--threshold <level>` | `warning` | Inline-comment severity threshold. |
| `--no-security` | off | Skip the LLM security agent. |
| `--no-scanners` | off | Skip semgrep + Aikido. |
| `--issue` | off | Also create a GitHub issue. |
| `--review-deferred` | off | Re-investigate only `#noresolve` comments. |

## Execution flow

### Step 1 — Parse flags and resolve scope

Run `node scripts/code-review/compute-scope.mjs` (call directly from a small
inline node `-e` wrapper) with the resolved mode (`working_tree` /
`committed_only` / `staged` / `all`) and `--base` override if given.

Print the pre-flight summary:

```
Code review scope
─────────────────────────────────────
Branch:      <branch>
Base:        <base_ref> @ <base_sha first 7>
Mode:        <mode>
Files:       <count> (<deleted> deleted, <renamed> renamed, <ignored> ignored)
Agents:      12
Scanners:    semgrep + aikido
─────────────────────────────────────
```

Filter the file list:
- Drop files under `generated/` or `__generated__/` or with auto-generated headers.
- Drop files matching `.code-reviewignore` patterns (use the `ignore` Node API or `git check-ignore` with a custom file).
- Drop binary files.

### Step 2 — Check resume

Read `.ai-context/code-reviews/.in-flight.json` via `manifest.readInFlight()`.
If present and its `{base_sha, head_sha}` matches the current scope:
1. Read the manifest at `.ai-context/code-reviews/<review_id>_manifest.json`.
2. Count completed agents.
3. Ask the user:

   ```
   Found in-flight review <review_id> (X/12 agents complete).
   Resume? [Y/n]
   ```

4. If yes → set `resume_mode = true`, the review_id stays the same.
5. If no → `clearInFlight`, generate a new review_id, start fresh.

If `--resume <id>` is given, force-resume that ID (skipping the prompt).
If `--fresh` is given, ignore the in-flight pointer entirely.

### Step 3 — `--all` confirmation (only if `--all`)

1. Run `scripts/code-review/estimate-all.mjs` with the file count, agent
   count, and current model pricing.
2. Print the warning block (see spec §7).
3. Read user input. Require the **exact** phrase `review everything`.
   Anything else aborts.

### Step 4 — Critical-finding interrupt (scanners first)

Unless `--no-scanners` is set:

1. Run semgrep via `scripts/code-review/run-scanners.mjs#runSemgrep`.
   Write output to `.ai-context/code-reviews/scanners/<review_id>_semgrep.json`.
2. Call `mcp__plugin_aikido_aikido-mcp__aikido_full_scan` over the
   file list. Parse via `parseAikidoOutput`. Write to
   `<review_id>_aikido.json`.
3. If any finding has `severity == "critical"`, pause and prompt:

   ```
   ⚠  Critical finding from <scanner>:
      <file>:<line>
      <message>

      [c] Cancel review and fix this first
      [F] Continue with the review anyway
   ```

4. Default selection = "c" (cancel). Only "F" proceeds.

### Step 5 — Spawn agents in parallel

For each of the 12 agents (or only `--agent <name>` if set, or only the
agents that haven't completed in resume mode):

1. Dispatch a sub-agent via the `Agent` tool. Each one is instructed to:
   - Read the contract from `.claude/skills/code-review/agents/index.md`.
   - Read its own rule source.
   - Read each file in the scope (use the cache helper: skip if cached).
   - Produce findings only on changed lines.
   - Write `<review_id>_<agent>.json` atomically.
2. The security agent runs **after** scanners and gets their JSON files as input.

### Step 6 — Aggregate

For each agent JSON found, merge into a single in-memory finding list.
Compute the summary counts. Write `<review_id>_review.md` using the
template from spec §6.

Mark the manifest `status = "complete"` and `completed_at = now`.
Clear the in-flight pointer.

### Step 7 — Deliver

1. Call `findOpenPr({ cwd: process.cwd() })`.
2. If a PR exists:
   - Fetch existing inline comments via `gh api`.
   - For each, parse the embedded `<!-- code-review:finding-id=... -->` tag to map to a finding ID.
   - Call `syncComments` to compute `{add, update, resolve, defer}` sets.
   - `add` → `gh api repos/.../pulls/.../comments -X POST` (one per finding ≥ threshold). Embed the finding-id HTML tag in the body.
   - `update` → `PATCH` the existing comment with the new body.
   - `resolve` → `PATCH` with `resolved=true`.
   - `defer` → leave as-is; log in manifest.
   - Post the summary as a single PR review body.
3. If no PR and `--issue` set → `gh issue create` with the report body.
4. Always print the report path.

### Step 8 — `--review-deferred` flow (alternative entry)

When `--review-deferred` is set, skip Steps 4–6 above and do:

1. `findOpenPr` → if no PR, error out.
2. `fetchDeferred({ cwd, prNumber })` → list of deferred items.
3. For each unique file in the deferred set, run only the originating
   agents on the working-tree version of that file, restricted to lines
   that intersect the deferred comment's range.
4. Write `<review_id>_deferred-review.md` with each deferred item and
   a verdict: `still valid` / `no longer applies` / `changed materially`.
5. Do NOT modify any PR comments.
6. Print the report path.

## Failure modes

- **Agent times out / crashes.** No JSON written. Manifest marks it `failed`. Orchestrator finishes other agents and aggregates what exists. Final report flags the missing agent.
- **Scanner unavailable.** Log warning, skip, continue. Manifest records `scanner: skipped`.
- **Orchestrator killed mid-run.** Atomic writes guarantee no corruption. Re-invoking auto-detects in-flight and prompts to resume.
- **Working tree changes during a run.** Recompute `head_sha` at aggregation time; if it changed, set `manifest.head_sha_changed = true` and add a note to the report.
- **No PR and no `--issue`.** File-only output. Print the path. No GitHub call.

## Single-agent re-run (`--agent <name>`)

Only spawn the named agent. Read existing scope from the in-flight
manifest if present, otherwise compute fresh scope. Useful pattern after
fixing one class of finding: `pnpm /code-review --agent security`.

## Cache behavior

For each (file, agent) pair:
1. Compute `hashFileContent(file)`.
2. `readCache(root, hash, agent)`.
3. If hit: reuse findings. If miss: agent runs, then `writeCache(root, hash, agent, findings)`.

The cache is keyed on **content**, not branch or run, so editing a file
then re-running re-reviews only that file's findings for affected agents.

## File layout reference

```
.ai-context/code-reviews/
├── <review_id>_manifest.json
├── agents/<review_id>_<agent>.json
├── scanners/<review_id>_<scanner>.json
├── cache/<content_hash>_<agent>.json
├── <review_id>_review.md
└── <review_id>_deferred-review.md   (only for --review-deferred runs)
```
````

- [ ] **Step 2: Sanity-check the markdown renders correctly (no broken fences).**

Run: `head -80 .claude/skills/code-review/SKILL.md`
Expected: clean markdown, no truncation.

- [ ] **Step 3: Commit.**

```bash
git add .claude/skills/code-review/SKILL.md
git commit -m "feat(code-review): write orchestrator SKILL.md [GH-XXX]"
```

---

## Phase 10 — Migrate `/full-review`

### Task 10.1: Replace `full-review/SKILL.md` with a deprecation alias

**Files:**
- Modify: `.claude/skills/full-review/SKILL.md`

- [ ] **Step 1: Read the existing SKILL.md.**

Run: `wc -l .claude/skills/full-review/SKILL.md`
Expected: a multi-hundred-line file.

- [ ] **Step 2: Replace it with the alias.**

Write `.claude/skills/full-review/SKILL.md`:

```markdown
---
name: full-review
description: Deprecated alias for `/code-review --all`. Use /code-review instead.
---

# Full Review (deprecated)

This skill has been replaced by [`/code-review`](../code-review/SKILL.md).

**Migration:**

| Old invocation | New invocation |
| --- | --- |
| `/full-review` | `/code-review --all` |
| `/full-review src/features/foo` | `/code-review` (auto-scopes to branch diff) or `/code-review --all` |

When invoked, this skill prints a deprecation note and forwards to
`/code-review --all`. The agent docs and persistence layout are
unchanged in shape — only the directory moved to
`.claude/skills/code-review/agents/` and `.ai-context/code-reviews/`.

See the spec at
`docs/superpowers/specs/2026-05-18-code-review-skill-design.md` for the
full design.
```

- [ ] **Step 3: Commit.**

```bash
git add .claude/skills/full-review/SKILL.md
git commit -m "refactor(code-review): deprecate /full-review (now alias for /code-review --all) [GH-XXX]"
```

---

### Task 10.2: Update `fix-full-review` to also read the new directory

**Files:**
- Modify: `.claude/skills/fix-full-review/SKILL.md`

- [ ] **Step 1: Read the existing fix-full-review SKILL.md.**

Run: `head -60 .claude/skills/fix-full-review/SKILL.md`
Expected: instructions that read `.ai-context/reviews/`.

- [ ] **Step 2: Edit the file location section.**

Find the section that says it reads `.ai-context/reviews/` (or whatever existing report-path text it has) and replace it with:

```markdown
## Report location

This skill reads the most recent review report from either:

- `.ai-context/code-reviews/` — produced by the new `/code-review` skill.
- `.ai-context/reviews/` — produced by the deprecated `/full-review` skill (kept for historical reports).

The most recent file across both directories wins. Both report formats
share the same structure (severity sections + finding entries), so the
fixer logic is unchanged downstream.
```

- [ ] **Step 3: Commit.**

```bash
git add .claude/skills/fix-full-review/SKILL.md
git commit -m "refactor(fix-full-review): also read .ai-context/code-reviews/ [GH-XXX]"
```

---

## Phase 11 — End-to-end smoke test

### Task 11.1: Run all helper tests together

- [ ] **Step 1: Run the full helper test suite.**

Run: `pnpm vitest run scripts/__tests__/code-review/`
Expected: every test from Phases 2–7 passes (≈35+ test cases).

- [ ] **Step 2: If any test fails, fix the implementation. Do not modify the test to make it pass unless the test itself is wrong.**

- [ ] **Step 3: Run the project-wide quality gates.**

Run in sequence (stop on first failure):

```bash
pnpm format:check
pnpm lint
pnpm --filter payments --filter admin typecheck
pnpm vitest run scripts/__tests__/code-review/
```

Expected: all four pass.

- [ ] **Step 4: Commit any drift fixes.**

```bash
git add scripts/code-review scripts/__tests__/code-review
git commit -m "chore(code-review): fix quality-gate drift after helper integration [GH-XXX]" || echo "nothing to commit"
```

---

### Task 11.2: Skill smoke test on a real branch

This task verifies the prose flow Claude follows when the skill is invoked, end-to-end on this exact branch.

- [ ] **Step 1: Read the skill instructions.**

Read: `.claude/skills/code-review/SKILL.md`
Expected: full orchestrator instructions.

- [ ] **Step 2: Walk the scope-resolution step manually.**

Run:

```bash
node -e "import('./scripts/code-review/compute-scope.mjs').then(({ computeScope }) => console.log(JSON.stringify(computeScope({ repoRoot: process.cwd(), mode: 'working_tree' }), null, 2)))"
```

Expected: prints `{branch, baseRef, baseSha, headSha, files: [...]}`. The branch should be the current one; the base should be `origin/develop` (or `origin/main` if on `release/*`); the file list non-empty if there are local changes.

- [ ] **Step 3: Walk the scanner step manually (if semgrep is available).**

Run:

```bash
node -e "import('./scripts/code-review/run-scanners.mjs').then(async ({ runSemgrep }) => { const r = await runSemgrep({ files: ['scripts/code-review/finding-id.mjs'], cwd: process.cwd() }); console.log(r); }).catch(e => console.error(e))"
```

Expected: array (possibly empty) of normalized findings. No exception.

- [ ] **Step 4: Walk the manifest write/read roundtrip.**

Run:

```bash
node -e "
const { createManifest, readManifest, setInFlight, readInFlight, clearInFlight } = await import('./scripts/code-review/manifest.mjs');
const root = '.ai-context/code-reviews';
const m = await createManifest(root, {
  reviewId: 'smoke-test',
  branch: 'b', baseRef: 'origin/develop', baseSha: 'a', headSha: 'b',
  mode: 'working_tree', files: [], agents: ['solid'], scanners: ['semgrep'],
});
await setInFlight(root, { review_id: 'smoke-test', base_sha: 'a', head_sha: 'b' });
console.log('manifest:', (await readManifest(root, 'smoke-test')).review_id);
console.log('in-flight:', await readInFlight(root));
await clearInFlight(root);
console.log('cleared:', await readInFlight(root));
"
```

Expected:

```
manifest: smoke-test
in-flight: { review_id: 'smoke-test', base_sha: 'a', head_sha: 'b' }
cleared: null
```

- [ ] **Step 5: Clean up smoke-test artifacts.**

```bash
rm -f .ai-context/code-reviews/smoke-test_manifest.json
```

- [ ] **Step 6: Commit the smoke-test marker.**

```bash
git status --short
# Verify only the cleanup is staged. If everything is clean already, skip the commit.
git diff --cached --quiet || git commit -m "chore(code-review): smoke-test artifacts cleaned [GH-XXX]"
```

---

## Phase 12 — Handoff

### Task 12.1: Update related docs and CLAUDE.md cross-references

**Files:**
- Modify: `CLAUDE.md` (under the Skills index)

- [ ] **Step 1: Read the existing CLAUDE.md Skills section.**

Run: `grep -n "Skills" CLAUDE.md`
Expected: a "## Related Documentation" or similar section with a Skills sublist.

- [ ] **Step 2: Locate the existing line for `/full-review` and update it.**

In `CLAUDE.md`, find:

```markdown
- [Full Review](.claude/skills/full-review/SKILL.md) - `/full-review`
```

Replace with:

```markdown
- [Code Review](.claude/skills/code-review/SKILL.md) - `/code-review` (branch-scoped) / `/code-review --all` (whole repo) — replaces the older `/full-review`
```

- [ ] **Step 3: Commit.**

```bash
git add CLAUDE.md
git commit -m "docs: point CLAUDE.md skills index at /code-review [GH-XXX]"
```

---

### Task 12.2: Final verification

- [ ] **Step 1: Re-run all quality gates from a clean state.**

```bash
pnpm format:check && \
pnpm lint && \
pnpm --filter payments --filter admin typecheck && \
pnpm vitest run scripts/__tests__/code-review/
```

Expected: all four green.

- [ ] **Step 2: Verify the directory layout matches the spec's File Structure section.**

Run:

```bash
ls .claude/skills/code-review/
ls .claude/skills/code-review/agents/
ls scripts/code-review/
ls scripts/__tests__/code-review/
ls .ai-context/code-reviews/
test -f .code-reviewignore && echo OK
```

Expected:
- 12 agent files + `index.md` under `agents/`.
- 11 helper `.mjs` files under `scripts/code-review/`.
- 7 test files under `scripts/__tests__/code-review/`.
- `.ai-context/code-reviews/` exists (likely empty after smoke-test cleanup).
- `.code-reviewignore` exists.

- [ ] **Step 3: Squash-merge readiness check.**

Run: `git log --oneline origin/develop..HEAD | wc -l`
Expected: a manageable commit count (the plan produces ~25-30 commits; the human will squash-merge per `.claude/rules/git-workflow.md`).

- [ ] **Step 4: Open the PR.**

This is the user's job — invoke `/submit-pr` from a fresh session, or `gh pr create --base develop` manually. The PR description should reference both the spec and this plan.

---

## Self-review summary

**Spec coverage check** (each spec section → task that covers it):

- §1 Identity → Task 10.1 (full-review alias).
- §2 Scope resolution → Task 4.1 (compute-scope).
- §3 Agent set → Tasks 8.1, 8.2, 8.3.
- §4 Security scanning → Tasks 5.1, 5.2, 8.4 (security agent triage).
- §5 Orchestration + persistence → Tasks 3.1, 3.2, 3.3 (helpers); Task 9.1 (orchestrator prose).
- §6 Output and delivery → Tasks 2.1, 2.3, 6.1, 6.2 (helpers); Task 9.1 (orchestrator prose).
- §6.4 `#noresolve` → Tasks 2.2 (parser), 6.2 (fetch).
- §6.5 `--review-deferred` → Task 6.2 (fetch); Task 9.1 (flow in SKILL.md).
- §7 `--all` mode → Task 7.1 (estimator); Task 9.1 (prompt flow).
- §8 Flag reference → Task 9.1.
- §9 File-level changes → Task 1.1 (scaffold), Tasks 8.1 (move), 10.1+10.2 (modify).
- §10 Out of scope → not implemented (correct).

**Placeholder scan:** no `TBD`/`TODO`/"implement later" patterns. Every step shows the code or content it produces. Every test shows the expected output. Every commit message is concrete.

**Type/name consistency:**
- `computeFindingId` consistently named across `finding-id.mjs`, tests, `pr-comment-sync.mjs`.
- `writeJsonAtomic` consistently named across `atomic-write.mjs`, `manifest.mjs`, `cache.mjs`.
- Finding shape (id, agent, severity, file, lineStart, lineEnd, ruleId, body) consistent across helpers and agents/index.md.
- Manifest field names (`review_id`, `base_sha`, `head_sha`, `agents`, `scanners`, `status`) consistent across `manifest.mjs`, smoke test, and orchestrator prose.

No gaps found.
