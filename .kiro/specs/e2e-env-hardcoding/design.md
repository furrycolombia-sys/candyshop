# E2E Env Hardcoding Bugfix Design

## Overview

Multiple E2E test infrastructure files bypass the project's single-source-of-truth env file by
falling back to `getLocalSupabaseEnv()` (which shells out to `supabase status` at runtime),
hardcoding fallback URLs (`http://127.0.0.1:54321`), injecting mock JWTs when the service role
key is missing, and duplicating helper logic across files. The fix removes every secondary data
source, makes missing env vars a hard error, deduplicates shared helpers, and adds an ESLint rule
to prevent regressions.

## Glossary

- **Bug_Condition (C)**: Any E2E setup context where the code reads Supabase credentials from a
  source other than `process.env`, uses a hardcoded fallback URL/port, injects a mock session, or
  duplicates logic that already exists in `session.ts`
- **Property (P)**: The desired behavior — E2E setup reads exclusively from `process.env`, throws
  a clear error when required vars are absent, and reuses shared helpers without duplication
- **Preservation**: All existing exports, fixture signatures, and test-user creation flows that
  must remain unchanged when env vars are correctly set
- **`getLocalSupabaseEnv()`**: CJS helper in `scripts/local-supabase-env.js` that shells out to
  `supabase status` to retrieve local Supabase credentials — the secondary data source being
  removed
- **`loadRootEnv()`**: CJS helper that loads the active `.env.*` file into `process.env`; called
  once by each `playwright.config.ts` before any test file is imported
- **`SESSION_EXPIRY_SECONDS`**: Named constant (`3600`) in `session.ts` representing cookie
  lifetime — currently unexported, causing the literal `3600` to be duplicated elsewhere
- **`buildSharedCookieDomain()`**: Helper in `session.ts` that derives the shared cookie domain
  from an app URL — currently duplicated inline in `checkout-stock-integrity.spec.ts`
- **`injectSession()`**: Exported function in `session.ts` that constructs and injects Supabase
  auth cookies into a Playwright `BrowserContext`

## Bug Details

### Bug Condition

The bug manifests whenever E2E setup code resolves Supabase credentials through any path other
than `process.env`, or when it silently continues with invalid/missing configuration instead of
failing fast.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type E2ESetupContext (a file + its runtime behaviour)
  OUTPUT: boolean

  RETURN (
    X calls getLocalSupabaseEnv() anywhere in e2e/ code
    OR X contains the string literal "http://127.0.0.1:54321"
    OR X contains the string literal "http://127.0.0.1:64321"
    OR X contains the numeric literal 54321 or 64321
    OR X injects a mock JWT / "mock-refresh-token" when SERVICE_ROLE_KEY is missing
    OR X uses the literal 3600 for cookie expiry outside of a named constant definition
    OR X calls loadRootEnv() at module level in a file other than playwright.config.ts
    OR X duplicates buildSharedCookieDomain logic inline instead of importing from session.ts
  )
END FUNCTION
```

### Examples

- `apps/auth/e2e/helpers/session.ts` calls `getLocalSupabaseEnv()` at module load time and falls
  back to `"http://127.0.0.1:54321"` when `NEXT_PUBLIC_SUPABASE_URL` is a placeholder — expected:
  throw `"NEXT_PUBLIC_SUPABASE_URL is not set"`
- `apps/auth/e2e/fixtures/auth.fixture.ts` injects a hardcoded fake JWT when
  `SUPABASE_SERVICE_ROLE_KEY` is missing — expected: throw
  `"SUPABASE_SERVICE_ROLE_KEY is required for E2E tests"`
- `apps/store/e2e/auth.setup.ts` falls back to `"http://127.0.0.1:54321"` and the literal `3600`
  — expected: read from `process.env`, reference `SESSION_EXPIRY_SECONDS`
- `apps/auth/e2e/checkout-stock-integrity.spec.ts` defines `buildSharedCookieDomain()` inline —
  expected: import from `session.ts`
- `apps/auth/e2e/mobile-layout.spec.ts` calls `loadRootEnv()` at module level — expected: remove
  the call; the playwright config already loaded the env

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `apps/auth/e2e/helpers/session.ts` continues to export `createTestUser`, `injectSession`,
  `adminInsert`, `adminQuery`, `adminDelete`, `grantPermissions`, `supabaseAdmin`,
  `hasAdminTestEnv`, `BUYER_PERMISSIONS`, `SELLER_PERMISSIONS`, and `ADMIN_PERMISSIONS` with
  identical signatures
- `apps/auth/e2e/fixtures/auth.fixture.ts` continues to export the `test` fixture with an
  `authenticatedPage` property (`{ userId, email }`) that creates a real test user and injects a
  valid session cookie
- `apps/store/e2e/auth.setup.ts` continues to run the `"authenticate"` setup: create test user,
  inject session cookie, save storage state to `e2e/.auth/session.json`, delete test user
- `apps/store/playwright.config.ts` continues to pass all required Supabase env vars to the
  Next.js webServer process
- `apps/auth/e2e/helpers/constants.ts` continues to export `APP_URLS`, `DEBOUNCE_WAIT_MS`,
  `MUTATION_WAIT_MS`, `BULK_MUTATION_WAIT_MS`, `ELEMENT_TIMEOUT_MS`, `NAVIGATION_TIMEOUT_MS`, and
  `LONG_OPERATION_TIMEOUT_MS` with the same values
- `apps/auth/e2e/checkout-stock-integrity.spec.ts` continues to compute the same shared cookie
  domain value (same logic, now sourced from the shared helper)

**Scope:**

All inputs where `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correctly set in
the active `.env.*` file are unaffected. This includes:

- All existing E2E test assertions and test logic
- All Playwright fixture APIs consumed by test files
- The `resolveE2EAppUrls()` / `getE2EExtraHTTPHeaders()` helpers (not modified)

## Hypothesized Root Cause

1. **Incremental fallback accumulation**: The `isPlaceholder()` + `getLocalSupabaseEnv()` pattern
   was added as a convenience for developers who hadn't yet populated their env file. Over time it
   became the default path, masking misconfigured environments instead of surfacing them.

2. **Module-level side effects**: `loadRootEnv()` and `getLocalSupabaseEnv()` are called at
   import time in multiple files. Because `playwright.config.ts` already calls `loadRootEnv()`
   before any test file is imported, the repeated calls are redundant — but they also mean the
   secondary data source is resolved unconditionally on every import.

3. **Missing exports**: `SESSION_EXPIRY_SECONDS` and `buildSharedCookieDomain()` were never
   exported from `session.ts`, forcing consumers to either duplicate the logic or use magic
   literals.

4. **No lint enforcement**: Without a rule banning `getLocalSupabaseEnv` calls and hardcoded
   Supabase ports in `e2e/` files, the pattern silently re-enters the codebase with each new test
   file.

## Correctness Properties

Property 1: Bug Condition — No Secondary Credential Source

_For any_ E2E setup context where `isBugCondition` returns true (the file calls
`getLocalSupabaseEnv()`, contains a hardcoded fallback URL/port, injects a mock session, uses the
literal `3600` for cookie expiry, calls `loadRootEnv()` redundantly, or duplicates
`buildSharedCookieDomain`), the fixed code SHALL eliminate that pattern: read exclusively from
`process.env`, throw a descriptive error when required vars are absent, reference
`SESSION_EXPIRY_SECONDS`, and import `buildSharedCookieDomain` from `session.ts`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13**

Property 2: Preservation — Correct-Env Behaviour Unchanged

_For any_ E2E setup context where `isBugCondition` returns false (i.e. `NEXT_PUBLIC_SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` are correctly set in the active env file), the fixed code SHALL
produce the same observable behaviour as the original code: same test users created, same session
cookies injected, same exports available with the same signatures, same cookie domain computed.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

Property 3: Lint Enforcement — Banned Patterns Rejected

_For any_ file under `**/e2e/**`, the ESLint config SHALL report an error if the file contains a
call to `getLocalSupabaseEnv`, a string literal `"http://127.0.0.1:54321"` or
`"http://127.0.0.1:64321"`, or a numeric literal `54321` or `64321`.

**Validates: Requirements 2.14**

## Fix Implementation

### Changes Required

#### 1. `apps/auth/e2e/helpers/session.ts`

- Remove `getLocalSupabaseEnv()` import and call
- Remove `loadRootEnv()` call (playwright config already calls it)
- Remove `isPlaceholder()` function
- Read `NEXT_PUBLIC_SUPABASE_URL` directly from `process.env`; throw if absent/empty:
  ```
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Ensure the correct .env.* file is loaded.")
  }
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ```
- Read `SUPABASE_SERVICE_ROLE_KEY` directly from `process.env`; throw if absent/empty
- Export `SESSION_EXPIRY_SECONDS` (change `const` → `export const`)
- Export `buildSharedCookieDomain()` as a named export (extract from `injectSession` or add
  alongside it)
- Update `hasAdminTestEnv` to use the now-direct `SERVICE_ROLE_KEY` value

#### 2. `apps/auth/e2e/fixtures/auth.fixture.ts`

- Remove `getLocalSupabaseEnv()` import and call
- Remove `loadRootEnv()` call
- Remove `isPlaceholder()` function
- Remove `hasUsableServiceRoleKey()` function
- Remove the entire mock session branch (`if (!hasUsableServiceRoleKey()) { ... }`)
- Read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly from `process.env`;
  throw if absent
- Delegate cookie injection to `injectSession()` imported from `session.ts` — the fixture becomes
  a thin wrapper: create user → inject session → yield → cleanup
- Reference `SESSION_EXPIRY_SECONDS` from `session.ts` (or rely on `injectSession` which already
  uses it)

#### 3. `apps/store/e2e/auth.setup.ts`

- Remove `getLocalSupabaseEnv()` import and call
- Remove `loadRootEnv()` call
- Read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly from `process.env`;
  throw if absent
- Replace the hardcoded `3600` literals with `SESSION_EXPIRY_SECONDS` imported from
  `apps/auth/e2e/helpers/session.ts` (or define a local named constant if cross-app import is
  undesirable — the key requirement is no bare `3600` literal)

#### 4. `apps/store/playwright.config.ts`

- Remove `getLocalSupabaseEnv()` import and call
- Remove `const localSupabaseEnv = getLocalSupabaseEnv()`
- Rewrite `buildServerEnv()` to read exclusively from `process.env` (already populated by
  `loadRootEnv()`):
  ```
  return {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  }
  ```

#### 5. `apps/auth/e2e/mobile-layout.spec.ts`

- Remove the `loadRootEnv()` require and call at module level

#### 6. `apps/auth/e2e/helpers/constants.ts`

- Remove the `loadRootEnv()` require and call at module level

#### 7. `apps/auth/e2e/checkout-stock-integrity.spec.ts`

- Remove the inline `buildSharedCookieDomain()` function definition
- Import `buildSharedCookieDomain` from `./helpers/session`

#### 8. `eslint.config.mjs`

Add a new config block targeting `**/e2e/**` files with two rules:

**`no-restricted-syntax`** — bans hardcoded Supabase ports and fallback URLs via AST selectors:

```js
{
  files: ["**/e2e/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      // ... existing selectors preserved ...
      {
        selector: "Literal[value=54321]",
        message: "Do not hardcode Supabase port 54321 in e2e files. Read NEXT_PUBLIC_SUPABASE_URL from process.env.",
      },
      {
        selector: "Literal[value=64321]",
        message: "Do not hardcode Supabase port 64321 in e2e files. Read NEXT_PUBLIC_SUPABASE_URL from process.env.",
      },
      {
        selector: "Literal[value=/127\\.0\\.0\\.1:(54321|64321)/]",
        message: "Do not hardcode Supabase fallback URLs in e2e files. Read NEXT_PUBLIC_SUPABASE_URL from process.env.",
      },
      {
        selector: "CallExpression[callee.name='getLocalSupabaseEnv'], CallExpression[callee.object.name='getLocalSupabaseEnv']",
        message: "getLocalSupabaseEnv() is banned in e2e files. Read credentials directly from process.env.",
      },
    ],
  },
}
```

**`no-restricted-imports`** — bans the import of `local-supabase-env.js` in e2e files:

```js
{
  files: ["**/e2e/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/local-supabase-env*", "**/local-supabase-env.js"],
            message: "local-supabase-env is banned in e2e files. Read credentials directly from process.env.",
          },
        ],
      },
    ],
  },
}
```

Note: The existing `no-restricted-syntax` block for `**/e2e/**` already bans role/text/label
selectors. The new selectors must be merged into that block (ESLint flat config: last `rules`
entry for a given file pattern wins, so a separate block is fine as long as the existing block is
not overwritten).

## Testing Strategy

### Validation Approach

Two-phase approach: first surface counterexamples on the unfixed code to confirm root cause
analysis, then verify the fix and preservation.

### Exploratory Bug Condition Checking

**Goal**: Confirm that the buggy patterns exist and behave as described before touching any code.

**Test Plan**: Grep the affected files for the banned patterns; run ESLint with the new rule
against the unfixed files to observe the errors that will be reported once the rule is added.

**Test Cases**:

1. **`getLocalSupabaseEnv` presence**: Search `apps/*/e2e/**` for `getLocalSupabaseEnv` — expect
   matches in `session.ts`, `auth.fixture.ts`, `auth.setup.ts`, `playwright.config.ts` (will fail
   lint after rule is added)
2. **Hardcoded fallback URL**: Search for `127.0.0.1:54321` — expect matches in `session.ts`,
   `auth.fixture.ts`, `auth.setup.ts` (will fail lint after rule is added)
3. **Mock session injection**: Inspect `auth.fixture.ts` for the `!hasUsableServiceRoleKey()`
   branch — expect a fake JWT string to be present (will be removed by fix)
4. **Duplicate `buildSharedCookieDomain`**: Search `checkout-stock-integrity.spec.ts` for the
   inline function — expect it to be present (will be replaced by import)

**Expected Counterexamples**:

- ESLint reports errors on `getLocalSupabaseEnv` calls in all four files
- ESLint reports errors on `"http://127.0.0.1:54321"` string literals
- ESLint reports errors on numeric literals `54321`

### Fix Checking

**Goal**: Verify that for all inputs where `isBugCondition` holds, the fixed code eliminates the
pattern.

**Pseudocode:**

```
FOR ALL file WHERE isBugCondition(file) DO
  result := lint(file_fixed)
  ASSERT result has no "getLocalSupabaseEnv" errors
  ASSERT result has no hardcoded-port errors
  ASSERT file_fixed does NOT contain mock JWT string
  ASSERT file_fixed does NOT contain loadRootEnv() call (except playwright.config.ts)
  ASSERT file_fixed throws when NEXT_PUBLIC_SUPABASE_URL is absent
  ASSERT file_fixed throws when SUPABASE_SERVICE_ROLE_KEY is absent
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where `isBugCondition` does NOT hold (env vars correctly
set), the fixed code produces the same observable behaviour.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  // X = env file has valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  ASSERT exports(session.ts_fixed) = exports(session.ts_original)
  ASSERT createTestUser_fixed(label) creates same user shape as original
  ASSERT injectSession_fixed(ctx, user) injects same cookies as original
  ASSERT buildSharedCookieDomain_fixed(url) = buildSharedCookieDomain_original(url)
  ASSERT authenticatedPage_fixed yields { userId, email } as before
END FOR
```

**Testing Approach**: Property-based testing is appropriate for `buildSharedCookieDomain` (many
URL inputs) and for the ESLint rule (many synthetic file inputs). Unit tests cover the throw
behaviour and the export surface.

### Unit Tests

- `session.ts` throws `"NEXT_PUBLIC_SUPABASE_URL is not set"` when env var is absent
- `session.ts` throws `"SUPABASE_SERVICE_ROLE_KEY is not set"` when env var is absent
- `auth.fixture.ts` throws when `SUPABASE_SERVICE_ROLE_KEY` is absent (no mock session fallback)
- `SESSION_EXPIRY_SECONDS` is exported from `session.ts` and equals `3600`
- `buildSharedCookieDomain` is exported from `session.ts`
- `checkout-stock-integrity.spec.ts` imports `buildSharedCookieDomain` from `session.ts` (no
  inline definition)

### Property-Based Tests

- For any valid URL string, `buildSharedCookieDomain(url)` imported from `session.ts` returns the
  same value as the previously-inline version in `checkout-stock-integrity.spec.ts`
- For any synthetic e2e file containing a banned pattern, the ESLint rule reports at least one
  error; for any file without banned patterns, the rule reports zero errors

### Integration Tests

- Full E2E run against a correctly-configured local environment passes without regression
- `auth.fixture.ts` `authenticatedPage` fixture creates a real Supabase user and injects a valid
  session cookie when env vars are set
- `apps/store/e2e/auth.setup.ts` saves a valid `session.json` when env vars are set
