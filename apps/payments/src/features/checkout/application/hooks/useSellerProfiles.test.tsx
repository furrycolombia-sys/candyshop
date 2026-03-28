/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/checkout/infrastructure/checkoutQueries", () => ({
  fetchSellerProfiles: vi.fn(),
}));

import { useSellerProfiles } from "./useSellerProfiles";

import { fetchSellerProfiles } from "@/features/checkout/infrastructure/checkoutQueries";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useSellerProfiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns profiles when sellerIds are provided", async () => {
    const mock = { s1: "Seller One" };
    vi.mocked(fetchSellerProfiles).mockResolvedValue(mock);
    const { result } = renderHook(() => useSellerProfiles(["s1"]), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("does not fetch when sellerIds is empty", () => {
    renderHook(() => useSellerProfiles([]), { wrapper: createWrapper() });
    expect(fetchSellerProfiles).not.toHaveBeenCalled();
  });
});
