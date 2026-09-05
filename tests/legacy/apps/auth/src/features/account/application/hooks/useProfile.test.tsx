/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/account/infrastructure/profileQueries", () => ({
  fetchProfile: vi.fn(),
}));

import { useProfile } from "./useProfile";

import { fetchProfile } from "@/features/account/infrastructure/profileQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns profile data on success", async () => {
    const mock = {
      id: "u1",
      email: "john@test.com",
      avatar_url: null,
      provider: "google",
      display_name: "John",
      display_email: null,
      display_avatar_url: null,
      first_seen_at: "2025-01-01",
      last_seen_at: "2025-01-01",
    };
    vi.mocked(fetchProfile).mockResolvedValue(mock);

    const { result } = renderHook(() => useProfile("u1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("does not fetch when userId is undefined", () => {
    renderHook(() => useProfile(undefined as unknown as string), {
      wrapper: createWrapper(),
    });
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it("handles error", async () => {
    vi.mocked(fetchProfile).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useProfile("u1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
