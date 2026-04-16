# Bugfix Requirements Document

## Introduction

The E2E test infrastructure across `apps/*/e2e/` and `scripts/` violates the project's single-source-of-truth principle for environment configuration. Instead of reading exclusively from the active `.env.*` file, multiple files fall back to a secondary data source (`getLocalSupabaseEnv()` — which shells out to `supabase status` at runtime), use hardcoded magic strings and numbers, and execute side effects at module load time. This makes E2E tests non-deterministic: their behavior depends on whether local Supabase is running, not on what the env file says. The fix establishes the env file as the sole configuration source and adds a lint rule to prevent regressions.

**Files affected by the audit:**

- `apps/auth/e2e/fixtures/auth.fixture.ts`
- `apps/auth/e2e/helpers/session.ts`
- `apps/store/e2e/auth.setup.ts`
- `apps/store/playwright.config.ts`
- `apps/auth/e2e/mobile-layout.spec.ts` (redundant `loadRootEnv()` call)
- `apps/auth/e2e/helpers/constants.ts` (redundant `loadRootEnv()` call)
- `apps/auth/e2e/checkout-stock-integrity.spec.ts` (inline `buildSharedCookieDomain` duplicates session.ts logic)
- `eslint.config.mjs` (no rule preventing future regressions)

---

## Bug Analysis

### Current Behavior (Defect)

**Bug Group 1 — `getLocalSupabaseEnv()` as a secondary data source**

1.1 WHEN `NEXT_PUBLIC_SUPABASE_URL` is absent or starts with `"YOUR_"` in the env file THEN the system calls `getLocalSupabaseEnv()` (shells out to `supabase status`) and uses its `API_URL` as the Supabase URL, bypassing the env file entirely

1.2 WHEN `SUPABASE_SERVICE_ROLE_KEY` is absent or starts with `"YOUR_"` in the env file THEN the system calls `getLocalSupabaseEnv()` and uses its `SERVICE_ROLE_KEY`, bypassing the env file entirely

1.3 WHEN `getLocalSupabaseEnv()` is called at module load time in `apps/auth/e2e/helpers/session.ts` and `apps/auth/e2e/fixtures/auth.fixture.ts` THEN the resolved Supabase credentials are captured once at import time and cannot reflect env changes made after the module is first loaded

1.4 WHEN `apps/store/playwright.config.ts` calls `getLocalSupabaseEnv()` at module load time THEN the `buildServerEnv()` function injects `localSupabaseEnv.API_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` into the webServer process env, overriding the values already loaded from the env file

**Bug Group 2 — Hardcoded mock session in `auth.fixture.ts`**

1.5 WHEN `SUPABASE_SERVICE_ROLE_KEY` is missing or a placeholder THEN the system injects a hardcoded fake JWT (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`), a hardcoded `"mock-refresh-token"`, a hardcoded user ID `"e2e-mock-user"`, and a hardcoded email `"e2e@test.invalid"` into the browser context, creating a fake session that will be rejected by any real Supabase instance

1.6 WHEN the mock session path is taken THEN the system silently continues test execution with an invalid session instead of failing with a clear error message

**Bug Group 3 — Hardcoded fallback URLs and ports**

1.7 WHEN `NEXT_PUBLIC_SUPABASE_URL` is missing THEN `apps/store/e2e/auth.setup.ts` falls back to the hardcoded string `"http://127.0.0.1:54321"` instead of failing with a clear error

1.8 WHEN `NEXT_PUBLIC_SUPABASE_URL` is missing THEN `apps/auth/e2e/helpers/session.ts` falls back to the hardcoded string `"http://127.0.0.1:54321"` instead of failing with a clear error

1.9 WHEN `NEXT_PUBLIC_SUPABASE_URL` is missing THEN `apps/auth/e2e/fixtures/auth.fixture.ts` falls back to the hardcoded string `"http://127.0.0.1:54321"` instead of failing with a clear error

**Bug Group 4 — Hardcoded magic numbers and strings scattered across E2E files**

1.10 WHEN session cookies are constructed in `apps/store/e2e/auth.setup.ts` THEN the cookie expiry is hardcoded as the literal `3600` instead of referencing a named constant

1.11 WHEN session cookies are constructed in `apps/auth/e2e/fixtures/auth.fixture.ts` (real-user path) THEN the cookie expiry is hardcoded as the literal `3600` instead of referencing a named constant

1.12 WHEN `apps/auth/e2e/checkout-stock-integrity.spec.ts` needs to compute the shared cookie domain THEN it contains an inline `buildSharedCookieDomain()` function that duplicates the identical logic already present in `apps/auth/e2e/helpers/session.ts`

1.13 WHEN `apps/auth/e2e/mobile-layout.spec.ts` runs THEN it calls `loadRootEnv()` at module level even though `apps/auth/playwright.config.ts` already calls `loadRootEnv()` before any test file is loaded, causing the env to be loaded twice

1.14 WHEN `apps/auth/e2e/helpers/constants.ts` is imported THEN it calls `loadRootEnv()` at module level, duplicating the call already made by the Playwright config

**Bug Group 5 — No lint enforcement**

1.15 WHEN a developer adds a new E2E file THEN there is no ESLint rule preventing them from introducing `getLocalSupabaseEnv()` calls, hardcoded Supabase ports (`54321`, `64321`), or hardcoded fallback URLs (`http://127.0.0.1:*`) in `e2e/` directories

---

### Expected Behavior (Correct)

**Bug Group 1 — `getLocalSupabaseEnv()` removed**

2.1 WHEN `NEXT_PUBLIC_SUPABASE_URL` is absent or empty in the env file THEN the system SHALL throw a clear error message (e.g. `"NEXT_PUBLIC_SUPABASE_URL is not set. Ensure the correct .env.* file is loaded."`) and halt test setup — no fallback to `supabase status`

2.2 WHEN `SUPABASE_SERVICE_ROLE_KEY` is absent or empty in the env file THEN the system SHALL throw a clear error message (e.g. `"SUPABASE_SERVICE_ROLE_KEY is not set. Ensure the correct .env.* file is loaded."`) and halt test setup — no fallback to `supabase status`

2.3 WHEN `apps/auth/e2e/helpers/session.ts` and `apps/auth/e2e/fixtures/auth.fixture.ts` resolve Supabase credentials THEN they SHALL read directly from `process.env` at the point of use (or lazily), not capture values at module load time via `getLocalSupabaseEnv()`

2.4 WHEN `apps/store/playwright.config.ts` builds the server env THEN it SHALL read Supabase credentials exclusively from `process.env` (already populated by `loadRootEnv()`) and SHALL NOT call `getLocalSupabaseEnv()`

**Bug Group 2 — No mock session fallback**

2.5 WHEN `SUPABASE_SERVICE_ROLE_KEY` is missing or a placeholder in `apps/auth/e2e/fixtures/auth.fixture.ts` THEN the system SHALL throw a descriptive error (e.g. `"SUPABASE_SERVICE_ROLE_KEY is required for E2E tests. Set it in your .env.* file."`) instead of injecting a fake session

2.6 WHEN E2E tests require a real Supabase session THEN the system SHALL ONLY create sessions via the Supabase admin API using a valid `SUPABASE_SERVICE_ROLE_KEY` from the env file

**Bug Group 3 — No hardcoded fallback URLs**

2.7 WHEN `NEXT_PUBLIC_SUPABASE_URL` is missing in `apps/store/e2e/auth.setup.ts` THEN the system SHALL throw a clear error instead of silently using `"http://127.0.0.1:54321"`

2.8 WHEN `NEXT_PUBLIC_SUPABASE_URL` is missing in `apps/auth/e2e/helpers/session.ts` THEN the system SHALL throw a clear error instead of silently using `"http://127.0.0.1:54321"`

2.9 WHEN `NEXT_PUBLIC_SUPABASE_URL` is missing in `apps/auth/e2e/fixtures/auth.fixture.ts` THEN the system SHALL throw a clear error instead of silently using `"http://127.0.0.1:54321"`

**Bug Group 4 — Named constants replace magic values**

2.10 WHEN session cookies are constructed in any E2E file THEN the cookie expiry SHALL reference the named constant `SESSION_EXPIRY_SECONDS` (already defined in `apps/auth/e2e/helpers/session.ts`) rather than the literal `3600`

2.11 WHEN `apps/auth/e2e/checkout-stock-integrity.spec.ts` needs to compute the shared cookie domain THEN it SHALL import and reuse the shared helper from `apps/auth/e2e/helpers/session.ts` instead of duplicating the logic inline

2.12 WHEN `apps/auth/e2e/mobile-layout.spec.ts` runs THEN it SHALL NOT call `loadRootEnv()` at module level, relying on the Playwright config to have already loaded the env

2.13 WHEN `apps/auth/e2e/helpers/constants.ts` is imported THEN it SHALL NOT call `loadRootEnv()` at module level, relying on the Playwright config to have already loaded the env

**Bug Group 5 — Lint enforcement**

2.14 WHEN a developer adds a new file under any `e2e/` directory THEN the ESLint config SHALL report an error if the file contains a call to `getLocalSupabaseEnv`, a string literal matching `http://127.0.0.1:54321`, `http://127.0.0.1:64321`, or a numeric literal `54321` or `64321`

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correctly set in the active `.env.*` file THEN the system SHALL CONTINUE TO resolve Supabase credentials from those env vars and create real test users via the admin API

3.2 WHEN `apps/auth/e2e/helpers/session.ts` exports `createTestUser`, `injectSession`, `adminInsert`, `adminQuery`, `adminDelete`, `grantPermissions`, `supabaseAdmin`, `hasAdminTestEnv`, `BUYER_PERMISSIONS`, `SELLER_PERMISSIONS`, and `ADMIN_PERMISSIONS` THEN all those exports SHALL CONTINUE TO be available with the same signatures

3.3 WHEN `apps/auth/e2e/fixtures/auth.fixture.ts` exports the `test` fixture with `authenticatedPage` THEN that fixture SHALL CONTINUE TO create a real test user and inject a valid session cookie into the browser context

3.4 WHEN `apps/store/e2e/auth.setup.ts` runs the `"authenticate"` setup THEN it SHALL CONTINUE TO create a real test user, inject a valid session cookie, save storage state to `e2e/.auth/session.json`, and delete the test user after saving

3.5 WHEN `apps/store/playwright.config.ts` builds the server env for the webServer THEN it SHALL CONTINUE TO pass all required Supabase env vars to the Next.js dev/start process

3.6 WHEN `apps/auth/e2e/helpers/constants.ts` is imported THEN it SHALL CONTINUE TO export `APP_URLS`, `DEBOUNCE_WAIT_MS`, `MUTATION_WAIT_MS`, `BULK_MUTATION_WAIT_MS`, `ELEMENT_TIMEOUT_MS`, `NAVIGATION_TIMEOUT_MS`, and `LONG_OPERATION_TIMEOUT_MS` with the same values

3.7 WHEN the existing E2E test suite runs against a correctly configured environment THEN all existing tests SHALL CONTINUE TO pass without modification to their assertions or test logic

3.8 WHEN `apps/auth/e2e/checkout-stock-integrity.spec.ts` computes the shared cookie domain THEN it SHALL CONTINUE TO produce the same domain value as before (same logic, just sourced from the shared helper)

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies inputs that trigger the defective behavior:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type E2ESetupContext
  OUTPUT: boolean

  // Any of the following conditions triggers the bug:
  RETURN (
    X calls getLocalSupabaseEnv() anywhere in e2e/ code
    OR X uses "http://127.0.0.1:54321" as a hardcoded fallback string
    OR X uses the literal 3600 for cookie expiry outside of a named constant
    OR X injects a mock JWT / mock-refresh-token when SERVICE_ROLE_KEY is missing
    OR X calls loadRootEnv() at module level in a file other than playwright.config.ts
    OR X duplicates buildSharedCookieDomain logic inline instead of importing from session.ts
  )
END FUNCTION
```

**Property: Fix Checking**

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← runE2ESetup'(X)   // F' = fixed code
  ASSERT result does NOT call supabase status CLI
  ASSERT result does NOT silently fall back to hardcoded URLs or tokens
  ASSERT result throws a clear error when required env vars are missing
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  // X = env file has valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  ASSERT F(X) = F'(X)   // same test users created, same sessions injected, same exports
END FOR
```
