/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/products/infrastructure/productQueries", () => ({
  fetchProducts: vi.fn(),
}));

import { useProducts } from "./useProducts";

import { fetchProducts } from "@/features/products/infrastructure/productQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns products on success", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = [{ id: "1", name_en: "Product" }] as any;
    vi.mocked(fetchProducts).mockResolvedValue(mock);

    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("passes filters to fetchProducts", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([]);

    const filters = { type: "merch" };
    const { result } = renderHook(() => useProducts(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchProducts).toHaveBeenCalledWith(expect.anything(), filters);
  });

  it("handles error", async () => {
    vi.mocked(fetchProducts).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
