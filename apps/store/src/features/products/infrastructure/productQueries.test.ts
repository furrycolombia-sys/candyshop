import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchStoreProducts, fetchStoreProductById } from "./productQueries";

// ---------------------------------------------------------------------------
// Mock Supabase with chained builder
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockOrder2 = vi
  .fn()
  .mockReturnValue({ data: [{ id: "p1" }], error: null });
const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

describe("productQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain for fetchStoreProducts
    mockOrder2.mockReturnValue({ data: [{ id: "p1" }], error: null });
    mockOrder1.mockReturnValue({ order: mockOrder2 });
    mockEq.mockReturnValue({ order: mockOrder1 });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe("fetchStoreProducts", () => {
    it("returns data on success", async () => {
      const result = await fetchStoreProducts();
      expect(result).toEqual([{ id: "p1" }]);
      expect(mockFrom).toHaveBeenCalledWith("products");
    });

    it("throws on error", async () => {
      mockOrder2.mockReturnValue({ data: null, error: { message: "fail" } });
      await expect(fetchStoreProducts()).rejects.toEqual({ message: "fail" });
    });
  });

  describe("fetchStoreProductById", () => {
    it("returns data on success", async () => {
      mockSingle.mockReturnValue({ data: { id: "p1" }, error: null });
      // Reset chain for single query
      mockEq.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await fetchStoreProductById("p1");
      expect(result).toEqual({ id: "p1" });
    });

    it("throws on error", async () => {
      mockSingle.mockReturnValue({
        data: null,
        error: { message: "not found" },
      });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      await expect(fetchStoreProductById("bad")).rejects.toEqual({
        message: "not found",
      });
    });
  });
});
