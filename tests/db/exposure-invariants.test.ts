import { afterAll, describe, expect, it } from "vitest";

import { withSuperuser } from "./helpers";

afterAll(async () => {
  const { closePool } = await import("./helpers");
  await closePool();
});

/**
 * Catalog-level, not fixture-level.
 *
 * A test that names a table proves only the tables that existed when it was
 * written. These ask the catalog instead, so they keep holding as the schema
 * grows -- which is where the next leak comes from. The audit view that was
 * exposing 2995 rows got in exactly that way: it was added after the tests
 * that would have covered it.
 */

const CLIENT_ROLES = ["anon", "authenticated"];

/**
 * Columns that link a row to a real person's identity provider account.
 * `identity_sub` is the Clerk subject: with it, rows across every table can be
 * correlated to one human, and to that human's account at the IdP.
 */
const LINKABILITY_COLUMNS = ["identity_sub"];

type Grant = { relation: string; column: string; role: string };

const clientReadableColumns = (columns: string[]): Promise<Grant[]> =>
  withSuperuser(async (c) => {
    const r = await c.query<Grant>(
      `select n.nspname || '.' || c.relname as relation,
              a.attname                     as column,
              r.rolname                     as role
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         join pg_attribute a on a.attrelid = c.oid
        cross join unnest($2::text[]) as r(rolname)
        where n.nspname = 'public'
          and c.relkind in ('r', 'p', 'v', 'm', 'f')
          and a.attnum > 0
          and not a.attisdropped
          and a.attname = any($1::text[])
          and has_column_privilege(r.rolname, c.oid, a.attnum, 'SELECT')
        order by 1, 2, 3`,
      [columns, CLIENT_ROLES],
    );
    return r.rows;
  });

describe("exposure invariants", () => {
  it("no client role can read a linkability column, on any relation", async () => {
    const leaks = await clientReadableColumns(LINKABILITY_COLUMNS);

    expect(
      leaks.map((l) => `${l.role} can read ${l.relation}.${l.column}`),
    ).toEqual([]);
  });

  it("every table in public has row level security enabled", async () => {
    const unprotected = await withSuperuser(async (c) => {
      const r = await c.query<{ relname: string }>(
        `select c.relname
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'r'
            and not c.relrowsecurity
          order by 1`,
      );
      return r.rows.map((row) => row.relname);
    });

    // A new table without RLS is readable by every client the moment a grant
    // is added, and grants are added far more casually than policies.
    expect(unprotected).toEqual([]);
  });

  it("finds a leak when one exists", async () => {
    // Proves the query above can fail. Without this, a typo in the catalog
    // join -- a wrong relkind, a misspelled privilege -- produces an empty
    // result and a green suite that checks nothing.
    const grants = await clientReadableColumns(["id"]);

    expect(grants.length).toBeGreaterThan(0);
  });
});
