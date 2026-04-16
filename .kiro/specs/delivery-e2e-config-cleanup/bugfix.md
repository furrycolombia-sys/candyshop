# Bugfix Requirements Document

## Introduction

The delivery and E2E configuration layer of the `candystore` monorepo has grown into an unmaintainable tangle of overlapping scripts, env files, and Docker Compose definitions. The topology abstraction (`APPS_MODE` / `SUPABASE_MODE` / `TUNNEL_MODE`) was intended to unify three deployment scenarios but instead produced three compose files, five env files, three launcher scripts, and a custom env-loader that every script and every `next.config.ts` must import. The result is that no single file tells you what runs what, secrets resolution is implicit, and adding or changing a scenario requires touching six or more files simultaneously.

This cleanup replaces the entire delivery and E2E layer with a minimal, explicit, and self-documenting set of files — one compose file per scenario, one env file per environment, and one script per job — while leaving all source code, migrations, and existing specs untouched.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a developer wants to start the local dev environment THEN the system requires running `scripts/site-up.mjs`, which internally calls `load-root-env.js`, resolves `$secret:` references from a `.secrets` file, starts Supabase via a pnpm wrapper, and spawns `pnpm dev` — with no single entry point that documents what it does or why.

1.2 WHEN a developer wants to run E2E tests THEN the system requires `scripts/e2e-docker.mjs` to read `APPS_MODE`, `SUPABASE_MODE`, and `TUNNEL_MODE` from the loaded env file, then dynamically select one of three compose files (`compose.yml`, `compose.e2e.yml`, `compose.staging.yml`) based on those values — making it impossible to know which compose file will be used without tracing the script logic.

1.3 WHEN a developer wants to start the staging Docker stack THEN the system requires `scripts/site-prod.mjs`, which duplicates the compose-file-selection logic from `e2e-docker.mjs` and re-implements the same `SUPABASE_MODE`-to-compose-file mapping independently.

1.4 WHEN a developer adds a new environment variable to the build THEN the system requires updating it in `Dockerfile` (as `ARG` and `ENV`), `docker/compose.yml`, `docker/compose.e2e.yml`, `docker/compose.staging.yml`, `scripts/site-prod.mjs` (the `buildArgEnvKeys` array), and `.env.example` — six locations for one variable.

1.5 WHEN a developer reads `.env.e2e` THEN the system provides `APPS_MODE=docker`, `SUPABASE_MODE=isolated`, and `TUNNEL_MODE=none` as topology switches, but these values are only meaningful to `e2e-docker.mjs`; any other script or tool that reads the env file silently ignores them, creating a false impression that they control global behavior.

1.6 WHEN `load-root-env.js` is called from a `next.config.ts` inside a Docker build THEN the system attempts to read `.secrets` from the filesystem, requiring `CI=true` to be set to suppress the error — a non-obvious coupling between the build environment and the secret-resolution logic.

1.7 WHEN a developer inspects `docker/compose.staging.yml` THEN the system presents a 300-line file containing the full Supabase stack (Kong, GoTrue, PostgREST, Realtime, Storage, imgproxy, pg-meta, Analytics/Logflare, Studio, Inbucket) with no separation between "what is the app" and "what is the Supabase infrastructure", making it hard to update one without accidentally breaking the other.

1.8 WHEN a developer runs `pnpm test:e2e` THEN the system silently selects `compose.e2e.yml` because `SUPABASE_MODE=isolated` is set in `.env.e2e`, but there is no validation that the correct compose file was chosen — a wrong value in the env file causes a silent wrong-compose-file selection with no error.

1.9 WHEN a developer looks at the root `package.json` scripts THEN the system exposes `staging`, `staging:fresh`, `staging:tunnel`, `staging:stop`, `staging:public`, `staging:public:fresh`, `staging:public:stop`, `test:e2e`, `test:e2e:headed`, `test:e2e:ui`, `test:e2e:debug`, `test:e2e:build`, `test:e2e:rebuild`, `test:e2e:down`, and `smoke` — 15 delivery/E2E scripts with overlapping responsibilities and no grouping or documentation.

1.10 WHEN a developer needs to understand the full env-loading precedence THEN the system requires reading the comment headers of `.env.example`, `load-root-env.js`, and each `next.config.ts` independently, as no single document describes the complete chain.

---

### Expected Behavior (Correct)

2.1 WHEN a developer wants to start the local dev environment THEN the system SHALL provide a single documented command (`pnpm dev:up`) backed by a script whose only job is: start Supabase, then start `pnpm dev` — with inline comments explaining each step.

2.2 WHEN a developer wants to run E2E tests THEN the system SHALL use a dedicated compose file (`docker/compose.e2e.yml`) that is explicitly named in the `pnpm test:e2e` script, with no runtime compose-file selection logic — the file used is always visible in the script definition.

2.3 WHEN a developer wants to start the staging Docker stack THEN the system SHALL use a dedicated compose file (`docker/compose.staging.yml`) that is explicitly named in the `pnpm staging` script, with no shared launcher logic between staging and E2E.

2.4 WHEN a developer adds a new environment variable to the build THEN the system SHALL require updating it in at most two locations: the relevant `.env.<environment>` file and the compose file for that environment — not in scripts, not in multiple compose files.

2.5 WHEN a developer reads any `.env.<environment>` file THEN the system SHALL contain only real configuration values for that environment — no topology switches, no script-control flags, no values that are silently ignored by most consumers.

2.6 WHEN `next.config.ts` needs environment variables at build time THEN the system SHALL read them directly from `process.env` (populated by Docker build args or the shell) without requiring a custom `load-root-env.js` import or `.secrets` file resolution.

2.7 WHEN a developer inspects `docker/compose.staging.yml` THEN the system SHALL present the Supabase infrastructure services in a clearly separated, commented section so that app-level changes and Supabase-level changes are visually distinct.

2.8 WHEN a developer runs `pnpm test:e2e` with a misconfigured environment THEN the system SHALL fail fast with an explicit error message identifying the missing or invalid configuration before attempting to build or start any container.

2.9 WHEN a developer looks at the root `package.json` scripts THEN the system SHALL expose no more than one script per distinct job (dev, staging up, staging stop, e2e run, e2e teardown, smoke) with names that directly describe what they do.

2.10 WHEN a developer needs to understand the full env-loading chain THEN the system SHALL provide a single `docs/delivery.md` (or equivalent inline README) that describes every env file, every compose file, every script, and the exact precedence order in one place.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN all apps are built for Docker deployment THEN the system SHALL CONTINUE TO produce a single multi-app container image with nginx routing all seven apps (`store`, `studio`, `landing`, `payments`, `admin`, `auth`, `playground`) under their respective base paths.

3.2 WHEN E2E tests run against the isolated Supabase instance THEN the system SHALL CONTINUE TO start a separate Supabase CLI project (`supabase-e2e/`) on port 64321, isolated from the local dev Supabase instance on port 54321.

3.3 WHEN the staging stack starts THEN the system SHALL CONTINUE TO bring up the full Supabase Docker stack (Postgres, GoTrue, PostgREST, Realtime, Storage, Kong) alongside the app container.

3.4 WHEN `NEXT_PUBLIC_*` variables are needed at build time THEN the system SHALL CONTINUE TO pass them as Docker build args so they are baked into the Next.js static output.

3.5 WHEN server-side API routes inside the Docker container call Supabase THEN the system SHALL CONTINUE TO use an internal Docker network URL (`SUPABASE_URL_INTERNAL`) rather than the public-facing URL, so requests stay within the Docker network.

3.6 WHEN a Cloudflare tunnel is needed for public access THEN the system SHALL CONTINUE TO support running `cloudflared` as a Docker Compose sidecar service alongside the app container.

3.7 WHEN the E2E test suite runs THEN the system SHALL CONTINUE TO execute the same set of Playwright spec files (`auth-session`, `checkout-stock-integrity`, `full-purchase-flow`, `google-login`, `mobile-layout`, `permission-management`, `smoke-all-apps`) against the containerized app.

3.8 WHEN `supabase/migrations/` and `supabase/seed.sql` exist THEN the system SHALL CONTINUE TO apply them automatically on first start of any environment that uses a fresh Postgres volume.

3.9 WHEN `config/app-links.json` defines app paths and dev URLs THEN the system SHALL CONTINUE TO be the single source of truth for cross-app navigation URLs, consumed by whatever URL-resolution mechanism replaces `app-url-resolver.js`.

3.10 WHEN the production deployment runs on the remote server THEN the system SHALL CONTINUE TO be triggerable via `pnpm prod:deploy` (SSH + remote deploy script) without requiring changes to the server-side setup.

---

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type DeliveryConfigState
  OUTPUT: boolean

  // The bug condition is met when the delivery/E2E config layer
  // requires a developer to trace through multiple scripts, env files,
  // and compose files to understand or change a single deployment scenario.
  RETURN (
    X.composFileSelectedAtRuntime = true        // compose file chosen by script logic, not by script name
    OR X.envLoadingRequiresCustomLoader = true  // next.config.ts imports load-root-env.js
    OR X.topologyVarsInEnvFile = true           // APPS_MODE/SUPABASE_MODE/TUNNEL_MODE in .env files
    OR X.singleVarRequiresN_FileEdits(N > 2)    // adding one env var touches >2 files
  )
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← cleanConfig'(X)
  ASSERT result.composeFileIsExplicitInScript = true
  AND result.envFilesContainOnlyValues = true
  AND result.singleVarEditCount <= 2
  AND result.nextConfigReadsProcessEnvDirectly = true
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT cleanConfig(X) = cleanConfig'(X)
  // All working deployment scenarios (local dev, E2E, staging, prod)
  // produce identical runtime behavior before and after the cleanup.
END FOR
```
