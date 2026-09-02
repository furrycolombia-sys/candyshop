import { describe, it, expect } from "vitest";

import { API_REFRESH_INTERVALS, API_DEFAULTS, orvalOptions } from "./api";

describe("API_REFRESH_INTERVALS", () => {
  it("has LIVE set to 5000ms", () => {
    expect(API_REFRESH_INTERVALS.LIVE).toBe(5000);
  });

  it("has STATIC set to false", () => {
    expect(API_REFRESH_INTERVALS.STATIC).toBe(false);
  });

  it("has SLOW set to 30000ms", () => {
    expect(API_REFRESH_INTERVALS.SLOW).toBe(30_000);
  });

  it("has HISTORICAL set to 60000ms", () => {
    expect(API_REFRESH_INTERVALS.HISTORICAL).toBe(60_000);
  });
});

describe("API_DEFAULTS", () => {
  it("has DEFAULT_PAGE_SIZE set to 10", () => {
    expect(API_DEFAULTS.DEFAULT_PAGE_SIZE).toBe(10);
  });
});

describe("orvalOptions", () => {
  it("wraps query options under a query key", () => {
    const opts = { staleTime: 5000, enabled: true };
    const result = orvalOptions(opts);
    expect(result).toEqual({ query: opts });
  });

  it("returns an object with the query property", () => {
    const result = orvalOptions({});
    expect(result).toHaveProperty("query");
  });
});
