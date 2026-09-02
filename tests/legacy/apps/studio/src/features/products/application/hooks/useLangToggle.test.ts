import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useLangToggle } from "./useLangToggle";

describe("useLangToggle", () => {
  it("starts with 'en' as the default language", () => {
    const { result } = renderHook(() => useLangToggle());
    expect(result.current.lang).toBe("en");
  });

  it("toggles from 'en' to 'es'", () => {
    const { result } = renderHook(() => useLangToggle());

    act(() => {
      result.current.toggleLang();
    });

    expect(result.current.lang).toBe("es");
  });

  it("toggles back from 'es' to 'en'", () => {
    const { result } = renderHook(() => useLangToggle());

    act(() => {
      result.current.toggleLang();
    });
    act(() => {
      result.current.toggleLang();
    });

    expect(result.current.lang).toBe("en");
  });

  it("returns a stable toggleLang callback", () => {
    const { result, rerender } = renderHook(() => useLangToggle());
    const firstCallback = result.current.toggleLang;
    rerender();
    expect(result.current.toggleLang).toBe(firstCallback);
  });
});
