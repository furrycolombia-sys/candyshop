---
name: e2e-eval
description: Fully autonomous E2E test evaluator. Starts all required services, runs Playwright tests, diagnoses failures, optionally fixes production code, and delivers a structured report. Unattended except when test code itself may need changing.
---

# E2E Eval Skill

## Description

Fully autonomous end-to-end test runner for this monorepo. You handle everything without being asked: kill stale services, start Docker and Supabase, build images, launch the Cloudflare tunnel, install missing Playwright browsers, run the tests, analyze every failure, and optionally fix production code.

**You are unattended from start to finish** — the only exception is when a test file itself appears to contain a bug and you believe test code should change. That case requires user confirmation before touching any test file.

---

## Usage

```
/e2e-eval [env] [options]
```

Natural language also works:

```
Run all E2E tests on staging
Run E2E headless on dev for admin app, fix failures
Run e2e staging headed for the reports spec
Run e2e dev --fix
```

## Parameters

| Parameter      | Values                                | Default            | Description                                                                                       |
| -------------- | ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `env`          | `dev` \| `staging`                    | `dev`              | Target environment                                                                                |
| `--headed`     | flag                                  | off (headless)     | Show the browser window during tests                                                              |
| `--app`        | `auth` \| `admin` \| `store` \| `all` | `all`              | Which app suite(s) to run                                                                         |
| `--fix`        | flag                                  | off                | Auto-fix production code when tests fail                                                          |
| `--files`      | path(s) or pattern                    | all specs          | Restrict to specific test files or grep pattern                                                   |
| `--skip-infra` | flag                                  | off                | Skip infrastructure startup (phases 1–2); assume services are already running                     |
| `--clean`      | flag                                  | off                | Reset Supabase DB before running (re-applies all migrations from scratch)                         |
| `--retries`    | integer                               | `1`                | Number of times to retry a failing test before classifying it as a real failure (flaky detection) |
| `--timeout`    | milliseconds                          | Playwright default | Override per-test timeout for slow environments                                                   |

Google OAuth tests are always skipped automatically (they require live Google credentials and are explicitly skipped by the specs themselves).

---

## Project Infrastructure Reference

### Monorepo layout

```
apps/
  auth/    e2e/  ← playwright.config.ts  (port 5000 dev)
  admin/   e2e/  ← playwright.config.ts  (port 5002 dev)
  store/   e2e/  ← playwright.config.ts  (port 5001 dev)
scripts/
  e2e.mjs                  ← unified runner (use this)
  supabase-docker.mjs      ← supabase start/stop/reset
  docker-build.mjs         ← docker build + compose up
  cloudflared.mjs          ← tunnel start
  cloudflared-stop.mjs     ← tunnel stop
```

### Test runner command

Always use `node scripts/e2e.mjs`. Never call Playwright directly.

```bash
# Supported --app values: auth | store | admin
node scripts/e2e.mjs --env {dev|staging} --app {auth|store|admin} [--headed] [-- playwright_passthrough_args]

# Examples
node scripts/e2e.mjs --env dev --app auth
node scripts/e2e.mjs --env staging --app admin -- apps/admin/e2e/reports.spec.ts
node scripts/e2e.mjs --env staging --app auth --headed -- --grep "permission-management"
```

### App → spec files mapping

| --app   | Spec files                         |
| ------- | ---------------------------------- |
| `auth`  | `apps/auth/e2e/*.spec.ts`          |
| `admin` | `apps/admin/e2e/*.spec.ts`         |
| `store` | (store has no e2e specs currently) |

### Infrastructure per environment

**dev:**

- Supabase: local Docker (port from `.env.dev`, key `SUPABASE_PORT`)
- Apps: `pnpm dev` (starts all apps on their ports)
- No Docker container, no tunnel

**staging:**

- Supabase: local Docker (port 64321, config in `.env.staging`)
- App: single Docker container (port 7542) via `pnpm docker:build --env staging --up`
- Tunnel: Cloudflare tunnel via `pnpm tunnel --env staging`
- All URLs go through the tunnel (e.g. `https://store.ffxivbe.org`)

### Playwright artifact locations

After each test run, Playwright saves artifacts for failing tests:

```
apps/{app}/test-results/
  {test-name}/
    screenshot.png       ← Screenshot at point of failure
    trace.zip            ← Full trace (open with: npx playwright show-trace trace.zip)
    video.webm           ← Video (if enabled)
```

Always include the trace path in the report for each failing test.

---

## Execution Phases

Work through each phase in order. Skip phases 1–2 when `--skip-infra` is set.

---

### PHASE 0 — Environment Variable Pre-flight

**Always run this phase, even when `--skip-infra` is set.**

Before touching any infrastructure, verify all required environment variables are present. Read the appropriate `.env.{env}` file and check for:

| Variable                    | Required for     |
| --------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | All environments |
| `SUPABASE_SERVICE_ROLE_KEY` | All environments |
| `NEXT_PUBLIC_ADMIN_URL`     | Admin app tests  |
| `NEXT_PUBLIC_AUTH_URL`      | Auth app tests   |
| `SUPABASE_PORT`             | Dev environment  |

If any required variable is missing, **exit immediately** with a clear error naming the missing variable and which `.env.*` file to check. Do not proceed to Phase 1.

---

### PHASE 1 — Preflight Checks

_(Skip when `--skip-infra` is set)_

**1a. Playwright browsers**

Check that Playwright browsers are installed for each app you will test. Run:

```bash
pnpm --dir apps/auth exec playwright --version
pnpm --dir apps/admin exec playwright --version
```

If the command fails or shows "Please run `playwright install`", install for each app:

```bash
pnpm --dir apps/auth exec playwright install --with-deps chromium
pnpm --dir apps/admin exec playwright install --with-deps chromium
```

**1b. Docker (staging only)**

For staging, verify Docker is running:

```bash
docker info 2>&1 | head -5
```

If Docker is not running, exit with a clear error — Docker Desktop must be started manually.

**1c. cloudflared (staging only)**

```bash
cloudflared --version 2>&1 | head -2
```

If missing, exit with an error instructing the user to install cloudflared.

---

### PHASE 2 — Start Infrastructure

_(Skip when `--skip-infra` is set)_

#### Dev environment

**2a. Supabase**

If `--clean` was requested, reset first:

```bash
node scripts/supabase-docker.mjs reset --env dev
```

Otherwise check if local Supabase is already running by reading `SUPABASE_PORT` from `.env.dev` and testing that port. If not running:

```bash
node scripts/supabase-docker.mjs start --env dev
```

**2b. Dev servers**

Check if app ports are already listening. For each app being tested, check the relevant port (auth=5000, admin=5002, store=5001). If any are down:

```bash
pnpm dev
```

Wait up to 120 seconds for the ports to respond before proceeding.

#### Staging environment

Execute in this exact order:

**2a. Stop any existing tunnel**

```bash
pnpm tunnel:stop --env staging
```

**2b. Start Supabase Docker**

If `--clean` was requested, reset first:

```bash
node scripts/supabase-docker.mjs reset --env staging
```

Then start:

```bash
node scripts/supabase-docker.mjs start --env staging
```

If start fails with a schema/migration error (e.g., "column not found in schema cache") and `--clean` was NOT requested, run a full reset then retry:

```bash
node scripts/supabase-docker.mjs reset --env staging
node scripts/supabase-docker.mjs start --env staging
```

**2c. Build and start Docker container**

```bash
pnpm docker:build --env staging --up
```

This rebuilds the image (using cached layers when code hasn't changed) and restarts the container on port 7542.

**2d. Start Cloudflare tunnel**

```bash
pnpm tunnel --env staging
```

Wait until port 7542 responds (the script does this internally). If it times out, check Docker container logs:

```bash
docker logs candyshop-staging --tail 50
```

---

### PHASE 3 — Run Tests

Run tests for each requested app using `node scripts/e2e.mjs`.

**Strategy for `--app all`:** Run auth first, then admin. Collect all results.

**Pass-through args for specific files:**

```bash
node scripts/e2e.mjs --env staging --app auth -- apps/auth/e2e/permission-management.spec.ts
```

**Pass-through args for grep:**

```bash
node scripts/e2e.mjs --env staging --app auth -- --grep "turns payments"
```

**Pass-through timeout override (when `--timeout` specified):**

```bash
node scripts/e2e.mjs --env staging --app admin -- --timeout 60000
```

**Important:** Capture full stdout/stderr — you will parse it in Phase 4.

Collect:

- Total tests run
- Number passed / failed / skipped
- For each failure: test name, file, line, error message, expected vs actual
- Path to `test-results/` directory for artifact locations

---

### PHASE 4 — Analyze Failures

If all tests passed, skip to Phase 6 (Report).

For each failing test, apply **flaky test detection** before root cause analysis:

#### Flaky Test Detection

Re-run each failing test up to `--retries` times (default: 1 additional attempt) in isolation:

```bash
node scripts/e2e.mjs --env {env} --app {app} -- {spec_file}:{line}
```

- **Passes on retry** → classify as **Flaky** (see classification table below). Do NOT attempt to fix flaky tests automatically.
- **Fails consistently on every attempt** → proceed to root cause analysis below.

#### Root Cause Analysis (for consistent failures)

**Step 1: Read the test**

Read the test file and identify exactly what the test expects (selector, text, URL, attribute, etc.).

**Step 2: Reproduce the failure**

Look at the error output:

- **Timeout waiting for locator** → element never appeared (selector wrong, or feature broken)
- **Expected X, received Y** → assertion mismatch (wrong value, or test expectation is wrong)
- **Navigation failed** → network/tunnel issue, or route doesn't exist
- **403 / permission denied** → auth/permission setup issue in test data
- **Console error** → runtime crash in the app

**Step 3: Locate artifacts**

Find the trace and screenshot for this failure:

```
apps/{app}/test-results/{test-name-slugified}/trace.zip
apps/{app}/test-results/{test-name-slugified}/screenshot.png
```

Include these paths in the report so the user can inspect them.

**Step 4: Classify the failure**

| Classification           | Criteria                                                                  | Action                                        |
| ------------------------ | ------------------------------------------------------------------------- | --------------------------------------------- |
| **Flaky**                | Fails on first run but passes on retry                                    | Document; do not fix automatically            |
| **Infrastructure**       | Network timeout, port not responding, Docker not ready                    | Retry Phase 2–3; if persists, report and stop |
| **Code bug**             | App returns wrong data, wrong behavior, missing element that should exist | Fix production code (Phase 5)                 |
| **Test data bug**        | Seed data missing, wrong IDs, DB state issue                              | Fix seed data or test setup (Phase 5)         |
| **Test bug**             | Selector outdated, wrong URL pattern, assertion tests wrong thing         | Ask user before changing (see below)          |
| **Requirements changed** | The feature was deliberately changed and the test is now stale            | Ask user before changing tests                |

**Test code change policy — ALWAYS ASK:**

If you believe a test file needs to change, STOP and ask the user:

```
Test `{test name}` in `{file}:{line}` appears to fail because the test itself
may be incorrect (not the production code). Here's what I found:

- Test expects: {expectation}
- Current behavior: {actual behavior}
- My diagnosis: {why I think this is a test bug / requirements change}

Should I:
a) Fix the test to match the current behavior
b) Fix the production code to match the original test intent
c) Skip this test and continue
```

Do NOT change test files without explicit user confirmation.

---

### PHASE 5 — Fix Production Code (if --fix)

Only executed when `--fix` was requested AND the failure is classified as a **code bug** or **test data bug** (not a test bug, not flaky).

**Fix process:**

1. Read the failing test to understand the expected behavior
2. Identify the production files responsible (API routes, components, hooks, DB queries)
3. Apply the minimal fix needed to make the test pass
4. Do NOT refactor or improve surrounding code — only fix what's needed
5. Re-run only the failing test to verify:

```bash
node scripts/e2e.mjs --env {env} --app {app} -- {spec_file}:{line}
```

6. If the fix causes other tests to fail, investigate the regression before proceeding
7. Record every file changed and why

**After all individual fixes — regression check:**

Once all failing tests have been fixed, run the **full suite** one more time to confirm no regressions were introduced:

```bash
node scripts/e2e.mjs --env {env} --app {app}
```

If new failures appear that weren't in the original run, investigate and fix them before proceeding to the report.

**Generate a git diff summary of all changes:**

```bash
git diff --stat
```

Include this in the report under "Fixes Applied".

**If `--fix` was NOT requested:** Document the diagnosis and recommended fix in the report, but make no code changes.

---

### PHASE 6 — Generate Report

Save a timestamped markdown report to `.ai-context/reports/`:

```
.ai-context/reports/e2e-eval-{YYYY-MM-DDTHH-MM-SS}.md
```

#### Report format

```markdown
# E2E Eval Report

**Date:** {timestamp}
**Environment:** dev | staging
**Mode:** headless | headed
**Fix mode:** on | off
**Infra skipped:** yes | no
**DB reset (--clean):** yes | no
**Retries per failure:** {N}

---

## Summary

| App       | Total | Passed | Failed | Flaky | Skipped | Duration |
| --------- | ----- | ------ | ------ | ----- | ------- | -------- |
| auth      | X     | X      | X      | X     | X       | Xs       |
| admin     | X     | X      | X      | X     | X       | Xs       |
| **Total** | **X** | **X**  | **X**  | **X** | **X**   | **Xs**   |

**Overall status:** ✅ ALL PASSED | ⚠️ {N} FLAKY | ❌ {N} FAILED

---

## Infrastructure

| Service             | Status                                                      |
| ------------------- | ----------------------------------------------------------- |
| Supabase            | ✅ Started / ✅ Already running / ⏭️ Skipped (--skip-infra) |
| Docker container    | ✅ Built + started (staging) / ⏭️ N/A (dev)                 |
| Cloudflare tunnel   | ✅ Active (staging) / ⏭️ N/A (dev)                          |
| Playwright browsers | ✅ Installed                                                |
| DB reset            | ✅ Done (--clean) / ⏭️ Skipped                              |

---

## Failed Tests

### {Test name} — {file}:{line}

**Classification:** Code bug | Test data bug | Infrastructure | Test bug (user confirmation needed)

**Error:**
```

{exact error message}

```

**Root cause:** {your diagnosis}

**Artifacts:**
- Screenshot: `apps/{app}/test-results/{slug}/screenshot.png`
- Trace: `apps/{app}/test-results/{slug}/trace.zip` (open with: `npx playwright show-trace`)

**Fix applied:** {what was changed, or "None — --fix not requested"}

---

## Flaky Tests

### {Test name} — {file}:{line}

**Pattern:** Failed on attempt 1, passed on attempt 2 (or vice versa)

**Recommendation:** Investigate selector stability, timing issues, or test data race conditions. Not auto-fixed.

---

## Fixes Applied

| File | Change | Reason |
|------|--------|--------|
| {path} | {description} | {failing test name} |

**Git diff summary:**
```

{output of git diff --stat}

```

---

## Regression Check

{Result of full-suite re-run after fixes, if --fix was used}

| Status | Notes |
|--------|-------|
| ✅ No regressions | All previously-passing tests still pass |
| ❌ {N} new failures | {list of new failures introduced by fixes} |

---

## Items Requiring User Decision

{List any test bug / requirements-change failures that were NOT fixed autonomously}

---

## Recommendations

{Any patterns, recurring issues, flaky tests worth stabilizing, or infrastructure improvements worth noting}
```

---

## Rules

1. **Never skip Phase 0** — env var validation runs even with `--skip-infra`.
2. **Never skip a phase** — infrastructure must be verified before tests run (unless `--skip-infra`).
3. **Never change test files** without user confirmation.
4. **Never commit changes** — only fix files; let the user decide when to commit.
5. **Always retry failures** before classifying (flaky detection, default 1 retry).
6. **Always run regression check** after applying fixes with `--fix`.
7. **Always include artifact paths** (screenshot, trace) for every failing test in the report.
8. **Always re-run failing tests after a fix** to confirm they pass.
9. **Report path must be saved** — always write the file even if all tests passed.
10. **Minimal fixes only** — no refactoring, no surrounding cleanup.

---

## Related

- [E2E Selectors](../../rules/e2e-selectors.md) — Selector guidelines
- [Testing Rules](../../rules/testing.md) — When to change tests
- [Run E2E Skill](../run-e2e/SKILL.md) — Simpler non-autonomous runner
- `scripts/e2e.mjs` — Unified test runner
- `scripts/supabase-docker.mjs` — Supabase control
- `scripts/docker-build.mjs` — Docker image/container control
