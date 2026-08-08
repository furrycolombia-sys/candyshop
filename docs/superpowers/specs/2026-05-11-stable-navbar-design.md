# Stable Navbar Across App Navigations

**Date:** 2026-05-11
**Status:** Approved

---

## Problem

When a user navigates between apps (e.g. store → studio), the browser does a full hard navigation. The `useCurrentUserPermissions` hook always starts with `grantedKeys = []` and `isLoading = true`. Because `AppNavigation` hides permission-gated apps while loading, those items (studio, payments, admin, playground) disappear briefly then pop back in — creating a flash that feels unstable and untrustworthy.

---

## Goal

The navbar must appear stable on every cross-app navigation. The existing permission-based show/hide logic must not change. Fresh permissions must always be fetched from the backend; the cookie is only a seed for the initial render. If permissions change, the navbar updates — that is expected behaviour.

---

## Architecture

### New files

| File                                                  | Purpose                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/shared/src/constants/nav.ts`                | Cookie key constant `NAV_PERM_COOKIE_KEY`                            |
| `packages/auth/src/client/navPermCachePersistence.ts` | Cookie read/write/clear helpers (mirrors `cartCookiePersistence.ts`) |

### Changed files

| File                                                       | Change                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/shared/src/constants/index.ts`                   | Export `NAV_PERM_COOKIE_KEY`                                                       |
| `packages/auth/package.json`                               | Add `cookies-next` and `shared` as dependencies                                    |
| `packages/auth/src/client/permissions.tsx`                 | Seed state from cookie; write/clear on fetch/logout; return `hasCachedPermissions` |
| `packages/app-components/src/components/AppNavigation.tsx` | Accept `hasCachedPermissions` in `permissionState`; one-line filter change         |
| `e2e/navbar-persistence.spec.ts`                           | New E2E spec targeting staging                                                     |

---

## Implementation Details

### `packages/shared/src/constants/nav.ts` (new)

```typescript
export const NAV_PERM_COOKIE_KEY = "libra-nav-perm";
```

Exported from `packages/shared/src/constants/index.ts` alongside `CART_COOKIE_KEY`.

---

### `packages/auth/src/client/navPermCachePersistence.ts` (new)

Mirrors `apps/store/src/features/cart/application/cartCookiePersistence.ts`:

- `getNavPermCookieOptions()` — same logic as `getCartCookieOptions()`: detects `secure` from `location.protocol`, uses `getSharedCookieDomain` from `shared`, `path: "/"`, `sameSite: "lax"`. This handles all environments correctly:
  - **Dev** (no nginx): apps run on `localhost:5001`, `localhost:5002`, etc. `getSharedCookieDomain("localhost")` returns `undefined` so no `domain` attribute is set. Modern browsers (Chrome, Firefox) share cookies across all ports on `localhost`, so the cookie is accessible from every dev app.
  - **Production** (nginx, same domain, different paths): `getSharedCookieDomain("example.com")` returns `.example.com` — cookie is shared across all paths and any subdomains.
  - **Staging / subdomain deployments**: same `getSharedCookieDomain` logic returns the root domain, so `store.staging.example.com` and `admin.staging.example.com` share the cookie.
- `readNavPermCache(): string[] | null` — uses `getCookie` from `cookies-next`; wraps `JSON.parse` in try/catch; validates result is a `string[]`; returns `null` on any error.
- `writeNavPermCache(keys: string[]): void` — uses `setCookie` from `cookies-next` with `maxAge: 3600` (1 hour).
- `clearNavPermCache(): void` — uses `deleteCookie` from `cookies-next`; mirrors cart's double-delete pattern: deletes with domain options first, then deletes again without domain (`path: "/"` only) to catch any cookie that was previously written without a domain attribute (e.g. if a user first visited in dev then later in production).

---

### `packages/auth/src/client/permissions.tsx` changes

```typescript
// Initialize from cache (captured once on mount via useRef)
const hasCachedPermissions = useRef(readNavPermCache() !== null).current;
const [grantedKeys, setGrantedKeys] = useState<string[]>(
  () => readNavPermCache() ?? [],
);
```

After successful Supabase fetch, before `setGrantedKeys`:

```typescript
writeNavPermCache([...uniqueKeys]);
setGrantedKeys([...uniqueKeys]);
```

When `userId` becomes `null` (no authenticated user):

```typescript
clearNavPermCache();
setGrantedKeys([]);
```

Add `hasCachedPermissions: boolean` to the hook's return value. No other changes to fetch logic, error handling, or `isLoading` lifecycle.

---

### `packages/app-components/src/components/AppNavigation.tsx` changes

Accept `hasCachedPermissions?: boolean` in `permissionState` (optional, defaults to `false`).

One-line change in `visibleApps` filter:

```typescript
// Before
if (isLoading) return false;

// After
if (isLoading && !hasCachedPermissions) return false;
```

All other logic — `matchesPermissions`, `APP_ACCESS_RULES`, `APP_ORDER`, active-link highlighting — is unchanged.

---

## Data Flow

### Returning user (cookie present)

1. Hard navigation to any app.
2. Hook reads cookie on mount → `grantedKeys` pre-populated, `hasCachedPermissions = true`.
3. `AppNavigation` renders immediately with correct visible apps — no loading state shown.
4. Supabase fetch runs in background.
5. Fetch completes:
   - **Same keys** → no state change, no re-render, cookie unchanged.
   - **Different keys** → `setGrantedKeys` called, cookie updated, navbar updates. Expected and intentional.

### First visit / expired cookie

1. No cookie → `grantedKeys = []`, `hasCachedPermissions = false`.
2. Gated apps hidden during load (current behaviour — acceptable for first visit only).
3. Fetch completes → navbar renders correctly, cookie written.
4. All subsequent navigations: stable.

### Logout

1. `userId` becomes `null`.
2. Hook calls `clearNavPermCache()`, sets `grantedKeys = []`.
3. Navbar correctly shows only public apps.

### Tampered / invalid cookie

1. `readNavPermCache()` returns `null` on any parse error or invalid shape.
2. Falls back to no-cache behaviour. No crash, no security risk.

---

## Security Note

`nav_perm_cache` is a UI rendering cache only. It does not grant access to anything. API endpoints enforce actual permissions. A user with a revoked permission may briefly see the old navbar item before the background fetch completes; clicking it will fail at the API layer. This is acceptable.

---

## Testing

### Unit tests — `packages/auth/src/client/permissions.tsx`

| Scenario                     | Expected                                                         |
| ---------------------------- | ---------------------------------------------------------------- |
| Cookie present on mount      | `grantedKeys` initialized from it; `hasCachedPermissions = true` |
| No cookie on mount           | `grantedKeys = []`; `hasCachedPermissions = false`               |
| Fetch returns same keys      | Cookie unchanged; no extra re-render                             |
| Fetch returns different keys | State updated; cookie updated                                    |
| Invalid cookie JSON          | Falls back to `null`; no crash                                   |
| Logout (userId → null)       | Cookie cleared; `grantedKeys = []`                               |

### Unit tests — `packages/app-components/src/components/AppNavigation.tsx`

| Scenario                                                         | Expected                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| `isLoading=true`, `hasCachedPermissions=false`                   | Gated apps hidden                                        |
| `isLoading=true`, `hasCachedPermissions=true`, keys grant studio | Studio shown                                             |
| `isLoading=false`                                                | Normal permission logic applies regardless of cache flag |

### E2E tests — `e2e/navbar-persistence.spec.ts` (target: staging)

- Sign in as a seller with known permissions (studio + payments access).
- Navigate store → studio → payments → admin.
- Assert `tid("app-navigation")` is visible on every page.
- Assert `aria-current="page"` is on the correct app link after each navigation.
- Assert gated apps the user has access to remain visible on every navigation without pop-in.
- Assert a gated app the user lacks (e.g. admin for a non-admin seller) is never visible.
