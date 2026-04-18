import { describe, expect, it } from "vitest";

import { getInitials } from "./getInitials";

describe("getInitials", () => {
  it("returns first letters of each word in a display name", () => {
    expect(getInitials("John Doe", "john@example.com")).toBe("JD");
  });

  it("caps initials at 2 characters for names with more than 2 words", () => {
    expect(getInitials("Alice Bob Carol", "alice@example.com")).toBe("AB");
  });

  it("returns single-letter initial for single-word name", () => {
    expect(getInitials("Alice", "alice@example.com")).toBe("A");
  });

  it("returns uppercased initials", () => {
    expect(getInitials("john doe", "john@example.com")).toBe("JD");
  });

  it("falls back to first letter of email when name is null", () => {
    expect(getInitials(null, "alice@example.com")).toBe("A");
  });

  it("returns uppercase email initial", () => {
    expect(getInitials(null, "bob@example.com")).toBe("B");
  });

  it("returns ? when name is null and email is empty", () => {
    expect(getInitials(null, "")).toBe("?");
  });
});
