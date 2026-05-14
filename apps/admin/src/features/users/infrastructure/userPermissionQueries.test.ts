import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  escapeLikePattern: (s: string) => s.replaceAll(/[%_\\]/g, (c) => `\\${c}`),
}));

import {
  listUsers,
  getUserProfile,
  getUserPermissionKeys,
  grantPermission,
  revokePermission,
} from "./userPermissionQueries";

describe("listUsers", () => {
  it("returns paginated users without search", async () => {
    const mockData = [{ id: "1", email: "a@example.com" }];
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              data: mockData,
              error: null,
              count: 1,
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listUsers(supabase as any, "", 1, 10);
    expect(result.users).toEqual(mockData);
    expect(result.total).toBe(1);
  });

  it("applies search filter when search is non-empty", async () => {
    const orMock = vi.fn().mockReturnValue({ data: [], error: null, count: 0 });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              or: orMock,
              data: [],
              error: null,
              count: 0,
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listUsers(supabase as any, "john", 1, 10);
    expect(orMock).toHaveBeenCalled();
  });

  it("throws when query returns an error", async () => {
    const dbError = new Error("DB failure");
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              data: null,
              error: dbError,
              count: null,
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(listUsers(supabase as any, "", 1, 10)).rejects.toThrow(
      "DB failure",
    );
  });

  it("returns empty array and zero count when data and count are null", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              data: null,
              error: null,
              count: null,
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listUsers(supabase as any, "", 1, 10);
    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("getUserProfile", () => {
  it("returns user data when found", async () => {
    const mockUser = { id: "u1", email: "u@example.com" };
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: mockUser, error: null }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getUserProfile(supabase as any, "u1");
    expect(result).toEqual(mockUser);
  });

  it("returns null when PGRST116 not-found error", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: { code: "PGRST116", message: "Not found" },
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getUserProfile(supabase as any, "u1");
    expect(result).toBeNull();
  });

  it("throws on other errors", async () => {
    const dbError = { code: "22P02", message: "invalid input syntax" };
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: null, error: dbError }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(getUserProfile(supabase as any, "u1")).rejects.toEqual(
      dbError,
    );
  });
});

describe("getUserPermissionKeys", () => {
  it("returns permission keys from rows", async () => {
    const mockData = [
      {
        resource_permissions: { permissions: { key: "products.read" } },
      },
      {
        resource_permissions: { permissions: { key: "orders.read" } },
      },
    ];
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({ data: mockData, error: null }),
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getUserPermissionKeys(supabase as any, "u1");
    expect(result).toEqual(["products.read", "orders.read"]);
  });

  it("returns empty array when data is null", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({ data: null, error: null }),
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getUserPermissionKeys(supabase as any, "u1");
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    const dbError = new Error("perm query failed");
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({ data: null, error: dbError }),
            }),
          }),
        }),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(getUserPermissionKeys(supabase as any, "u1")).rejects.toThrow(
      "perm query failed",
    );
  });
});

describe("grantPermission", () => {
  function makeGrantSupabase(
    permData: unknown,
    permError: unknown,
    rpData: unknown,
    rpError: unknown,
    upsertError: unknown = null,
  ) {
    let callCount = 0;
    return {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockReturnValue({ data: permData, error: permError }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi
                  .fn()
                  .mockReturnValue({ data: rpData, error: rpError }),
              }),
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnValue({ error: upsertError }),
        };
      }),
    };
  }

  it("grants permission successfully", async () => {
    const supabase = makeGrantSupabase(
      { id: "perm-1" },
      null,
      [{ id: "rp-1", resource_id: null }],
      null,
      null,
    );

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grantPermission(supabase as any, "u1", "products.read", "admin-1"),
    ).resolves.toBeUndefined();
  });

  it("throws when permission lookup fails", async () => {
    const permError = new Error("permission not found");
    const supabase = makeGrantSupabase({ id: null }, permError, null, null);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grantPermission(supabase as any, "u1", "products.read", "admin-1"),
    ).rejects.toThrow("permission not found");
  });

  it("throws when no resource permission rows exist", async () => {
    const supabase = makeGrantSupabase({ id: "perm-1" }, null, [], null);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grantPermission(supabase as any, "u1", "products.read", "admin-1"),
    ).rejects.toThrow(/No resource permission found/);
  });

  it("prefers null resource_id row over non-null when multiple rows", async () => {
    const rpData = [
      { id: "rp-2", resource_id: "some-product" },
      { id: "rp-1", resource_id: null },
    ];
    const supabase = makeGrantSupabase(
      { id: "perm-1" },
      null,
      rpData,
      null,
      null,
    );

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grantPermission(supabase as any, "u1", "products.read", "admin-1"),
    ).resolves.toBeUndefined();
  });
});

describe("revokePermission", () => {
  it("revokes permission successfully", async () => {
    let callCount = 0;
    const supabase = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockReturnValue({ data: { id: "perm-1" }, error: null }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  data: [{ id: "rp-1", resource_id: null }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ error: null }),
            }),
          }),
        };
      }),
    };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      revokePermission(supabase as any, "u1", "products.read"),
    ).resolves.toBeUndefined();
  });
});
