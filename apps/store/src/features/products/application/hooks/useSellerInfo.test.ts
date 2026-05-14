import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSellerInfo } from "./useSellerInfo";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("shared", () => ({
  useSupabase: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSellerInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("returns undefined data and is disabled when sellerId is null", () => {
    const { result } = renderHook(() => useSellerInfo(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches and returns displayName and avatarUrl when sellerId is provided", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "seller-1",
        display_name: "Jane Doe",
        email: "jane@example.com",
        display_avatar_url: "https://cdn.example.com/jane.jpg",
        avatar_url: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useSellerInfo("seller-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      displayName: "Jane Doe",
      avatarUrl: "https://cdn.example.com/jane.jpg",
    });
  });

  it("falls back to avatar_url when display_avatar_url is null", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "seller-1",
        display_name: "Jane Doe",
        email: "jane@example.com",
        display_avatar_url: null,
        avatar_url: "https://cdn.example.com/jane-auth.jpg",
      },
      error: null,
    });

    const { result } = renderHook(() => useSellerInfo("seller-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.avatarUrl).toBe(
      "https://cdn.example.com/jane-auth.jpg",
    );
  });

  it("returns null avatarUrl when both avatar fields are null", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "seller-1",
        display_name: "Jane Doe",
        email: "jane@example.com",
        display_avatar_url: null,
        avatar_url: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useSellerInfo("seller-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.avatarUrl).toBeNull();
  });

  it("falls back to email prefix when display_name is null", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "seller-1",
        display_name: null,
        email: "jane@example.com",
        display_avatar_url: null,
        avatar_url: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useSellerInfo("seller-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.displayName).toBe("jane");
  });

  it("sets isError when the query fails", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const { result } = renderHook(() => useSellerInfo("seller-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
