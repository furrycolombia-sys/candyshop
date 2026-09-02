/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/account/infrastructure/profileQueries", () => ({
  updateProfile: vi.fn(),
}));

import { useUpdateProfile } from "./useUpdateProfile";

import { updateProfile } from "@/features/account/infrastructure/profileQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useUpdateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateProfile on mutate", async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      id: "u1",
      email: "test@test.com",
      avatar_url: null,
      provider: "google",
      display_name: "Updated",
      display_email: null,
      display_avatar_url: null,
      first_seen_at: "2025-01-01",
      last_seen_at: "2025-01-01",
    });

    const { result } = renderHook(() => useUpdateProfile("u1"), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        display_name: "Updated",
        display_email: null,
        display_avatar_url: null,
      }),
    );

    expect(updateProfile).toHaveBeenCalledWith(expect.anything(), "u1", {
      display_name: "Updated",
      display_email: null,
      display_avatar_url: null,
    });
  });
});
