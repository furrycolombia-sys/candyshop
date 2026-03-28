/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/products/infrastructure/templateQueries", () => ({
  fetchActiveTemplates: vi.fn(),
}));

import { useProductTemplates } from "./useProductTemplates";

import { fetchActiveTemplates } from "@/features/products/infrastructure/templateQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProductTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns templates on success", async () => {
    const mock: import("@/features/products/infrastructure/templateQueries").ActiveTemplate[] =
      [
        {
          id: "t1",
          name_en: "Basic",
          name_es: "Básico",
          description_en: null,
          description_es: null,
          sections: [],
        },
      ];
    vi.mocked(fetchActiveTemplates).mockResolvedValue(mock);

    const { result } = renderHook(() => useProductTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("handles error", async () => {
    vi.mocked(fetchActiveTemplates).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useProductTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
