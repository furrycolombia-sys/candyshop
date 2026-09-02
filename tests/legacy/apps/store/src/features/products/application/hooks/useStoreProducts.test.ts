import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useStoreProducts, useStoreProduct } from "./useStoreProducts";

import type { Product } from "@/features/products/domain/types";
import * as productQueries from "@/features/products/infrastructure/productQueries";

type PartialProduct = Pick<Product, "id" | "name_en">;
const mockProducts = [
  { id: "p1", name_en: "Product 1" },
] as unknown as Product[];

vi.mock("@/features/products/infrastructure/productQueries", () => ({
  fetchStoreProducts: vi
    .fn()
    .mockResolvedValue([{ id: "p1", name_en: "Product 1" }]),
  fetchStoreProductById: vi
    .fn()
    .mockResolvedValue({ id: "p1", name_en: "Product 1" }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("useStoreProducts", () => {
  beforeEach(() => {
    vi.mocked(productQueries.fetchStoreProducts).mockResolvedValue(
      mockProducts,
    );
  });

  it("fetches products", async () => {
    const { result } = renderHook(() => useStoreProducts(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProducts);
  });

  it("sets isError when fetchStoreProducts rejects", async () => {
    vi.mocked(productQueries.fetchStoreProducts).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useStoreProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useStoreProduct", () => {
  it("fetches a single product by id", async () => {
    const mockProduct = { id: "p1", name_en: "Product 1" } as PartialProduct;
    vi.mocked(productQueries.fetchStoreProductById).mockResolvedValue(
      mockProduct as unknown as Product,
    );

    const { result } = renderHook(() => useStoreProduct("p1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProduct);
  });
});
