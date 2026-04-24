# Task Overview: GH-188

## Issue Details

| Field        | Value                                                     |
| ------------ | --------------------------------------------------------- |
| **Issue**    | #188                                                      |
| **Title**    | perf(ci): reduce deploy time from 26+ min to under 10 min |
| **Type**     | feat (enhancement)                                        |
| **Labels**   | enhancement                                               |
| **Assignee** | —                                                         |
| **Created**  | 2026-04-24                                                |
| **URL**      | https://github.com/furrycolombia-sys/candyshop/issues/188 |

## Description

End-to-end deploy time regularly exceeds **26 minutes** — from merging a PR to the new
version running in production. The target is under 10 minutes. Root causes are fully
identified.

## Measured Baseline

| Job                                                    | Duration         |
| ------------------------------------------------------ | ---------------- |
| CI (parallel: quality + unit-tests + build + e2e)      | ~279s (~4.6 min) |
| `deploy-production` → `ci-gate` job                    | ~367s (~6 min)   |
| `deploy-production` → `deploy` job (server-side build) | up to 25 min     |
| **Total worst case**                                   | **~31 min**      |

## Root Causes & Fixes (Priority Order)

### 1. Remove `ci-gate` job (saves ~6 min)

`deploy-production.yml` runs a full duplicate of CI (install + typecheck + lint + test + build) after merging to `main`. Since PRs must pass CI before merge, this is pure redundancy.
**Fix:** Delete the `ci-gate` job entirely.

### 2. Transfer build artifacts to VPS instead of building on server (saves ~25 min)

`deploy-production.sh` runs `pnpm build` on the production VPS — slow on low-resource hardware. The CI `build` job already produces `.next` artifacts.
**Fix:** `rsync`/`scp` pre-built `.next` artifacts from CI runner to VPS; server only runs `pnpm install --prod` + `pm2 reload`.

### 3. Remove E2E double-build (saves ~60–90s per CI run)

`e2e-tests` job downloads build artifacts then immediately runs another full `pnpm build`.
**Fix:** Remove the redundant "Rebuild E2E apps locally" step; use downloaded artifacts directly.

### 4. Add `.next` build cache (incremental improvement)

No build cache between CI runs — every run is cold.
**Fix:** Add `actions/cache@v4` for `.next/cache` keyed on `pnpm-lock.yaml` + source hashes.

### 5. Cache Playwright browsers in `e2e-tests` (saves ~60s)

Chromium downloaded fresh every run. `docker-smoke-tests` already caches it correctly.
**Fix:** Apply the same Playwright cache pattern to `e2e-tests`.

### 6. Shared pnpm install (lowest priority)

`pnpm install` runs in 5 parallel jobs independently.
**Fix:** Shared `setup` job or pre-warm pnpm store cache.

## Expected Outcome After Fixes

| Bottleneck         | Before        | After                  |
| ------------------ | ------------- | ---------------------- |
| `ci-gate`          | ~6 min        | 0 min (removed)        |
| Server-side build  | up to 25 min  | ~1 min (rsync)         |
| E2E double-build   | 2×            | removed                |
| `.next` cache      | cold          | warm on unchanged deps |
| Playwright install | ~60s uncached | cached                 |
| **Total target**   | **26–31 min** | **< 8 min**            |

## Acceptance Criteria

- [ ] Deploy time from PR merge to production is consistently under 10 minutes
- [ ] `ci-gate` job removed from `deploy-production.yml`
- [ ] Server-side build eliminated — VPS receives pre-built `.next` artifacts
- [ ] E2E double-build removed from `ci.yml`
- [ ] `.next` build cache added to `ci.yml`
- [ ] Playwright browser cache added to `e2e-tests` job
- [ ] All existing CI checks still pass
- [ ] Production deploy still works correctly
