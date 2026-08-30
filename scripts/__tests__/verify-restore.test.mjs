import { describe, it, expect } from "vitest";

import { compareCounts } from "../verify-restore.mjs";

describe("compareCounts", () => {
  it("passes when every table matches the manifest", () => {
    const result = compareCounts(
      { orders: 147, user_profiles: 196 },
      { orders: 147, user_profiles: 196 },
    );

    expect(result).toEqual({ ok: true, mismatches: [] });
  });

  it("reports the table, expected and actual on a mismatch", () => {
    const result = compareCounts(
      { orders: 147, user_profiles: 196 },
      { orders: 147, user_profiles: 195 },
    );

    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual([
      { table: "user_profiles", expected: 196, actual: 195 },
    ]);
  });

  it("treats a table missing from the restore as zero, not as absent", () => {
    // A table that failed to restore reports no count at all. Silently skipping
    // it would turn a total restore failure into a pass.
    const result = compareCounts({ orders: 147 }, {});

    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual([
      { table: "orders", expected: 147, actual: 0 },
    ]);
  });
});
