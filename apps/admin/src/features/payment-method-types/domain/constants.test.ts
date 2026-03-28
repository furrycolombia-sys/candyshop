import { describe, it, expect } from "vitest";

import {
  PAYMENT_METHOD_TYPES_QUERY_KEY,
  PAYMENT_METHOD_TYPE_FORM_DEFAULTS,
} from "./constants";

describe("payment-method-types domain constants", () => {
  it("exports PAYMENT_METHOD_TYPES_QUERY_KEY", () => {
    expect(PAYMENT_METHOD_TYPES_QUERY_KEY).toBe("payment-method-types");
  });

  it("exports PAYMENT_METHOD_TYPE_FORM_DEFAULTS with correct shape", () => {
    expect(PAYMENT_METHOD_TYPE_FORM_DEFAULTS).toEqual({
      name_en: "",
      name_es: "",
      description_en: "",
      description_es: "",
      icon: "",
      requires_receipt: true,
      requires_transfer_number: true,
      is_active: true,
    });
  });

  it("requires_receipt defaults to true", () => {
    expect(PAYMENT_METHOD_TYPE_FORM_DEFAULTS.requires_receipt).toBe(true);
  });

  it("requires_transfer_number defaults to true", () => {
    expect(PAYMENT_METHOD_TYPE_FORM_DEFAULTS.requires_transfer_number).toBe(
      true,
    );
  });
});
