/* eslint-disable vitest/no-conditional-expect */
import { describe, it, expect } from "vitest";

import { profileFormSchema } from "./types";

describe("profileFormSchema", () => {
  it("accepts valid display_name", () => {
    const result = profileFormSchema.safeParse({ display_name: "John Doe" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_name).toBe("John Doe");
    }
  });

  it("trims and nullifies empty display_name", () => {
    const result = profileFormSchema.safeParse({ display_name: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_name).toBeNull();
    }
  });

  it("trims and nullifies empty string display_name", () => {
    const result = profileFormSchema.safeParse({ display_name: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_name).toBeNull();
    }
  });

  it("rejects display_name over 100 characters", () => {
    const result = profileFormSchema.safeParse({
      display_name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid display_email", () => {
    const result = profileFormSchema.safeParse({
      display_email: "test@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_email).toBe("test@example.com");
    }
  });

  it("trims and nullifies empty display_email", () => {
    const result = profileFormSchema.safeParse({ display_email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_email).toBeNull();
    }
  });

  it("rejects invalid display_email", () => {
    const result = profileFormSchema.safeParse({
      display_email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid https avatar URL", () => {
    const result = profileFormSchema.safeParse({
      display_avatar_url: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_avatar_url).toBe(
        "https://example.com/avatar.png",
      );
    }
  });

  it("trims and nullifies empty display_avatar_url", () => {
    const result = profileFormSchema.safeParse({ display_avatar_url: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_avatar_url).toBeNull();
    }
  });

  it("rejects non-https avatar URL", () => {
    const result = profileFormSchema.safeParse({
      display_avatar_url: "http://example.com/avatar.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL avatar string", () => {
    const result = profileFormSchema.safeParse({
      display_avatar_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all fields together", () => {
    const result = profileFormSchema.safeParse({
      display_name: "John",
      display_email: "john@example.com",
      display_avatar_url: "https://img.example.com/john.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = profileFormSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
