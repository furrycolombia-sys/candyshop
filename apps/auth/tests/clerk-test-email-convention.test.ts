import { describe, expect, it } from "vitest";

import { assertNotProductionClerk } from "../e2e/helpers/guardEnv";

describe("assertNotProductionClerk", () => {
  it("throws on a live secret key", () => {
    expect(() => assertNotProductionClerk("sk_live_abc123")).toThrow(
      /production Clerk instance/i,
    );
  });

  it("allows a test secret key", () => {
    expect(() => assertNotProductionClerk("sk_test_abc123")).not.toThrow();
  });
});

describe("test email convention", () => {
  it("every generated address carries +clerk_test", () => {
    const label = "sample";
    const email = `e2e-${label}-${Date.now()}+clerk_test@example.com`;
    expect(email).toMatch(/^e2e-.*\+clerk_test@example\.com$/);
  });
});
