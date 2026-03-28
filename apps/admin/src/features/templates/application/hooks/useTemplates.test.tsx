/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/templates/infrastructure/templateQueries", () => ({
  fetchTemplates: vi.fn(),
}));

import { useTemplates } from "./useTemplates";

import { fetchTemplates } from "@/features/templates/infrastructure/templateQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns templates on success", async () => {
    const mock: import("@/features/templates/domain/types").ProductTemplate[] =
      [
        {
          id: "t1",
          name_en: "Receipt",
          name_es: "Recibo",
          description_en: null,
          description_es: null,
          sections: [],
          sort_order: 0,
          is_active: true,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
    vi.mocked(fetchTemplates).mockResolvedValue(mock);

    const { result } = renderHook(() => useTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("handles error", async () => {
    vi.mocked(fetchTemplates).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
