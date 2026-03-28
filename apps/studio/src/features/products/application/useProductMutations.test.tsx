/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/products/infrastructure/productQueries", () => ({
  toggleProductField: vi.fn(),
  deleteProduct: vi.fn(),
  reorderProducts: vi.fn(),
}));

import {
  useToggleProduct,
  useDeleteProduct,
  useReorderProducts,
} from "./useProductMutations";

import {
  toggleProductField,
  deleteProduct,
  reorderProducts,
} from "@/features/products/infrastructure/productQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useToggleProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls toggleProductField on mutate", async () => {
    vi.mocked(toggleProductField).mockResolvedValue();

    const { result } = renderHook(() => useToggleProduct(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        id: "p1",
        field: "is_active",
        value: true,
      }),
    );

    expect(toggleProductField).toHaveBeenCalledWith(
      expect.anything(),
      "p1",
      "is_active",
      true,
    );
  });
});

describe("useDeleteProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deleteProduct on mutate", async () => {
    vi.mocked(deleteProduct).mockResolvedValue();

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync("p1"));
    expect(deleteProduct).toHaveBeenCalledWith(expect.anything(), "p1");
  });
});

describe("useReorderProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls reorderProducts on mutate", async () => {
    vi.mocked(reorderProducts).mockResolvedValue();

    const { result } = renderHook(() => useReorderProducts(), {
      wrapper: createWrapper(),
    });

    const items = [
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ];
    await act(() => result.current.mutateAsync(items));
    expect(reorderProducts).toHaveBeenCalledWith(expect.anything(), items);
  });
});
