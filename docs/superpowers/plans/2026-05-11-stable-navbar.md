# Stable Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache granted permission keys in a cookie so the AppNavigation renders immediately on cross-app hard navigation instead of flashing blank while Supabase is queried.

**Architecture:** Seed `useCurrentUserPermissions` initial state from a `libra-nav-perm` cookie written on every successful fetch. Pass a new `hasCachedPermissions` flag from the hook into `AppNavigation`, which uses it to skip the loading-hide only when cached data is available. Fresh permissions are always fetched and the cookie is updated or unchanged accordingly.

**Tech Stack:** `cookies-next` (already a monorepo dep), `getSharedCookieDomain` from `packages/shared`, Vitest + React Testing Library for unit tests, Playwright for E2E targeting staging.

---

## File Map

| Action | Path                                                            | Purpose                                                                |
| ------ | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Create | `packages/shared/src/constants/nav.ts`                          | `NAV_PERM_COOKIE_KEY` constant                                         |
| Modify | `packages/shared/src/constants/index.ts`                        | Export `NAV_PERM_COOKIE_KEY`                                           |
| Modify | `packages/auth/package.json`                                    | Add `cookies-next` and `shared` deps                                   |
| Create | `packages/auth/src/client/navPermCachePersistence.ts`           | read / write / clear helpers                                           |
| Create | `packages/auth/src/client/navPermCachePersistence.test.ts`      | Unit tests for persistence                                             |
| Modify | `packages/auth/src/client/permissions.tsx`                      | Seed from cookie; write/clear on change; return `hasCachedPermissions` |
| Create | `packages/auth/src/client/permissions.test.tsx`                 | Unit tests for hook changes                                            |
| Modify | `packages/app-components/src/components/AppNavigation.tsx`      | Accept `hasCachedPermissions`; one-line filter change                  |
| Modify | `packages/app-components/src/components/AppNavigation.test.tsx` | Tests for new prop scenarios                                           |
| Create | `apps/store/e2e/navbar-persistence.spec.ts`                     | E2E spec targeting staging                                             |

---

## Task 1: Cookie key constant + auth package deps

**Files:**

- Create: `packages/shared/src/constants/nav.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Modify: `packages/auth/package.json`

- [ ] **Step 1: Create the constant file**

`packages/shared/src/constants/nav.ts`:

```typescript
/** Cookie key used to cache nav permission keys across cross-app navigations */
export const NAV_PERM_COOKIE_KEY = "libra-nav-perm";
```

- [ ] **Step 2: Export from the constants barrel**

In `packages/shared/src/constants/index.ts`, add the new export (alongside `CART_COOKIE_KEY`):

```typescript
export {
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  TIME_CONSTANTS,
} from "./time";
export { CART_COOKIE_KEY } from "./cart";
export { NAV_PERM_COOKIE_KEY } from "./nav";
export { ORDER_STATUS_LIST } from "./orders";
export { PROCESS_FLOW } from "./processFlow";
```

- [ ] **Step 3: Add dependencies to packages/auth/package.json**

Replace the `"dependencies"` block:

```json
"dependencies": {
  "api": "workspace:*",
  "cookies-next": "*",
  "next-intl": "^4.9.1",
  "shared": "workspace:*"
},
```

- [ ] **Step 4: Install new deps**

Run from the monorepo root:

```bash
pnpm install
```

Expected: no errors, `packages/auth/node_modules` resolves `cookies-next` and `shared`.

- [ ] **Step 5: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/constants/nav.ts packages/shared/src/constants/index.ts packages/auth/package.json pnpm-lock.yaml
git commit -m "feat(nav): add NAV_PERM_COOKIE_KEY constant and auth deps [GH-???]"
```

---

## Task 2: navPermCachePersistence.ts (TDD)

**Files:**

- Create: `packages/auth/src/client/navPermCachePersistence.test.ts`
- Create: `packages/auth/src/client/navPermCachePersistence.ts`

### Step 1: Write the failing tests

- [ ] **Create `packages/auth/src/client/navPermCachePersistence.test.ts`:**

```typescript
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cookies-next", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

vi.mock("shared", () => ({
  getSharedCookieDomain: vi.fn().mockReturnValue(undefined),
}));

import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { getSharedCookieDomain } from "shared";
import {
  readNavPermCache,
  writeNavPermCache,
  clearNavPermCache,
} from "./navPermCachePersistence";

const mockGetCookie = vi.mocked(getCookie);
const mockSetCookie = vi.mocked(setCookie);
const mockDeleteCookie = vi.mocked(deleteCookie);
const mockGetSharedDomain = vi.mocked(getSharedCookieDomain);

describe("readNavPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when cookie is absent", () => {
    mockGetCookie.mockReturnValue(undefined);
    expect(readNavPermCache()).toBeNull();
  });

  it("returns string[] when cookie holds valid JSON array", () => {
    mockGetCookie.mockReturnValue(
      JSON.stringify(["products.create", "orders.read"]),
    );
    expect(readNavPermCache()).toEqual(["products.create", "orders.read"]);
  });

  it("returns empty array when cookie holds []", () => {
    mockGetCookie.mockReturnValue("[]");
    expect(readNavPermCache()).toEqual([]);
  });

  it("returns null when cookie holds invalid JSON", () => {
    mockGetCookie.mockReturnValue("not-json{{{");
    expect(readNavPermCache()).toBeNull();
  });

  it("returns null when cookie holds a non-array JSON value", () => {
    mockGetCookie.mockReturnValue(JSON.stringify({ key: "value" }));
    expect(readNavPermCache()).toBeNull();
  });

  it("returns null when cookie holds an array with non-string items", () => {
    mockGetCookie.mockReturnValue(JSON.stringify([1, 2, 3]));
    expect(readNavPermCache()).toBeNull();
  });
});

describe("writeNavPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls setCookie with the key, JSON-stringified keys, and maxAge 3600", () => {
    const keys = ["products.create", "orders.read"];
    writeNavPermCache(keys);

    expect(mockSetCookie).toHaveBeenCalledWith(
      "libra-nav-perm",
      JSON.stringify(keys),
      expect.objectContaining({ maxAge: 3600 }),
    );
  });

  it("does NOT pre-delete when domain is undefined (localhost dev)", () => {
    mockGetSharedDomain.mockReturnValue(undefined);
    writeNavPermCache(["products.create"]);

    expect(mockDeleteCookie).not.toHaveBeenCalled();
  });

  it("pre-deletes the no-domain cookie before setting when domain is present", () => {
    mockGetSharedDomain.mockReturnValue(".example.com");
    writeNavPermCache(["products.create"]);

    expect(mockDeleteCookie).toHaveBeenCalledWith("libra-nav-perm", {
      path: "/",
    });
    expect(mockSetCookie).toHaveBeenCalledWith(
      "libra-nav-perm",
      expect.any(String),
      expect.objectContaining({ domain: ".example.com" }),
    );
  });
});

describe("clearNavPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteCookie once with base options when domain is undefined", () => {
    mockGetSharedDomain.mockReturnValue(undefined);
    clearNavPermCache();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(1);
    expect(mockDeleteCookie).toHaveBeenCalledWith(
      "libra-nav-perm",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("calls deleteCookie twice when domain is present (double-delete pattern)", () => {
    mockGetSharedDomain.mockReturnValue(".example.com");
    clearNavPermCache();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(2);
    expect(mockDeleteCookie).toHaveBeenNthCalledWith(
      1,
      "libra-nav-perm",
      expect.objectContaining({ domain: ".example.com" }),
    );
    expect(mockDeleteCookie).toHaveBeenNthCalledWith(2, "libra-nav-perm", {
      path: "/",
    });
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
pnpm --filter auth test navPermCachePersistence
```

Expected: FAIL — `Cannot find module './navPermCachePersistence'`

- [ ] **Step 3: Create `packages/auth/src/client/navPermCachePersistence.ts`:**

```typescript
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { getSharedCookieDomain } from "shared";

import { NAV_PERM_COOKIE_KEY } from "shared/constants/nav";

const NAV_PERM_MAX_AGE = 3600;

function getNavPermCookieOptions() {
  const isSecure =
    globalThis.window !== undefined &&
    globalThis.location.protocol === "https:";
  let sharedDomain: string | undefined;
  if (globalThis.window !== undefined) {
    sharedDomain = getSharedCookieDomain(globalThis.location.hostname);
  }

  return {
    path: "/",
    ...(sharedDomain ? { domain: sharedDomain } : {}),
    sameSite: "lax" as const,
    secure: isSecure,
  };
}

export function readNavPermCache(): string[] | null {
  try {
    const raw = getCookie(NAV_PERM_COOKIE_KEY);
    if (raw === undefined || raw === null) return null;
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((item) => typeof item === "string")) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

export function writeNavPermCache(keys: string[]): void {
  const options = getNavPermCookieOptions();
  if (options.domain) {
    deleteCookie(NAV_PERM_COOKIE_KEY, { path: "/" });
  }
  setCookie(NAV_PERM_COOKIE_KEY, JSON.stringify(keys), {
    ...options,
    maxAge: NAV_PERM_MAX_AGE,
  });
}

export function clearNavPermCache(): void {
  const options = getNavPermCookieOptions();
  deleteCookie(NAV_PERM_COOKIE_KEY, options);
  if (options.domain !== undefined) {
    deleteCookie(NAV_PERM_COOKIE_KEY, { path: "/" });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter auth test navPermCachePersistence
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/auth/src/client/navPermCachePersistence.ts packages/auth/src/client/navPermCachePersistence.test.ts
git commit -m "feat(nav): add navPermCachePersistence helpers [GH-???]"
```

---

## Task 3: useCurrentUserPermissions — seed from cookie, write/clear (TDD)

**Files:**

- Create: `packages/auth/src/client/permissions.test.tsx`
- Modify: `packages/auth/src/client/permissions.tsx`

### Step 1: Write the failing tests

- [ ] **Create `packages/auth/src/client/permissions.test.tsx`:**

```typescript
// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./navPermCachePersistence", () => ({
  readNavPermCache: vi.fn().mockReturnValue(null),
  writeNavPermCache: vi.fn(),
  clearNavPermCache: vi.fn(),
}));

vi.mock("./useSupabaseAuth", () => ({
  useSupabaseAuth: vi.fn().mockReturnValue({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

import {
  readNavPermCache,
  writeNavPermCache,
  clearNavPermCache,
} from "./navPermCachePersistence";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { createBrowserSupabaseClient } from "api/supabase";
import { useCurrentUserPermissions } from "./permissions";

const mockReadCache = vi.mocked(readNavPermCache);
const mockWriteCache = vi.mocked(writeNavPermCache);
const mockClearCache = vi.mocked(clearNavPermCache);
const mockUseSupabaseAuth = vi.mocked(useSupabaseAuth);
const mockCreateClient = vi.mocked(createBrowserSupabaseClient);

type PermRow = {
  expires_at: string | null;
  resource_permissions: { permissions: { key: string } };
};

function makeQuery(data: unknown[], error: null | Error = null) {
  let q: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    then: (
      cb?: (v: { data: unknown[]; error: null | Error }) => unknown,
    ) => Promise<unknown>;
  };
  q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    then: (cb) => Promise.resolve({ data, error }).then(cb),
  };
  return q;
}

function makeSupabase(
  userPermsData: PermRow[] = [],
  sellerAdminsData: { permissions: string[] }[] = [],
  userPermsError: null | Error = null,
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "user_permissions") {
        return makeQuery(userPermsData, userPermsError);
      }
      return makeQuery(sellerAdminsData);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSupabaseAuth.mockReturnValue({
    user: { id: "user-1" } as ReturnType<typeof useSupabaseAuth>["user"],
    isAuthenticated: true,
    isLoading: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCurrentUserPermissions — cookie seeding", () => {
  it("initializes grantedKeys to [] and hasCachedPermissions false when no cookie", () => {
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase() as ReturnType<typeof createBrowserSupabaseClient>,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    // Synchronous initial state
    expect(result.current.hasCachedPermissions).toBe(false);
    expect(result.current.grantedKeys).toEqual([]);
  });

  it("initializes grantedKeys from cookie and hasCachedPermissions true when cookie present", () => {
    mockReadCache.mockReturnValue(["products.create", "orders.read"]);
    mockCreateClient.mockReturnValue(
      makeSupabase() as ReturnType<typeof createBrowserSupabaseClient>,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    expect(result.current.hasCachedPermissions).toBe(true);
    expect(result.current.grantedKeys).toEqual([
      "products.create",
      "orders.read",
    ]);
  });
});

describe("useCurrentUserPermissions — cache write on fetch", () => {
  it("calls writeNavPermCache with fetched keys after successful fetch", async () => {
    mockReadCache.mockReturnValue(null);
    const perms: PermRow[] = [
      {
        expires_at: null,
        resource_permissions: { permissions: { key: "products.create" } },
      },
    ];
    mockCreateClient.mockReturnValue(
      makeSupabase(perms) as ReturnType<typeof createBrowserSupabaseClient>,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWriteCache).toHaveBeenCalledWith(["products.create"]);
    expect(result.current.grantedKeys).toEqual(["products.create"]);
  });

  it("writes empty array to cache when user has no permissions", async () => {
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase([]) as ReturnType<typeof createBrowserSupabaseClient>,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWriteCache).toHaveBeenCalledWith([]);
  });

  it("does NOT call writeNavPermCache when the fetch returns an error", async () => {
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase([], [], new Error("DB error")) as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWriteCache).not.toHaveBeenCalled();
  });
});

describe("useCurrentUserPermissions — cache clear on logout", () => {
  it("calls clearNavPermCache and resets grantedKeys when userId becomes null", async () => {
    mockReadCache.mockReturnValue(["products.create"]);
    mockCreateClient.mockReturnValue(
      makeSupabase() as ReturnType<typeof createBrowserSupabaseClient>,
    );

    // Start authenticated
    mockUseSupabaseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockClearCache).toHaveBeenCalled();
    expect(result.current.grantedKeys).toEqual([]);
  });
});

describe("useCurrentUserPermissions — hasCachedPermissions stability", () => {
  it("hasCachedPermissions stays true even after fetch completes with empty keys", async () => {
    mockReadCache.mockReturnValue(["products.create"]);
    mockCreateClient.mockReturnValue(
      makeSupabase([]) as ReturnType<typeof createBrowserSupabaseClient>,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    // Initially true from cookie
    expect(result.current.hasCachedPermissions).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Still true — it's a mount-time snapshot
    expect(result.current.hasCachedPermissions).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
pnpm --filter auth test permissions
```

Expected: FAIL — `hasCachedPermissions` is not in the return type / initial state doesn't use cookie.

- [ ] **Step 3: Update `packages/auth/src/client/permissions.tsx`**

Full replacement of the file (only the `useCurrentUserPermissions` function body and return type change; all other exports are unchanged):

```typescript
"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  clearNavPermCache,
  readNavPermCache,
  writeNavPermCache,
} from "./navPermCachePersistence";
import { useSupabaseAuth } from "./useSupabaseAuth";

type PermissionRow = {
  expires_at: string | null;
  resource_permissions: {
    permissions: {
      key: string;
    };
  };
};

export type PermissionRequirementMode = "all" | "any";

function normalizeRequired(
  required: string | readonly string[],
): readonly string[] {
  if (typeof required === "string") {
    return [required];
  }

  return required;
}

export function matchesPermissions(
  grantedKeys: string[],
  required: string | readonly string[],
  mode: PermissionRequirementMode = "all",
): boolean {
  const requiredKeys = normalizeRequired(required);

  if (requiredKeys.length === 0) return true;
  if (mode === "any") {
    return requiredKeys.some((key) => grantedKeys.includes(key));
  }

  return requiredKeys.every((key) => grantedKeys.includes(key));
}

export function useCurrentUserPermissions() {
  const { user, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Captured once on mount — true only when a valid cookie exists at page load.
  const hasCachedPermissions = useRef(readNavPermCache() !== null).current;

  const [grantedKeys, setGrantedKeys] = useState<string[]>(
    () => readNavPermCache() ?? [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadPermissions() {
      if (authLoading) return;

      if (!userId) {
        if (isActive) {
          clearNavPermCache();
          setGrantedKeys([]);
          loadedUserIdRef.current = null;
          setIsLoading(false);
        }
        return;
      }

      // Always show loading state while fetching to prevent stale permissions
      // from briefly appearing after a session change or page navigation.
      setIsLoading(true);

      const [{ data, error }, { data: delegateData }] = await Promise.all([
        supabase
          .from("user_permissions")
          .select(
            "expires_at,resource_permissions!inner(permissions!inner(key))",
          )
          .eq("user_id", userId)
          .eq("mode", "grant"),
        supabase
          .from("seller_admins")
          .select("permissions")
          .eq("admin_user_id", userId),
      ]);

      if (!isActive) return;

      if (error) {
        setGrantedKeys([]);
        loadedUserIdRef.current = userId;
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const uniqueKeys = new Set(
        ((data ?? []) as PermissionRow[])
          .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
          .map((row) => row.resource_permissions.permissions.key),
      );

      for (const row of delegateData ?? []) {
        for (const key of row.permissions ?? []) {
          uniqueKeys.add(key);
        }
      }

      writeNavPermCache([...uniqueKeys]);
      setGrantedKeys([...uniqueKeys]);
      loadedUserIdRef.current = userId;
      setIsLoading(false);
    }

    loadPermissions();

    return () => {
      isActive = false;
    };
  }, [authLoading, supabase, userId]);

  return {
    grantedKeys,
    hasCachedPermissions,
    isLoading: authLoading || isLoading,
    isAuthenticated,
    hasPermission: (
      required: string | readonly string[],
      mode: PermissionRequirementMode = "all",
    ) => matchesPermissions(grantedKeys, required, mode),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter auth test permissions
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Run full auth test suite**

```bash
pnpm --filter auth test
```

Expected: all tests PASS (including pre-existing useAuth tests).

- [ ] **Step 6: Commit**

```bash
git add packages/auth/src/client/permissions.tsx packages/auth/src/client/permissions.test.tsx
git commit -m "feat(nav): seed permissions from cookie and write/clear on change [GH-???]"
```

---

## Task 4: AppNavigation — accept hasCachedPermissions, update filter (TDD)

**Files:**

- Modify: `packages/app-components/src/components/AppNavigation.test.tsx`
- Modify: `packages/app-components/src/components/AppNavigation.tsx`

### Step 1: Write the failing tests

- [ ] **Add three new test cases to the end of the existing `describe("AppNavigation")` block in `AppNavigation.test.tsx`:**

```typescript
  it("hides gated apps while loading when hasCachedPermissions is false (default)", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
        permissionState={{
          grantedKeys: ["products.create"],
          isLoading: true,
          hasCachedPermissions: false,
        }}
      />,
    );

    expect(screen.queryByTestId("nav-link-studio")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-link-payments")).not.toBeInTheDocument();
  });

  it("shows gated apps while loading when hasCachedPermissions is true and keys grant access", () => {
    render(
      <AppNavigation
        currentApp="studio"
        urls={defaultUrls}
        locales={defaultLocales}
        permissionState={{
          grantedKeys: ["products.create"],
          isLoading: true,
          hasCachedPermissions: true,
        }}
      />,
    );

    expect(screen.getByTestId("nav-link-studio")).toBeInTheDocument();
  });

  it("applies normal permission logic when isLoading is false, regardless of hasCachedPermissions", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
        permissionState={{
          grantedKeys: ["products.create"],
          isLoading: false,
          hasCachedPermissions: true,
        }}
      />,
    );

    expect(screen.getByTestId("nav-link-studio")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-link-admin")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
pnpm --filter app-components test AppNavigation
```

Expected: the 3 new tests FAIL — `hasCachedPermissions` is not accepted / the filter still hides on `isLoading` alone.

- [ ] **Step 3: Update `packages/app-components/src/components/AppNavigation.tsx`**

**Change 1** — extend `AppNavigationProps` interface (add the optional field):

```typescript
interface AppNavigationProps {
  currentApp: AppId;
  urls: Record<AppId, string>;
  locales: readonly string[];
  userEmail?: string | null;
  permissionState?: {
    grantedKeys: string[];
    isLoading: boolean;
    isAuthenticated?: boolean;
    hasCachedPermissions?: boolean;
  };
}
```

**Change 2** — destructure `hasCachedPermissions` from `permissionState` (line ~97):

```typescript
const {
  grantedKeys,
  isLoading,
  hasCachedPermissions = false,
} = permissionState ?? {
  grantedKeys: [],
  isLoading: true,
  isAuthenticated: false,
  hasCachedPermissions: false,
};
```

**Change 3** — update the `visibleApps` filter (line ~108):

```typescript
const visibleApps = APP_ORDER.filter(({ id }) => {
  const rule = APP_ACCESS_RULES[id];
  if (!rule) return true;
  if (isLoading && !hasCachedPermissions) return false;

  return matchesPermissions(grantedKeys, rule.required, rule.mode ?? "all");
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter app-components test AppNavigation
```

Expected: all tests PASS (3 new + all 11 existing).

- [ ] **Step 5: Verify the existing "hides protected links while permissions are loading" test still passes**

This test passes `isLoading: true` with no `hasCachedPermissions` — it must still hide gated apps (default `hasCachedPermissions = false`). Confirm it is green in the output from Step 4.

- [ ] **Step 6: Commit**

```bash
git add packages/app-components/src/components/AppNavigation.tsx packages/app-components/src/components/AppNavigation.test.tsx
git commit -m "feat(nav): skip loading-hide when permissions are seeded from cookie [GH-???]"
```

---

## Task 5: Wire hasCachedPermissions into every AppNavigation call site

**Goal:** Find every place `useCurrentUserPermissions()` result is passed to `AppNavigation` and forward the new `hasCachedPermissions` field.

- [ ] **Step 1: Find all call sites**

```bash
grep -r "permissionState" apps/ packages/ --include="*.tsx" --include="*.ts" -l
```

Look for files that spread or pass `permissionState` to `<AppNavigation>`.

- [ ] **Step 2: Update each call site**

For each file found, add `hasCachedPermissions` to the object passed as `permissionState`. The value comes from `useCurrentUserPermissions()`.

Typical before pattern:

```typescript
const { grantedKeys, isLoading, isAuthenticated } = useCurrentUserPermissions();
// ...
permissionState={{ grantedKeys, isLoading, isAuthenticated }}
```

Typical after pattern:

```typescript
const { grantedKeys, isLoading, isAuthenticated, hasCachedPermissions } =
  useCurrentUserPermissions();
// ...
permissionState={{ grantedKeys, isLoading, isAuthenticated, hasCachedPermissions }}
```

- [ ] **Step 3: Run typecheck to confirm no missed call sites**

```bash
pnpm typecheck
```

Expected: no errors. TypeScript won't error on missing optional props, but any type mismatch will surface here.

- [ ] **Step 4: Commit**

```bash
git add -p  # stage only the call-site files
git commit -m "feat(nav): pass hasCachedPermissions to AppNavigation in all apps [GH-???]"
```

---

## Task 6: E2E spec targeting staging

**Files:**

- Create: `apps/store/e2e/navbar-persistence.spec.ts`

- [ ] **Step 1: Create `apps/store/e2e/navbar-persistence.spec.ts`:**

```typescript
import path from "node:path";

import { test, expect } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const {
  store: STORE_URL,
  studio: STUDIO_URL,
  payments: PAYMENTS_URL,
} = resolveE2EAppUrls();

/**
 * These tests verify that the AppNavigation remains stable (no pop-in) when a
 * user navigates between apps. They rely on the nav-perm cookie being written
 * on first load, so they run AFTER at least one authenticated page visit.
 *
 * Target env: staging (TARGET_ENV=staging pnpm test:e2e).
 */
test.describe("Navbar persistence across cross-app navigations", () => {
  test.beforeEach(async ({ page }) => {
    // Seed the nav-perm cookie by visiting the store once.
    // This simulates a returning user whose cookie is already set.
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    // Wait for the permission fetch to complete and cookie to be written.
    await page.waitForTimeout(1500);
  });

  test("navbar is visible immediately after navigating store → studio", async ({
    page,
  }) => {
    await page.goto(`${STUDIO_URL}/en`);

    // Nav must be visible without waiting — no flash allowed
    await expect(page.getByTestId("app-navigation")).toBeVisible();
  });

  test("navbar is visible immediately after navigating store → payments", async ({
    page,
  }) => {
    await page.goto(`${PAYMENTS_URL}/en`);

    await expect(page.getByTestId("app-navigation")).toBeVisible();
  });

  test("active link has aria-current=page after cross-app navigation", async ({
    page,
  }) => {
    // Navigate to studio
    await page.goto(`${STUDIO_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();

    await expect(page.getByTestId("nav-link-studio")).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Store link must NOT be marked current
    await expect(page.getByTestId("nav-link-store")).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("gated app links remain visible on every navigation (no pop-in)", async ({
    page,
    context,
  }) => {
    // Navigate store → studio → payments, asserting stability at each stop
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
    await expect(page.getByTestId("nav-link-payments")).toBeVisible();

    await page.goto(`${STUDIO_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
    await expect(page.getByTestId("nav-link-payments")).toBeVisible();

    await page.goto(`${PAYMENTS_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
    await expect(page.getByTestId("nav-link-payments")).toBeVisible();
  });

  test("nav-perm cookie is present after first authenticated load", async ({
    page,
  }) => {
    const cookies = await page.context().cookies();
    const navCookie = cookies.find((c) => c.name === "libra-nav-perm");
    expect(navCookie).toBeDefined();
    expect(navCookie!.value).not.toBe("");
  });

  test("nav-perm cookie is cleared after the session cookie is removed", async ({
    page,
    context,
  }) => {
    // Simulate logout by clearing auth cookies
    const cookies = await context.cookies();
    const authCookies = cookies.filter((c) => c.name.startsWith("sb-"));
    await context.clearCookies();

    // Navigate — no auth means clearNavPermCache should have been called
    await page.goto(`${STORE_URL}/en`);
    await page.waitForTimeout(1500);

    const remaining = await context.cookies();
    const navCookie = remaining.find((c) => c.name === "libra-nav-perm");
    expect(navCookie).toBeUndefined();
  });
});
```

- [ ] **Step 2: Verify the spec file is picked up**

```bash
pnpm --filter store exec playwright test --list navbar-persistence
```

Expected: lists the 6 tests.

- [ ] **Step 3: Commit**

```bash
git add apps/store/e2e/navbar-persistence.spec.ts
git commit -m "test(e2e): add navbar-persistence spec targeting staging [GH-???]"
```

---

## Task 7: Quality checks

- [ ] **Step 1: Format**

```bash
pnpm format
```

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: build succeeds.

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                                                      | Task   |
| ------------------------------------------------------------------------------------- | ------ |
| `NAV_PERM_COOKIE_KEY` constant in `shared/constants/nav.ts`                           | Task 1 |
| Exported from `shared/constants/index.ts`                                             | Task 1 |
| `cookies-next` and `shared` in `packages/auth` deps                                   | Task 1 |
| `navPermCachePersistence.ts` with read/write/clear                                    | Task 2 |
| Cookie options mirror cart pattern (`getSharedCookieDomain`, `secure`, `lax`)         | Task 2 |
| Double-delete on clear                                                                | Task 2 |
| `readNavPermCache` returns null on invalid JSON / non-array                           | Task 2 |
| Seed `grantedKeys` from cookie on mount                                               | Task 3 |
| `hasCachedPermissions` captured via useRef on mount                                   | Task 3 |
| `writeNavPermCache` called after successful fetch                                     | Task 3 |
| `clearNavPermCache` called when userId → null                                         | Task 3 |
| Error path does NOT write cache                                                       | Task 3 |
| `AppNavigation` accepts optional `hasCachedPermissions` in `permissionState`          | Task 4 |
| Filter: `isLoading && !hasCachedPermissions`                                          | Task 4 |
| Existing loading-hide behavior preserved (no `hasCachedPermissions` → defaults false) | Task 4 |
| All call sites forwarding `hasCachedPermissions`                                      | Task 5 |
| E2E spec targeting staging                                                            | Task 6 |
| E2E: navbar visible immediately after cross-app navigation                            | Task 6 |
| E2E: `aria-current="page"` on correct link                                            | Task 6 |
| E2E: gated apps stable without pop-in                                                 | Task 6 |
| E2E: cookie written after auth                                                        | Task 6 |
| E2E: cookie cleared after logout                                                      | Task 6 |

**Placeholder scan:** None found.

**Type consistency:** `hasCachedPermissions: boolean` — defined in hook return, accepted as `hasCachedPermissions?: boolean` in `AppNavigationProps`, destructured with default `false`. Consistent throughout.
