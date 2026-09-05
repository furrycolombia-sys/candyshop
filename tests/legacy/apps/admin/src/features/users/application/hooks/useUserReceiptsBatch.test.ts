import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchUserReceipts = vi.fn();
vi.mock("@/features/users/infrastructure/userReceiptQueries", () => ({
  fetchUserReceipts: (...args: unknown[]) => mockFetchUserReceipts(...args),
}));

const mockSupabase = {};
vi.mock("@/shared/application/hooks/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

import { useUserReceiptsBatch } from "./useUserReceiptsBatch";

describe("useUserReceiptsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a fetchReceipts function", () => {
    const { result } = renderHook(() => useUserReceiptsBatch());
    expect(typeof result.current.fetchReceipts).toBe("function");
  });

  it("delegates to fetchUserReceipts with supabase and userIds", async () => {
    const mockReceipts = [{ id: "r1" }];
    mockFetchUserReceipts.mockResolvedValue(mockReceipts);

    const { result } = renderHook(() => useUserReceiptsBatch());
    const userIds = ["u1", "u2"];

    const receipts = await result.current.fetchReceipts(userIds);

    expect(mockFetchUserReceipts).toHaveBeenCalledWith(mockSupabase, userIds);
    expect(receipts).toEqual(mockReceipts);
  });

  it("passes empty array of userIds to fetchUserReceipts", async () => {
    mockFetchUserReceipts.mockResolvedValue([]);

    const { result } = renderHook(() => useUserReceiptsBatch());

    await result.current.fetchReceipts([]);

    expect(mockFetchUserReceipts).toHaveBeenCalledWith(mockSupabase, []);
  });
});
