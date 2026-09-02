import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/application/hooks/useSupabase", () => ({
  useSupabase: vi.fn(),
}));

vi.mock("@/features/users/infrastructure/userPermissionQueries", () => ({
  listUsers: vi.fn(),
}));

import { useUsers } from "./useUsers";

import { USERS_PER_PAGE } from "@/features/users/domain/constants";
import { listUsers } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("calls listUsers with correct parameters and returns data", async () => {
    const mockSupabase = { auth: {} };
    vi.mocked(useSupabase).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof useSupabase>,
    );

    const mockResponse = { users: [{ id: "1" }], total: 1 };
    vi.mocked(listUsers).mockResolvedValue(
      mockResponse as unknown as Awaited<ReturnType<typeof listUsers>>,
    );

    const { result } = renderHook(() => useUsers("admin", 2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useSupabase).toHaveBeenCalled();
    expect(listUsers).toHaveBeenCalledWith(
      mockSupabase,
      "admin",
      2,
      USERS_PER_PAGE,
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  it("handles empty responses correctly", async () => {
    const mockSupabase = { auth: {} };
    vi.mocked(useSupabase).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof useSupabase>,
    );

    const mockResponse = { users: [], total: 0 };
    vi.mocked(listUsers).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUsers("", 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listUsers).toHaveBeenCalledWith(mockSupabase, "", 1, USERS_PER_PAGE);
    expect(result.current.data).toEqual(mockResponse);
  });
});
