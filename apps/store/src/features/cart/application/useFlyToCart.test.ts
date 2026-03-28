/* eslint-disable vitest/expect-expect */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useFlyToCart } from "./useFlyToCart";

describe("useFlyToCart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns fire, setCartTarget, and cartRef", () => {
    const { result } = renderHook(() => useFlyToCart());
    expect(result.current.fire).toBeInstanceOf(Function);
    expect(result.current.setCartTarget).toBeInstanceOf(Function);
    expect(result.current.cartRef).toBeDefined();
  });

  it("setCartTarget sets the ref", () => {
    const { result } = renderHook(() => useFlyToCart());
    const mockButton = document.createElement("button");
    act(() => {
      result.current.setCartTarget(mockButton);
    });
    expect(result.current.cartRef.current).toBe(mockButton);
  });

  it("fire does nothing when cartRef is null", () => {
    const { result } = renderHook(() => useFlyToCart());
    const sourceRect = new DOMRect(100, 100, 50, 50);
    // Should not throw
    act(() => {
      result.current.fire(sourceRect, "bg-mint");
    });
  });

  it("fire creates and animates a projectile element", () => {
    const mockAnimate = vi.fn().mockReturnValue({ onfinish: null });
    const mockButton = document.createElement("button");
    mockButton.getBoundingClientRect = vi
      .fn()
      .mockReturnValue(new DOMRect(300, 50, 60, 40));
    mockButton.animate = mockAnimate;

    // Mock document.createElement to return a div that also has animate
    const origCreate = document.createElement.bind(document);
    const mockDiv = origCreate("div");
    mockDiv.animate = mockAnimate;
    vi.spyOn(document, "createElement").mockReturnValue(
      mockDiv as HTMLDivElement,
    );

    const { result } = renderHook(() => useFlyToCart());
    act(() => {
      result.current.setCartTarget(mockButton);
    });

    const sourceRect = new DOMRect(100, 200, 50, 50);
    act(() => {
      result.current.fire(sourceRect, "bg-mint");
    });

    expect(mockAnimate).toHaveBeenCalled();
  });
});
