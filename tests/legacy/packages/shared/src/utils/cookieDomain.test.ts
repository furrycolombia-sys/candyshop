import { describe, it, expect } from "vitest";

import { getSharedCookieDomain } from "./cookieDomain";

describe("getSharedCookieDomain", () => {
  it("returns undefined for 'localhost'", () => {
    expect(getSharedCookieDomain("localhost")).toBeUndefined();
  });

  it("returns undefined for '127.0.0.1'", () => {
    expect(getSharedCookieDomain("127.0.0.1")).toBeUndefined();
  });

  it("returns undefined for a single-segment hostname", () => {
    expect(getSharedCookieDomain("myapp")).toBeUndefined();
  });

  it("returns '.example.com' for 'app.example.com'", () => {
    expect(getSharedCookieDomain("app.example.com")).toBe(".example.com");
  });

  it("returns '.example.com' for 'sub1.sub2.example.com'", () => {
    expect(getSharedCookieDomain("sub1.sub2.example.com")).toBe(".example.com");
  });
});
