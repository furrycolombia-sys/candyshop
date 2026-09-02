import { describe, expect, it } from "vitest";

import { buildAdminOrderFilters } from "@/app/api/admin/_shared/reportsFilters";

function build(params: Record<string, string>): Record<string, string> {
  const sp = new URLSearchParams(params);
  return buildAdminOrderFilters(sp);
}

describe("buildAdminOrderFilters — status validation", () => {
  it("accepts a valid status from ORDER_STATUS_LIST", () => {
    expect(build({ status: "approved" })).toEqual({
      payment_status: "eq.approved",
    });
  });

  it("accepts every status value the UI can produce", () => {
    for (const status of [
      "pending",
      "awaiting_payment",
      "pending_verification",
      "evidence_requested",
      "approved",
      "rejected",
      "expired",
    ]) {
      expect(build({ status })).toEqual({
        payment_status: `eq.${status}`,
      });
    }
  });

  it("silently drops an unknown status", () => {
    expect(build({ status: "nonsense" })).toEqual({});
  });

  it("silently drops a status that exists in legacy code but not the enum", () => {
    expect(build({ status: "failed" })).toEqual({});
    expect(build({ status: "refunded" })).toEqual({});
    expect(build({ status: "cancelled" })).toEqual({});
  });
});

describe("buildAdminOrderFilters — currency validation", () => {
  it("accepts a popular currency and normalizes to uppercase", () => {
    expect(build({ currency: "USD" })).toEqual({ currency: "eq.USD" });
    expect(build({ currency: "usd" })).toEqual({ currency: "eq.USD" });
    expect(build({ currency: "uSd" })).toEqual({ currency: "eq.USD" });
  });

  it("accepts non-USD currencies that exist in POPULAR_CURRENCIES", () => {
    expect(build({ currency: "COP" })).toEqual({ currency: "eq.COP" });
    expect(build({ currency: "EUR" })).toEqual({ currency: "eq.EUR" });
    expect(build({ currency: "MXN" })).toEqual({ currency: "eq.MXN" });
  });

  it("silently drops an unknown currency", () => {
    expect(build({ currency: "ZZZ" })).toEqual({});
  });
});

describe("buildAdminOrderFilters — UUID pass-throughs", () => {
  it("passes seller and buyer IDs through unchanged", () => {
    const sellerId = "11111111-1111-1111-1111-111111111111";
    const buyerId = "22222222-2222-2222-2222-222222222222";
    expect(build({ sellerId, buyerId })).toEqual({
      seller_id: `eq.${sellerId}`,
      user_id: `eq.${buyerId}`,
    });
  });
});

describe("buildAdminOrderFilters — date filters", () => {
  it("builds an open-lower-bound filter for dateFrom alone", () => {
    expect(build({ dateFrom: "2026-01-01" })).toEqual({
      created_at: "gte.2026-01-01",
    });
  });

  it("builds an open-upper-bound filter for dateTo alone (exclusive end)", () => {
    // dateTo=2026-01-31 → lt.2026-02-01 (day-after, half-open interval)
    expect(build({ dateTo: "2026-01-31" })).toEqual({
      created_at: "lt.2026-02-01",
    });
  });

  it("builds a closed range when both dates are present", () => {
    expect(build({ dateFrom: "2026-01-01", dateTo: "2026-01-31" })).toEqual({
      created_at: "gte.2026-01-01",
      and: "(created_at.lt.2026-02-01)",
    });
  });

  it("ignores invalid ISO dates", () => {
    expect(build({ dateFrom: "not-a-date" })).toEqual({});
    expect(build({ dateTo: "2026-13-99" })).toEqual({});
  });
});

describe("buildAdminOrderFilters — amount filters", () => {
  it("builds a single-bound filter for amountMin alone", () => {
    expect(build({ amountMin: "100" })).toEqual({ total: "gte.100" });
  });

  it("builds a single-bound filter for amountMax alone", () => {
    expect(build({ amountMax: "999" })).toEqual({ total: "lte.999" });
  });

  it("builds a combined range using the and= clause", () => {
    expect(build({ amountMin: "10", amountMax: "100" })).toEqual({
      total: "gte.10",
      and: "(total.lte.100)",
    });
  });

  it("appends to an existing and= clause when dates are also present", () => {
    expect(
      build({
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        amountMin: "10",
        amountMax: "100",
      }),
    ).toEqual({
      created_at: "gte.2026-01-01",
      and: "(created_at.lt.2026-02-01),(total.lte.100)",
      total: "gte.10",
    });
  });

  it("ignores negative or non-numeric amounts", () => {
    expect(build({ amountMin: "-5" })).toEqual({});
    expect(build({ amountMax: "not-a-number" })).toEqual({});
  });
});

describe("buildAdminOrderFilters — empty input", () => {
  it("returns an empty object when no params are given", () => {
    expect(build({})).toEqual({});
  });
});
