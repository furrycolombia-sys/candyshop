import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  fetchStoreProducts,
  fetchStoreProductById,
  fetchStoreProductsByIds,
} from "@/features/products/infrastructure/productQueries";

// ---------------------------------------------------------------------------
// Mock Supabase with chained builder
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockOrder2 = vi
  .fn()
  .mockReturnValue({ data: [{ id: "p1" }], error: null });
const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
const mockEqForById = vi.fn().mockReturnValue({ single: mockSingle });
const mockEqAfterIn = vi
  .fn()
  .mockReturnValue({ data: [{ id: "p1" }], error: null });
const mockIn = vi.fn().mockReturnValue({ eq: mockEqAfterIn });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, in: mockIn });
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
    mockEqAfterIn.mockReturnValue({ data: [{ id: "p1" }], error: null });
    mockIn.mockReturnValue({ eq: mockEqAfterIn });
    mockSelect.mockReturnValue({ eq: mockEq, in: mockIn });
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
      mockEqForById.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEqForById, in: mockIn });

      const result = await fetchStoreProductById("p1");
      expect(result).toEqual({ id: "p1" });
    });

    it("throws on error", async () => {
      mockSingle.mockReturnValue({
        data: null,
        error: { message: "not found" },
      });
      mockEqForById.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEqForById, in: mockIn });

      await expect(fetchStoreProductById("bad")).rejects.toEqual({
        message: "not found",
      });
    });
  });

  describe("fetchStoreProductsByIds", () => {
    it("returns empty array when ids is empty", async () => {
      const result = await fetchStoreProductsByIds([]);
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("deduplicates ids and returns data", async () => {
      const result = await fetchStoreProductsByIds(["p1", "p2", "p1"]);
      expect(result).toEqual([{ id: "p1" }]);
      expect(mockIn).toHaveBeenCalledWith("id", ["p1", "p2"]);
    });

    it("throws on error", async () => {
      mockEqAfterIn.mockReturnValue({
        data: null,
        error: { message: "query failed" },
      });
      await expect(fetchStoreProductsByIds(["p1"])).rejects.toEqual({
        message: "query failed",
      });
    });

    it("returns empty array when data is null", async () => {
      mockEqAfterIn.mockReturnValue({ data: null, error: null });
      const result = await fetchStoreProductsByIds(["p1"]);
      expect(result).toEqual([]);
    });
  });
});
