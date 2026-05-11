// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { createBrowserSupabaseClient } from "api/supabase";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearNavPermCache,
  readNavPermCache,
  writeNavPermCache,
} from "./navPermCachePersistence";
import { useCurrentUserPermissions } from "./permissions";
import { useSupabaseAuth } from "./useSupabaseAuth";

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

const mockReadCache = vi.mocked(readNavPermCache);
const mockWriteCache = vi.mocked(writeNavPermCache);
const mockClearCache = vi.mocked(clearNavPermCache);
const mockUseSupabaseAuth = vi.mocked(useSupabaseAuth);
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
  mockUseSupabaseAuth.mockReturnValue({
    user: { id: "user-1" } as ReturnType<typeof useSupabaseAuth>["user"],
    isAuthenticated: true,
    isLoading: false,
    session: null,
    signInWithProvider: vi.fn(),
    signOut: vi.fn(),
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

    mockUseSupabaseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      session: null,
      signInWithProvider: vi.fn(),
      signOut: vi.fn(),
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

    expect(result.current.hasCachedPermissions).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasCachedPermissions).toBe(true);
  });
});
