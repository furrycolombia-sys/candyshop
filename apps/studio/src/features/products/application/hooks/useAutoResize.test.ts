import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useAutoResize } from "./useAutoResize";

describe("useAutoResize", () => {
  it("sets the textarea height to its scrollHeight", () => {
    const textarea = {
      style: { height: "" },
      scrollHeight: 120,
    } as unknown as HTMLTextAreaElement;

    const ref = { current: textarea };

    renderHook(() => useAutoResize(ref, "initial-content"));

    expect(textarea.style.height).toBe("120px");
  });

  it("resets height to auto before measuring", () => {
    const heights: string[] = [];
    const textarea = {
      style: {
        set height(val: string) {
          heights.push(val);
        },
        get height() {
          return heights.at(-1) ?? "";
        },
      },
      scrollHeight: 80,
    } as unknown as HTMLTextAreaElement;

    const ref = { current: textarea };

    renderHook(() => useAutoResize(ref, "content"));

    expect(heights[0]).toBe("auto");
    expect(heights[1]).toBe("80px");
  });

  it("does nothing when ref is null", () => {
    const ref = { current: null };

    // Should not throw
    expect(() => {
      renderHook(() => useAutoResize(ref, "content"));
    }).not.toThrow();
  });

  it("recalculates when key changes", () => {
    const textarea = {
      style: { height: "" },
      scrollHeight: 100,
    } as unknown as HTMLTextAreaElement;

    const ref = { current: textarea };

    const { rerender } = renderHook(({ key }) => useAutoResize(ref, key), {
      initialProps: { key: "first" },
    });

    Object.defineProperty(textarea, "scrollHeight", {
      value: 200,
      configurable: true,
    });
    rerender({ key: "second" });

    expect(textarea.style.height).toBe("200px");
  });

  it("returns the autoResize function", () => {
    const textarea = {
      style: { height: "" },
      scrollHeight: 50,
    } as unknown as HTMLTextAreaElement;

    const ref = { current: textarea };
    const { result } = renderHook(() => useAutoResize(ref, "content"));

    expect(typeof result.current).toBe("function");
  });
});
