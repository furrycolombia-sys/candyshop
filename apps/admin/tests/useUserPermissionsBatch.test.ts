import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserPermissionKeys = vi.fn();
vi.mock("@/features/users/infrastructure/userPermissionQueries", () => ({
  getUserPermissionKeys: (...args: unknown[]) =>
    mockGetUserPermissionKeys(...args),
}));

const mockSupabase = {};
vi.mock("@/shared/application/hooks/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

import { useUserPermissionsBatch } from "@/features/users/application/hooks/useUserPermissionsBatch";

import type { UserProfileSummary } from "@/features/users/domain/types";

const makeUser = (id: string): UserProfileSummary => ({
  id,
  email: `${id}@example.com`,
  display_name: null,
  last_seen_at: null,
  display_avatar_url: null,
  avatar_url: null,
});

describe("useUserPermissionsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a fetchPermissions function", () => {
    const { result } = renderHook(() => useUserPermissionsBatch());
    expect(typeof result.current.fetchPermissions).toBe("function");
  });

  it("fetchPermissions returns a record mapping user ids to permission keys", async () => {
    mockGetUserPermissionKeys
      .mockResolvedValueOnce(["products.read", "orders.read"])
      .mockResolvedValueOnce(["users.read"]);

    const { result } = renderHook(() => useUserPermissionsBatch());
    const users = [makeUser("u1"), makeUser("u2")];

    const permissions = await result.current.fetchPermissions(users);

    expect(permissions).toEqual({
      u1: ["products.read", "orders.read"],
      u2: ["users.read"],
    });
  });

  it("maps rejected promises to empty arrays", async () => {
    mockGetUserPermissionKeys
      .mockResolvedValueOnce(["products.read"])
      .mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useUserPermissionsBatch());
    const users = [makeUser("u1"), makeUser("u2")];

    const permissions = await result.current.fetchPermissions(users);

    expect(permissions["u1"]).toEqual(["products.read"]);
    expect(permissions["u2"]).toEqual([]);
  });

  it("returns empty record when no users provided", async () => {
    const { result } = renderHook(() => useUserPermissionsBatch());

    const permissions = await result.current.fetchPermissions([]);

    expect(permissions).toEqual({});
  });

  it("calls getUserPermissionKeys with supabase and user id", async () => {
    mockGetUserPermissionKeys.mockResolvedValue([]);
    const { result } = renderHook(() => useUserPermissionsBatch());

    await result.current.fetchPermissions([makeUser("u1")]);

    expect(mockGetUserPermissionKeys).toHaveBeenCalledWith(mockSupabase, "u1");
  });
});
