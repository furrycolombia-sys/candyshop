# Requirements Document

## Introduction

The monorepo currently carries three environment variables — `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, and `E2E_PUBLIC_ORIGIN` — that are poorly named, partially redundant, and conflate two unrelated concerns:

1. **Docker port exposure** (`SITE_PROD_PORT`) — the host port the container binds to. This value is never read by any application code or script; it only appears in env files and documentation examples. It is dead configuration.
2. **Browser-facing public origin** (`SITE_PUBLIC_ORIGIN`) — the scheme + host the browser uses to reach the app. Used by `appUrls.ts` to derive absolute URLs for the top nav bar in production.
3. **E2E override origin** (`E2E_PUBLIC_ORIGIN`) — overrides `SITE_PUBLIC_ORIGIN` during E2E runs, and doubles as a boolean flag to detect "are we in E2E mode" in test fixtures.

This feature replaces all three with a cleaner two-variable model that maps directly to the two real concerns:

- `APP_INTERNAL_ORIGIN` — the scheme + host + port used for Docker inter-service HTTP calls (server-to-server, not browser-facing).
- `APP_PUBLIC_ORIGIN` — the scheme + host the browser uses to reach the app (top nav bar, OAuth redirects, canonical URLs).

The `E2E_PUBLIC_ORIGIN` dual-purpose pattern (navigation config + test-mode flag) is eliminated; E2E fixtures read `APP_PUBLIC_ORIGIN` directly from the environment, the same as any other code would.

---

## Glossary

- **App_Navigation_Origins**: The feature described in this document — the two-variable model replacing the three legacy variables.
- **APP_INTERNAL_ORIGIN**: New env var. The base URL used for Docker inter-service HTTP calls (e.g., `http://candyshop-prod:80`). Server-side only; never exposed to the browser.
- **APP_PUBLIC_ORIGIN**: New env var. The browser-facing base URL of the deployed app (e.g., `https://store.furrycolombia.com`). Used by `appUrls.ts` and any code that builds canonical or nav-bar URLs.
- **Env_File**: One of `.env.dev`, `.env.test`, `.env.staging`, `.env.prod` — the flat env files at the monorepo root loaded by `scripts/load-env.mjs`.
- **Env_Linter**: `scripts/lint-envs.mjs`, enforces that all Env_Files have exactly the same set of keys.
- **AppUrls_Module**: `packages/shared/src/config/appUrls.ts` — the shared module that resolves per-app URLs consumed by the top nav bar and cross-app links.
- **E2E_Fixture**: Test helper files under `apps/*/e2e/` that currently read `E2E_PUBLIC_ORIGIN` to detect E2E mode and resolve Supabase credentials.
- **TARGET_ENV**: Existing env var set by the env loader. Values: `dev`, `test`, `staging`, `prod`. Used as the canonical environment discriminator.
- **Legacy_Vars**: The three variables being removed: `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`.

---

## Requirements

### Requirement 1: Introduce APP_PUBLIC_ORIGIN

**User Story:** As a developer, I want a single, clearly named variable for the browser-facing public origin, so that I can configure top-nav URLs and canonical links without ambiguity.

#### Acceptance Criteria

1. THE Env_File SHALL define `APP_PUBLIC_ORIGIN` as the browser-facing base URL of the deployed application (scheme + host, no trailing slash).
2. WHEN `APP_PUBLIC_ORIGIN` is set and `NODE_ENV` is `production`, THE AppUrls_Module SHALL derive all per-app absolute URLs by joining `APP_PUBLIC_ORIGIN` with each app's path (e.g., `APP_PUBLIC_ORIGIN + "/store"`).
3. WHEN `APP_PUBLIC_ORIGIN` is set and `NODE_ENV` is `production`, THE AppUrls_Module SHALL strip any trailing slash from `APP_PUBLIC_ORIGIN` before joining paths.
4. WHEN `APP_PUBLIC_ORIGIN` is not set and `NODE_ENV` is `production`, THE AppUrls*Module SHALL fall back to per-app `NEXT_PUBLIC*\*\_URL` env vars, then to relative same-domain paths — preserving the existing fallback chain.
5. WHEN `NODE_ENV` is not `production`, THE AppUrls*Module SHALL ignore `APP_PUBLIC_ORIGIN` and use per-app `NEXT_PUBLIC*\*\_URL` values or dev-mode defaults, as it does today.

---

### Requirement 2: Introduce APP_INTERNAL_ORIGIN

**User Story:** As a developer, I want a dedicated variable for the Docker inter-service base URL, so that server-side HTTP calls between containers use a meaningful, explicitly named origin.

#### Acceptance Criteria

1. THE Env_File SHALL define `APP_INTERNAL_ORIGIN` as the base URL for Docker inter-service HTTP calls (scheme + host + optional port, no trailing slash).
2. THE AppUrls_Module SHALL NOT read `APP_INTERNAL_ORIGIN`; it is reserved for server-side infrastructure code only.
3. WHERE `APP_INTERNAL_ORIGIN` is set, server-side code that makes inter-service HTTP requests SHALL use `APP_INTERNAL_ORIGIN` as the base URL.
4. WHEN `APP_INTERNAL_ORIGIN` is not set, server-side code SHALL fall back to `http://localhost` as the inter-service base URL.

---

### Requirement 3: Remove Legacy Variables

**User Story:** As a developer, I want the three legacy variables removed from all env files and code, so that the configuration surface is smaller and there are no misleading or dead variables.

#### Acceptance Criteria

1. THE Env_File SHALL NOT contain `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, or `E2E_PUBLIC_ORIGIN` after this feature is implemented.
2. THE AppUrls_Module SHALL NOT read `SITE_PUBLIC_ORIGIN` or `E2E_PUBLIC_ORIGIN` after this feature is implemented.
3. THE E2E_Fixture SHALL NOT read `E2E_PUBLIC_ORIGIN` after this feature is implemented.
4. WHEN the Env_Linter runs after this feature is implemented, THE Env_Linter SHALL pass with no missing-key or extra-key errors across all Env_Files.

---

### Requirement 4: E2E Fixtures Read APP_PUBLIC_ORIGIN Directly

**User Story:** As a developer, I want E2E fixtures to read `APP_PUBLIC_ORIGIN` directly from the environment — the same way any other code does — so that there is no special mode-detection flag and no branching on environment discriminators inside fixtures.

#### Acceptance Criteria

1. THE E2E_Fixture SHALL read `APP_PUBLIC_ORIGIN` directly from the environment to derive the public base URL for browser navigation, with no `isE2EMode` flag and no `TARGET_ENV` check inside the fixture.
2. THE E2E_Fixture SHALL resolve Supabase credentials from `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as loaded from the active env file; the correct values are already present because `TARGET_ENV` controls which `.env.*` file is loaded.
3. THE E2E_Fixture SHALL NOT contain any boolean flag (e.g. `isE2EMode`) that branches on which environment is active. Note: broader architectural cleanup of the fixture files (hardcoded mock tokens, dual-path session creation, module-level side effects) is tracked as separate bugfix specs and is out of scope for this feature.

---

### Requirement 5: Env File Consistency

**User Story:** As a developer, I want all env files to define the new variables with correct, environment-appropriate values, so that every environment works correctly out of the box.

#### Acceptance Criteria

1. THE Env_File `.env.dev` SHALL set `APP_PUBLIC_ORIGIN` to `"http://localhost:8088"` and `APP_INTERNAL_ORIGIN` to `"http://localhost:8088"`, because in dev the public and internal origins are the same local address.
2. THE Env_File `.env.test` SHALL set `APP_PUBLIC_ORIGIN` to `"http://localhost:8088"` and `APP_INTERNAL_ORIGIN` to `"http://localhost:8088"`.
3. THE Env_File `.env.staging` SHALL set `APP_PUBLIC_ORIGIN` to `"https://store.ffxivbe.org"` and `APP_INTERNAL_ORIGIN` to `"http://candyshop-staging:80"`.
4. THE Env_File `.env.prod` SHALL set `APP_PUBLIC_ORIGIN` to `"https://store.furrycolombia.com"` and `APP_INTERNAL_ORIGIN` to `"http://candyshop-prod:80"`.
5. WHEN the Env_Linter runs, THE Env_Linter SHALL confirm that `APP_PUBLIC_ORIGIN` and `APP_INTERNAL_ORIGIN` are present in all four Env_Files and that no Env_File contains any Legacy_Var key.

---

### Requirement 6: AppUrls Module Round-Trip Correctness

**User Story:** As a developer, I want the AppUrls_Module to produce the same URL structure it produced before, so that no existing nav-bar links or cross-app redirects break.

#### Acceptance Criteria

1. FOR ALL valid `APP_PUBLIC_ORIGIN` values, THE AppUrls_Module SHALL produce per-app URLs equivalent to those previously produced by the same value in `SITE_PUBLIC_ORIGIN`.
2. THE AppUrls_Module SHALL produce identical results whether `APP_PUBLIC_ORIGIN` is set with or without a trailing slash (trailing slash is normalized away).
3. WHEN `APP_PUBLIC_ORIGIN` is an empty string, THE AppUrls*Module SHALL behave identically to when `SITE_PUBLIC_ORIGIN` was an empty string — using per-app `NEXT_PUBLIC*\*\_URL` or relative paths as fallback.
4. THE AppUrls_Module unit tests SHALL be updated to stub `APP_PUBLIC_ORIGIN` instead of `SITE_PUBLIC_ORIGIN` and `E2E_PUBLIC_ORIGIN`, and all existing test scenarios SHALL continue to pass.

---

### Requirement 7: Documentation and Example Files

**User Story:** As a developer, I want all documentation and example env files updated to reflect the new variable names, so that onboarding and server setup instructions remain accurate.

#### Acceptance Criteria

1. THE file `scripts/server/docker-prod.env.example` SHALL replace `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN` with `APP_PUBLIC_ORIGIN` and `APP_INTERNAL_ORIGIN` using production-appropriate values.
2. THE file `docs/infrastructure.md` SHALL replace all references to Legacy_Vars with the new variable names and updated example env blocks.
3. THE file `docs/environment.md` SHALL document `APP_PUBLIC_ORIGIN` and `APP_INTERNAL_ORIGIN` in the key variables table and remove Legacy_Vars from that table.

---

### Requirement 8: E2E Infrastructure Scripts Read from Env Files, Not Runtime Detection

**User Story:** As a developer, I want all E2E infrastructure scripts and fixtures to derive their configuration exclusively from the active env file, so that pointing E2E tests at any environment (dev, staging, prod) requires only loading the correct `.env.*` file — with no special-casing, mode flags, or runtime environment detection anywhere in the test infrastructure.

> **Scope note:** Changes to `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts` in this requirement are **limited to removing `E2E_PUBLIC_ORIGIN` references**. The broader architectural cleanup of those files (hardcoded mock tokens, dual-path session creation, module-level side effects) is tracked as separate bugfix specs.

#### Acceptance Criteria

1. THE script `scripts/app-url-resolver.js` SHALL be created as a committed file in the repository (not gitignored/generated). It SHALL export `resolveE2EAppUrls()` and `getE2EExtraHTTPHeaders()`. It SHALL read `APP_PUBLIC_ORIGIN` (not `E2E_PUBLIC_ORIGIN`) to resolve app URLs: if `APP_PUBLIC_ORIGIN` is set, derive each app URL by joining it with the app's path; otherwise fall back to the corresponding `NEXT_PUBLIC_*_URL` env var. It SHALL contain no `isE2EMode` flag and no branching on `E2E_PUBLIC_ORIGIN`.
2. THE file `apps/auth/e2e/fixtures/auth.fixture.ts` SHALL remove `isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN)` and replace the `isE2EMode`-gated credential resolution with the env-file-primary pattern: `NEXT_PUBLIC_SUPABASE_URL` is used when it is not a placeholder; `getLocalSupabaseEnv().API_URL` is the fallback for placeholder values. No other structural changes to this file are in scope.
3. THE file `apps/auth/e2e/helpers/session.ts` SHALL remove `isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN)` and apply the same env-file-primary credential resolution pattern as criterion 8.2. No other structural changes to this file are in scope.
4. THE `injectSession()` function in `apps/auth/e2e/helpers/session.ts` SHALL remove the `supabaseUrlForRef` branch that switches based on `E2E_PUBLIC_ORIGIN`, and SHALL derive the Supabase project ref for cookie naming directly from the resolved `SUPABASE_URL`.
5. WHEN `TARGET_ENV=prod` and `.env.prod` is loaded, ALL E2E fixtures and scripts SHALL use the prod Supabase URL, prod service role key, and prod app origin with no code path differences from any other environment.
