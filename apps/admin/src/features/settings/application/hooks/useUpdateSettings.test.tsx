/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/settings/infrastructure/settingsQueries", () => ({
  updatePaymentSetting: vi.fn(),
}));

import { useUpdateSettings } from "./useUpdateSettings";

import { updatePaymentSetting } from "@/features/settings/infrastructure/settingsQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useUpdateSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updatePaymentSetting with key and numeric value", async () => {
    vi.mocked(updatePaymentSetting).mockResolvedValue();

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({ key: "timeout", value: "60" }),
    );

    expect(updatePaymentSetting).toHaveBeenCalledWith(
      expect.anything(),
      "timeout",
      60,
    );
  });
});
