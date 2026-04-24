# Analysis: GH-188

## Branch Context

| Field         | Value                            |
| ------------- | -------------------------------- |
| **Branch**    | `feat/GH-188_Reduce-Deploy-Time` |
| **Type**      | `feat` (enhancement)             |
| **Source**    | `develop`                        |
| **PR Target** | `develop`                        |

## Relevant Files

| File                                      | Purpose                                                        | Action Needed                          |
| ----------------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| `.github/workflows/deploy-production.yml` | Triggers on push to `main`; contains `ci-gate` + `deploy` jobs | Rewrite                                |
| `.github/workflows/ci.yml`                | PR CI — quality, unit-tests, build, e2e-tests, bundle-analysis | Fix E2E double-build + add caches      |
| `scripts/deploy-production.sh`            | Server-side deploy script — currently runs `pnpm build` on VPS | Rewrite to receive pre-built artifacts |

## Deep-Dive: What Each Fix Touches

---

### Fix 1 — Remove `ci-gate` (deploy-production.yml lines 27–74)

The `ci-gate` job runs:

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build` (with STANDALONE=true + prod secrets)

Since only `release/*` or `fix/*` PRs can target `main`, and those PRs must pass `ci.yml` before merge, this is pure duplication.

**Also noticed:** `ci-gate` uses Node **20** while `ci.yml` uses Node **24** — a version inconsistency.

**Action:** Delete entire `ci-gate` job. Update `deploy` job's `needs:` to remove the dependency. Update `notify-failure` job's `needs:` and `if:` condition.

---

### Fix 2 — Transfer pre-built artifacts to server (biggest win)

**Current flow:**

```
deploy-production.yml deploy job
  → copies deploy-production.sh to server via SSH
  → server runs: git pull + pnpm install + pnpm build (on slow VPS) + pm2 reload
```

**New flow:**

```
deploy-production.yml
  → new "build" job: install + pnpm build (STANDALONE=true, prod secrets)
  → new "transfer" step in deploy job: rsync .next/standalone dirs to VPS
  → server runs: (no build) → pm2 reload (fast)
```

**Key implementation points:**

1. **SSH + rsync is already plumbed** — the `deploy` job already installs `cloudflared`, sets up SSH keys, and has host/user secrets. Adding an `rsync` step is straightforward.

2. **Standalone builds are self-contained** — `.next/standalone` includes all runtime Node.js deps. Server only needs to:
   - Receive the standalone dir via rsync
   - Copy static assets (`apps/<app>/.next/static → standalone/apps/<app>/.next/static`)
   - Copy public dirs (`apps/<app>/public → standalone/apps/<app>/public`)
   - `pm2 restart candyshop-<app>` (or `pm2 reload`)

3. **Runtime env vars** — `NEXT_PUBLIC_*` are baked at build time (done in CI). Non-public vars (`SUPABASE_SERVICE_ROLE_KEY`, Telegram tokens) must be passed to PM2 at runtime. Currently the deploy script sources the env file before building — with artifact transfer, we write these to a `.env.production.local` on the server and configure PM2 to read them.

4. **The env file write step** (`Write ephemeral env file on server`) already exists in the deploy job — we just need to ensure PM2 picks up the runtime vars. The simplest way: write the non-NEXT_PUBLIC vars to `.env.production.local` in the standalone dir.

5. **Nginx config and health check** — these remain on the server-side script but are fast (seconds).

**Modified `deploy-production.sh` scope after fix:**

- Remove: `pnpm install`, `pnpm run build`, Turborepo cache clear
- Keep: PM2 restart, static asset copying, Nginx config, health check, warm-up
- Add: Acceptance of pre-built artifacts path

---

### Fix 3 — Remove E2E double-build (ci.yml lines 486–532)

The `e2e-tests` job:

1. Downloads build artifacts (store, admin, auth, landing, payments) — lines 451–484
2. Then immediately runs "Rebuild E2E apps locally" — lines 486–532

The rebuild step is a full `pnpm --filter <APP> build` for each changed app. This defeats the purpose of uploading/downloading artifacts.

**Why does it exist?** Likely added as a workaround when artifact download alone wasn't sufficient (e.g., missing env bake, or `.next/standalone` vs regular `.next` mismatch).

**Action:** Delete the "Rebuild E2E apps locally" step entirely. The `e2e-tests` already runs with `next start` (E2E Playwright config), which reads `.next` directly — the downloaded artifacts are sufficient.

**Risk:** If E2E tests use features that require a fresh build (unlikely), this could break. Verify by checking if downloaded artifacts match what `next start` needs.

---

### Fix 4 — Add `.next` build cache to `build` job (ci.yml)

The `docker-smoke-tests` job already has a Playwright cache pattern (lines 669–678). The `build` job has no cache.

**Cache key pattern (from issue):**

```yaml
- uses: actions/cache@v4
  with:
    path: apps/*/next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('apps/**/*.ts', 'apps/**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('pnpm-lock.yaml') }}-
      ${{ runner.os }}-nextjs-
```

**Note:** The correct path for Next.js build cache is `apps/*/.next/cache` (not `apps/*/next/cache` as written in the issue — slight typo).

Place this step immediately after "Install dependencies" in the `build` job.

---

### Fix 5 — Cache Playwright browsers in `e2e-tests` (ci.yml)

The `docker-smoke-tests` job already caches Playwright (lines 669–686):

```yaml
- name: Get Playwright version
  id: playwright-version
  run: echo "version=$(pnpm --filter store list @playwright/test --json | jq -r '.[0].devDependencies["@playwright/test"].version')" >> $GITHUB_OUTPUT

- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: pnpm --filter store exec playwright install --with-deps chromium

- name: Install Playwright dependencies (if cached)
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: pnpm --filter store exec playwright install-deps
```

The `e2e-tests` job currently has only:

```yaml
- name: Install Playwright browsers
  run: pnpm --filter store exec playwright install --with-deps chromium
```

**Action:** Replace the single step with the full 4-step pattern from `docker-smoke-tests`.

---

## Requirements Analysis

| Requirement                   | Existing Support                     | Gap/Action                                      |
| ----------------------------- | ------------------------------------ | ----------------------------------------------- |
| Remove ci-gate                | Exists (job to delete)               | Delete `ci-gate` job, update dependents         |
| Build prod artifacts in CI    | ci-gate already does prod build      | Move build to standalone job in deploy workflow |
| Transfer artifacts to VPS     | SSH already configured               | Add rsync step + rewrite deploy.sh              |
| Remove E2E double-build       | Rebuild step exists and runs         | Delete "Rebuild E2E apps locally" step          |
| `.next` build cache           | Not present                          | Add `actions/cache@v4` to build job             |
| Playwright cache in e2e-tests | Pattern exists in docker-smoke-tests | Copy pattern to e2e-tests job                   |

## Technical Considerations

1. **Standalone output requires `STANDALONE=true` at build time** — the CI build job must set this env var along with all prod `NEXT_PUBLIC_*` secrets.

2. **Runtime-only secrets** (not baked) — `SUPABASE_SERVICE_ROLE_KEY`, Telegram tokens, etc. must reach PM2 processes. Strategy: write them to `.env.production.local` in each app's standalone dir, which Next.js standalone runtime reads automatically.

3. **Artifact size** — `.next/standalone` for 7 apps may be large. Actions artifacts have a 5GB limit per run. Should be fine but worth monitoring.

4. **The `studio` app** — The build job in `ci.yml` does not include `studio` in its upload steps. Need to check if `deploy-production.sh` builds studio and include it.

5. **`notify-failure` job update** — currently `needs: [ci-gate, deploy]`. After removing `ci-gate`, update to `needs: [build, deploy]` (or just `needs: [deploy]`).

6. **`pnpm install` on server** — After artifact transfer, the server may still need `pnpm install --prod` for any server-side scripts that aren't bundled. For pure standalone, this is not needed. The Nginx config and PM2 watcher steps don't require pnpm.

## Implementation Summary

### Files to Modify

- `.github/workflows/deploy-production.yml` — Delete `ci-gate`, add `build` job with standalone prod build + artifact upload, add rsync transfer in `deploy` job
- `.github/workflows/ci.yml` — Delete "Rebuild E2E apps locally" step, add `.next` cache to `build` job, add Playwright cache to `e2e-tests` job
- `scripts/deploy-production.sh` — Remove `pnpm install` + `pnpm build` + Turborepo clear; add logic to receive rsync'd artifacts and copy static assets; keep PM2 restart, Nginx, health check, warm-up

### Implementation Order (matches priority in issue)

1. `deploy-production.yml`: Remove `ci-gate` → update `deploy.needs` → update `notify-failure`
2. `deploy-production.yml`: Add `build` job → add rsync in `deploy` job
3. `deploy-production.sh`: Rewrite to skip build, receive artifacts, restart PM2
4. `ci.yml`: Delete "Rebuild E2E apps locally" step
5. `ci.yml`: Add `.next` build cache to `build` job
6. `ci.yml`: Add Playwright browser cache to `e2e-tests` job

## Questions/Blockers

- [ ] Does the `studio` app need to be included in the artifact transfer? (It is built in deploy.sh but not in ci.yml artifact uploads — check if studio has E2E tests or just needs the build)
- [ ] What is the rsync path on the VPS? (`/home/furrycolombia/candyshop` = `DEPLOY_DIR`)
- [ ] Should PM2 use `reload` (zero-downtime) or `restart` for the new binaries? (Standalone server.js is a new process start, so `pm2 delete + start` as currently done)
