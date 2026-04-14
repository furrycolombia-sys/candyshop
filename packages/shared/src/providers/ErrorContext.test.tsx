import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";

import { ErrorProvider, useErrorContext } from "./ErrorContext";

function wrapper({ children }: { children: ReactNode }) {
  return <ErrorProvider>{children}</ErrorProvider>;
}

describe("ErrorContext", () => {
  describe("useErrorContext", () => {
    it("throws when used outside ErrorProvider", () => {
      expect(() => {
        renderHook(() => useErrorContext());
      }).toThrow("useErrorContext must be used within an ErrorProvider");
    });

    it("returns initial state with no error", () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      expect(result.current.error.message).toBeNull();
      expect(result.current.error.retry).toBeNull();
    });

    it("sets an error message", () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.setError("Something went wrong");
      });

      expect(result.current.error.message).toBe("Something went wrong");
      expect(result.current.error.retry).toBeNull();
    });

    it("sets an error message with a retry function", () => {
      const retryFn = vi.fn();
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.setError("Network error", retryFn);
      });

      expect(result.current.error.message).toBe("Network error");
      expect(result.current.error.retry).toBe(retryFn);
    });

    it("clears the error", () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.setError("Error occurred");
      });
      expect(result.current.error.message).toBe("Error occurred");

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error.message).toBeNull();
      expect(result.current.error.retry).toBeNull();
    });

    it("sets error to null message", () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.setError("First error");
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error.message).toBeNull();
    });
  });
});
