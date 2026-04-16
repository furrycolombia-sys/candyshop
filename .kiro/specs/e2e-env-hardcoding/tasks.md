# E2E Env Hardcoding — Tasks

## Tasks

- [x] 1. Export shared helpers from `session.ts`
  - [x] 1.1 Export `SESSION_EXPIRY_SECONDS` (change `const` → `export const`)
  - [x] 1.2 Extract `buildSharedCookieDomain(url: string): string` as a named export (derive from the logic already inside `injectSession`)

- [x] 2. Fix `apps/auth/e2e/helpers/session.ts`
  - [x] 2.1 Remove `getLocalSupabaseEnv()` require and call
  - [x] 2.2 Remove `loadRootEnv()` call
  - [x] 2.3 Remove `isPlaceholder()` function
  - [x] 2.4 Read `NEXT_PUBLIC_SUPABASE_URL` directly from `process.env`; throw `"NEXT_PUBLIC_SUPABASE_URL is not set. Ensure the correct .env.* file is loaded."` if absent or empty
  - [x] 2.5 Read `SUPABASE_SERVICE_ROLE_KEY` directly from `process.env`; throw `"SUPABASE_SERVICE_ROLE_KEY is not set. Ensure the correct .env.* file is loaded."` if absent or empty
  - [x] 2.6 Update `hasAdminTestEnv` to use the now-direct `SERVICE_ROLE_KEY` binding

- [x] 3. Fix `apps/auth/e2e/fixtures/auth.fixture.ts`
  - [x] 3.1 Remove `getLocalSupabaseEnv()` require and call
  - [x] 3.2 Remove `loadRootEnv()` call
  - [x] 3.3 Remove `isPlaceholder()`, `hasUsableServiceRoleKey()`, and the entire mock session branch
  - [x] 3.4 Read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly from `process.env`; throw if absent
  - [x] 3.5 Delegate cookie injection to `injectSession()` imported from `../helpers/session` (remove the duplicated `context.addCookies` call in the fixture)
  - [x] 3.6 Remove the duplicated `toBase64URL` helper (already in `session.ts` or no longer needed after delegation)

- [x] 4. Fix `apps/store/e2e/auth.setup.ts`
  - [x] 4.1 Remove `getLocalSupabaseEnv()` require and call
  - [x] 4.2 Remove `loadRootEnv()` call
  - [x] 4.3 Read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly from `process.env`; throw if absent
  - [x] 4.4 Replace the hardcoded `3600` literals with `SESSION_EXPIRY_SECONDS` imported from `../../auth/e2e/helpers/session` (or define a local `SESSION_EXPIRY_SECONDS = 3600` constant if cross-app import is undesirable)

- [x] 5. Fix `apps/store/playwright.config.ts`
  - [x] 5.1 Remove `getLocalSupabaseEnv()` require and call
  - [x] 5.2 Remove `const localSupabaseEnv = getLocalSupabaseEnv()`
  - [x] 5.3 Rewrite `buildServerEnv()` to read `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` exclusively from `process.env` (already populated by `loadRootEnv()`)

- [x] 6. Remove redundant `loadRootEnv()` calls
  - [x] 6.1 `apps/auth/e2e/mobile-layout.spec.ts` — remove the `loadRootEnv` require and call
  - [x] 6.2 `apps/auth/e2e/helpers/constants.ts` — remove the `loadRootEnv` require and call

- [x] 7. Deduplicate `buildSharedCookieDomain` in `apps/auth/e2e/checkout-stock-integrity.spec.ts`
  - [x] 7.1 Remove the inline `buildSharedCookieDomain()` function definition
  - [x] 7.2 Import `buildSharedCookieDomain` from `./helpers/session`

- [x] 8. Add ESLint enforcement rule in `eslint.config.mjs`
  - [x] 8.1 Add a `no-restricted-syntax` config block for `**/e2e/**` files banning: `Literal[value=54321]`, `Literal[value=64321]`, `Literal[value=/127\\.0\\.0\\.1:(54321|64321)/]`, and `CallExpression` matching `getLocalSupabaseEnv`
  - [x] 8.2 Add a `no-restricted-imports` config block for `**/e2e/**` files banning imports matching `**/local-supabase-env*`
  - [x] 8.3 Verify the new rules do not conflict with the existing `no-restricted-syntax` block already present for `**/e2e/**` (merge selectors into the same block if needed to avoid override)

- [x] 9. Verify no regressions
  - [x] 9.1 Run `pnpm eslint apps/auth/e2e apps/store/e2e` and confirm zero errors from the changed files
  - [x] 9.2 Confirm `SESSION_EXPIRY_SECONDS` and `buildSharedCookieDomain` are importable from `session.ts` (TypeScript compilation passes)
  - [x] 9.3 Confirm all previously-exported symbols from `session.ts` remain exported with the same signatures
