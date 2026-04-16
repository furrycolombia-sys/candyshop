# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale Supabase URL Not Overwritten by `pnpm dev`
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that `loadRootEnv` does NOT overwrite a stale `NEXT_PUBLIC_SUPABASE_URL` when called without `force`
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — any non-dev URL already present in `process.env` when `loadRootEnv({ targetEnv: "dev" })` is called
  - Create `candystore/scripts/__tests__/load-root-env.test.js` (new file; Node/Vitest or plain Node assert)
  - Set `process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stale.supabase.co"` before calling `loadRootEnv({ targetEnv: "dev" })` (no `force`)
  - Assert that `process.env.NEXT_PUBLIC_SUPABASE_URL` equals `"http://127.0.0.1:54321"` after the call
  - Run test on UNFIXED code — **EXPECTED OUTCOME**: Test FAILS (stale URL is not overwritten — this proves the bug exists)
  - Document the counterexample: `loadRootEnv({ targetEnv: "dev" })` with `NEXT_PUBLIC_SUPABASE_URL=https://stale.supabase.co` → URL unchanged, expected `http://127.0.0.1:54321`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Keys Are Never Overwritten When `force` Is Absent
  - **IMPORTANT**: Follow observation-first methodology — observe `loadRootEnv` behavior on unfixed code for non-buggy inputs before writing assertions
  - Observe: `loadRootEnv({ targetEnv: "staging" })` with `NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co` already set → URL unchanged (key is protected)
  - Observe: `loadRootEnv({ targetEnv: "dev" })` with `CI=true` and explicit Supabase vars → CI vars not overwritten
  - Observe: `loadRootEnv()` with no options on a clean `process.env` → URL becomes `http://127.0.0.1:54321` (existing behavior)
  - Write property-based test: for all arbitrary `process.env` snapshots (random string values for `NEXT_PUBLIC_SUPABASE_URL`), calling `loadRootEnv({ targetEnv: "dev" })` without `force` NEVER overwrites a key that was present before the call (from Preservation Requirements in design)
  - Use `fast-check` (install if not present) to generate random URL strings as the pre-existing value
  - Verify tests PASS on UNFIXED code — **EXPECTED OUTCOME**: Tests PASS (confirms baseline preservation behavior)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix: `pnpm dev` always loads local Supabase URL
  - [ ] 3.1 Add `force` option to `loadRootEnv` in `scripts/load-root-env.js`
    - Add `const force = options.force === true;` after the `targetEnv` line
    - Change the `loadEnvFile` call for the target env file from `(key) => !protectedKeys.has(key)` to `(key) => force || !protectedKeys.has(key)`
    - Leave the `.env.example` defaults call and secret resolution unchanged (force only affects step 2)
    - Update the JSDoc `@param` block to document the new `force` option
    - _Bug_Condition: `isBugCondition(X)` where `X.command = "dev"` AND `X.shellEnv[NEXT_PUBLIC_SUPABASE_URL] ≠ "http://127.0.0.1:54321"`_
    - _Expected_Behavior: `loadRootEnv({ targetEnv: "dev", force: true })` overwrites `NEXT_PUBLIC_SUPABASE_URL` to `"http://127.0.0.1:54321"` regardless of prior shell state_
    - _Preservation: callers that do NOT pass `force: true` are completely unaffected — `protectedKeys` semantics unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.4_

  - [ ] 3.2 Create `scripts/dev.mjs` wrapper script
    - Create new file `candystore/scripts/dev.mjs` mirroring the pattern in `site-up.mjs`
    - Import `loadRootEnv` via `createRequire` and call `loadRootEnv({ targetEnv: "dev", force: true })` before spawning Turbo
    - Spawn `pnpm turbo dev` (cross-platform: `pnpm.cmd` on Windows, `pnpm` elsewhere) with `stdio: "inherit"` and `env: process.env`
    - Forward the child process exit code via `child.on("exit", (code) => process.exit(code ?? 0))`
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Update `package.json` dev script
    - Change `"dev": "turbo dev"` to `"dev": "node scripts/dev.mjs"` in `candystore/package.json`
    - _Requirements: 2.1, 2.3_

  - [ ] 3.4 Add `TARGET_ENV` to `turbo.json` dev task env array
    - Add `"env": ["TARGET_ENV"]` to the `"dev"` task in `candystore/turbo.json`
    - _Requirements: 2.4_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stale Supabase URL Overwritten by `pnpm dev`
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `loadRootEnv({ targetEnv: "dev", force: true })` must overwrite a stale URL
    - Run bug condition exploration test from step 1 on the FIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms the bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Keys Are Never Overwritten When `force` Is Absent
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 on the FIXED code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — callers without `force` are unaffected)
    - Confirm all tests still pass after fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite (`pnpm test` from the repo root or the relevant package)
  - Verify the static config assertion: `turbo.json` `dev` task `env` array contains `"TARGET_ENV"`
  - Verify `scripts/dev.mjs` exists and calls `loadRootEnv` before spawning Turbo
  - Ensure all tests pass; ask the user if questions arise
