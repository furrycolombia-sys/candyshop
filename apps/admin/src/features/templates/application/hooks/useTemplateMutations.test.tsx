/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/templates/infrastructure/templateQueries", () => ({
  insertTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  toggleTemplateActive: vi.fn(),
}));

import {
  useInsertTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useToggleTemplateActive,
} from "./useTemplateMutations";

import {
  insertTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
} from "@/features/templates/infrastructure/templateQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useInsertTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls insertTemplate on mutate", async () => {
    vi.mocked(insertTemplate).mockResolvedValue({
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
    });

    const { result } = renderHook(() => useInsertTemplate(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        name_en: "Receipt",
        name_es: "Recibo",
        description_en: "",
        description_es: "",
        sections: [],
        sort_order: 0,
        is_active: true,
      }),
    );

    expect(insertTemplate).toHaveBeenCalledWith(expect.anything(), {
      name_en: "Receipt",
      name_es: "Recibo",
      description_en: "",
      description_es: "",
      sections: [],
      sort_order: 0,
      is_active: true,
    });
  });
});

describe("useUpdateTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateTemplate on mutate", async () => {
    vi.mocked(updateTemplate).mockResolvedValue({
      id: "t1",
      name_en: "Updated",
      name_es: "Actualizado",
      description_en: null,
      description_es: null,
      sections: [],
      sort_order: 0,
      is_active: true,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useUpdateTemplate(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({ id: "t1", values: { name_en: "Updated" } }),
    );

    expect(updateTemplate).toHaveBeenCalledWith(expect.anything(), "t1", {
      name_en: "Updated",
    });
  });
});

describe("useDeleteTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deleteTemplate on mutate", async () => {
    vi.mocked(deleteTemplate).mockResolvedValue();

    const { result } = renderHook(() => useDeleteTemplate(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync("t1"));

    expect(deleteTemplate).toHaveBeenCalledWith(expect.anything(), "t1");
  });
});

describe("useToggleTemplateActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls toggleTemplateActive on mutate", async () => {
    vi.mocked(toggleTemplateActive).mockResolvedValue();

    const { result } = renderHook(() => useToggleTemplateActive(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync({ id: "t1", isActive: false }));

    expect(toggleTemplateActive).toHaveBeenCalledWith(
      expect.anything(),
      "t1",
      false,
    );
  });
});
