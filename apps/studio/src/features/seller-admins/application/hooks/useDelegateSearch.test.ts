import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({})),
}));

vi.mock("@/features/seller-admins/infrastructure/delegateQueries", () => ({
  searchUsers: vi.fn(),
}));

import { useDelegateSearch } from "./useDelegateSearch";

import { searchUsers } from "@/features/seller-admins/infrastructure/delegateQueries";

describe("useDelegateSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a search function", () => {
    const { result } = renderHook(() => useDelegateSearch("seller-1"));
    expect(typeof result.current.search).toBe("function");
  });

  it("calls searchUsers with query and excludeUserId", async () => {
    const mockResults = [
      {
        id: "user-2",
        email: "delegate@example.com",
        display_name: "Delegate User",
        avatar_url: null,
      },
    ];
    vi.mocked(searchUsers).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useDelegateSearch("seller-1"));
    const results = await result.current.search("delegate");

    expect(searchUsers).toHaveBeenCalledWith(
      expect.anything(),
      "delegate",
      "seller-1",
    );
    expect(results).toEqual(mockResults);
  });

  it("returns empty array immediately when excludeUserId is not set", async () => {
    const { result } = renderHook(() => useDelegateSearch());
    const results = await result.current.search("anything");

    expect(results).toEqual([]);
    expect(searchUsers).not.toHaveBeenCalled();
  });

  it("returns empty array when query is empty string", async () => {
    vi.mocked(searchUsers).mockResolvedValue([]);

    const { result } = renderHook(() => useDelegateSearch("seller-1"));
    const results = await result.current.search("");

    expect(results).toEqual([]);
  });
});
