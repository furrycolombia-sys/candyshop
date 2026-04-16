# Implementation Plan: App Navigation Origins

## Overview

Replace the three legacy env vars (`SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`) with a clean two-variable model (`APP_PUBLIC_ORIGIN`, `APP_INTERNAL_ORIGIN`). Update `appUrls.ts`, create `scripts/app-url-resolver.js` as a committed file, clean up E2E fixtures, update all env files, and update docs.

## Tasks

- [x] 1. Update `packages/shared/src/config/appUrls.ts`
  - Replace `getPublicOrigin()` to read `APP_PUBLIC_ORIGIN` instead of `SITE_PUBLIC_ORIGIN`
  - Remove all references to `SITE_PUBLIC_ORIGIN` and `E2E_PUBLIC_ORIGIN`
  - Keep the rest of `resolveAppUrl` fallback chain unchanged
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 6.1, 6.2, 6.3_

- [x] 2. Update unit and property tests for `appUrls.ts`
  - [x] 2.1 Update `packages/shared/src/config/appUrls.test.ts`
    - Replace `clearAppUrlEnvVars()` to stub `APP_PUBLIC_ORIGIN` instead of `SITE_PUBLIC_ORIGIN` / `E2E_PUBLIC_ORIGIN`
    - Update all existing test cases that stub `SITE_PUBLIC_ORIGIN` to stub `APP_PUBLIC_ORIGIN`
    - Add example tests: `APP_PUBLIC_ORIGIN` unset in production falls back to `NEXT_PUBLIC_*_URL`; `APP_PUBLIC_ORIGIN` set in development is ignored; legacy vars stubbed have no effect
    - _Requirements: 6.4_

  - [x]\* 2.2 Write property test for `appUrls.ts` — Property 1: APP_PUBLIC_ORIGIN produces same URLs as SITE_PUBLIC_ORIGIN did
    - Create `packages/shared/src/config/appUrls.property.test.ts`
    - Use fast-check; `validOriginArb` generates `^https?://[a-z0-9.-]+(:[0-9]+)?` strings
    - Tag: `Feature: app-navigation-origins, Property 1: APP_PUBLIC_ORIGIN produces same URLs as SITE_PUBLIC_ORIGIN did`
    - **Property 1: APP_PUBLIC_ORIGIN produces same URLs as SITE_PUBLIC_ORIGIN did**
    - **Validates: Requirements 6.1, 1.2**

  - [x]\* 2.3 Write property test for `appUrls.ts` — Property 2: Trailing slash normalization is idempotent
    - Tag: `Feature: app-navigation-origins, Property 2: Trailing slash normalization is idempotent`
    - **Property 2: Trailing slash normalization is idempotent**
    - **Validates: Requirements 1.3, 6.2**

  - [x]\* 2.4 Write property test for `appUrls.ts` — Property 3: APP_PUBLIC_ORIGIN is ignored outside production
    - Tag: `Feature: app-navigation-origins, Property 3: APP_PUBLIC_ORIGIN is ignored outside production`
    - **Property 3: APP_PUBLIC_ORIGIN is ignored outside production**
    - **Validates: Requirements 1.5**

- [x] 3. Checkpoint — Ensure all `appUrls` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create `scripts/app-url-resolver.js` as a committed source file
  - Create the file at `scripts/app-url-resolver.js` (not gitignored)
  - Export `resolveE2EAppUrls()`: reads `APP_PUBLIC_ORIGIN`, falls back to `NEXT_PUBLIC_*_URL` per app, then `devUrl`
  - Export `getE2EExtraHTTPHeaders()`: returns `{}`
  - No `isE2EMode` flag, no `E2E_PUBLIC_ORIGIN` reference
  - Strip trailing slash from `APP_PUBLIC_ORIGIN` before joining paths
  - _Requirements: 8.1_

- [x] 5. Update E2E fixtures to remove `E2E_PUBLIC_ORIGIN` and `isE2EMode`
  - [x] 5.1 Update `apps/auth/e2e/fixtures/auth.fixture.ts`
    - Remove `isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN)`
    - Replace `isE2EMode`-gated credential resolution with env-file-primary pattern: use `NEXT_PUBLIC_SUPABASE_URL` when not a placeholder; fall back to `localSupabaseEnv.API_URL`
    - Apply same pattern to `SERVICE_ROLE_KEY`
    - No other structural changes to this file
    - _Requirements: 3.3, 4.1, 4.3, 8.2_

  - [x] 5.2 Update `apps/auth/e2e/helpers/session.ts`
    - Remove `isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN)`
    - Apply env-file-primary credential resolution pattern (same as 5.1)
    - Remove `supabaseUrlForRef` branch in `injectSession()` that switches on `E2E_PUBLIC_ORIGIN`; always derive project ref from `SUPABASE_URL` directly
    - No other structural changes to this file
    - _Requirements: 3.3, 4.1, 4.3, 8.3, 8.4_

  - [ ]\* 5.3 Write property test for credential resolution — Property 4: Env file value is used when not a placeholder
    - Extract `resolveSupabaseUrl()` as a pure function from the credential resolution logic
    - Tag: `Feature: app-navigation-origins, Property 4: Env file value is used when not a placeholder`
    - **Property 4: Env file value is used when not a placeholder**
    - **Validates: Requirements 4.2, 8.2, 8.3**

  - [ ]\* 5.4 Write property test for `injectSession()` — Property 5: Project ref is correctly derived from any Supabase URL
    - Extract `deriveProjectRef()` as a pure function from `injectSession()`
    - Tag: `Feature: app-navigation-origins, Property 5: Project ref is correctly derived from any Supabase URL`
    - **Property 5: Project ref is correctly derived from any Supabase URL**
    - **Validates: Requirements 8.4**

- [x] 6. Checkpoint — Ensure all fixture-related tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update all env files
  - [x] 7.1 Update `.env.dev`
    - Add `APP_PUBLIC_ORIGIN=http://localhost:8088` and `APP_INTERNAL_ORIGIN=http://localhost:8088`
    - Remove `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`
    - _Requirements: 3.1, 5.1_

  - [x] 7.2 Update `.env.test`
    - Add `APP_PUBLIC_ORIGIN=http://localhost:8088` and `APP_INTERNAL_ORIGIN=http://localhost:8088`
    - Remove `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`
    - _Requirements: 3.1, 5.2_

  - [x] 7.3 Update `.env.staging`
    - Add `APP_PUBLIC_ORIGIN=https://store.ffxivbe.org` and `APP_INTERNAL_ORIGIN=http://candyshop-staging:80`
    - Remove `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`
    - _Requirements: 3.1, 5.3_

  - [x] 7.4 Update `.env.prod`
    - Add `APP_PUBLIC_ORIGIN=https://store.furrycolombia.com` and `APP_INTERNAL_ORIGIN=http://candyshop-prod:80`
    - Remove `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`
    - _Requirements: 3.1, 5.4_

- [x] 8. Update `scripts/server/docker-prod.env.example`
  - Replace `SITE_PROD_PORT` and `SITE_PUBLIC_ORIGIN` with `APP_PUBLIC_ORIGIN=https://store.furrycolombia.com` and `APP_INTERNAL_ORIGIN=http://candyshop-prod:80`
  - _Requirements: 7.1_

- [x] 9. Update documentation files
  - [x] 9.1 Update `docs/environment.md`
    - Add `APP_PUBLIC_ORIGIN` and `APP_INTERNAL_ORIGIN` to the key variables table
    - Remove `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN` from the table
    - _Requirements: 7.3_

  - [x] 9.2 Update `docs/infrastructure.md`
    - Replace all legacy var references in example env blocks and prose with the new variable names
    - _Requirements: 7.2_

- [x] 10. Final checkpoint — Verify env linter and grep assertions
  - Run `pnpm lint:env` and confirm exit code 0
  - Confirm no env file contains `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, or `E2E_PUBLIC_ORIGIN`
  - Confirm `appUrls.ts` does not reference `SITE_PUBLIC_ORIGIN` or `E2E_PUBLIC_ORIGIN`
  - Confirm `apps/auth/e2e/fixtures/auth.fixture.ts`, `apps/auth/e2e/helpers/session.ts`, and `scripts/app-url-resolver.js` do not reference `E2E_PUBLIC_ORIGIN` or `isE2EMode`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 3.4, 5.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- `config/app-links.json` is unchanged — it remains the single source of truth for app path segments and dev-mode ports
- The broader architectural cleanup of `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts` (mock tokens, dual-path session creation, module-level side effects) is out of scope — tracked as separate bugfix specs
- Property tests use fast-check with a minimum of 100 iterations per property
