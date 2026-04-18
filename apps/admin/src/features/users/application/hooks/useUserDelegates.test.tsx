/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/application/utils/getApiBasePath", () => ({
  getApiBasePath: vi.fn(() => ""),
}));

import { useUserDelegates, useRemoveUserDelegate } from "./useUserDelegates";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockDelegatesResponse = {
  asSeller: [
    {
      id: "row-1",
      seller_id: "seller-1",
      admin_user_id: "admin-1",
      product_id: "prod-1",
      permissions: ["orders.read"],
      created_at: "2026-01-01T00:00:00Z",
      admin_profile: {
        id: "admin-1",
        email: "admin@example.com",
        display_name: "Admin One",
        avatar_url: null,
      },
      product: { id: "prod-1", name_en: "Widget", name_es: "Gadget" },
    },
  ],
  asDelegate: [],
};

describe("useUserDelegates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does not fetch when userId is null", () => {
    const { result } = renderHook(() => useUserDelegates(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches delegates for a given userId", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(mockDelegatesResponse, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useUserDelegates("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/users/user-1/delegates",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data?.asSeller).toHaveLength(1);
    expect(result.current.data?.asDelegate).toHaveLength(0);
  });

  it("sets error state when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));

    const { result } = renderHook(() => useUserDelegates("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("useRemoveUserDelegate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls DELETE endpoint and invalidates query on success", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const { result } = renderHook(() => useRemoveUserDelegate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "user-1", delegateRowId: "row-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/users/user-1/delegates",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ delegateRowId: "row-1" }),
      }),
    );
  });

  it("sets error state when DELETE response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useRemoveUserDelegate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "user-1", delegateRowId: "row-bad" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
