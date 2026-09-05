import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiBasePath } from "./getApiBasePath";

describe("getApiBasePath", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns '' when window is undefined (SSR)", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- stub must be undefined to simulate SSR (no window object)
    vi.stubGlobal("window", undefined);
    expect(getApiBasePath()).toBe("");
  });

  it("returns '/admin' when pathname starts with /admin", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/admin/users" },
    });
    expect(getApiBasePath()).toBe("/admin");
  });

  it("returns '' for other paths", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/store/products" },
    });
    expect(getApiBasePath()).toBe("");
  });
});
