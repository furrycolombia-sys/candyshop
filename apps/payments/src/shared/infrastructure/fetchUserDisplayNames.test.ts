import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchUserDisplayNames } from "./fetchUserDisplayNames";

const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));

const mockSupabase = {
  from: mockFrom,
} as unknown as Parameters<typeof fetchUserDisplayNames>[0];

describe("fetchUserDisplayNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ in: mockIn });
  });

  it("returns empty object for empty userIds array", async () => {
    const result = await fetchUserDisplayNames(mockSupabase, [], "Fallback");
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns a map of userId to display_name", async () => {
    mockIn.mockResolvedValue({
      data: [
        { id: "u1", display_name: "Alice", email: "alice@example.com" },
        { id: "u2", display_name: "Bob", email: "bob@example.com" },
      ],
      error: null,
    });

    const result = await fetchUserDisplayNames(
      mockSupabase,
      ["u1", "u2"],
      "Fallback",
    );

    expect(result).toEqual({ u1: "Alice", u2: "Bob" });
    expect(mockFrom).toHaveBeenCalledWith("user_profiles");
  });

  it("falls back to email when display_name is null", async () => {
    mockIn.mockResolvedValue({
      data: [{ id: "u1", display_name: null, email: "alice@example.com" }],
      error: null,
    });

    const result = await fetchUserDisplayNames(
      mockSupabase,
      ["u1"],
      "Fallback",
    );

    expect(result).toEqual({ u1: "alice@example.com" });
  });

  it("falls back to fallbackName when both are null", async () => {
    mockIn.mockResolvedValue({
      data: [{ id: "u1", display_name: null, email: null }],
      error: null,
    });

    const result = await fetchUserDisplayNames(mockSupabase, ["u1"], "Unknown");

    expect(result).toEqual({ u1: "Unknown" });
  });

  it("returns empty object on error", async () => {
    mockIn.mockResolvedValue({
      data: null,
      error: new Error("DB error"),
    });

    const result = await fetchUserDisplayNames(
      mockSupabase,
      ["u1"],
      "Fallback",
    );

    expect(result).toEqual({});
  });

  it("handles null data gracefully", async () => {
    mockIn.mockResolvedValue({ data: null, error: null });

    const result = await fetchUserDisplayNames(
      mockSupabase,
      ["u1"],
      "Fallback",
    );

    expect(result).toEqual({});
  });
});
