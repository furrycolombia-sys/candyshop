// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  PermissionsProvider,
  useInitialGrantedKeys,
} from "@auth/client/PermissionsContext";

describe("PermissionsContext", () => {
  it("provides initialGrantedKeys through context to consumers", () => {
    const initialKeys = ["products.create", "orders.read"];

    const wrapper = ({ children }: { children: ReactNode }) => (
      <PermissionsProvider initialGrantedKeys={initialKeys}>
        {children}
      </PermissionsProvider>
    );

    const { result } = renderHook(() => useInitialGrantedKeys(), { wrapper });

    expect(result.current).toEqual(initialKeys);
  });

  it("returns empty array when no PermissionsProvider is present (default context value)", () => {
    const { result } = renderHook(() => useInitialGrantedKeys());

    expect(result.current).toEqual([]);
  });

  it("reflects updated initialGrantedKeys when provider re-renders with new value", () => {
    let keys = ["orders.read"];

    const wrapper = ({ children }: { children: ReactNode }) => (
      <PermissionsProvider initialGrantedKeys={keys}>
        {children}
      </PermissionsProvider>
    );

    const { result, rerender } = renderHook(() => useInitialGrantedKeys(), {
      wrapper,
    });

    expect(result.current).toEqual(["orders.read"]);

    keys = ["orders.read", "products.create"];
    rerender();

    expect(result.current).toEqual(["orders.read", "products.create"]);
  });
});
