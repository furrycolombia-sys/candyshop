# Implementation Plan: cloudflared-tunnel-launcher

## Overview

Implement the named-tunnel pattern for Cloudflare tunnels: update env files, create the launcher and stopper scripts, wire the launcher into `docker-build.mjs`, update the env parity checker, clean up the old linter, and update `package.json`.

## Tasks

- [x] 1. Update env files to named tunnel pattern
  - In `.env.dev`: remove `CLOUDFLARE_TUNNEL_TOKEN`, `CLOUDFLARED_CONFIG_DIR`, and `TUNNEL_MODE`; add `CLOUDFLARE_TUNNEL_APP_ENABLED=false` and `CLOUDFLARE_TUNNEL_APP_TOKEN=`
  - In `.env.prod`: same removals; add `CLOUDFLARE_TUNNEL_APP_ENABLED=false` and `CLOUDFLARE_TUNNEL_APP_TOKEN=`
  - In `.env.staging`: remove `CLOUDFLARE_TUNNEL_TOKEN`, `CLOUDFLARED_CONFIG_DIR`, and `TUNNEL_MODE`; add `CLOUDFLARE_TUNNEL_APP_ENABLED=true`, `CLOUDFLARE_TUNNEL_APP_TOKEN=$secret:STAGING_CLOUDFLARE_TUNNEL_APP_TOKEN`, `CLOUDFLARE_TUNNEL_SUPABASE_ENABLED=true`, `CLOUDFLARE_TUNNEL_SUPABASE_TOKEN=$secret:STAGING_CLOUDFLARE_TUNNEL_SUPABASE_TOKEN`
  - In `.env.test`: remove the same three keys; add `CLOUDFLARE_TUNNEL_APP_ENABLED=false` and `CLOUDFLARE_TUNNEL_APP_TOKEN=`
  - _Requirements: 8.1, 8.2_

- [x] 2. Update `scripts/check-env-parity.mjs` to exempt `CLOUDFLARE_TUNNEL_*` keys
  - Add `const EXEMPT_PREFIXES = [/^CLOUDFLARE_TUNNEL_/]` and an `isExempt(key)` helper
  - After building `keyMap`, delete exempt keys and count them
  - Print `(N keys with CLOUDFLARE_TUNNEL_* prefix skipped)` when `exemptCount > 0`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.1 Write unit tests for `check-env-parity.mjs` exemption logic in `scripts/__tests__/check-env-parity.test.mjs`
    - `CLOUDFLARE_TUNNEL_*` keys only in some files → passes + prints skip note
    - Non-tunnel key missing from one file → still fails (exemption is scoped)
    - No `CLOUDFLARE_TUNNEL_*` keys present → no skip note printed
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 3. Delete `scripts/lint-envs.mjs`
  - Remove the file — it is fully superseded by `check-env-parity.mjs`
  - _Requirements: 8.6_

- [x] 4. Create `scripts/cloudflared.mjs` — tunnel launcher
  - Parse `--env <name>` (default `"prod"`) and `--help` from `process.argv`
  - On `--help`: print usage and `process.exit(0)`
  - Call `loadEnv(targetEnv)`; on throw: print `ERROR: Failed to load .env.<name>: <message>` to stderr and `process.exit(1)`
  - Print resolved `targetEnv` to stdout
  - Scan `process.env` for keys matching `/^CLOUDFLARE_TUNNEL_(.+)_ENABLED$/`
  - If no keys found: print informational message and `process.exit(0)`
  - For each discovered tunnel:
    - If `ENABLED !== "true"`: skip silently
    - If `ENABLED === "true"` and token is empty/unset: print `ERROR: CLOUDFLARE_TUNNEL_<NAME>_TOKEN is not set — skipping` to stderr; continue (non-fatal)
    - If `ENABLED === "true"` and token is non-empty: `spawn("cloudflared", ["tunnel", "run", "--token", token], { detached: true, stdio: "ignore" })` then `.unref()`; print `✓ Tunnel launched: <NAME>`
  - If no tunnels were enabled: print informational message
  - `process.exit(0)`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.1 Write property test — Property 1: Token passthrough is exact
    - **Property 1: Token passthrough is exact**
    - Generate arbitrary arrays of `{ name, token }` (token non-empty); assert each `spawn` call receives the exact token string as the `--token` argument
    - **Validates: Requirements 2.2, 6.3**

  - [x] 4.2 Write property test — Property 2: Per-tunnel token error is non-fatal
    - **Property 2: Per-tunnel token error is non-fatal**
    - Generate mixed tunnel arrays (some with valid tokens, some with empty tokens); assert spawn called only for valid-token tunnels, stderr contains error for invalid ones, process exits 0
    - **Validates: Requirements 2.4, 6.5**

  - [x] 4.3 Write property test — Property 3: loadEnv error message propagation
    - **Property 3: loadEnv error message propagation**
    - Generate arbitrary error message strings; assert stderr contains the message and exit code is 1
    - **Validates: Requirements 1.4**

  - [x] 4.4 Write property test — Property 4: Spawn count matches enabled tunnels
    - **Property 4: Spawn count matches enabled tunnels**
    - Generate arbitrary arrays of `{ enabled: boolean, token: string }`; assert `spawn` call count equals exactly the count of tunnels where `enabled=true` AND token is non-empty
    - **Validates: Requirements 2.1, 2.2, 2.3, 6.2**

  - [x] 4.5 Write property test — Property 5: unref called on every spawned process
    - **Property 5: unref called on every spawned process**
    - Same generator as Property 4; assert `.unref()` is called exactly once per spawned child process
    - **Validates: Requirements 3.2, 6.4**

  - [x] 4.6 Write unit tests for `cloudflared.mjs` example paths in `scripts/__tests__/cloudflared.test.mjs`
    - `--help` prints usage and exits 0
    - No `CLOUDFLARE_TUNNEL_*_ENABLED` keys found → informational message + exit 0
    - All discovered tunnels have `ENABLED=false` → no spawns + exit 0
    - Single tunnel `ENABLED=true` with valid token → one `spawn` + `.unref()` + exit 0
    - Single tunnel `ENABLED=true` with empty token → stderr error + exit 0 (non-fatal)
    - Two tunnels: one valid, one missing token → one spawn + one stderr error + exit 0
    - _Requirements: 1.3, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create `scripts/cloudflared-stop.mjs` — tunnel stopper
  - Parse `--env <name>` (default `"prod"`) and `--help` from `process.argv`
  - On `--help`: print usage and `process.exit(0)`
  - Call `loadEnv(targetEnv)`; on throw: print `ERROR: Failed to load .env.<name>: <message>` to stderr and `process.exit(1)`
  - Scan `process.env` for keys matching `/^CLOUDFLARE_TUNNEL_(.+)_ENABLED$/`
  - For each tunnel where `ENABLED === "true"`: read the token; run `spawnSync("pkill", ["-f", "cloudflared tunnel run --token " + token], { stdio: "pipe" })`
    - Exit 0 from pkill → print `✓ Tunnel stopped: <NAME>`
    - Exit 1 from pkill (no process found) → print `⚠ No running tunnel found for: <NAME>` (non-fatal)
  - `process.exit(0)`
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 6.1 Write unit tests for `cloudflared-stop.mjs` in `scripts/__tests__/cloudflared-stop.test.mjs`
    - Single enabled tunnel, `pkill` exits 0 → prints `✓ Tunnel stopped: <NAME>` + exits 0
    - Single enabled tunnel, `pkill` exits 1 → prints warning + exits 0 (non-fatal)
    - Two enabled tunnels: one found, one not → one success + one warning + exits 0
    - `loadEnv` throws → stderr error + exits 1
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

- [x] 7. Modify `scripts/docker-build.mjs` to support `--tunnel` flag
  - Parse `--tunnel` from `args`
  - Add guard: if `--tunnel` is set but `--up` is not, print warning to stderr and `process.exit(1)`
  - After successful `docker compose up` and when `--tunnel` is set: `spawnSync("node", ["scripts/cloudflared.mjs", "--env", targetEnv], { stdio: "inherit" })` and propagate exit code
  - Update the `--help` text and summary log to include `--tunnel`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.1 Write property test — Property 6: docker-build propagates launcher exit code exactly
    - **Property 6: docker-build propagates launcher exit code exactly**
    - Generate arbitrary non-zero exit codes (1–255); assert docker-build exits with that exact code when the launcher subprocess returns it
    - **Validates: Requirements 4.4**

  - [x] 7.2 Write unit tests for `--tunnel` flag in `scripts/__tests__/docker-build.test.mjs`
    - `--tunnel` without `--up` → stderr warning + exit 1
    - `--tunnel` + `--up` + launcher exits 0 → docker-build exits 0
    - `--tunnel` + `--up` + no enabled tunnels → launcher exits 0, docker-build exits 0
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Update `package.json` scripts
  - Add `"tunnel": "node scripts/cloudflared.mjs"`
  - Add `"tunnel:stop": "node scripts/cloudflared-stop.mjs"`
  - Change `"lint:env"` value from `"node scripts/lint-envs.mjs"` to `"node scripts/check-env-parity.mjs"`
  - Remove the `"check:env-parity"` alias (consolidate to `"lint:env"`)
  - Update `"precommit"` to reference `pnpm lint:env` instead of `pnpm check:env-parity`
  - _Requirements: 5.1, 5.2, 7.2, 8.5, 8.6_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests live in `scripts/__tests__/` and use `fast-check` (already a dev dependency) with `vitest.config.scripts.js`
- Each property test must include the tag comment `// Feature: cloudflared-tunnel-launcher, Property <N>: <text>`
- `cloudflared.mjs` and `cloudflared-stop.mjs` follow the same flat ESM pattern as `docker-build.mjs` — no classes, no exports
- The stopper uses `pkill -f` (macOS/Linux); Windows support is out of scope per the design
- `TUNNEL_MODE` and `CLOUDFLARED_CONFIG_DIR` are removed from all env files as part of task 1
