import { describe, it, expect } from "vitest";

import { DEFAULT_SETTINGS, SETTINGS_QUERY_KEY } from "./constants";

describe("settings domain constants", () => {
  it("exports SETTINGS_QUERY_KEY", () => {
    expect(SETTINGS_QUERY_KEY).toBe("payment-settings");
  });

  it("exports DEFAULT_SETTINGS with correct values", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      timeout_awaiting_payment_hours: 48,
      timeout_pending_verification_hours: 72,
      timeout_evidence_requested_hours: 24,
    });
  });
});
