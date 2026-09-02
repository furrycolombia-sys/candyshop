import { afterAll, describe, expect, it } from "vitest";

import { withSuperuser } from "./helpers";

afterAll(async () => {
  const { closePool } = await import("./helpers");
  await closePool();
});

/**
 * A migration chain that builds the right *structure* and none of the rows the
 * application reads at runtime still produces a dead database.
 *
 * This is not hypothetical. Squashing 51 migrations into one baseline went
 * through `supabase db dump`, which emits structure and no data, so the
 * squashed baseline created an empty `permissions` table and no receipts
 * bucket. A schema diff of the two builds reported zero differences, because
 * structure was all it compared. The first thing to notice was an E2E test
 * failing with "Permission 'products.create' not found in DB" -- an expensive
 * way to learn it, several minutes into CI and only for the one permission
 * that test happened to touch.
 *
 * These assert against the catalog rather than a fixture, so they fail on a
 * fresh database with no seed at all, which is exactly the case that broke.
 */

// Empty is the failure being guarded against, so a floor is enough; pinning
// exact counts would make every legitimately added permission a test edit.
const SEEDED_TABLES = [
  { table: "permissions", minimum: 40 },
  { table: "resource_permissions", minimum: 40 },
  { table: "product_templates", minimum: 1 },
  { table: "payment_settings", minimum: 3 },
] as const;

describe("reference data the application reads at runtime", () => {
  it.each(SEEDED_TABLES)("$table is seeded", async ({ table, minimum }) => {
    const rows = await withSuperuser((client) =>
      client.query(`select count(*)::int as count from public.${table}`),
    );

    expect(rows.rows[0]?.count).toBeGreaterThanOrEqual(minimum);
  });

  it("every permission has a matching global resource_permissions row", async () => {
    // The two tables are seeded by separate statements, so one can land
    // without the other. has_permission() joins through this row, which means
    // a permission missing its grant row is silently unusable.
    const rows = await withSuperuser((client) =>
      client.query(`
        select p.key
          from public.permissions p
         where not exists (
           select 1 from public.resource_permissions rp
            where rp.permission_id = p.id
              and rp.resource_type = 'global'
              and rp.resource_id is null
         )
         order by p.key
      `),
    );

    expect(rows.rows.map((row) => row.key)).toEqual([]);
  });

  it("the receipts bucket and its storage policies exist", async () => {
    // `supabase db dump` does not emit the storage schema at all, so this is
    // the part a dump-based squash loses most quietly: uploads break, and
    // nothing in the public schema looks wrong.
    const bucket = await withSuperuser((client) =>
      client.query(
        `select count(*)::int as count from storage.buckets where id = 'receipts'`,
      ),
    );
    expect(bucket.rows[0]?.count).toBe(1);

    const policies = await withSuperuser((client) =>
      client.query(`
        select policyname
          from pg_policies
         where schemaname = 'storage'
           and tablename = 'objects'
           and policyname like 'receipts%'
         order by policyname
      `),
    );
    expect(policies.rows.map((row) => row.policyname)).toEqual([
      "receipts_delete",
      "receipts_read",
      "receipts_upload",
    ]);
  });
});
