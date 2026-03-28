/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/settings/infrastructure/settingsQueries", () => ({
  fetchPaymentSettings: vi.fn(),
}));

import { usePaymentSettings } from "./usePaymentSettings";

import { fetchPaymentSettings } from "@/features/settings/infrastructure/settingsQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePaymentSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns data on success", async () => {
    const mock: import("@/features/settings/domain/types").PaymentSettings = {
      timeout_awaiting_payment_hours: 24,
      timeout_pending_verification_hours: 48,
      timeout_evidence_requested_hours: 72,
    };
    vi.mocked(fetchPaymentSettings).mockResolvedValue(mock);

    const { result } = renderHook(() => usePaymentSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("handles error", async () => {
    vi.mocked(fetchPaymentSettings).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => usePaymentSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
