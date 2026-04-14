import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useGridCols } from "./useGridCols";

vi.mock("usehooks-ts", () => ({
  useMediaQuery: (query: string) => {
    if (query === "(min-width: 1024px)") return mockIsLg;
    if (query === "(min-width: 640px)") return mockIsSm;
    return false;
  },
}));

let mockIsLg = false;
let mockIsSm = false;

describe("useGridCols", () => {
  it("returns 1 on mobile (no breakpoints)", () => {
    mockIsLg = false;
    mockIsSm = false;
    const { result } = renderHook(() => useGridCols());
    expect(result.current).toBe(1);
  });

  it("returns 2 on sm breakpoint", () => {
    mockIsLg = false;
    mockIsSm = true;
    const { result } = renderHook(() => useGridCols());
    expect(result.current).toBe(2);
  });

  it("returns 3 on lg breakpoint", () => {
    mockIsLg = true;
    mockIsSm = true;
    const { result } = renderHook(() => useGridCols());
    expect(result.current).toBe(3);
  });
});
