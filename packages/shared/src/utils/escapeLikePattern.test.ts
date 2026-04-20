import { describe, it, expect } from "vitest";

import { escapeLikePattern } from "./escapeLikePattern";

describe("escapeLikePattern", () => {
  it("escapes %", () => {
    expect(escapeLikePattern("100%")).toBe(String.raw`100\%`);
  });

  it("escapes _", () => {
    expect(escapeLikePattern("col_name")).toBe(String.raw`col\_name`);
  });

  it("escapes \\", () => {
    expect(escapeLikePattern(String.raw`path\to\file`)).toBe(
      String.raw`path\\to\\file`,
    );
  });

  it("handles empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });

  it("handles string with no special chars", () => {
    expect(escapeLikePattern("hello world")).toBe("hello world");
  });

  it("handles multiple wildcards in one string", () => {
    expect(escapeLikePattern(String.raw`100% of col_1 in path\dir`)).toBe(
      String.raw`100\% of col\_1 in path\\dir`,
    );
  });
});
