import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { describe, it, expect, vi } from "vitest";

import { useStoreProducts, useStoreProduct } from "./useStoreProducts";

const mockProducts = [{ id: "p1", name_en: "Product 1" }];

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
  it("fetches products", async () => {
    const { result } = renderHook(() => useStoreProducts(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProducts);
  });
});

describe("useStoreProduct", () => {
  it("fetches a single product by id", async () => {
    const { result } = renderHook(() => useStoreProduct("p1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "p1", name_en: "Product 1" });
  });
});
