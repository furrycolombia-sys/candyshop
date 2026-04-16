# Bugfix Requirements Document

## Introduction

When a developer runs `pnpm dev` directly (which invokes `turbo dev`), the Next.js apps connect to the wrong Supabase instance — typically a cloud or staging URL — instead of the local dev instance at `http://127.0.0.1:54321`. This causes auth failures, data mismatches, and confusing behaviour during local development.

The root cause is that `pnpm dev` bypasses the `loadRootEnv()` call that normally sets `NEXT_PUBLIC_SUPABASE_URL` (and related vars) from `.env.dev`. Each app's `next.config.ts` does call `loadRootEnv()`, but by that point `process.env` may already contain values from a prior environment (e.g. a stale shell export or a previously loaded `.env.prod`/`.env.staging`), and `loadRootEnv()` deliberately does **not** overwrite keys that are already present in `process.env`. Additionally, Turbo's `dev` task declares no `env` passthrough for `TARGET_ENV`, so even a correctly set shell variable is not reliably forwarded to child processes.

`pnpm dev:up` is unaffected because `scripts/site-up.mjs` calls `loadRootEnv()` before spawning `pnpm dev`, populating `process.env` with the correct dev values before Turbo or Next.js start.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a developer runs `pnpm dev` (i.e. `turbo dev`) without first running `pnpm dev:up`, THEN the apps use whatever `NEXT_PUBLIC_SUPABASE_URL` value is already present in the shell environment (which may be a staging or production URL) instead of `http://127.0.0.1:54321`

1.2 WHEN `NEXT_PUBLIC_SUPABASE_URL` (or `TARGET_ENV`) is exported in the shell from a previous session or CI run, THEN `loadRootEnv()` inside `next.config.ts` does not overwrite it, so the stale value persists into the running app

1.3 WHEN `TARGET_ENV` is not set in the shell and `pnpm dev` is run, THEN `loadRootEnv()` defaults to `dev` and loads `.env.dev`, but any `NEXT_PUBLIC_*` vars already in `process.env` are protected and not replaced, leaving stale cloud URLs intact

1.4 WHEN Turbo runs the `dev` task, THEN `TARGET_ENV` is not listed in the task's `env` array in `turbo.json`, so Turbo does not guarantee the variable is forwarded to child Next.js processes

### Expected Behavior (Correct)

2.1 WHEN a developer runs `pnpm dev` from a clean shell (no stale env vars), THEN the apps SHALL connect to the local Supabase instance at `http://127.0.0.1:54321`

2.2 WHEN `NEXT_PUBLIC_SUPABASE_URL` or `TARGET_ENV` is already set in the shell to a non-dev value, THEN running `pnpm dev` SHALL still result in apps using the local dev Supabase URL (`http://127.0.0.1:54321`), not the stale value

2.3 WHEN `pnpm dev` is run, THEN `TARGET_ENV` SHALL be treated as `dev` and the correct `.env.dev` values SHALL be applied to all apps regardless of prior shell state

2.4 WHEN Turbo runs the `dev` task, THEN `TARGET_ENV` SHALL be available to all child processes so that `loadRootEnv()` in each `next.config.ts` resolves the correct environment file

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `pnpm dev:up` is used to start the dev environment, THEN the system SHALL CONTINUE TO load `.env.dev` correctly and connect apps to the local Supabase instance

3.2 WHEN `pnpm staging` or `pnpm staging:*` scripts are run with `TARGET_ENV=staging`, THEN the system SHALL CONTINUE TO load `.env.staging` and use the staging Supabase URL

3.3 WHEN `pnpm build` or `turbo build` is run in CI with `TARGET_ENV` set explicitly, THEN the system SHALL CONTINUE TO respect the explicitly provided `TARGET_ENV` value

3.4 WHEN `process.env` already contains a key that was set by the CI system or an explicit CLI export, THEN `loadRootEnv()` SHALL CONTINUE TO treat those values as protected and not overwrite them (existing precedence rules are preserved)

3.5 WHEN `pnpm dev:up:tunnel` is run, THEN the system SHALL CONTINUE TO start the Cloudflare tunnel alongside the dev apps using the correct dev environment

---

## Bug Condition

**Bug Condition Function:**

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type DevStartContext
         X.command        — the npm script invoked (e.g. "dev" or "dev:up")
         X.shellEnv       — snapshot of process.env at the time the command runs
  OUTPUT: boolean

  // Bug triggers when pnpm dev is run directly AND stale/wrong Supabase vars exist
  RETURN X.command = "dev"
     AND (X.shellEnv contains NEXT_PUBLIC_SUPABASE_URL ≠ "http://127.0.0.1:54321"
          OR X.shellEnv does not contain TARGET_ENV forwarded by Turbo)
END FUNCTION
```

**Fix Checking Property:**

```pascal
// Property: Fix Checking — dev always uses local Supabase
FOR ALL X WHERE isBugCondition(X) DO
  result ← resolvedSupabaseUrl(X)   // NEXT_PUBLIC_SUPABASE_URL seen by the app
  ASSERT result = "http://127.0.0.1:54321"
END FOR
```

**Preservation Checking Property:**

```pascal
// Property: Preservation — non-dev commands are unaffected
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT resolvedSupabaseUrl(F(X)) = resolvedSupabaseUrl(F'(X))
END FOR
```
