import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/application/utils/getApiBasePath", () => ({
  getApiBasePath: vi.fn(() => ""),
}));

import { useApplyTemplate } from "./useApplyTemplate";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useApplyTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends PUT request with userId and permissionKeys", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const { result } = renderHook(() => useApplyTemplate(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        userId: "user-123",
        permissionKeys: ["products.read", "products.create"],
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/users/user-123/permissions",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          permissionKeys: ["products.read", "products.create"],
        }),
      }),
    );
  });

  it("throws when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useApplyTemplate(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutate({
        userId: "user-123",
        permissionKeys: ["products.read"],
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("invalidates user permissions query on success", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useApplyTemplate(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        userId: "user-456",
        permissionKeys: ["orders.read"],
      }),
    );

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(["user-456"]),
      }),
    );
  });
});
