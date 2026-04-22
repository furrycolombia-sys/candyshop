Fully autonomous E2E test evaluator. Starts all required services, runs Playwright tests, diagnoses failures, optionally fixes production code, and delivers a structured report.

## Usage

```
/e2e-eval [env] [options]
```

**Examples:**

```
/e2e-eval dev
/e2e-eval staging --headed
/e2e-eval dev --app admin --fix
/e2e-eval staging --files apps/admin/e2e/reports.spec.ts
/e2e-eval dev --skip-infra          # services already running, just run tests
/e2e-eval staging --clean --fix     # reset DB, run tests, auto-fix failures
```

## Parameters

| Parameter      | Values                                | Default            | Description                                     |
| -------------- | ------------------------------------- | ------------------ | ----------------------------------------------- |
| `env`          | `dev` \| `staging`                    | `dev`              | Target environment                              |
| `--headed`     | flag                                  | off                | Show browser window                             |
| `--app`        | `auth` \| `admin` \| `store` \| `all` | `all`              | Which app suite(s) to run                       |
| `--fix`        | flag                                  | off                | Auto-fix production code when tests fail        |
| `--files`      | path(s) or pattern                    | all specs          | Restrict to specific test files                 |
| `--skip-infra` | flag                                  | off                | Skip service startup (assume already running)   |
| `--clean`      | flag                                  | off                | Reset Supabase DB before running                |
| `--retries`    | integer                               | `1`                | Re-run each failure N times for flaky detection |
| `--timeout`    | ms                                    | Playwright default | Override per-test timeout                       |

## Behavior

Runs fully unattended across 6 phases:

1. **Env var pre-flight** — validates required variables before touching anything
2. **Preflight checks** — Playwright browsers, Docker, cloudflared (skipped with `--skip-infra`)
3. **Infrastructure** — Supabase, dev servers or Docker+tunnel (skipped with `--skip-infra`)
4. **Run tests** — collects full output and artifact paths
5. **Analyze failures** — retries each failure for flaky detection, then classifies: Flaky / Infrastructure / Code bug / Test data bug / Test bug
6. **Fix + regression check** — if `--fix`: applies minimal code fixes, re-runs failing tests, then runs full suite to catch regressions
7. **Report** — includes artifact paths (screenshot, trace) for every failure

The only non-unattended case: when a **test file itself** appears to have a bug, the skill stops and asks before changing any test code.

## Report Location

Reports saved to: `.ai-context/reports/e2e-eval-{timestamp}.md`

## Full Skill Reference

See `.claude/skills/e2e-eval/SKILL.md` for complete documentation.
