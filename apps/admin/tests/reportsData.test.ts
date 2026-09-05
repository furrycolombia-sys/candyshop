import { beforeEach, describe, expect, it, vi } from "vitest";

const ok = (json: unknown) =>
  ({ ok: true, json: async () => json }) as Response;

async function loadModule() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  vi.resetModules();
  return import("@/app/api/admin/_shared/reportsData");
}

const ids = (n: number, prefix = "id") =>
  Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

/** Every URL the module handed to fetch. */
const urls = () => vi.mocked(fetch).mock.calls.map((c) => String(c[0]));

describe("reports data fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("batchIds", () => {
    it("returns nothing for an empty list", async () => {
      const { batchIds } = await loadModule();
      expect(batchIds([])).toEqual([]);
    });

    it("keeps a short list in one batch", async () => {
      const { batchIds } = await loadModule();
      expect(batchIds(ids(10))).toHaveLength(1);
    });

    it("splits at the batch size and preserves order", async () => {
      const { batchIds } = await loadModule();
      const batches = batchIds(ids(250));

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(100);
      expect(batches[2]).toHaveLength(50);
      expect(batches.flat()).toEqual(ids(250));
    });
  });

  // The reports asked for every order's lines in one `in.(...)`, so the URL
  // grew 37 bytes per order. Measured against this project's own stack: 200
  // ids is 7,466 bytes and answers 200; 250 ids is 9,316 bytes and answers
  // 414 URI Too Long. Both routes cap the order query at 10,000 rows.
  describe("fetchOrderItems", () => {
    it("uses one request for a small set of orders", async () => {
      const { fetchOrderItems } = await loadModule();
      vi.mocked(fetch).mockResolvedValue(ok([]));

      await fetchOrderItems(ids(100), null);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("splits a set too long for one URL, and merges the results", async () => {
      const { fetchOrderItems } = await loadModule();
      vi.mocked(fetch)
        .mockResolvedValueOnce(ok([{ id: "a" }]))
        .mockResolvedValueOnce(ok([{ id: "b" }]))
        .mockResolvedValueOnce(ok([{ id: "c" }]));

      const items = await fetchOrderItems(ids(250), null);

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("keeps every batch well under the length that returned 414", async () => {
      const { fetchOrderItems } = await loadModule();
      vi.mocked(fetch).mockResolvedValue(ok([]));

      // Real uuids, so the measured byte counts apply.
      const uuids = Array.from(
        { length: 500 },
        (_, i) => `a0eebc99-9c0b-4ef8-bb6d-${String(i).padStart(12, "0")}`,
      );
      await fetchOrderItems(uuids, null);

      for (const url of urls()) {
        expect(url.length).toBeLessThan(7466);
      }
    });

    it("applies the product filter to every batch", async () => {
      const { fetchOrderItems } = await loadModule();
      vi.mocked(fetch).mockResolvedValue(ok([]));

      await fetchOrderItems(ids(250), "product-1");

      expect(urls()).toHaveLength(3);
      for (const url of urls()) {
        expect(url).toContain("product_id=eq.product-1");
      }
    });
  });

  describe("fetchProfileMap", () => {
    it("makes no request for an empty list", async () => {
      const { fetchProfileMap } = await loadModule();
      const map = await fetchProfileMap([]);

      expect(map.size).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("splits and merges into one map keyed by id", async () => {
      const { fetchProfileMap } = await loadModule();
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          ok([{ id: "u1", email: "a@b.c", display_name: null }]),
        )
        .mockResolvedValueOnce(
          ok([{ id: "u2", email: "d@e.f", display_name: "Dee" }]),
        );

      const map = await fetchProfileMap(ids(150));

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(map.size).toBe(2);
      expect(map.get("u2")?.display_name).toBe("Dee");
    });
  });
});
