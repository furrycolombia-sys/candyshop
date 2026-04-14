import { describe, it, expect } from "vitest";

import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
  MY_ORDERS_QUERY_KEY,
  ORDERS_STALE_TIME_MS,
  RECEIPTS_BUCKET,
} from "./constants";

describe("orders domain constants", () => {
  it("MY_ORDERS_QUERY_KEY is defined", () => {
    expect(MY_ORDERS_QUERY_KEY).toBe("my-orders");
  });

  it("MAX_RECEIPT_SIZE_BYTES is 5 MB", () => {
    expect(MAX_RECEIPT_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("ACCEPTED_RECEIPT_TYPES lists the accepted image mime types", () => {
    expect(ACCEPTED_RECEIPT_TYPES).toBe("image/jpeg,image/png,image/webp");
  });

  it("RECEIPTS_BUCKET is receipts", () => {
    expect(RECEIPTS_BUCKET).toBe("receipts");
  });

  it("ORDERS_STALE_TIME_MS is 30 seconds", () => {
    expect(ORDERS_STALE_TIME_MS).toBe(30_000);
  });
});
