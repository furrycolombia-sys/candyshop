import { describe, expect, it } from "vitest";

import {
  EDITABLE,
  findOffenders,
  MIGRATIONS_DIR,
} from "../lib/migration-edits.mjs";

const at = (name) => `${MIGRATIONS_DIR}${name}`;

describe("findOffenders", () => {
  it("allows a new migration", () => {
    const changes = [{ status: "A", path: at("20261001000000_add_thing.sql") }];

    expect(findOffenders(changes, new Set())).toEqual([]);
  });

  it("rejects editing an applied migration", () => {
    // The case the check exists for: Supabase records a migration by name and
    // never re-runs it, so this edit reaches the file and no database.
    const changes = [{ status: "M", path: at("20260901000000_applied.sql") }];

    expect(findOffenders(changes, new Set())).toEqual(changes);
  });

  it("rejects deleting or renaming one", () => {
    // Both rewrite a history some database already holds.
    const changes = [
      { status: "D", path: at("20260901000000_applied.sql") },
      { status: "R100", path: at("20260902000000_renamed.sql") },
    ];

    expect(findOffenders(changes, new Set())).toEqual(changes);
  });

  it("allows editing a migration no database has applied yet", () => {
    const name = "20260902120000_baseline.sql";
    const changes = [{ status: "M", path: at(name) }];

    expect(findOffenders(changes, new Set([name]))).toEqual([]);
  });

  it("exempts the baseline today, because production does not exist yet", () => {
    // This asserts the exemption is real rather than aspirational. When
    // production is restored the entry goes away and this test goes red, which
    // is the reminder.
    const changes = [
      { status: "M", path: at("20260902120000_baseline.sql") },
      { status: "M", path: at("20260319000000_core_schema.sql") },
    ];

    expect(findOffenders(changes)).toEqual([
      { status: "M", path: at("20260319000000_core_schema.sql") },
    ]);
    expect(EDITABLE.has("20260902120000_baseline.sql")).toBe(true);
  });
});
