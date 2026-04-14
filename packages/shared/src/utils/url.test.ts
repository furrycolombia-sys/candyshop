import { describe, it, expect } from "vitest";

import { stripTrailingSlash } from "./url";

describe("stripTrailingSlash", () => {
  it("removes a trailing slash from a URL", () => {
    expect(stripTrailingSlash("http://example.com/")).toBe(
      "http://example.com",
    );
  });

  it("returns the same string if there is no trailing slash", () => {
    expect(stripTrailingSlash("http://example.com")).toBe("http://example.com");
  });

  it("handles root path", () => {
    expect(stripTrailingSlash("/")).toBe("");
  });

  it("handles paths with trailing slash", () => {
    expect(stripTrailingSlash("/api/v1/")).toBe("/api/v1");
  });

  it("does not remove slashes in the middle", () => {
    expect(stripTrailingSlash("http://example.com/api/v1")).toBe(
      "http://example.com/api/v1",
    );
  });

  it("handles empty string", () => {
    expect(stripTrailingSlash("")).toBe("");
  });
});
