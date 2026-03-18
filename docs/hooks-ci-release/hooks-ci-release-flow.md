# Hooks, CI & Release Flow

> Complete flow documentation of quality gates from commit to production.
> Source files: `.husky/pre-commit`, `.husky/pre-push`, `.github/workflows/*.yml`, `package.json`

---

## Overview

```
Developer Workstation                    GitHub                         Azure
========================    ==============================    ==================

 git commit                  PR Created / Updated               Deploy
    |                            |                                |
    v                            v                                v
[Pre-Commit Hook]           [PR Checks]                    [Container Apps]
 category-aware checks        branch rules, security           Docker build
 scoped to staged files       a11y, visual                     + ACR push
    |                            |
    v                            |
 git push                   [CI Pipeline]
    |                         7 jobs, docs-only skip
    v                         4 parallel after changes
[Pre-Push Hook]              next start for E2E
 change detection                |
 sequential execution            v
 error-aware cleanup        [Release Workflow]
                              release.yml (on merge to main)
                                 |
                                 v
                            [Deployment]
                              deploy-combined.yml (on push to develop)
```

---

## 1. Pre-Commit Hook (`.husky/pre-commit`)

Runs on every `git commit`. Blocks commit on failure. **Category-aware**: detects staged file types and only runs relevant checks.

### Flow

```
git commit
    |
    v
[Detect staged files: git diff --cached --name-only]
    |
    +-- No staged files? --> Exit 0 (skip all checks)
    |
    v
[Categorize staged files]
    |
    +-- HAS_CODE:      *.ts, *.tsx, *.js, *.jsx
    +-- HAS_CSS:       *.css
    +-- HAS_WORKSPACE: package.json, pnpm-workspace.yaml,
    |                  pnpm-lock.yaml, .npmrc
    +-- HAS_TEXT:      *.ts, *.tsx, *.js, *.jsx, *.json,
                       *.md, *.css, *.yaml, *.yml
    |
    v
[ALWAYS: lint-staged (scoped to staged files)]
    |     - *.{ts,tsx,js,jsx}: prettier --write + secretlint
    |     - *.{json,md,css}: prettier --write
    |
    v
[IF HAS_WORKSPACE: Workspace manifest checks]
    |     - pnpm install --frozen-lockfile
    |     - pnpm sherif (monorepo structure)
    |     - pnpm syncpack:list (dep version mismatches)
    |
    v
[IF HAS_CODE: Code quality checks]
    |     - pnpm lint (ESLint - all apps + packages)
    |     - pnpm ls-lint (filename conventions)
    |     - pnpm knip (unused deps/exports)
    |     - pnpm jscpd (code duplication)
    |     - pnpm madge (circular dependencies)
    |     - [CONDITIONAL: semgrep installed?]
    |         NO  --> EXIT 1 "Install semgrep"
    |         YES --> pnpm semgrep (SAST via Docker)
    |
    v
[IF HAS_CSS: CSS checks]
    |     - pnpm stylelint (CSS quality)
    |     - pnpm css-sync (globals.css identical across apps)
    |
    v
[IF HAS_TEXT: Spell check]
    |     - pnpm cspell
    |
    v
All passed? --> Commit proceeds
Any failed? --> Commit blocked
```

### Pre-Commit Tools Summary

| #   | Tool       | What It Checks                      | Category  | Runs When                                    |
| --- | ---------- | ----------------------------------- | --------- | -------------------------------------------- |
| 1   | prettier   | Code formatting                     | Always    | Staged files via lint-staged                 |
| 2   | secretlint | No secrets in code                  | Always    | Staged code files via lint-staged            |
| 3   | pnpm       | Lockfile matches manifests          | Workspace | package.json, lockfile, etc. staged          |
| 4   | sherif     | Monorepo structure consistency      | Workspace | Workspace manifest staged                    |
| 5   | syncpack   | Dependency version consistency      | Workspace | Workspace manifest staged                    |
| 6   | ESLint     | Code quality, patterns, imports     | Code      | .ts/.tsx/.js/.jsx staged                     |
| 7   | ls-lint    | File naming conventions             | Code      | .ts/.tsx/.js/.jsx staged                     |
| 8   | knip       | Unused dependencies and exports     | Code      | .ts/.tsx/.js/.jsx staged                     |
| 9   | jscpd      | Copy-paste / code duplication       | Code      | .ts/.tsx/.js/.jsx staged                     |
| 10  | madge      | Circular dependency detection       | Code      | .ts/.tsx/.js/.jsx staged                     |
| 11  | semgrep    | Security patterns (SAST via Docker) | Code      | .ts/.tsx/.js/.jsx staged + semgrep installed |
| 12  | stylelint  | CSS quality                         | CSS       | .css files staged                            |
| 13  | css-sync   | globals.css identical across apps   | CSS       | .css files staged                            |
| 14  | cspell     | Spelling in code and docs           | Text      | Any text file staged                         |

### Category Detection

The hook uses `git diff --cached --name-only` to detect which file types are staged, then runs only relevant checks:

| Category      | File Pattern                                                                   | Checks Triggered                           |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| **Always**    | Any staged files                                                               | lint-staged (prettier + secretlint)        |
| **Workspace** | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`              | frozen-lockfile, sherif, syncpack          |
| **Code**      | `*.ts`, `*.tsx`, `*.js`, `*.jsx`                                               | lint, ls-lint, knip, jscpd, madge, semgrep |
| **CSS**       | `*.css`                                                                        | stylelint, css-sync                        |
| **Text**      | `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.json`, `*.md`, `*.css`, `*.yaml`, `*.yml` | cspell                                     |

---

## 2. Pre-Push Hook (`.husky/pre-push`)

Runs on every `git push`. Blocks push on failure. Change-aware with sequential execution to avoid resource contention.

### Flow

```
git push
    |
    v
Step 1: CHANGE DETECTION
    |
    +-- Detect base: origin/develop or @{upstream} (fallback)
    +-- git diff --name-only base..HEAD
    +-- Categorize:
    |     Deploy: Dockerfile, docker/*, .dockerignore
    |     Code:   *.ts, *.tsx, *.js, *.jsx
    |
    v
[DECISION: What changed?]
    |
    +-- NEITHER deploy nor code --> Skip all, exit 0
    |
    +-- DEPLOY ONLY (no code changes):
    |     |
    |     v
    |   [Docker PATH discovery - 3 Windows locations]
    |     /c/Program Files/Docker/Docker/resources/bin
    |     $HOME/AppData/Local/Docker/resources/bin
    |     /usr/local/bin
    |     |
    |     v
    |   [CONDITIONAL: docker info running?]
    |     +-- NO: EXIT 1 "Docker not running"
    |     +-- YES: Docker health check FOREGROUND
    |               bash scripts/docker-health-check.sh
    |               Exit with Docker result
    |
    +-- BOTH deploy + code:
    |     |
    |     v
    |   [Docker PATH discovery + docker info check]
    |     +-- Docker not running: EXIT 1
    |     +-- Docker running:
    |           |
    |           +-- Step 1: Code checks FIRST (sequential):
    |           |     pnpm typecheck
    |           |     && pnpm test:coverage
    |           |     && pnpm test:e2e
    |           |     (NO pnpm build - Docker covers compilation)
    |           |
    |           +-- [Code checks passed?]
    |           |     +-- NO: EXIT 1
    |           |     +-- YES: continue to Docker
    |           |
    |           +-- Step 2: Docker health check AFTER code checks:
    |                 bash scripts/docker-health-check.sh
    |                 +-- Docker failed: EXIT 1
    |                 +-- Docker passed: All checks passed
    |
    +-- CODE ONLY (no deploy changes):
          |
          v
        pnpm typecheck
        && pnpm test:coverage
        && pnpm build          <-- included (no Docker to cover it)
        && pnpm test:e2e
        || exit 1
```

### Pre-Push Decision Matrix

| Deploy Changes | Code Changes |    Docker Check     | Build | Tests |
| :------------: | :----------: | :-----------------: | :---: | :---: |
|       No       |      No      |        Skip         | Skip  | Skip  |
|      Yes       |      No      |     Foreground      | Skip  | Skip  |
|       No       |     Yes      |        Skip         |  Run  |  Run  |
|      Yes       |     Yes      | After code checks\* | Skip  |  Run  |

\* Docker runs sequentially after code checks to avoid resource contention. Build skipped because Docker already proves compilation.

### Docker Health Check (`scripts/docker-health-check.sh`)

1. `docker build -t dallas-frontend-test .`
2. `docker run` on random available port
3. Wait for `/health` endpoint (max 60s)
4. Run E2E smoke tests against container
5. Cleanup container on exit

---

## 3. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every PR to `main` or `develop`. Concurrency group cancels previous runs on new push.

### Job Dependency Graph

```
changes (5 min)
    |
    +-- [if docs-only] --> Skip all below
    |
    +---+---+---+  (ALL PARALLEL after changes, if: docs-only == false)
    |   |   |   |
    |   |   |   +-- bundle-analysis (10 min)
    |   |   |         [if: event == pull_request]
    |   |   |         ANALYZE=true pnpm build (web only)
    |   |   |         Upload: bundle report [if: always(), 7-day]
    |   |   |
    |   |   +-- quality (10 min)
    |   |         format:check, lint, typecheck, sherif, syncpack
    |   |
    |   +-- unit-tests (15 min)
    |         Upload: coverage (web + admin + landing) [if: always(), 7-day]
    |
    +-- build (15 min)
    |     env: NEXT_PUBLIC_* baked into artifacts for next start
    |     Upload: .next/ (web + admin + landing) [if-no-files-found: error, 1-day]
    |     |
    |     +-- e2e-tests (30 min) [needs: build]
    |           Uses `next start` (pre-built artifacts, ~2s startup)
    |           All 3 apps run CONCURRENTLY (different ports)
    |             web: port 3000, admin: port 3001, landing: port 3003
    |           [CONDITIONAL: Playwright cache hit?]
    |             HIT  --> playwright install-deps (all 3 apps)
    |             MISS --> playwright install --with-deps (all 3 apps)
    |           Upload: Playwright reports [if: always(), 7-day]
    |           Upload: test results [if: failure(), 7-day]
    |
    +-- docker-smoke-tests (20 min)
          [if: deploy == true]
          [CONDITIONAL: Playwright cache hit?]
            HIT  --> install-deps
            MISS --> install --with-deps
          bash scripts/docker-health-check.sh
```

### CI Quality Checks (Job 2: quality)

| Step | Command              | Purpose             |
| ---- | -------------------- | ------------------- |
| 1    | `pnpm format:check`  | Prettier formatting |
| 2    | `pnpm lint`          | ESLint              |
| 3    | `pnpm typecheck`     | TypeScript          |
| 4    | `pnpm sherif`        | Monorepo structure  |
| 5    | `pnpm syncpack:list` | Dependency versions |

### Change Detection (Job 1: changes)

Uses `dorny/paths-filter@v3`:

| Output      | Paths                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `code`      | `apps/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `eslint.config.*`, `prettier.config.*` |
| `deploy`    | `Dockerfile`, `.dockerignore`, `docker/**`                                                                           |
| `docs-only` | `code == false`                                                                                                      |

---

## 4. PR Checks (`.github/workflows/pr-checks.yml`)

Runs on every PR event (opened, synchronize, reopened). Concurrency per PR number. Separate from CI.

### Jobs

#### Branch Target (CRITICAL)

Validates branch can target the base branch:

| Head Branch |                Base: main                 |       Base: develop       | Base: other |
| ----------- | :---------------------------------------: | :-----------------------: | :---------: |
| `release/*` |                    OK                     | FAIL ("must target main") |     OK      |
| `fix/*`     |                OK (hotfix)                |     OK (regular fix)      |     OK      |
| Other       | FAIL ("only release/fix can target main") |            OK             |     OK      |

#### PR Title

- Conventional commit format: `type(scope): description`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`
- Max 80 characters

#### Changes Detection

Outputs: `web`, `admin`, `landing`, `packages`, `tests`, `e2e`, `docs`, `deps`, `code`, `docs-only`

#### Security (10 min)

- **Skip condition:** `docs-only == true`
- `pnpm audit --audit-level=high`
- `pnpm semgrep` (Docker: Semgrep SAST)
- `pnpm run secretlint`

#### Accessibility (20 min)

- **Skip condition:** `web != true AND packages != true`
- Builds app, then runs `pnpm --filter web run test:a11y`

#### Visual Regression (20 min)

- **Skip condition:** `web != true AND packages != true`
- Builds app, then runs `pnpm --filter web run test:visual`
- Uploads visual diffs on failure (7-day retention)

#### PR Summary (always)

- **Condition:** `if: always()` (runs even if other jobs fail)
- Posts/updates a PR comment with:
  - Areas changed table (web, admin, landing, packages, tests, e2e, docs, deps)
  - TDD reminder (if code changed but no tests modified)
  - Dependency change warning
  - Package change notification
- Creates new comment or updates existing bot comment

---

## 5. Release & Deployment

### Release Flow (`release.yml`)

**Trigger:** PR merged to `main` with `release/` prefix

```
1. Create branch: release/vYYYY.MM.DD.N (from develop)
2. Create PR: release/* --> main
   Title: "chore(release): vYYYY.MM.DD.N"
3. CI + PR Checks run:
   - branch-target: release/* to main = OK
   - pr-title: conventional format = OK
   - All CI jobs pass
4. Manual reviewer approval (required on main)
5. Merge to main (merge commit strategy)
6. release.yml triggers:
   Conditions: merged == true AND startsWith(head, 'release/')
   - Extract version from PR title: regex v\d{4}\.\d{2}\.\d{2}\.\d+
   - [CONDITIONAL: version found?]
     NO  --> ERROR: "Could not extract version"
     YES --> gh release create $VERSION --generate-notes --target main
7. Post-release: sync main back to develop
```

### Deployment Flow (`deploy-combined.yml`)

**Trigger:** Push to `develop` OR `workflow_dispatch`

**Path filter:** `apps/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `Dockerfile`, `docker/**`

```
1. Login to Azure Container Registry (dallasregistry.azurecr.io)
2. Docker build + push
   Tags: :sha + :latest
   Build args:
     NEXT_PUBLIC_API_URL=https://apo-api.igrafxcloud.com
     NEXT_PUBLIC_BUILD_HASH=${{ github.sha }}
3. Azure Login (service principal)
4. Deploy to Azure Container Apps
   App: dallas-frontend-app-2
   Resource Group: golabs-ntt-coop
```

### Hotfix Flow

```
1. Create branch: fix/GH-XXX_Title (from main)
2. Create PR: fix/* --> main
3. CI + PR Checks:
   branch-target: fix/* to main = OK (hotfix)
4. Merge to main
5. Cherry-pick or merge to develop (manual sync)
```

---

## 6. Quality Gate Summary

| Gate            | When                     | Blocks | Checks                                                                           |
| --------------- | ------------------------ | ------ | -------------------------------------------------------------------------------- |
| **Pre-Commit**  | `git commit`             | Commit | Category-aware: lint-staged (always), workspace checks, code quality, CSS, spell |
| **Pre-Push**    | `git push`               | Push   | Typecheck, tests, build, E2E, Docker health (conditional)                        |
| **PR Checks**   | PR opened/updated        | Merge  | Branch rules, title format, security, a11y, visual                               |
| **CI Pipeline** | PR to main/develop       | Merge  | Quality, tests, build, E2E, bundle, Docker smoke                                 |
| **Release**     | Merge release/\* to main | N/A    | Auto-creates GitHub Release with version tag                                     |
| **Deploy**      | Push to develop          | N/A    | Docker build + push to Azure Container Apps                                      |

---

## 7. Artifact Retention

| Artifact           | Produced By           | Condition | Retention |
| ------------------ | --------------------- | --------- | --------- |
| Coverage reports   | CI: unit-tests        | always()  | 7 days    |
| Build artifacts    | CI: build             | always    | 1 day     |
| Playwright reports | CI: e2e-tests         | always()  | 7 days    |
| Test results       | CI: e2e-tests         | failure() | 7 days    |
| Bundle analysis    | CI: bundle-analysis   | always()  | 7 days    |
| Visual diff images | PR: visual-regression | failure() | 7 days    |
