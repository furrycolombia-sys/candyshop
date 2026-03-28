import { describe, it, expect } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("converts a normal string to a slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("converts uppercase to lowercase", () => {
    expect(slugify("HELLO")).toBe("hello");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("hello world foo")).toBe("hello-world-foo");
  });

  it("removes special characters", () => {
    expect(slugify("hello! @world# $bar")).toBe("hello-world-bar");
  });

  it("collapses multiple non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("hello---world")).toBe("hello-world");
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("removes leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("returns the same string if already slugified", () => {
    expect(slugify("already-slugified")).toBe("already-slugified");
  });

  it("handles strings with numbers", () => {
    expect(slugify("Product 123")).toBe("product-123");
    expect(slugify("42 items")).toBe("42-items");
  });

  it("handles strings with only special characters", () => {
    expect(slugify("!@#$%^&*()")).toBe("");
  });

  it("handles mixed unicode and ASCII", () => {
    expect(slugify("café latte")).toBe("caf-latte");
  });
});
