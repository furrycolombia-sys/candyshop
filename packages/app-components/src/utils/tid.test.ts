import { describe, it, expect, afterEach } from "vitest";

import { tid, TID_ATTR } from "./tid";

describe("tid", () => {
  // tid is re-exported from shared, so we test the actual implementation behavior
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.NEXT_PUBLIC_ENABLE_TEST_IDS;
  });

  it("exports TID_ATTR as data-testid", () => {
    expect(TID_ATTR).toBe("data-testid");
  });

  it("returns data-testid when given a string in test env", () => {
    process.env.NODE_ENV = "test";
    const result = tid("submit-button");
    expect(result).toEqual({ "data-testid": "submit-button" });
  });

  it("returns data-testid when given a string in development", () => {
    process.env.NODE_ENV = "development";
    const result = tid("my-element");
    expect(result).toEqual({ "data-testid": "my-element" });
  });

  it("returns empty object in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_ENABLE_TEST_IDS;
    const result = tid("my-element");
    expect(result).toEqual({});
  });

  it("returns data-testid in production when NEXT_PUBLIC_ENABLE_TEST_IDS is true", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ENABLE_TEST_IDS = "true";
    const result = tid("my-element");
    expect(result).toEqual({ "data-testid": "my-element" });
  });

  it("handles options object with id", () => {
    process.env.NODE_ENV = "test";
    const result = tid({ id: "card" });
    expect(result).toEqual({ "data-testid": "card" });
  });

  it("handles options object with cls string", () => {
    process.env.NODE_ENV = "test";
    const result = tid({ cls: "featured" });
    expect(result).toEqual({ "data-test-class": "featured" });
  });

  it("handles options object with cls array", () => {
    process.env.NODE_ENV = "test";
    const result = tid({ cls: ["featured", "active"] });
    expect(result).toEqual({ "data-test-class": "featured active" });
  });

  it("handles options object with vals", () => {
    process.env.NODE_ENV = "test";
    const result = tid({ vals: { status: "active", role: "admin" } });
    expect(result).toEqual({
      "data-test-status": "active",
      "data-test-role": "admin",
    });
  });

  it("handles options object with all properties", () => {
    process.env.NODE_ENV = "test";
    const result = tid({
      id: "card",
      cls: "featured",
      vals: { status: "active" },
    });
    expect(result).toEqual({
      "data-testid": "card",
      "data-test-class": "featured",
      "data-test-status": "active",
    });
  });

  it("returns empty object for options in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_ENABLE_TEST_IDS;
    const result = tid({ id: "card", cls: "featured" });
    expect(result).toEqual({});
  });
});
