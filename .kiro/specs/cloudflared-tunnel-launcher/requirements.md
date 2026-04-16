# Requirements Document

## Introduction

This feature adds a `scripts/cloudflared.mjs` script that launches one or more named Cloudflare tunnels for the containerized Next.js app. It follows the same `--env <name>` convention as `scripts/docker-build.mjs`, reads tunnel configuration from the active env file, and uses token-based authentication.

Tunnels are declared using a **named pattern**: each tunnel has its own `CLOUDFLARE_TUNNEL_<NAME>_ENABLED` and `CLOUDFLARE_TUNNEL_<NAME>_TOKEN` pair in the env file. Multiple tunnels can be declared and all enabled ones are launched in parallel as detached background processes. The script exits `0` immediately after spawning — it does not wait for tunnels to finish.

The script can be invoked standalone (`pnpm tunnel`) or chained after a successful `docker compose up` via `docker-build.mjs --tunnel`.

---

## Glossary

- **Launcher**: `scripts/cloudflared.mjs` — the new script that manages cloudflared tunnel lifecycle.
- **docker-build Script**: `scripts/docker-build.mjs` — the existing script that builds and optionally starts the Docker container.
- **Named tunnel**: A tunnel identified by `<NAME>` (e.g. `APP`, `SUPABASE`), controlled by the pair `CLOUDFLARE_TUNNEL_<NAME>_ENABLED` and `CLOUDFLARE_TUNNEL_<NAME>_TOKEN`.
- **`CLOUDFLARE_TUNNEL_<NAME>_ENABLED`**: Boolean env var (`"true"` or `"false"`) that controls whether the named tunnel is launched.
- **`CLOUDFLARE_TUNNEL_<NAME>_TOKEN`**: Secret env var holding the Cloudflare tunnel token for `<NAME>`, resolved at runtime by `loadEnv` from a `$secret:` reference (e.g. `$secret:STAGING_CLOUDFLARE_TUNNEL_APP_TOKEN`).
- **Env File**: A `.env.<name>` file loaded by `loadEnv(targetEnv)` from `scripts/load-env.mjs`.
- **cloudflared**: The Cloudflare tunnel daemon binary, expected to be available on `PATH`.

---

## Requirements

### Requirement 1: Standalone tunnel launcher script

**User Story:** As a developer, I want a dedicated script to launch Cloudflare tunnels, so that I can start all tunnels independently of the Docker build workflow.

#### Acceptance Criteria

1. THE Launcher SHALL accept a `--env <name>` CLI flag to select the environment (default: `"prod"`).
2. WHEN `--env <name>` is provided, THE Launcher SHALL call `loadEnv(name)` to populate `process.env` from `.env.<name>`.
3. WHEN `--help` is passed, THE Launcher SHALL print usage instructions and exit with code `0`.
4. WHEN `loadEnv` throws, THE Launcher SHALL print a descriptive error to stderr and exit with code `1`.
5. THE Launcher SHALL print the resolved `targetEnv` to stdout before scanning for tunnels.

---

### Requirement 2: Named tunnel discovery and dispatch

**User Story:** As a developer, I want the script to automatically discover and launch all enabled tunnels from the env file, so that I can declare multiple tunnels without changing the script.

#### Acceptance Criteria

1. AFTER `loadEnv(targetEnv)` runs, THE Launcher SHALL scan `process.env` for all keys matching the pattern `CLOUDFLARE_TUNNEL_<NAME>_ENABLED`.
2. FOR EACH discovered tunnel where `CLOUDFLARE_TUNNEL_<NAME>_ENABLED` is `"true"`, THE Launcher SHALL attempt to launch that tunnel.
3. FOR EACH discovered tunnel where `CLOUDFLARE_TUNNEL_<NAME>_ENABLED` is `"false"`, THE Launcher SHALL skip that tunnel silently.
4. IF `CLOUDFLARE_TUNNEL_<NAME>_ENABLED` is `"true"` and `CLOUDFLARE_TUNNEL_<NAME>_TOKEN` is empty or unset, THEN THE Launcher SHALL print a descriptive error to stderr for that tunnel and skip it — it SHALL NOT exit; other tunnels SHALL continue to be processed.
5. WHEN no tunnels are enabled across all discovered tunnel keys, THE Launcher SHALL print an informational message and exit with code `0`.

---

### Requirement 3: Detached cloudflared subprocess execution

**User Story:** As a developer, I want each tunnel to run as a detached background process so that the launcher exits immediately and does not block the terminal or the calling script.

#### Acceptance Criteria

1. THE Launcher SHALL invoke `cloudflared` for each enabled tunnel via `spawn()` (not `spawnSync`) with `{ detached: true, stdio: 'ignore' }`.
2. THE Launcher SHALL call `.unref()` on each spawned child process so the parent process does not wait for it.
3. AFTER spawning each enabled tunnel, THE Launcher SHALL print `"✓ Tunnel launched: <NAME>"` to stdout.
4. AFTER spawning all enabled tunnels, THE Launcher SHALL exit with code `0` immediately.
5. THE Launcher SHALL pass no additional flags to `cloudflared` beyond `tunnel run --token <TOKEN>`.

---

### Requirement 4: Integration with docker-build.mjs via `--tunnel` flag

**User Story:** As a developer, I want to optionally start all Cloudflare tunnels immediately after the container comes up, so that the full stack is accessible via tunnels in a single command.

#### Acceptance Criteria

1. THE docker-build Script SHALL accept a `--tunnel` CLI flag.
2. WHEN `--tunnel` is passed without `--up`, THE docker-build Script SHALL print a warning that `--tunnel` requires `--up` and exit with code `1`.
3. WHEN `--tunnel` and `--up` are both passed and `docker compose up` succeeds, THE docker-build Script SHALL invoke the Launcher by spawning `node scripts/cloudflared.mjs --env <targetEnv>`.
4. IF the Launcher exits with a non-zero code when invoked from docker-build Script, THEN THE docker-build Script SHALL propagate that exit code.

---

### Requirement 5: `package.json` script entry

**User Story:** As a developer, I want a short `pnpm` command to launch all tunnels, so that I don't have to remember the full `node scripts/...` invocation.

#### Acceptance Criteria

1. THE `package.json` SHALL contain a `"tunnel"` script entry with value `"node scripts/cloudflared.mjs"`.
2. WHEN `pnpm tunnel --env staging` is run, THE Launcher SHALL receive `--env staging` as CLI arguments.

---

### Requirement 6: Correctness and testability

**User Story:** As a developer, I want the launcher logic to be unit-testable with mocked subprocesses, so that CI can verify correct behavior without requiring a live Cloudflare account.

#### Acceptance Criteria

1. THE Launcher SHALL source all configuration exclusively from `process.env` after `loadEnv` runs — no hardcoded tokens or tunnel names.
2. FOR ALL sets of named tunnel env vars, THE Launcher SHALL produce a deterministic set of spawn calls (or no calls) based solely on the env vars present.
3. FOR ALL non-empty strings used as `CLOUDFLARE_TUNNEL_<NAME>_TOKEN`, THE Launcher SHALL pass that exact string as the `--token` argument to `cloudflared` — no truncation, escaping, or transformation.
4. THE Launcher SHALL call `.unref()` on every spawned child process.
5. A per-tunnel token validation error SHALL NOT prevent other enabled tunnels from being launched.

---

### Requirement 7: Tunnel stopper script

**User Story:** As a developer, I want a dedicated script to stop running Cloudflare tunnels, so that I can cleanly terminate background tunnel processes without manually hunting for PIDs.

#### Acceptance Criteria

1. THE project SHALL contain a `scripts/cloudflared-stop.mjs` script.
2. THE `package.json` SHALL contain a `"tunnel:stop"` script entry with value `"node scripts/cloudflared-stop.mjs"`.
3. THE Stopper SHALL accept a `--env <name>` CLI flag (same pattern as the Launcher) to select the environment (default: `"prod"`).
4. WHEN `--env <name>` is provided, THE Stopper SHALL call `loadEnv(name)` to populate `process.env` from `.env.<name>`.
5. AFTER `loadEnv` runs, THE Stopper SHALL scan `process.env` for all keys matching `CLOUDFLARE_TUNNEL_<NAME>_ENABLED`.
6. FOR EACH enabled tunnel, THE Stopper SHALL kill the corresponding `cloudflared` process by matching on the token string used to launch it.
7. WHEN a tunnel process is successfully killed, THE Stopper SHALL print `"✓ Tunnel stopped: <NAME>"` to stdout.
8. WHEN no running process is found for an enabled tunnel, THE Stopper SHALL print a warning to stdout and continue — this is non-fatal.
9. THE Stopper SHALL exit with code `0` after processing all tunnels.

---

### Requirement 8: Env linter exemption for `CLOUDFLARE_TUNNEL_*` keys

**User Story:** As a developer, I want the env linter script to ignore `CLOUDFLARE_TUNNEL_*` keys when checking parity, so that environments with different tunnel configurations don't cause false linter failures.

#### Acceptance Criteria

1. THE `scripts/check-env-parity.mjs` script SHALL skip any key matching the pattern `/^CLOUDFLARE_TUNNEL_/` when building the key map and checking for parity violations.
2. ALL other keys (not matching `/^CLOUDFLARE_TUNNEL_/`) SHALL continue to require parity across all env files — the exemption is scoped exclusively to `CLOUDFLARE_TUNNEL_*` keys.
3. WHEN exempt keys are skipped, THE linter script SHALL print an informational note indicating how many `CLOUDFLARE_TUNNEL_*` keys were skipped (e.g. `"  (N keys with CLOUDFLARE_TUNNEL_* prefix skipped)"`).
4. WHEN no `CLOUDFLARE_TUNNEL_*` keys are present in any env file, THE linter script SHALL behave identically to its current behavior — no output change.
5. THE `package.json` `"lint:env"` script SHALL point to `node scripts/check-env-parity.mjs`.
6. THE `scripts/lint-envs.mjs` file SHALL be deleted — it is superseded by `check-env-parity.mjs`.
