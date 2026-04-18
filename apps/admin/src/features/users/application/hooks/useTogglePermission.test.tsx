import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/application/utils/getApiBasePath", () => ({
  getApiBasePath: vi.fn(() => ""),
}));

import { useTogglePermission } from "./useTogglePermission";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useTogglePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends POST request when granting a permission", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const { result } = renderHook(() => useTogglePermission(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        userId: "user-123",
        permissionKey: "products.create",
        grant: true,
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/users/user-123/permissions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ permissionKey: "products.create", grant: true }),
      }),
    );
  });

  it("sends POST request when revoking a permission", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const { result } = renderHook(() => useTogglePermission(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        userId: "user-123",
        permissionKey: "products.delete",
        grant: false,
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/users/user-123/permissions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          permissionKey: "products.delete",
          grant: false,
        }),
      }),
    );
  });

  it("throws when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));

    const { result } = renderHook(() => useTogglePermission(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutate({
        userId: "user-123",
        permissionKey: "products.read",
        grant: true,
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

    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useTogglePermission(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        userId: "user-789",
        permissionKey: "orders.read",
        grant: true,
      }),
    );

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(["user-789"]),
      }),
    );
  });
});
