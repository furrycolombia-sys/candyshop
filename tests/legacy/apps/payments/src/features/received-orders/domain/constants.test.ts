import { describe, it, expect } from "vitest";

import {
  EXPIRING_SOON_THRESHOLD_MS,
  FILTER_STATUSES,
  RECEIVED_ORDERS_QUERY_KEY,
  RECEIVED_ORDERS_STALE_TIME_MS,
} from "./constants";

describe("received-orders domain constants", () => {
  it("RECEIVED_ORDERS_QUERY_KEY is defined", () => {
    expect(RECEIVED_ORDERS_QUERY_KEY).toBe("received-orders");
  });

  it("FILTER_STATUSES includes all expected values", () => {
    expect(FILTER_STATUSES).toContain("all");
    expect(FILTER_STATUSES).toContain("pending_verification");
    expect(FILTER_STATUSES).toContain("evidence_requested");
    expect(FILTER_STATUSES).toContain("approved");
    expect(FILTER_STATUSES).toContain("rejected");
    expect(FILTER_STATUSES).toContain("expired");
  });

  it("RECEIVED_ORDERS_STALE_TIME_MS is 30 seconds", () => {
    expect(RECEIVED_ORDERS_STALE_TIME_MS).toBe(30_000);
  });

  it("EXPIRING_SOON_THRESHOLD_MS is 6 hours", () => {
    expect(EXPIRING_SOON_THRESHOLD_MS).toBe(6 * 60 * 60 * 1000);
  });
});
