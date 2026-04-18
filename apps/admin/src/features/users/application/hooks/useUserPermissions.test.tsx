import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/application/utils/getApiBasePath", () => ({
  getApiBasePath: vi.fn(() => ""),
}));

import { useUserPermissions } from "./useUserPermissions";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useUserPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetches granted keys for a given userId", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { grantedKeys: ["products.read", "orders.read"] },
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useUserPermissions("user-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/users/user-123/permissions",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(["products.read", "orders.read"]);
  });

  it("does not fetch when userId is null", () => {
    const { result } = renderHook(() => useUserPermissions(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sets error state when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useUserPermissions("user-fail"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
