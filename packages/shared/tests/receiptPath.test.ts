import { describe, expect, it } from "vitest";

import {
  SAFE_RECEIPT_PATH,
  assertSafeReceiptPath,
  toSafeReceiptPath,
} from "@shared/utils/receiptPath";

describe("SAFE_RECEIPT_PATH", () => {
  it("matches the canonical path shape", () => {
    expect(SAFE_RECEIPT_PATH.test("order-123/receipt.png")).toBe(true);
    expect(SAFE_RECEIPT_PATH.test("abc_DEF/file-1.jpg")).toBe(true);
    expect(SAFE_RECEIPT_PATH.test("seg/name.webp")).toBe(true);
  });

  it("rejects path traversal", () => {
    expect(SAFE_RECEIPT_PATH.test("../secret.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order/../other/file.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test(String.raw`..\secret.png`)).toBe(false);
  });

  it("rejects multiple slashes", () => {
    expect(SAFE_RECEIPT_PATH.test("a/b/c.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("/a/b.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("a/b.png/")).toBe(false);
  });

  it("rejects empty segments", () => {
    expect(SAFE_RECEIPT_PATH.test("/file.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("dir/.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("")).toBe(false);
  });

  it("rejects disallowed extensions", () => {
    expect(SAFE_RECEIPT_PATH.test("order/file.gif")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order/file.svg")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order/file.pdf")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order/file")).toBe(false);
  });

  it("rejects URL-encoded traversal attempts", () => {
    expect(SAFE_RECEIPT_PATH.test("order/%2E%2E/file.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order/file%2Epng")).toBe(false);
  });

  it("rejects spaces, dots, and other unsafe chars in segments", () => {
    expect(SAFE_RECEIPT_PATH.test("order id/file.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order.id/file.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order;rm -rf/file.png")).toBe(false);
    expect(SAFE_RECEIPT_PATH.test("order#x/file.png")).toBe(false);
  });
});

describe("toSafeReceiptPath", () => {
  it("returns the reconstructed path for a valid input", () => {
    expect(toSafeReceiptPath("order-123/receipt.png")).toBe(
      "order-123/receipt.png",
    );
    expect(toSafeReceiptPath("abc_def/my-file.webp")).toBe(
      "abc_def/my-file.webp",
    );
  });

  it("returns null on path traversal", () => {
    expect(toSafeReceiptPath("../secret.png")).toBeNull();
    expect(toSafeReceiptPath("order/../other.png")).toBeNull();
  });

  it("returns null on unknown extension", () => {
    expect(toSafeReceiptPath("order/file.gif")).toBeNull();
  });

  it("returns null on empty input", () => {
    expect(toSafeReceiptPath("")).toBeNull();
  });
});

describe("assertSafeReceiptPath", () => {
  it("returns the reconstructed path on valid input", () => {
    expect(assertSafeReceiptPath("order-123/receipt.png")).toBe(
      "order-123/receipt.png",
    );
  });

  it("throws on path traversal", () => {
    expect(() => assertSafeReceiptPath("../secret.png")).toThrow(
      /path traversal detected/,
    );
    expect(() => assertSafeReceiptPath("order/../other.png")).toThrow(
      /path traversal detected/,
    );
  });

  it("throws on unknown extension", () => {
    expect(() => assertSafeReceiptPath("order/file.gif")).toThrow(
      /path traversal detected/,
    );
  });

  it("throws on empty input", () => {
    expect(() => assertSafeReceiptPath("")).toThrow(/path traversal detected/);
  });
});
