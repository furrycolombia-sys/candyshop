import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSupabase } from "./useSupabase";

const mockClient = { auth: {}, from: vi.fn() };
const mockCreateBrowserSupabaseClient = vi.fn(() => mockClient);

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: () => mockCreateBrowserSupabaseClient(),
}));

describe("useSupabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls createBrowserSupabaseClient once during mount", () => {
    renderHook(() => useSupabase());

    expect(mockCreateBrowserSupabaseClient).toHaveBeenCalledTimes(1);
  });

  it("returns a stable client reference across re-renders", () => {
    const { result, rerender } = renderHook(() => useSupabase());

    const firstClient = result.current;
    rerender();
    const secondClient = result.current;

    expect(secondClient).toBe(firstClient);
  });

  it("does not call createBrowserSupabaseClient again on re-render", () => {
    const { rerender } = renderHook(() => useSupabase());

    rerender();
    rerender();

    expect(mockCreateBrowserSupabaseClient).toHaveBeenCalledTimes(1);
  });
});
