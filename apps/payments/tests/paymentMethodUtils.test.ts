import { describe, it, expect } from "vitest";

import type { FormField } from "@/shared/domain/PaymentMethodTypes";
import {
  validateBuyerSubmission,
  validateFileSize,
} from "@/shared/domain/paymentMethodUtils";

const makeField = (
  id: string,
  label_en: string,
  required: boolean,
): FormField => ({
  id,
  type: "text",
  label_en,
  required,
});

describe("validateBuyerSubmission", () => {
  it("returns empty array when all required fields are filled", () => {
    const fields = [makeField("f1", "Name", true)];
    const submission = { f1: "Alice" };
    expect(validateBuyerSubmission(fields, submission)).toEqual([]);
  });

  it("returns label_en for a missing required field", () => {
    const fields = [makeField("f1", "Name", true)];
    const submission = {};
    expect(validateBuyerSubmission(fields, submission)).toEqual(["Name"]);
  });

  it("returns label_en for a whitespace-only required field value", () => {
    const fields = [makeField("f1", "Name", true)];
    const submission = { f1: "   " };
    expect(validateBuyerSubmission(fields, submission)).toEqual(["Name"]);
  });

  it("does not flag optional fields that are missing", () => {
    const fields = [makeField("f1", "Notes", false)];
    const submission = {};
    expect(validateBuyerSubmission(fields, submission)).toEqual([]);
  });

  it("collects multiple missing required fields", () => {
    const fields = [
      makeField("f1", "Name", true),
      makeField("f2", "Email", true),
      makeField("f3", "Notes", false),
    ];
    const submission = { f2: "a@b.com" };
    expect(validateBuyerSubmission(fields, submission)).toEqual(["Name"]);
  });

  it("returns empty array when no fields are required", () => {
    const fields = [makeField("f1", "Optional", false)];
    expect(validateBuyerSubmission(fields, {})).toEqual([]);
  });

  it("returns empty array for empty fields list", () => {
    expect(validateBuyerSubmission([], {})).toEqual([]);
  });
});

describe("validateFileSize", () => {
  const TEN_MB = 10 * 1024 * 1024;

  it("returns true for a file exactly at the 10 MB limit", () => {
    expect(validateFileSize(TEN_MB)).toBe(true);
  });

  it("returns true for a file below the limit", () => {
    expect(validateFileSize(TEN_MB - 1)).toBe(true);
  });

  it("returns false for a file above the limit", () => {
    expect(validateFileSize(TEN_MB + 1)).toBe(false);
  });

  it("returns true for 0 bytes", () => {
    expect(validateFileSize(0)).toBe(true);
  });
});
