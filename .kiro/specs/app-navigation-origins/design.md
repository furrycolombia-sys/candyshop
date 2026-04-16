# Design Document — App Navigation Origins

## Overview

This feature replaces three legacy environment variables (`SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`) with a clean two-variable model:

- `APP_PUBLIC_ORIGIN` — the browser-facing base URL (scheme + host). Used by `appUrls.ts` to derive nav-bar and canonical URLs in production.
- `APP_INTERNAL_ORIGIN` — the Docker inter-service base URL (scheme + host + port). Server-side only; never read by `appUrls.ts` or any browser-facing code.

The `E2E_PUBLIC_ORIGIN` dual-purpose pattern (navigation config + E2E mode flag) is eliminated — including every downstream location that branched on it:

- `isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN)` is removed from `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts`.
- The `supabaseUrlForRef` branch in `injectSession()` (which switched the cookie project ref based on `E2E_PUBLIC_ORIGIN`) is removed.
- `scripts/app-url-resolver.js` is created as a committed source file (not gitignored) that reads `APP_PUBLIC_ORIGIN` with no mode detection.

The principle: E2E tests are just test runners pointed at a real environment. Loading `.env.prod` and running the suite should work identically to loading `.env.dev` — the same code paths, the same credential resolution logic, zero special-casing. The env file IS the configuration.

> **Scope note:** The changes to `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts` in this feature are **limited to removing `E2E_PUBLIC_ORIGIN` references only**. Both files carry additional technical debt (hardcoded mock tokens, dual-path session creation, mixed concerns) that is tracked as separate bugfix specs — see the [Out of Scope](#out-of-scope--known-technical-debt) section below.

`config/app-links.json` is retained as-is. It holds per-app structural metadata (`envKey`, `path`, `devUrl`) that is not origin-specific and remains valid after this change. The file is not redundant — it is the single source of truth for app path segments and dev-mode port assignments. No changes are needed to it.

---

## Architecture

```mermaid
flowchart TD
    subgraph "Env Files (.env.dev / .env.test / .env.staging / .env.prod)"
        A[APP_PUBLIC_ORIGIN]
        B[APP_INTERNAL_ORIGIN]
        SU[NEXT_PUBLIC_SUPABASE_URL]
        SK[SUPABASE_SERVICE_ROLE_KEY]
    end

    subgraph "packages/shared/src/config/appUrls.ts"
        C[getPublicOrigin()\nreads APP_PUBLIC_ORIGIN]
        D[resolveAppUrl(app)\nfallback chain]
        E[appUrls frozen object]
    end

    subgraph "Server-side infrastructure code"
        F[getInternalOrigin()\nreads APP_INTERNAL_ORIGIN]
    end

    subgraph "scripts/app-url-resolver.js (committed)"
        H[resolveE2EAppUrls()\nreads APP_PUBLIC_ORIGIN\nfallback: NEXT_PUBLIC_*_URL]
    end

    subgraph "E2E Fixtures (apps/*/e2e/)"
        I[SUPABASE_URL\nenv file primary\nlocalSupabaseEnv fallback]
        J[injectSession()\nprojectRef from SUPABASE_URL]
    end

    A --> C
    C --> D
    D --> E
    B --> F
    A --> H
    SU --> I
    SK --> I
    I --> J
```

### Fallback chain for `resolveAppUrl` (production)

```
APP_PUBLIC_ORIGIN set?
  YES → origin + app.path  (trailing slash stripped)
  NO  → NEXT_PUBLIC_<APP>_URL set?
          YES → use that value
          NO  → app.path  (relative same-domain path)
```

### Fallback chain for `resolveAppUrl` (non-production)

```
NEXT_PUBLIC_<APP>_URL set?
  YES → use that value
  NO  → app.devUrl  (hardcoded localhost port from app-links.json)
```

`APP_PUBLIC_ORIGIN` is **ignored entirely** outside `NODE_ENV=production`.

---

## Components and Interfaces

### 1. `packages/shared/src/config/appUrls.ts` (updated)

Replace `getPublicOrigin()` to read `APP_PUBLIC_ORIGIN` only:

```typescript
function getPublicOrigin(): string {
  return process.env.APP_PUBLIC_ORIGIN?.trim() ?? "";
}
```

Remove all references to `SITE_PUBLIC_ORIGIN` and `E2E_PUBLIC_ORIGIN`. The rest of `resolveAppUrl` is unchanged — only the variable name changes.

### 2. `config/app-links.json` (unchanged)

No changes. The file holds structural metadata (path segments, dev ports, env key names) that is independent of the origin. It remains the single source of truth consumed by `appUrls.ts`.

### 3. `scripts/lint-envs.mjs` (no logic changes needed)

The linter already enforces key-set parity across all `.env.*` files. No logic changes are required — once the env files are updated with the new keys and the legacy keys are removed, the linter will enforce the new schema automatically on every run.

### 4. E2E Fixtures — `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts`

> **Scope:** Changes to these files in this feature are **limited to removing `E2E_PUBLIC_ORIGIN` references**. The overall architecture of both files (hardcoded mock tokens, dual-path session creation, mixed concerns, module-level side effects) is **not redesigned here** — that work is tracked as separate bugfix specs. See [Out of Scope](#out-of-scope--known-technical-debt).

**What changes in this feature:**

1. Remove `isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN)` from both files.
2. Replace the `isE2EMode`-gated credential resolution with the env-file-primary pattern (env var is primary, `localSupabaseEnv` is fallback for placeholders only).
3. Remove the `supabaseUrlForRef` branch in `injectSession()` that switches based on `E2E_PUBLIC_ORIGIN`.

**Credential resolution change (both files):**

```typescript
// BEFORE — remove this:
// const isE2EMode = Boolean(process.env.E2E_PUBLIC_ORIGIN);
// const SUPABASE_URL =
//   (!isE2EMode && localSupabaseEnv.API_URL) ||
//   (isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL)
//     ? "http://127.0.0.1:54321"
//     : process.env.NEXT_PUBLIC_SUPABASE_URL) ||
//   "http://127.0.0.1:54321";

// AFTER — env file is primary; localSupabaseEnv is fallback for placeholders:
const SUPABASE_URL = isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ? (localSupabaseEnv.API_URL ?? "http://127.0.0.1:54321")
  : (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");

const SERVICE_ROLE_KEY = isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? (localSupabaseEnv.SERVICE_ROLE_KEY ?? "")
  : (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
```

**`injectSession()` change in `apps/auth/e2e/helpers/session.ts`:**

Remove the `supabaseUrlForRef` branch that switches on `E2E_PUBLIC_ORIGIN`. The project ref is always derived from `SUPABASE_URL` (already resolved correctly above):

```typescript
// BEFORE — remove this branch:
// const supabaseUrlForRef =
//   process.env.E2E_PUBLIC_ORIGIN && process.env.NEXT_PUBLIC_SUPABASE_URL
//     ? process.env.NEXT_PUBLIC_SUPABASE_URL
//     : SUPABASE_URL;
// const refHostname = new URL(supabaseUrlForRef).hostname;

// AFTER — always use SUPABASE_URL directly:
const refHostname = new URL(SUPABASE_URL).hostname;
const projectRef =
  refHostname === "localhost" || refHostname === "127.0.0.1"
    ? refHostname
    : refHostname.split(".")[0];
```

No other structural changes to these files in this feature.

### 5. `scripts/app-url-resolver.js` (must be created as a committed file)

This script is `require()`d by all Playwright configs and E2E specs. It is currently gitignored or generated. **It must be created as a committed source file** in the repository so that it is version-controlled alongside the rest of the E2E infrastructure.

It exports `resolveE2EAppUrls()` and `getE2EExtraHTTPHeaders()`. It reads `APP_PUBLIC_ORIGIN` (not `E2E_PUBLIC_ORIGIN`) and applies the same fallback logic as `appUrls.ts`:

```javascript
// scripts/app-url-resolver.js
const path = require("path");
const { loadRootEnv } = require(path.resolve(__dirname, "./load-root-env.js"));
loadRootEnv({ targetEnv: process.env.TARGET_ENV });

const appLinks = require("../config/app-links.json");

function stripTrailingSlash(s) {
  return s.replace(/\/+$/, "");
}

function resolveE2EAppUrls() {
  const publicOrigin = process.env.APP_PUBLIC_ORIGIN
    ? stripTrailingSlash(process.env.APP_PUBLIC_ORIGIN.trim())
    : null;

  const result = {};
  for (const [name, app] of Object.entries(appLinks)) {
    if (publicOrigin) {
      result[name] =
        app.path === "/" ? publicOrigin : `${publicOrigin}${app.path}`;
    } else {
      result[name] = process.env[app.envKey] ?? app.devUrl;
    }
  }
  return result;
}

function getE2EExtraHTTPHeaders() {
  // No E2E-mode-specific headers needed; return empty object
  return {};
}

module.exports = { resolveE2EAppUrls, getE2EExtraHTTPHeaders };
```

No `isE2EMode` flag. No `E2E_PUBLIC_ORIGIN` reference. The script is environment-agnostic: loading `.env.prod` and setting `APP_PUBLIC_ORIGIN=https://store.furrycolombia.com` produces prod URLs; loading `.env.dev` with `APP_PUBLIC_ORIGIN=http://localhost:8088` produces dev URLs.

### 6. Env files (all four)

| File           | `APP_PUBLIC_ORIGIN`               | `APP_INTERNAL_ORIGIN`         |
| -------------- | --------------------------------- | ----------------------------- |
| `.env.dev`     | `http://localhost:8088`           | `http://localhost:8088`       |
| `.env.test`    | `http://localhost:8088`           | `http://localhost:8088`       |
| `.env.staging` | `https://store.ffxivbe.org`       | `http://candyshop-staging:80` |
| `.env.prod`    | `https://store.furrycolombia.com` | `http://candyshop-prod:80`    |

Remove from all four: `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`.

Also remove `SITE_PROD_CONTAINER_NAME` and `SITE_PROD_IMAGE_NAME` if they are dead config (they appear in dev/test as "unused, kept for parity" — confirm before removing; they may be read by Docker Compose or deploy scripts).

### 7. `scripts/server/docker-prod.env.example`

Replace:

```
SITE_PROD_PORT=9090
SITE_PUBLIC_ORIGIN=https://store.furrycolombia.com
```

With:

```
APP_PUBLIC_ORIGIN=https://store.furrycolombia.com
APP_INTERNAL_ORIGIN=http://candyshop-prod:80
```

### 8. Documentation files

- `docs/environment.md` — add `APP_PUBLIC_ORIGIN` and `APP_INTERNAL_ORIGIN` to the key variables table; remove `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`.
- `docs/infrastructure.md` — replace all legacy var references in example env blocks and prose.

---

## Out of Scope — Known Technical Debt

The following files require cleanup that goes beyond removing `E2E_PUBLIC_ORIGIN` references. That broader work is **explicitly out of scope for this feature** and must be tracked as separate bugfix specs.

### `apps/auth/e2e/fixtures/auth.fixture.ts`

Known issues to address in a separate bugfix spec:

- **Hardcoded mock tokens** — the `mockSession` fallback path uses a hardcoded JWT string and `"mock-refresh-token"`. These are not real tokens and will fail against any real Supabase instance.
- **Dual-path session creation** — the file contains two separate code paths for creating a session (mock path vs. admin API path), controlled by `hasUsableServiceRoleKey()`. This mixed-concern logic should be separated.
- **`isE2EMode` flag** — removed by this feature, but the underlying reason it existed (the file needed to know which Supabase instance to target) points to a deeper credential resolution design issue.
- **Mixed concerns** — the fixture mixes Supabase client setup, credential resolution, cookie injection, and user lifecycle management in a single file.

### `apps/auth/e2e/helpers/session.ts`

Known issues to address in a separate bugfix spec:

- **`isE2EMode` flag** — removed by this feature, but the flag was masking a deeper issue: the credential resolution logic was not environment-agnostic.
- **`supabaseUrlForRef` branch in `injectSession()`** — removed by this feature. The branch existed because the cookie project ref was not being derived consistently from the resolved `SUPABASE_URL`.
- **Module-level side effects** — `loadRootEnv()` is called at module load time, which makes the module difficult to test in isolation and can cause ordering issues when multiple fixtures import it.
- **`getLocalSupabaseEnv()` called at module level** — the result is captured at import time, not at call time, which means it cannot reflect env changes made after the module is first loaded.

> These files are easy to find when creating the bugfix specs: search for `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts`.

---

## Data Models

No new data models. The change is purely at the environment variable and module-read level.

The shape of the `appUrls` frozen object is unchanged:

```typescript
{
  landing: string;
  store: string;
  studio: string;
  payments: string;
  admin: string;
  auth: string;
  playground: string;
}
```

The shape of `app-links.json` entries is unchanged:

```typescript
{
  envKey: string; // e.g. "NEXT_PUBLIC_STORE_URL"
  path: string; // e.g. "/store"
  devUrl: string; // e.g. "http://localhost:5001"
}
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

The URL derivation logic in `appUrls.ts` is a pure function of environment variables — it has clear input/output behavior, the input space (valid origin strings) is large, and 100 iterations with random inputs will surface edge cases (unusual ports, subdomains, paths, trailing slashes) that a handful of hand-written examples would miss. PBT is appropriate here.

The credential resolution logic in the E2E fixtures is also a pure function: given a `NEXT_PUBLIC_SUPABASE_URL` value and a `localSupabaseEnv.API_URL` value, the resolved `SUPABASE_URL` is deterministic. The input space (placeholder vs. non-placeholder strings, various URL formats) benefits from property-based testing.

### Property 1: APP_PUBLIC_ORIGIN produces the same URLs as SITE_PUBLIC_ORIGIN did

_For any_ valid origin string `x`, the `appUrls` object produced when `APP_PUBLIC_ORIGIN=x` (and `NODE_ENV=production`) SHALL be identical to the `appUrls` object that the old code produced when `SITE_PUBLIC_ORIGIN=x` — i.e., each app URL equals `stripTrailingSlash(x) + app.path` (or `stripTrailingSlash(x)` for the landing app whose path is `/`).

**Validates: Requirements 6.1, 1.2**

### Property 2: Trailing slash normalization is idempotent

_For any_ valid origin string `x` and any number of trailing slashes appended to it, the `appUrls` object produced in production SHALL be identical to the object produced from `x` with no trailing slash. That is, `appUrls(APP_PUBLIC_ORIGIN = x + "///")` equals `appUrls(APP_PUBLIC_ORIGIN = x)` for all apps.

**Validates: Requirements 1.3, 6.2**

### Property 3: APP_PUBLIC_ORIGIN is ignored outside production

_For any_ `APP_PUBLIC_ORIGIN` value and any `NODE_ENV` value other than `"production"`, the `appUrls` object SHALL be identical to the object produced when `APP_PUBLIC_ORIGIN` is unset — i.e., the origin has no effect on non-production URL resolution.

**Validates: Requirements 1.5**

### Property 4: Env file value is used when not a placeholder

_For any_ non-placeholder `NEXT_PUBLIC_SUPABASE_URL` value (a string that does not start with `YOUR_` and is non-empty), the resolved `SUPABASE_URL` in E2E fixtures SHALL equal that env file value — regardless of what `getLocalSupabaseEnv()` returns. Similarly, for any non-placeholder `SUPABASE_SERVICE_ROLE_KEY`, the resolved `SERVICE_ROLE_KEY` SHALL equal that env file value.

**Validates: Requirements 4.2, 8.2, 8.3**

### Property 5: Project ref is correctly derived from any Supabase URL

_For any_ Supabase URL string, the cookie project ref derived by `injectSession()` SHALL be: the full hostname when the hostname is `localhost` or `127.0.0.1`; otherwise the first dot-separated segment of the hostname (e.g., `abcdefghij` from `abcdefghij.supabase.co`). This property holds for all valid URL strings regardless of which environment is active.

**Validates: Requirements 8.4**

---

## Error Handling

### Invalid or missing `APP_PUBLIC_ORIGIN` in production

`appUrls.ts` does not throw on missing or malformed `APP_PUBLIC_ORIGIN`. The fallback chain handles it gracefully:

- Empty string or unset → falls through to `NEXT_PUBLIC_*_URL` values, then to relative paths.
- Malformed URL (e.g., missing scheme) → the string is used as-is for joining, which may produce broken URLs. This is the same behavior as the old `SITE_PUBLIC_ORIGIN` handling. No change in error posture.

If stricter validation is desired in the future, a startup check can be added to `load-env.mjs` that validates `APP_PUBLIC_ORIGIN` matches `^https?://[^/]` when `NODE_ENV=production`. This is out of scope for this feature.

### Missing `APP_INTERNAL_ORIGIN`

Server-side code reading `APP_INTERNAL_ORIGIN` falls back to `http://localhost`. This is safe for local dev and test environments where the internal and public origins are the same address.

### Env linter failures

If any env file is missing `APP_PUBLIC_ORIGIN` or `APP_INTERNAL_ORIGIN`, or still contains a legacy key, `pnpm lint:env` exits with code 1 and lists the offending keys. This is the existing linter behavior — no changes needed.

---

## Testing Strategy

### Unit tests — `packages/shared/src/config/appUrls.test.ts`

Update `clearAppUrlEnvVars()` to stub `APP_PUBLIC_ORIGIN` instead of `SITE_PUBLIC_ORIGIN` and `E2E_PUBLIC_ORIGIN`:

```typescript
function clearAppUrlEnvVars() {
  vi.stubEnv("APP_PUBLIC_ORIGIN", "");
  vi.stubEnv("NEXT_PUBLIC_LANDING_URL", "");
  // ... rest unchanged
}
```

Update the existing test cases that stub `SITE_PUBLIC_ORIGIN` to stub `APP_PUBLIC_ORIGIN` instead. All existing scenarios continue to pass — only the variable name changes.

Add example tests for:

- `APP_PUBLIC_ORIGIN` unset in production → falls back to `NEXT_PUBLIC_*_URL`, then relative paths.
- `APP_PUBLIC_ORIGIN` set in development → ignored, dev defaults used.
- Legacy vars (`SITE_PUBLIC_ORIGIN`, `E2E_PUBLIC_ORIGIN`) stubbed → have no effect on output.

### Property-based tests — `packages/shared/src/config/appUrls.property.test.ts`

Use **fast-check** (already available in the JS ecosystem; install as a dev dependency if not present).

Each property test runs a minimum of **100 iterations**.

Tag format: `Feature: app-navigation-origins, Property {N}: {property_text}`

**Property 1 test** — origin equivalence:

```typescript
// Feature: app-navigation-origins, Property 1: APP_PUBLIC_ORIGIN produces same URLs as SITE_PUBLIC_ORIGIN
fc.assert(
  fc.asyncProperty(validOriginArb, async (origin) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_PUBLIC_ORIGIN", origin);
    const { appUrls } = await importFreshAppUrls();
    const stripped = stripTrailingSlash(origin);
    expect(appUrls.store).toBe(`${stripped}/store`);
    expect(appUrls.auth).toBe(`${stripped}/auth`);
    expect(appUrls.landing).toBe(stripped);
    // ... all apps
  }),
  { numRuns: 100 },
);
```

`validOriginArb` generates strings matching `^https?://[a-z0-9.-]+(:[0-9]+)?` — no trailing slash.

**Property 2 test** — trailing slash idempotence:

```typescript
// Feature: app-navigation-origins, Property 2: Trailing slash normalization is idempotent
fc.assert(
  fc.asyncProperty(
    validOriginArb,
    fc.integer({ min: 0, max: 5 }),
    async (origin, slashes) => {
      const withSlashes = origin + "/".repeat(slashes);
      // appUrls from origin+slashes should equal appUrls from origin
      const urlsA = await resolveWithOrigin(origin);
      const urlsB = await resolveWithOrigin(withSlashes);
      expect(urlsA).toEqual(urlsB);
    },
  ),
  { numRuns: 100 },
);
```

**Property 3 test** — APP_PUBLIC_ORIGIN ignored outside production:

```typescript
// Feature: app-navigation-origins, Property 3: APP_PUBLIC_ORIGIN is ignored outside production
fc.assert(
  fc.asyncProperty(
    validOriginArb,
    fc.constantFrom("development", "test", ""),
    async (origin, nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("APP_PUBLIC_ORIGIN", origin);
      const withOrigin = await importFreshAppUrls();

      vi.stubEnv("APP_PUBLIC_ORIGIN", "");
      const withoutOrigin = await importFreshAppUrls();

      expect(withOrigin.appUrls).toEqual(withoutOrigin.appUrls);
    },
  ),
  { numRuns: 100 },
);
```

**Property 4 test** — env file value is used when not a placeholder:

```typescript
// Feature: app-navigation-origins, Property 4: Env file value is used when not a placeholder
const nonPlaceholderUrlArb = fc.webUrl().filter((s) => !s.startsWith("YOUR_"));
const localEnvArb = fc.record({
  API_URL: fc.webUrl(),
  SERVICE_ROLE_KEY: fc.string(),
});

fc.assert(
  fc.property(nonPlaceholderUrlArb, localEnvArb, (envUrl, localEnv) => {
    const resolved = resolveSupabaseUrl(envUrl, localEnv);
    expect(resolved).toBe(envUrl);
  }),
  { numRuns: 100 },
);
```

`resolveSupabaseUrl` is the extracted pure function from the credential resolution logic.

**Property 5 test** — project ref derived correctly from any Supabase URL:

```typescript
// Feature: app-navigation-origins, Property 5: Project ref is correctly derived from any Supabase URL
const supabaseUrlArb = fc.oneof(
  fc.constant("http://localhost:54321"),
  fc.constant("http://127.0.0.1:54321"),
  fc
    .webUrl()
    .map(
      (u) =>
        `https://${fc.sample(fc.stringMatching(/^[a-z]{10}$/), 1)[0]}.supabase.co`,
    ),
);

fc.assert(
  fc.property(supabaseUrlArb, (url) => {
    const hostname = new URL(url).hostname;
    const ref = deriveProjectRef(hostname);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      expect(ref).toBe(hostname);
    } else {
      expect(ref).toBe(hostname.split(".")[0]);
    }
  }),
  { numRuns: 100 },
);
```

`deriveProjectRef` is the extracted pure function from `injectSession()`.

### Integration / smoke tests

- Run `pnpm lint:env` after env file changes and assert exit code 0.
- Grep-based assertion that no env file contains `SITE_PROD_PORT`, `SITE_PUBLIC_ORIGIN`, or `E2E_PUBLIC_ORIGIN`.
- Grep-based assertion that `appUrls.ts` does not reference `SITE_PUBLIC_ORIGIN` or `E2E_PUBLIC_ORIGIN`.
- Grep-based assertion that `apps/auth/e2e/fixtures/auth.fixture.ts`, `apps/auth/e2e/helpers/session.ts`, and `scripts/app-url-resolver.js` do not reference `E2E_PUBLIC_ORIGIN` or `isE2EMode`.

### E2E fixture tests

No new automated tests for the fixture changes — the credential resolution logic is a direct env-var read with a simple placeholder fallback, covered by Properties 4 and 5. The E2E fixtures themselves are exercised by the full E2E suite.

The reference implementation to validate against is `apps/store/e2e/auth.setup.ts`, which already follows the correct pattern: env file primary, `localSupabaseEnv` fallback for placeholders, no mode flag. After this change, `apps/auth/e2e/fixtures/auth.fixture.ts` and `apps/auth/e2e/helpers/session.ts` must follow the same pattern for credential resolution — but no other structural changes are made to those files in this feature (see [Out of Scope](#out-of-scope--known-technical-debt)).
