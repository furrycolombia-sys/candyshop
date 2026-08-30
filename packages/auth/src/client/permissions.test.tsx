// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { createBrowserSupabaseClient } from "api/supabase";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPermCache,
  readPermCache,
  writePermCache,
} from "./permCachePersistence";
import { matchesPermissions, useCurrentUserPermissions } from "./permissions";
import { useCurrentUser } from "./useCurrentUser";

vi.mock("./permCachePersistence", () => ({
  readPermCache: vi.fn().mockReturnValue(null),
  writePermCache: vi.fn(),
  clearPermCache: vi.fn(),
}));

vi.mock("./useCurrentUser", () => ({
  useCurrentUser: vi.fn().mockReturnValue({
    user: { id: "user-1", email: "user-1@example.com" },
    isAuthenticated: true,
    isLoading: false,
    hasProfileLookupError: false,
  }),
}));

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

const mockReadCache = vi.mocked(readPermCache);
const mockWriteCache = vi.mocked(writePermCache);
const mockClearCache = vi.mocked(clearPermCache);
const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockCreateClient = vi.mocked(createBrowserSupabaseClient);

type PermRow = {
  expires_at: string | null;
  resource_permissions: { permissions: { key: string } };
};

/**
 * Returns a Promise extended with chainable `.select()` and `.eq()` methods.
 * Extending a native Promise is allowed by unicorn/no-thenable (which only
 * forbids adding `then` to plain objects).
 */
function makeQuery(data: unknown[], error: null | Error = null) {
  const p = Promise.resolve({ data, error });
  // Attach chain methods to the Promise instance so it is both awaitable
  // and chainable without adding `then` to a plain object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extended = p as any;
  extended.select = vi.fn().mockReturnValue(extended);
  extended.eq = vi.fn().mockReturnValue(extended);
  return extended;
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
  mockUseCurrentUser.mockReturnValue({
    user: { id: "user-1", email: "user-1@example.com" },
    isAuthenticated: true,
    isLoading: false,
    hasProfileLookupError: false,
    signOut: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCurrentUserPermissions — cookie seeding", () => {
  it("initializes grantedKeys to [] when no cookie", () => {
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase() as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    expect(result.current.grantedKeys).toEqual([]);
  });

  it("initializes grantedKeys from cookie synchronously when cookie present", () => {
    mockReadCache.mockReturnValue(["products.create", "orders.read"]);
    mockCreateClient.mockReturnValue(
      makeSupabase() as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    expect(result.current.grantedKeys).toEqual([
      "products.create",
      "orders.read",
    ]);
  });
});

describe("useCurrentUserPermissions — cache write on fetch", () => {
  it("calls writePermCache with fetched keys after successful fetch", async () => {
    mockReadCache.mockReturnValue(null);
    const perms: PermRow[] = [
      {
        expires_at: null,
        resource_permissions: { permissions: { key: "products.create" } },
      },
    ];
    mockCreateClient.mockReturnValue(
      makeSupabase(perms) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(mockWriteCache).toHaveBeenCalled());

    expect(mockWriteCache).toHaveBeenCalledWith(["products.create"]);
    expect(result.current.grantedKeys).toEqual(["products.create"]);
  });

  it("writes empty array to cache when user has no permissions", async () => {
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase([]) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(mockWriteCache).toHaveBeenCalled());

    expect(mockWriteCache).toHaveBeenCalledWith([]);
  });

  it("does NOT call writePermCache when the fetch returns an error", async () => {
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase([], [], new Error("DB error")) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    renderHook(() => useCurrentUserPermissions());

    // Give the async fetch time to complete.
    await new Promise((r) => setTimeout(r, 50));

    expect(mockWriteCache).not.toHaveBeenCalled();
  });
});

describe("useCurrentUserPermissions — cache clear on logout", () => {
  it("does NOT call clearPermCache when userId is null from the very first render (no prior session)", async () => {
    // Simulates a fresh page load where auth hasn't resolved a user yet.
    // The SSR-seeded cookie must be preserved so the next navigation doesn't flicker.
    mockReadCache.mockReturnValue(["products.create"]);
    mockCreateClient.mockReturnValue(
      makeSupabase() as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    mockUseCurrentUser.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasProfileLookupError: false,
      signOut: vi.fn(),
    });

    renderHook(() => useCurrentUserPermissions());

    // Give the async effect time to complete.
    await new Promise((r) => setTimeout(r, 50));

    expect(mockClearCache).not.toHaveBeenCalled();
  });

  it("calls clearPermCache when userId transitions from a real user to null (actual logout)", async () => {
    // Start with a logged-in user so hadUserIdRef becomes true.
    const perms: PermRow[] = [
      {
        expires_at: null,
        resource_permissions: { permissions: { key: "products.create" } },
      },
    ];
    mockReadCache.mockReturnValue(null);
    mockCreateClient.mockReturnValue(
      makeSupabase(perms) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { rerender } = renderHook(() => useCurrentUserPermissions());

    // Wait for the first fetch to complete (userId = "user-1").
    await waitFor(() => expect(mockWriteCache).toHaveBeenCalled());

    // Now simulate logout: userId becomes null.
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasProfileLookupError: false,
      signOut: vi.fn(),
    });
    rerender();

    await waitFor(() => expect(mockClearCache).toHaveBeenCalled());
  });
});

describe("useCurrentUserPermissions — no re-render when permissions unchanged", () => {
  it("does not change grantedKeys reference when API returns the same keys as cache", async () => {
    mockReadCache.mockReturnValue(["products.create"]);
    const perms: PermRow[] = [
      {
        expires_at: null,
        resource_permissions: { permissions: { key: "products.create" } },
      },
    ];
    mockCreateClient.mockReturnValue(
      makeSupabase(perms) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    const keysBeforeFetch = result.current.grantedKeys;

    await waitFor(() => expect(mockWriteCache).toHaveBeenCalled());

    // Same reference means React bailed out — no re-render triggered.
    expect(result.current.grantedKeys).toBe(keysBeforeFetch);
  });
});

describe("useCurrentUserPermissions — delegate permissions from seller_admins", () => {
  it("merges seller_admins permission keys into grantedKeys", async () => {
    mockReadCache.mockReturnValue(null);
    const sellerAdmins = [{ permissions: ["orders.approve", "payments.view"] }];
    mockCreateClient.mockReturnValue(
      makeSupabase([], sellerAdmins) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(mockWriteCache).toHaveBeenCalled());

    expect(result.current.grantedKeys).toEqual([
      "orders.approve",
      "payments.view",
    ]);
  });

  it("deduplicates keys that appear in both user_permissions and seller_admins", async () => {
    mockReadCache.mockReturnValue(null);
    const perms: PermRow[] = [
      {
        expires_at: null,
        resource_permissions: {
          permissions: { key: "orders.approve" },
        },
      },
    ];
    const sellerAdmins = [{ permissions: ["orders.approve", "payments.view"] }];
    mockCreateClient.mockReturnValue(
      makeSupabase(perms, sellerAdmins) as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );

    const { result } = renderHook(() => useCurrentUserPermissions());

    await waitFor(() => expect(mockWriteCache).toHaveBeenCalled());

    // "orders.approve" appears in both — must appear only once.
    expect(result.current.grantedKeys).toEqual([
      "orders.approve",
      "payments.view",
    ]);
  });
});

describe("useCurrentUserPermissions — hasPermission helper", () => {
  function setupHook(cachedKeys: string[]) {
    mockReadCache.mockReturnValue(cachedKeys);
    mockCreateClient.mockReturnValue(
      makeSupabase() as unknown as ReturnType<
        typeof createBrowserSupabaseClient
      >,
    );
    return renderHook(() => useCurrentUserPermissions());
  }

  it("returns true when the user has the required permission", () => {
    const { result } = setupHook(["orders.read"]);
    expect(result.current.hasPermission("orders.read")).toBe(true);
  });

  it("returns false when the user lacks the required permission", () => {
    const { result } = setupHook(["orders.read"]);
    expect(result.current.hasPermission("orders.write")).toBe(false);
  });

  it("returns true in 'any' mode when at least one key is granted", () => {
    const { result } = setupHook(["orders.read"]);
    expect(
      result.current.hasPermission(["orders.read", "orders.write"], "any"),
    ).toBe(true);
  });

  it("returns false in 'any' mode when no required key is granted", () => {
    const { result } = setupHook([]);
    expect(
      result.current.hasPermission(["orders.write", "orders.delete"], "any"),
    ).toBe(false);
  });
});

describe("matchesPermissions", () => {
  it("returns true when required is an empty array", () => {
    expect(matchesPermissions([], [])).toBe(true);
  });

  it("normalises a single string to a one-element check (granted)", () => {
    expect(matchesPermissions(["orders.read"], "orders.read")).toBe(true);
  });

  it("normalises a single string to a one-element check (denied)", () => {
    expect(matchesPermissions([], "orders.read")).toBe(false);
  });

  it("returns true in 'all' mode (default) when every required key is granted", () => {
    expect(
      matchesPermissions(
        ["orders.read", "orders.write"],
        ["orders.read", "orders.write"],
      ),
    ).toBe(true);
  });

  it("returns false in 'all' mode when any required key is missing", () => {
    expect(
      matchesPermissions(["orders.read"], ["orders.read", "orders.write"]),
    ).toBe(false);
  });

  it("returns true in 'any' mode when at least one required key is granted", () => {
    expect(
      matchesPermissions(
        ["orders.read"],
        ["orders.read", "orders.write"],
        "any",
      ),
    ).toBe(true);
  });

  it("returns false in 'any' mode when no required key is granted", () => {
    expect(matchesPermissions([], ["orders.read", "orders.write"], "any")).toBe(
      false,
    );
  });
});
