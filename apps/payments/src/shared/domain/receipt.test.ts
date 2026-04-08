import { describe, expect, it } from "vitest";

import {
  assertValidReceiptFile,
  buildReceiptStoragePath,
  getSafeReceiptHref,
  sanitizeReceiptFilename,
  validateReceiptFile,
} from "./receipt";

describe("receipt helpers", () => {
  it("accepts supported receipt images", () => {
    const file = new File(["ok"], "Receipt Final.PNG", { type: "image/png" });

    expect(validateReceiptFile(file)).toEqual({
      isValid: true,
      reason: null,
    });
  });

  it("rejects unsupported receipt types", () => {
    const file = new File(["bad"], "receipt.gif", { type: "image/gif" });

    expect(validateReceiptFile(file)).toEqual({
      isValid: false,
      reason: "invalid_type",
    });
    expect(() => assertValidReceiptFile(file)).toThrow("invalid_receipt_type");
  });

  it("rejects oversized receipts", () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });

    expect(validateReceiptFile(file)).toEqual({
      isValid: false,
      reason: "too_large",
    });
    expect(() => assertValidReceiptFile(file)).toThrow("receipt_too_large");
  });

  it("sanitizes filenames before building storage paths", () => {
    const file = new File(["ok"], "../../My Receipt (1).jpeg", {
      type: "image/jpeg",
    });

    expect(sanitizeReceiptFilename(file)).toBe("my-receipt-1.jpg");
    expect(buildReceiptStoragePath("order-123", file)).toBe(
      "order-123/my-receipt-1.jpg",
    );
  });

  it("only allows safe receipt hrefs", () => {
    expect(getSafeReceiptHref("https://example.com/file.png")).toBe(
      "https://example.com/file.png",
    );
    expect(getSafeReceiptHref("javascript:alert(1)")).toBeNull();
    expect(getSafeReceiptHref("order-123/receipt.png")).toBeNull();
  });
});
