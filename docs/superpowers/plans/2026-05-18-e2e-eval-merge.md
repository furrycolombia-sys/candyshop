# E2E Eval Skill Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/run-e2e` into `/e2e-eval` and add five behaviors: `--ui` and `--debug` interactive modes, cached infra detection in Phase 2, `--replay` to re-run last report's failures, and `--ci` to match GitHub Actions runtime config.

**Architecture:** All changes are documentation edits to `.claude/skills/e2e-eval/SKILL.md` plus targeted updates to 9 cross-referencing files and one folder deletion. The underlying `scripts/e2e.mjs` runner already supports `--ui` natively and accepts arbitrary Playwright passthrough args via `--`, so no runner code changes are needed.

**Tech Stack:** Markdown skill files, Node.js runner (`scripts/e2e.mjs`), Playwright Test, git.

**Spec:** `docs/superpowers/specs/2026-05-18-e2e-eval-merge-design.md`

---

## File Structure

**Files modified (10):**

| Path                                           | Purpose                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `.claude/skills/e2e-eval/SKILL.md`             | Primary: new flags, cached-infra logic, report-format update, mutex docs, drop self-link |
| `.claude/rules/e2e-selectors.md`               | Replace one `/run-e2e` reference                                                         |
| `.claude/rules/testing.md`                     | Replace one `/run-e2e` reference                                                         |
| `.claude/skills/capture-evidences/SKILL.md`    | Replace one `/run-e2e` reference                                                         |
| `.claude/skills/run-tests/SKILL.md`            | Replace two `/run-e2e` references                                                        |
| `.claude/skills/verify-code/SKILL.md`          | Replace one `/run-e2e` reference                                                         |
| `.claude/skills/generate-setup-guide/SKILL.md` | Replace one `/run-e2e` reference                                                         |
| `.claude/skills/start-task/SKILL.md`           | Replace three `/run-e2e` references                                                      |

**Files deleted:**

| Path                                  | Reason                          |
| ------------------------------------- | ------------------------------- |
| `.claude/skills/run-e2e/SKILL.md`     | Skill merged into `/e2e-eval`   |
| `.claude/skills/run-e2e/` (directory) | Empty after SKILL.md is removed |

**Files NOT touched:**

- `scripts/e2e.mjs` — already supports `--ui` natively (lines 59, 82, 222) and forwards `--`-prefixed args to Playwright (line 232). No runner changes needed.
- `docs/superpowers/plans/2026-05-14-start-task-brainstorming-integration.md` — historical artifact, left as-is.
- `CLAUDE.md` — does not reference `/run-e2e` (verified by grep).

---

## Task 1: Pre-flight — verify `scripts/e2e.mjs` supports the new flag patterns

**Files:**

- Read: `scripts/e2e.mjs`

Verification-only task. No file changes, no commit.

- [ ] **Step 1: Confirm `--ui` is a native runner flag**

Read `scripts/e2e.mjs` and confirm:

- Line 59 documents `--ui` in `--help` output
- Line 82: `const ui = args.includes("--ui");`
- Line 222: `if (ui) pwArgs.push("--ui");`

Expected: all three present. `--ui` works as `node scripts/e2e.mjs --app auth --ui` (no `--` separator needed).

- [ ] **Step 2: Confirm `--debug` works via passthrough**

The runner's separator logic at lines 87–88:

```js
const separatorIdx = args.indexOf("--");
const passthroughArgs = separatorIdx !== -1 ? args.slice(separatorIdx + 1) : [];
```

And the push at line 232:

```js
if (passthroughArgs.length) {
  pwArgs.push(...passthroughArgs);
}
```

So `node scripts/e2e.mjs --app admin -- --debug apps/admin/e2e/reports.spec.ts` reaches Playwright as `playwright test ... --debug apps/admin/e2e/reports.spec.ts`. No code change needed. **Do not actually invoke this** — the inspector is interactive.

- [ ] **Step 3: Confirm `--workers=1 --retries=2` passthrough works**

Same mechanism: `node scripts/e2e.mjs --app admin -- --workers=1 --retries=2` forwards both to Playwright. Confirm by reading the passthrough path above. No code change needed.

- [ ] **Step 4: Stop if any gap exists**

If any of Steps 1–3 reveal that the runner does NOT support a required flag pattern, STOP and escalate. Otherwise proceed to Task 2.

---

## Task 2: Add `--ui` and `--debug` to SKILL.md

**Files:**

- Modify: `.claude/skills/e2e-eval/SKILL.md` (Parameters table + new "Interactive Modes" section before `## Rules`)

- [ ] **Step 1: Insert two new rows in the Parameters table**

Find the Parameters table (the one that already documents `--headed`, `--app`, `--fix`, etc., around line 33). Insert these two rows immediately after the `--headed` row:

```markdown
| `--ui` | flag | off | Open Playwright UI mode after infra setup; skips analysis/report phases. Requires `--app <single>`. Mutually exclusive with `--fix`, `--retries`, `--replay`, `--ci`. |
| `--debug` | spec path | (none) | Open Playwright inspector after infra setup; requires a spec path. Skips analysis/report phases. Requires `--app <single>`. Mutually exclusive with `--fix`, `--retries`, `--replay`, `--ui`, `--ci`. |
```

- [ ] **Step 2: Insert a new "Interactive Modes" section immediately before the `## Rules` heading**

Add this block:

````markdown
---

## Interactive Modes

`--ui` and `--debug` provide interactive debugging on top of e2e-eval's autonomous infrastructure setup. Both modes run Phases 0–2 normally (env preflight, browser/Docker/tunnel checks, infrastructure start) then hand off control to Playwright. They skip Phases 3–6 (no failure analysis, no fix, no report).

### `--ui` (Playwright UI mode)

```bash
/e2e-eval --app auth --ui
/e2e-eval --env staging --app admin --ui
```

After Phase 2, invoke:

```bash
node scripts/e2e.mjs --env {env} --app {app} --ui
```

Wait for the Playwright UI process to exit; propagate its exit code.

**Requirements:**

- Must specify a single app via `--app`. `--app all` is rejected with: `--ui requires a single --app (auth, admin, store, or payments)`.
- Mutually exclusive with `--fix`, `--retries`, `--replay`, `--ci`. Combining them is rejected with: `--ui cannot be combined with {flag}`.

### `--debug <spec>` (Playwright inspector)

```bash
/e2e-eval --app admin --debug apps/admin/e2e/reports.spec.ts
```

After Phase 2, invoke:

```bash
node scripts/e2e.mjs --env {env} --app {app} -- --debug {spec}
```

Wait for the inspector to exit; propagate exit code.

**Requirements:**

- Spec path argument is required. If omitted, reject with: `--debug requires a spec file path`.
- Must specify a single app via `--app`. `--app all` is rejected.
- Mutually exclusive with `--fix`, `--retries`, `--replay`, `--ui`, `--ci`.
````

- [ ] **Step 3: Verify the changes**

Re-read the file. Confirm:

- Two new rows in the Parameters table after `--headed`
- A new "Interactive Modes" section immediately before `## Rules`
- No accidental edits elsewhere

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/e2e-eval/SKILL.md
git commit -m "feat(e2e-eval): add --ui and --debug interactive modes"
```

---

## Task 3: Update Phase 2 (dev) with Supabase cached detection

**Files:**

- Modify: `.claude/skills/e2e-eval/SKILL.md` (the `#### Dev environment` block under PHASE 2)

- [ ] **Step 1: Replace the `**2a. Supabase**` block under dev**

Find the existing `**2a. Supabase**` block under `#### Dev environment`. Replace its entire body (everything up to `**2b. Dev servers — always kill and restart**`) with:

````markdown
**2a. Supabase (cached detection)**

If `--clean` was requested, reset unconditionally — cached detection does not apply with `--clean`:

```bash
node scripts/supabase-docker.mjs reset --env dev
```

Otherwise, **probe before starting**. Read `SUPABASE_PORT` from `.env.dev` and TCP-probe it:

```powershell
$port = (Get-Content .env.dev | Select-String '^SUPABASE_PORT=').ToString().Split('=')[1]
Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet
```

| Probe result | Action                                                                                 |
| ------------ | -------------------------------------------------------------------------------------- |
| Responds     | Skip Supabase start. Record `Supabase: ♻️ Reused (already running on port N)`.         |
| No response  | Run `node scripts/supabase-docker.mjs start --env dev`. Record `Supabase: ✅ Started`. |
````

- [ ] **Step 2: Confirm `**2b. Dev servers — always kill and restart**` is untouched**

Verify the dev-server kill-restart block remains exactly as it is today. The Turbopack-staleness rationale paragraph must remain explicit. **Cached detection does NOT apply to dev servers in dev.**

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/e2e-eval/SKILL.md
git commit -m "feat(e2e-eval): cache Supabase startup in dev environment"
```

---

## Task 4: Update Phase 2 (staging) with cached infra detection

**Files:**

- Modify: `.claude/skills/e2e-eval/SKILL.md` (the `#### Staging environment` block under PHASE 2)

- [ ] **Step 1: Replace the staging Phase 2 body**

Find `#### Staging environment` under PHASE 2. Replace its entire body (the `Execute in this exact order:` line through the existing `docker logs candyshop-staging --tail 50` block) with:

````markdown
Execute in this exact order. **Each step probes first, then starts only if not responding.** `--skip-infra` bypasses all probes; `--clean` forces a Supabase reset regardless of probe result.

**2a. Cloudflare tunnel — pre-check**

Probe the tunnel URL (from `NEXT_PUBLIC_STORE_URL` or equivalent in `.env.staging`):

```bash
curl -sI {tunnel_url} --max-time 5 | head -1
```

| Probe result | Action                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| 2xx/3xx      | Tunnel is up — leave it alone for now (we'll re-confirm in 2d). Skip the `tunnel:stop` step. |
| No response  | Stop any zombie tunnel state: `pnpm tunnel:stop --env staging`.                              |

**2b. Start Supabase Docker (cached)**

If `--clean` was requested, reset unconditionally:

```bash
node scripts/supabase-docker.mjs reset --env staging
```

Otherwise probe port 64321:

```bash
nc -z 127.0.0.1 64321
```

| Probe result | Action                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------ |
| Responds     | Skip start. Record `Supabase: ♻️ Reused (already running on port 64321)`.                  |
| No response  | Run `node scripts/supabase-docker.mjs start --env staging`. Record `Supabase: ✅ Started`. |

If start fails with a schema/migration error (e.g. "column not found in schema cache") and `--clean` was NOT requested, run a full reset then retry:

```bash
node scripts/supabase-docker.mjs reset --env staging
node scripts/supabase-docker.mjs start --env staging
```

**2c. Build and start Docker container (cached)**

Probe `http://localhost:7542/`:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:7542/ --max-time 5
```

| Probe result                | Action                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| 2xx / 3xx / 4xx             | Container is responding (4xx is fine — the server is up). Record `Docker container: ♻️ Reused`. |
| No response / 5xx / timeout | Run `pnpm docker:build --env staging --up`. Record `Docker container: ✅ Built+started`.        |

**2d. Start Cloudflare tunnel (cached, re-probe)**

Re-probe the tunnel URL:

```bash
curl -sI {tunnel_url} --max-time 5 | head -1
```

| Probe result | Action                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| 2xx/3xx      | Skip start. Record `Cloudflare tunnel: ♻️ Reused (active)`.             |
| No response  | Run `pnpm tunnel --env staging`. Record `Cloudflare tunnel: ✅ Active`. |

Wait until port 7542 responds (the tunnel script does this internally). If it times out, check Docker container logs:

```bash
docker logs candyshop-staging --tail 50
```
````

- [ ] **Step 2: Verify the changes**

Re-read the staging section. Confirm:

- Lead-in line mentions `--skip-infra` (bypasses all) and `--clean` (forces Supabase reset).
- Four sub-steps in order: 2a tunnel pre-check, 2b Supabase, 2c Docker, 2d tunnel start.
- Each has a probe-then-decide table.
- The `docker logs` debug step survives at the end of 2d.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/e2e-eval/SKILL.md
git commit -m "feat(e2e-eval): cache staging infra (Supabase, Docker, tunnel)"
```

---

## Task 5: Update PHASE 6 report format with "Reused" status

**Files:**

- Modify: `.claude/skills/e2e-eval/SKILL.md` (the "Infrastructure" table inside PHASE 6's report-format example)

- [ ] **Step 1: Replace the Infrastructure table**

Find the table that starts with `| Service             | Status` under PHASE 6's report-format example. Replace the entire table with:

```markdown
| Service             | Status                                                               |
| ------------------- | -------------------------------------------------------------------- |
| Supabase            | ♻️ Reused (already running) / ✅ Started / ⏭️ Skipped (--skip-infra) |
| Docker container    | ♻️ Reused (already running) / ✅ Built+started / ⏭️ N/A (dev)        |
| Cloudflare tunnel   | ♻️ Reused (active) / ✅ Active / ⏭️ N/A (dev)                        |
| Playwright browsers | ✅ Installed                                                         |
| DB reset            | ✅ Done (--clean) / ⏭️ Skipped                                       |
| Dev server (dev)    | ✅ Killed + restarted clean / ⏭️ N/A (staging)                       |
| Dev server log      | ✅ Clean startup / ⚠️ Errors captured at `C:\Temp\devserver.log`     |
| UX tests            | ✅ Included (default) / ⏭️ Skipped (--no-ux)                         |
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/e2e-eval/SKILL.md
git commit -m "feat(e2e-eval): report 'Reused' status for cached infra services"
```

---

## Task 6: Add `--replay` flag to SKILL.md

**Files:**

- Modify: `.claude/skills/e2e-eval/SKILL.md` (Parameters table + new "Replay Mode" section before `## Rules`)

- [ ] **Step 1: Add `--replay` to the Parameters table**

Insert after the `--clean` row in the Parameters table:

```markdown
| `--replay` | flag | off | Re-run only the failures from the most recent `.ai-context/reports/e2e-eval-*.md`. Mutually exclusive with `--ui`, `--debug`, `--files`, `--ci`. |
```

- [ ] **Step 2: Add a new "Replay Mode" section after "Interactive Modes" and before `## Rules`**

````markdown
---

## Replay Mode

`--replay` re-runs only the failing tests from the most recent report, with full Phases 0–2 setup and Phases 4–6 analysis/fix/report.

### Behavior

1. Locate the newest report file matching `.ai-context/reports/e2e-eval-*.md` by filename timestamp.
2. If no report file exists at all → exit with: `No previous reports found in .ai-context/reports/`.
3. Parse the "Failed Tests" section. For each `### {Test name} — {file}:{line}` heading:
   - Extract `{app}` from the file path: `apps/{app}/e2e/...` → `{app}` is the second path segment.
   - Extract `{spec_file}:{line}` as the runner argument.
4. If no failures in the newest report → exit with: `No failures to replay (last report: {path})`.
5. Group failures by app, preserving auth-before-admin order.
6. Run Phases 0–2 normally (with cached detection).
7. For each app group, invoke:

```bash
node scripts/e2e.mjs --env {env} --app {app} -- {spec1}:{line1} {spec2}:{line2}
```

8. Continue with Phases 4–6 (analysis, fix if `--fix` was also passed, report).
9. In the new report, add this line directly under the existing `**Retries per failure:**` line:

```markdown
**Replay of:** .ai-context/reports/e2e-eval-{source_timestamp}.md
```

### Edge cases

| Situation                                             | Action                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Test file no longer exists at referenced path         | Log `Skipping {spec}:{line} — file no longer exists` and continue with the rest |
| Newest report mixes apps                              | Group and run sequentially (auth before admin)                                  |
| Replay run produces new failures not in source report | Treat normally — they appear in the new report under "Failed Tests"             |
| `--replay --fix` combination                          | Allowed: replay failures, fix each one, regression-check                        |
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/e2e-eval/SKILL.md
git commit -m "feat(e2e-eval): add --replay flag for re-running last report's failures"
```

---

## Task 7: Add `--ci` flag to SKILL.md

**Files:**

- Modify: `.claude/skills/e2e-eval/SKILL.md` (Parameters table + new "CI Parity Mode" section after "Replay Mode")

- [ ] **Step 1: Add `--ci` to the Parameters table**

Insert after the `--retries` row:

```markdown
| `--ci` | flag | off | Match GitHub Actions runtime config: `workers=1`, `retries=2`, headless. Disables skill-level flaky-detection retry (Playwright retries instead). Mutually exclusive with `--headed`, `--ui`, `--debug`, `--replay`. |
```

- [ ] **Step 2: Add a new "CI Parity Mode" section after "Replay Mode" and before `## Rules`**

````markdown
---

## CI Parity Mode

`--ci` reproduces how GitHub Actions runs the suite. Use it to debug failures that only manifest in CI.

### Behavior

- Force headless. If `--headed` was also passed, reject with: `--ci cannot be combined with --headed`.
- Pass through to `e2e.mjs` as: `-- --workers=1 --retries=2`.
- Disable the skill's flaky-detection retry loop. Treat Playwright's `retries=2` as the only retry mechanism; ignore the skill's `--retries` flag if also set.
- All other phases (0–6) run normally.

### Invocation

```bash
node scripts/e2e.mjs --env {env} --app {app} -- --workers=1 --retries=2
```

### Use cases

- A test passes locally but fails in CI → run `/e2e-eval --ci --files <spec>` to reproduce locally.
- Suspect a parallelism-related race → `--ci` forces single-worker.
- Suspect flakiness only in CI → `--ci` uses Playwright's retry instead of skill-level retry, matching CI behavior exactly.
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/e2e-eval/SKILL.md
git commit -m "feat(e2e-eval): add --ci flag to match GitHub Actions config"
```

---

## Task 8: Update `/run-e2e` cross-references in 8 files

**Files:**

- Modify: `.claude/rules/e2e-selectors.md` (line 341)
- Modify: `.claude/rules/testing.md` (line 791)
- Modify: `.claude/skills/capture-evidences/SKILL.md` (line 312)
- Modify: `.claude/skills/run-tests/SKILL.md` (lines 88, 317)
- Modify: `.claude/skills/verify-code/SKILL.md` (line 307)
- Modify: `.claude/skills/e2e-eval/SKILL.md` (line 622 — remove self-link)
- Modify: `.claude/skills/generate-setup-guide/SKILL.md` (line 399)
- Modify: `.claude/skills/start-task/SKILL.md` (lines 88, 838, 1090)

- [ ] **Step 1: `.claude/rules/e2e-selectors.md` line 341**

Replace:

```markdown
- [Run E2E Skill](../skills/run-e2e/SKILL.md) - `/run-e2e`
```

With:

```markdown
- [E2E Eval Skill](../skills/e2e-eval/SKILL.md) - `/e2e-eval`
```

- [ ] **Step 2: `.claude/rules/testing.md` line 791**

Replace:

```markdown
- [Run E2E Skill](../skills/run-e2e/SKILL.md) - `/run-e2e`
```

With:

```markdown
- [E2E Eval Skill](../skills/e2e-eval/SKILL.md) - `/e2e-eval`
```

- [ ] **Step 3: `.claude/skills/capture-evidences/SKILL.md` line 312**

Replace:

```markdown
| `/run-e2e` | Run automated E2E tests | Before capturing evidences |
```

With:

```markdown
| `/e2e-eval` | Run automated E2E tests | Before capturing evidences |
```

- [ ] **Step 4: `.claude/skills/run-tests/SKILL.md` lines 88 and 317**

Line 88 — replace:

```markdown
For E2E specific files, see [Run E2E](../run-e2e/SKILL.md).
```

With:

```markdown
For E2E specific files, see [E2E Eval](../e2e-eval/SKILL.md).
```

Line 317 — replace:

```markdown
- [Run E2E](../run-e2e/SKILL.md) - E2E testing with Playwright
```

With:

```markdown
- [E2E Eval](../e2e-eval/SKILL.md) - E2E testing with Playwright
```

- [ ] **Step 5: `.claude/skills/verify-code/SKILL.md` line 307**

Replace:

```markdown
- [Run E2E Skill](../run-e2e/SKILL.md) — `/run-e2e` for Playwright only
```

With:

```markdown
- [E2E Eval Skill](../e2e-eval/SKILL.md) — `/e2e-eval` for E2E runs
```

- [ ] **Step 6: `.claude/skills/e2e-eval/SKILL.md` line 622 — remove self-link**

Find this line in the "Related" section:

```markdown
- [Run E2E Skill](../run-e2e/SKILL.md) — Simpler non-autonomous runner
```

Delete the entire line. Verify no double blank line remains.

- [ ] **Step 7: `.claude/skills/generate-setup-guide/SKILL.md` line 399**

Replace:

```markdown
/run-e2e # E2E tests
```

With:

```markdown
/e2e-eval # E2E tests
```

- [ ] **Step 8: `.claude/skills/start-task/SKILL.md` lines 88, 838, 1090**

Line 88 — replace:

```markdown
| 05 | `testing-results.md` | `/run-tests`, `/run-e2e` | Test results, coverage, manual testing |
```

With:

```markdown
| 05 | `testing-results.md` | `/run-tests`, `/e2e-eval` | Test results, coverage, manual testing |
```

Line 838 — replace:

```markdown
- [ ] All E2E tests pass (`/run-e2e`)
```

With:

```markdown
- [ ] All E2E tests pass (`/e2e-eval`)
```

Line 1090 — replace:

```markdown
| [Run E2E](../run-e2e/SKILL.md) | E2E testing with Playwright | Before submitting PR |
```

With:

```markdown
| [E2E Eval](../e2e-eval/SKILL.md) | E2E testing with Playwright | Before submitting PR |
```

- [ ] **Step 9: Sanity grep**

Run:

```bash
grep -rn "/run-e2e\|run-e2e/SKILL" .claude/
```

Expected output: empty (no hits in `.claude/`).

If the deleted `.claude/skills/run-e2e/SKILL.md` is still present (it gets deleted in Task 9), grep will still hit it. That's expected — Task 9 removes it. The check here is for any OTHER stragglers in `.claude/`.

- [ ] **Step 10: Commit**

```bash
git add .claude/rules/e2e-selectors.md .claude/rules/testing.md .claude/skills/capture-evidences/SKILL.md .claude/skills/run-tests/SKILL.md .claude/skills/verify-code/SKILL.md .claude/skills/e2e-eval/SKILL.md .claude/skills/generate-setup-guide/SKILL.md .claude/skills/start-task/SKILL.md
git commit -m "chore(skills): update /run-e2e references to /e2e-eval"
```

---

## Task 9: Delete the `/run-e2e` skill

**Files:**

- Delete: `.claude/skills/run-e2e/SKILL.md`
- Delete: `.claude/skills/run-e2e/` (directory)

- [ ] **Step 1: Delete the skill file via git**

```bash
git rm .claude/skills/run-e2e/SKILL.md
```

- [ ] **Step 2: Remove the (now empty) directory**

```bash
rmdir .claude/skills/run-e2e
```

- [ ] **Step 3: Verify deletion**

```bash
test ! -d .claude/skills/run-e2e && echo "deleted" || echo "still exists"
```

Expected: `deleted`.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(skills): delete /run-e2e (merged into /e2e-eval)"
```

---

## Task 10: Final verification — full grep sweep + structural re-read

**Files:**

- Read: `.claude/skills/e2e-eval/SKILL.md`
- Read: `CLAUDE.md`

- [ ] **Step 1: Full grep sweep for stale references**

```bash
grep -rn "run-e2e" .claude/ CLAUDE.md 2>/dev/null
```

Expected output: empty. If anything turns up, fix it and continue to Step 4.

- [ ] **Step 2: Read SKILL.md end-to-end and confirm structure**

Open `.claude/skills/e2e-eval/SKILL.md`. Confirm in order:

- Frontmatter unchanged
- Description unchanged
- Usage section unchanged
- Parameters table includes `--ui`, `--debug`, `--replay`, `--ci` (and all original flags)
- PHASE 2 dev section has Supabase cached detection; dev-server kill-restart unchanged
- PHASE 2 staging section has 4 sub-steps (2a tunnel pre-check, 2b Supabase cached, 2c Docker cached, 2d tunnel cached)
- PHASE 6 Infrastructure table has `♻️ Reused` status options on Supabase / Docker / tunnel rows
- Between PHASE 6 and `## Rules`, three new sections appear in this order: "Interactive Modes", "Replay Mode", "CI Parity Mode"
- Rules section unchanged
- Related section no longer links to `/run-e2e`

- [ ] **Step 3: Confirm `scripts/e2e.mjs` is unchanged**

```bash
git log --oneline -- scripts/e2e.mjs | head -3
```

The most recent commit touching this file should be from BEFORE this branch — the merge did not modify the runner.

- [ ] **Step 4: Commit only if Step 1 turned up stragglers**

If Step 1 was clean (empty output), no commit needed for this task.

If Step 1 found references that were missed in Task 8, fix them and commit:

```bash
git add {files}
git commit -m "chore(skills): clean up remaining /run-e2e references"
```

---

## Self-Review Summary

**Spec coverage:**

| Spec section                               | Implementing task |
| ------------------------------------------ | ----------------- |
| 1 — `--ui` and `--debug` flags             | Task 2            |
| 2 — Cached infra detection (dev)           | Task 3            |
| 2 — Cached infra detection (staging)       | Task 4            |
| 2 — Report format change                   | Task 5            |
| 3 — `--replay`                             | Task 6            |
| 4 — `--ci`                                 | Task 7            |
| 5 — Cross-reference updates                | Task 8            |
| 5 — Delete `/run-e2e` files                | Task 9            |
| Implementation impact — verify `e2e.mjs`   | Task 1            |
| Implementation impact — final verification | Task 10           |

All spec sections have a corresponding task. The spec's testing section (11 steps) is partially covered by Task 10's structural verification; the behavior-level smoke tests (Playwright UI opens, replay re-runs the right tests, etc.) require live infrastructure and are the user's responsibility after the merge lands.

**Commits expected:** 8 (Tasks 2, 3, 4, 5, 6, 7, 8, 9) plus a possible 9th from Task 10 only if stragglers are found.
