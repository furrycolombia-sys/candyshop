import { describe, it, expect } from "vitest";

import { TIME_CONSTANTS } from "./time";

describe("TIME_CONSTANTS", () => {
  it("has QUERY.STALE_TIME_MS set to 60 seconds", () => {
    expect(TIME_CONSTANTS.QUERY.STALE_TIME_MS).toBe(60_000);
  });

  it("has QUERY.GC_TIME_MS set to 5 minutes", () => {
    expect(TIME_CONSTANTS.QUERY.GC_TIME_MS).toBe(300_000);
  });
});
