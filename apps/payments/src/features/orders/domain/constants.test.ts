import { describe, it, expect } from "vitest";

import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
  MY_ORDERS_QUERY_KEY,
  ORDERS_STALE_TIME_MS,
  RECEIPTS_BUCKET,
  STATUS_COLORS,
} from "./constants";

describe("orders domain constants", () => {
  it("MY_ORDERS_QUERY_KEY is defined", () => {
    expect(MY_ORDERS_QUERY_KEY).toBe("my-orders");
  });

  it("STATUS_COLORS has entries for all known statuses", () => {
    const expectedStatuses = [
      "pending",
      "awaiting_payment",
      "pending_verification",
      "evidence_requested",
      "approved",
      "rejected",
      "expired",
      "paid",
    ];

    for (const status of expectedStatuses) {
      expect(STATUS_COLORS).toHaveProperty(status);
      expect(typeof STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBe(
        "string",
      );
    }
  });

  it("MAX_RECEIPT_SIZE_BYTES is 5 MB", () => {
    expect(MAX_RECEIPT_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("ACCEPTED_RECEIPT_TYPES is image/*", () => {
    expect(ACCEPTED_RECEIPT_TYPES).toBe("image/*");
  });

  it("RECEIPTS_BUCKET is receipts", () => {
    expect(RECEIPTS_BUCKET).toBe("receipts");
  });

  it("ORDERS_STALE_TIME_MS is 30 seconds", () => {
    expect(ORDERS_STALE_TIME_MS).toBe(30_000);
  });
});
