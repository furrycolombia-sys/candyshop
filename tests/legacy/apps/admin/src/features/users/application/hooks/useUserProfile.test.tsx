import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/application/hooks/useSupabase", () => ({
  useSupabase: vi.fn(),
}));

vi.mock("@/features/users/infrastructure/userPermissionQueries", () => ({
  getUserProfile: vi.fn(),
}));

import { useUserProfile } from "./useUserProfile";

import { getUserProfile } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const mockSupabase = {} as ReturnType<typeof useSupabase>;

describe("useUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSupabase).mockReturnValue(mockSupabase);
  });

  it("does not fetch when userId is null", () => {
    const { result } = renderHook(() => useUserProfile(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("fetches and returns profile for given userId", async () => {
    const mockProfile = {
      id: "user-1",
      email: "test@example.com",
      display_name: "Test User",
      avatar_url: null,
    };
    vi.mocked(getUserProfile).mockResolvedValue(
      mockProfile as ReturnType<typeof getUserProfile> extends Promise<infer T>
        ? T
        : never,
    );

    const { result } = renderHook(() => useUserProfile("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getUserProfile).toHaveBeenCalledWith(mockSupabase, "user-1");
    expect(result.current.data).toEqual(mockProfile);
  });

  it("returns null when user profile is not found", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    const { result } = renderHook(() => useUserProfile("unknown-user"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("sets error state when query throws", async () => {
    vi.mocked(getUserProfile).mockRejectedValue(new Error("DB error"));

    const { result } = renderHook(() => useUserProfile("bad-user"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
