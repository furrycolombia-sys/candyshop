import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiBasePath } from "@/shared/application/utils/getApiBasePath";

describe("getApiBasePath", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns '' when window is undefined (SSR)", () => {
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
