# dev-supabase-config Bugfix Design

## Overview

When a developer runs `pnpm dev` directly (i.e. `turbo dev`), the Next.js apps may connect to a
stale cloud Supabase instance instead of the local dev instance at `http://127.0.0.1:54321`.

The fix has three coordinated parts:

1. **Wrap the `dev` script** — replace `"dev": "turbo dev"` in `package.json` with a small Node
   script (or inline command) that calls `loadRootEnv({ targetEnv: "dev" })` before spawning
   `turbo dev`, mirroring what `site-up.mjs` already does.
2. **Force-load dev env in `loadRootEnv`** — add a `force` option (or a dedicated
   `loadRootEnvForDev` path) that overwrites `NEXT_PUBLIC_SUPABASE_URL` and related keys even
   when they are already present in `process.env`, but **only** when the caller explicitly opts
   in (so CI and staging scripts are unaffected).
3. **Add `TARGET_ENV` to `turbo.json` `dev` task `env` array** — ensures Turbo forwards the
   variable to every child Next.js process so `loadRootEnv()` inside each `next.config.ts` picks
   the right env file.

`pnpm dev:up` already works correctly and must not be changed.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `pnpm dev` is invoked while
  `process.env` contains stale non-dev Supabase vars, or `TARGET_ENV` is not forwarded by Turbo.
- **Property (P)**: The desired behavior — every app started by `pnpm dev` SHALL use
  `NEXT_PUBLIC_SUPABASE_URL = http://127.0.0.1:54321`.
- **Preservation**: All other scripts (`dev:up`, `staging`, `build`, CI) must continue to load
  their respective env files without change.
- **`loadRootEnv(options)`**: The function in `scripts/load-root-env.js` that reads
  `.env.{TARGET_ENV}` and populates `process.env`. Currently protects all keys already present.
- **`protectedKeys`**: The `Set` built from `Object.keys(process.env)` at the start of
  `loadRootEnv()`. Keys in this set are never overwritten — the root cause of the stale-var bug.
- **`TARGET_ENV`**: Shell/Turbo variable that selects which `.env.*` file to load (`dev`,
  `staging`, `e2e`, `prod`).
- **`turbo.json` `env` array**: The list of env vars Turbo captures and forwards to child tasks.
  Missing entries mean the variable may not reach child processes.
- **`site-up.mjs`**: The `pnpm dev:up` entry point. Calls `loadRootEnv()` before spawning
  `pnpm dev`, so it is unaffected by this bug.

---

## Bug Details

### Bug Condition

The bug manifests when `pnpm dev` is run directly and `process.env` already contains
`NEXT_PUBLIC_SUPABASE_URL` (or `TARGET_ENV`) set to a non-dev value. The `loadRootEnv()` call
inside each app's `next.config.ts` sees those keys in `protectedKeys` and skips them, so the
stale cloud URL is never replaced with `http://127.0.0.1:54321`.

A secondary trigger is that `turbo.json`'s `dev` task has no `env` entry for `TARGET_ENV`, so
even a correctly set shell variable is not guaranteed to reach child Next.js processes.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type DevStartContext
         X.command   — npm script invoked ("dev" | "dev:up" | "staging" | ...)
         X.shellEnv  — snapshot of process.env at the moment the command runs

  OUTPUT: boolean

  RETURN X.command = "dev"
     AND (
           X.shellEnv[NEXT_PUBLIC_SUPABASE_URL] ≠ "http://127.0.0.1:54321"
           OR X.shellEnv[NEXT_PUBLIC_SUPABASE_URL] is undefined
                AND TARGET_ENV not forwarded to child processes by Turbo
         )
END FUNCTION
```

### Examples

- **Stale staging URL**: Developer previously ran `pnpm staging`; shell still has
  `NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co`. Running `pnpm dev` leaves that URL intact
  → apps hit the staging database. **Expected**: URL overwritten to `http://127.0.0.1:54321`.

- **Stale prod URL from CI**: CI job exported `NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co`
  and the developer reused that terminal. Running `pnpm dev` keeps the prod URL.
  **Expected**: URL overwritten to `http://127.0.0.1:54321`.

- **Clean shell, `TARGET_ENV` not forwarded**: Fresh terminal, no stale vars. `pnpm dev` runs
  `turbo dev`; Turbo does not list `TARGET_ENV` in the `dev` task `env` array, so child processes
  may not see it. `loadRootEnv()` defaults to `dev` and loads `.env.dev` — this case works today
  only because `protectedKeys` is empty. **Expected**: continues to work after the fix.

- **Edge case — `TARGET_ENV=staging` in shell**: Developer explicitly exported
  `TARGET_ENV=staging`. Running `pnpm dev` should still use `dev` env (the `dev` script forces
  `targetEnv: "dev"`). **Expected**: `http://127.0.0.1:54321` regardless of shell `TARGET_ENV`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `pnpm dev:up` (`site-up.mjs`) MUST continue to call `loadRootEnv()` and connect apps to the
  local Supabase instance exactly as it does today — no changes to `site-up.mjs`.
- `pnpm staging` / `pnpm staging:*` scripts MUST continue to load `.env.staging` and use the
  staging Supabase URL when `TARGET_ENV=staging`.
- `pnpm build` / `turbo build` in CI MUST continue to respect the explicitly provided
  `TARGET_ENV` value and the existing `protectedKeys` precedence rules.
- `loadRootEnv()` called without the new `force` option MUST continue to protect keys already
  present in `process.env` (existing callers are unaffected).
- `pnpm dev:up:tunnel` MUST continue to start the Cloudflare tunnel alongside dev apps.

**Scope:**

All inputs where `X.command ≠ "dev"` (i.e. `dev:up`, `staging`, `build`, CI) are completely
unaffected by this fix. The `force` option in `loadRootEnv` is opt-in and only the new `dev`
wrapper script uses it.

---

## Hypothesized Root Cause

Based on the bug description and code review, the causes are:

1. **`pnpm dev` has no pre-flight env load**: `"dev": "turbo dev"` in `package.json` spawns
   Turbo directly. Unlike `site-up.mjs`, nothing calls `loadRootEnv()` before Turbo starts, so
   stale shell vars are never cleared.

2. **`protectedKeys` prevents overwrite in `next.config.ts`**: `loadRootEnv()` snapshots
   `Object.keys(process.env)` into `protectedKeys` at call time. Any key already in the
   environment — including stale cloud URLs — is skipped. This is correct behaviour for CI/staging
   but wrong for the `pnpm dev` path where dev values should always win.

3. **`TARGET_ENV` absent from `turbo.json` `dev` task `env` array**: The `dev` task in
   `turbo.json` has no `env` entry. Turbo's task isolation may not forward `TARGET_ENV` to child
   Next.js processes, so `loadRootEnv()` inside `next.config.ts` cannot reliably determine which
   env file to load.

4. **`site-up.mjs` works by accident of ordering**: It calls `loadRootEnv()` before spawning
   `pnpm dev`, so `process.env` is already populated with dev values when Turbo starts. The child
   `next.config.ts` calls then see `protectedKeys` containing the _correct_ dev values and skip
   them — which is fine. The bug only surfaces when this pre-flight step is missing.

---

## Correctness Properties

Property 1: Bug Condition — `pnpm dev` always uses local Supabase URL

_For any_ `DevStartContext` where `isBugCondition(X)` returns true (i.e. `pnpm dev` is invoked
with stale or missing Supabase env vars), the fixed startup sequence SHALL result in
`NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"` being visible to every Next.js app process,
regardless of what was previously set in the shell environment.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Non-`dev` commands are unaffected

_For any_ `DevStartContext` where `isBugCondition(X)` returns false (i.e. `dev:up`, `staging`,
`build`, CI, or any command other than bare `pnpm dev`), the fixed code SHALL produce exactly the
same `NEXT_PUBLIC_SUPABASE_URL` resolution as the original code, preserving all existing env
loading precedence rules and Supabase URL values for those commands.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct, three targeted changes are needed:

---

**File**: `candystore/package.json`

**Change 1 — Wrap `dev` script with env pre-flight**

Replace the bare `turbo dev` invocation with a Node one-liner (or a dedicated small script) that
calls `loadRootEnv({ targetEnv: "dev", force: true })` before spawning Turbo. This mirrors the
pattern already used by `site-up.mjs`.

```json
"dev": "node -e \"require('./scripts/load-root-env.js').loadRootEnv({targetEnv:'dev',force:true})\" && turbo dev"
```

Alternatively, extract a `scripts/dev.mjs` wrapper (cleaner, easier to test):

```js
// scripts/dev.mjs
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

loadRootEnv({ targetEnv: "dev", force: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

const child = spawn(isWindows ? "pnpm.cmd" : "pnpm", ["turbo", "dev"], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
```

Then in `package.json`: `"dev": "node scripts/dev.mjs"`

---

**File**: `candystore/scripts/load-root-env.js`

**Change 2 — Add `force` option to `loadRootEnv`**

Add a `force` boolean option. When `true`, the `canSet` predicate for the target env file ignores
`protectedKeys` for the specific keys defined in that env file, allowing dev values to overwrite
stale shell vars.

```js
function loadRootEnv(options = {}) {
  const targetEnv = options.targetEnv || process.env.TARGET_ENV || "dev";
  const force = options.force === true; // NEW
  const envFilePath = resolve(rootDir, `.env.${targetEnv}`);
  // ...existing validation...

  const protectedKeys = new Set(Object.keys(process.env));

  // 1. Load defaults (unchanged — never force defaults)
  loadEnvFile(
    resolve(rootDir, ".env.example"),
    (key) => !protectedKeys.has(key) && !process.env[key],
  );

  // 2. Load target env file — force=true bypasses protectedKeys
  loadEnvFile(envFilePath, (key) => force || !protectedKeys.has(key)); // CHANGED

  // 3. Secret resolution (unchanged)
  // ...
}
```

The `force` flag only affects step 2 (the target env file). Defaults (`.env.example`) and secret
resolution are unchanged.

---

**File**: `candystore/turbo.json`

**Change 3 — Add `TARGET_ENV` to `dev` task `env` array**

```json
"dev": {
  "cache": false,
  "persistent": true,
  "env": ["TARGET_ENV"]
}
```

This ensures Turbo captures and forwards `TARGET_ENV` to all child Next.js processes, so
`loadRootEnv()` inside each `next.config.ts` can reliably read it.

---

### Summary of Changes

| File                       | Change                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `package.json`             | `dev` script calls `loadRootEnv({targetEnv:"dev", force:true})` before `turbo dev` |
| `scripts/load-root-env.js` | Add `force` option; when true, target env file overwrites `protectedKeys`          |
| `turbo.json`               | Add `"env": ["TARGET_ENV"]` to the `dev` task                                      |

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or
refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests for `loadRootEnv` that simulate a stale `process.env` (with a
non-dev `NEXT_PUBLIC_SUPABASE_URL` already set) and assert that the URL is NOT overwritten when
`force` is absent. Run these on the unfixed code to confirm the bug, then verify the fix.

**Test Cases**:

1. **Stale URL not overwritten (unfixed)**: Set `process.env.NEXT_PUBLIC_SUPABASE_URL =
"https://stale.supabase.co"`, call `loadRootEnv({ targetEnv: "dev" })` (no `force`), assert
   URL is still `"https://stale.supabase.co"` — confirms the bug exists.

2. **Stale URL overwritten with `force` (fixed)**: Same setup, call
   `loadRootEnv({ targetEnv: "dev", force: true })`, assert URL becomes
   `"http://127.0.0.1:54321"` — confirms the fix works.

3. **`TARGET_ENV` forwarding**: Verify that after Change 3, `turbo.json` `dev` task includes
   `TARGET_ENV` in its `env` array — a static config assertion.

4. **Edge case — no stale vars**: Call `loadRootEnv({ targetEnv: "dev", force: true })` with a
   clean `process.env`; assert URL is `"http://127.0.0.1:54321"` (force on clean env is a no-op
   in effect, but must not error).

**Expected Counterexamples**:

- Without `force`, `NEXT_PUBLIC_SUPABASE_URL` is not overwritten when already present in
  `process.env` — the stale cloud URL persists.
- Possible causes: `protectedKeys` set built before env file is loaded; `canSet` returns `false`
  for any key already in `process.env`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed startup sequence
produces the expected behavior.

**Pseudocode:**

```
FOR ALL X WHERE isBugCondition(X) DO
  result := resolvedSupabaseUrl(X)   // NEXT_PUBLIC_SUPABASE_URL seen by the app
  ASSERT result = "http://127.0.0.1:54321"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same `NEXT_PUBLIC_SUPABASE_URL` resolution as the original code.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT loadRootEnv_original(X.shellEnv) = loadRootEnv_fixed(X.shellEnv)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many `process.env` snapshots automatically across the input domain.
- It catches edge cases (unusual key combinations, partial env files) that manual tests miss.
- It provides strong guarantees that the `force` option does not affect callers that don't use it.

**Test Plan**: Observe behavior of `loadRootEnv` without `force` on a variety of `process.env`
snapshots (staging, prod, CI, empty), then write property-based tests asserting the same output
after the fix.

**Test Cases**:

1. **Staging URL preservation**: `process.env` has `NEXT_PUBLIC_SUPABASE_URL=https://staging...`,
   call `loadRootEnv({ targetEnv: "staging" })` (no `force`); assert URL is unchanged.

2. **CI var protection**: `process.env` has `CI=true` and explicit Supabase vars; call
   `loadRootEnv({ targetEnv: "dev" })` (no `force`); assert CI vars are not overwritten.

3. **`dev:up` path unchanged**: Simulate `site-up.mjs` flow — call `loadRootEnv()` with no
   options on a clean env; assert URL becomes `"http://127.0.0.1:54321"` (existing behavior).

4. **`force` does not affect non-dev callers**: Call `loadRootEnv({ targetEnv: "staging" })`
   without `force`; assert staging URL is loaded and dev URL is not injected.

### Unit Tests

- Test `loadRootEnv` with `force: true` overwrites a stale `NEXT_PUBLIC_SUPABASE_URL`.
- Test `loadRootEnv` without `force` does NOT overwrite a stale `NEXT_PUBLIC_SUPABASE_URL`
  (regression guard — existing behavior must be preserved for non-`force` callers).
- Test `loadRootEnv` with `force: true` on a clean `process.env` loads `.env.dev` correctly.
- Test that `turbo.json` `dev` task `env` array contains `"TARGET_ENV"` (static config check).
- Test that the new `dev` script (or `scripts/dev.mjs`) calls `loadRootEnv` before spawning Turbo.

### Property-Based Tests

- Generate random `process.env` snapshots with arbitrary `NEXT_PUBLIC_SUPABASE_URL` values;
  verify that `loadRootEnv({ targetEnv: "dev", force: true })` always results in
  `NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"`.
- Generate random `process.env` snapshots; verify that `loadRootEnv({ targetEnv: "dev" })`
  (no `force`) never overwrites a key that was present before the call — preservation of
  `protectedKeys` semantics.
- Generate random env file contents; verify that `force: true` only overwrites keys defined in
  the target env file, not arbitrary keys.

### Integration Tests

- Start a simulated `pnpm dev` flow (call the new wrapper script) with a stale staging URL in
  `process.env`; assert `NEXT_PUBLIC_SUPABASE_URL` is `"http://127.0.0.1:54321"` after startup.
- Start a simulated `pnpm dev:up` flow (call `site-up.mjs` logic) with a stale staging URL;
  assert the URL is also corrected (existing behavior, must not regress).
- Verify that running `loadRootEnv({ targetEnv: "staging" })` after the fix still loads the
  staging URL correctly (no cross-contamination from the `force` change).
