import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn();

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: () => ({
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            // eslint-disable-next-line sonarjs/no-nested-functions -- vi.mock factory requires deeply nested mock chain
            in: (...inArgs: unknown[]) => {
              mockIn(...inArgs);
              return Promise.resolve({
                data: [
                  {
                    id: "seller-1",
                    display_name: "Alice",
                    email: "alice@example.com",
                  },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
  }),
}));

let capturedOptions: {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled: boolean;
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    enabled: boolean;
  }) => {
    capturedOptions = opts;
    return { data: undefined, isLoading: false, error: null };
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useMemo: (fn: () => unknown) => fn(),
  };
});

import { useSellerProfiles } from "@/features/cart/application/useSellerProfiles";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSellerProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables query when sellerIds is empty", () => {
    useSellerProfiles([]);
    expect(capturedOptions.enabled).toBe(false);
  });

  it("filters out empty strings from sellerIds", () => {
    useSellerProfiles(["", ""]);
    expect(capturedOptions.enabled).toBe(false);
  });

  it("deduplicates seller IDs in query key", () => {
    useSellerProfiles(["a", "a", "b"]);
    expect(capturedOptions.queryKey).toEqual(["seller-profiles", ["a", "b"]]);
    expect(capturedOptions.enabled).toBe(true);
  });

  it("enables query when valid IDs are provided", () => {
    useSellerProfiles(["seller-1"]);
    expect(capturedOptions.enabled).toBe(true);
  });

  it("queryFn returns empty object for no IDs", async () => {
    useSellerProfiles([]);
    const result = await capturedOptions.queryFn();
    expect(result).toEqual({});
  });

  it("queryFn calls supabase with correct table and fields", async () => {
    useSellerProfiles(["seller-1"]);
    await capturedOptions.queryFn();
    expect(mockFrom).toHaveBeenCalledWith("user_profiles");
    expect(mockSelect).toHaveBeenCalledWith("id, display_name, email");
    expect(mockIn).toHaveBeenCalledWith("id", ["seller-1"]);
  });

  it("queryFn maps profiles to display names", async () => {
    useSellerProfiles(["seller-1"]);
    const result = await capturedOptions.queryFn();
    expect(result).toEqual({ "seller-1": "Alice" });
  });
});
