import { afterAll, describe, expect, it } from "vitest";

import { withClaims, withSeededClaims, withSuperuser } from "./helpers";

afterAll(async () => {
  const { closePool } = await import("./helpers");
  await closePool();
});

/**
 * The rule these assert is `.claude/rules/checkout-stock-integrity.md`:
 *
 *   "Direct browser reads of `seller_payment_methods` must stay restricted to
 *    the owning seller's management flow, not the buyer checkout flow."
 *
 * and its own review checklist item, "Do database policies still prevent
 * public reads of seller payment methods?"
 *
 * Nothing had ever checked. These are the checks.
 */
describe("seller_payment_methods", () => {
  it("is still readable by the seller who owns it", async () => {
    // The regression guard for the policy that was dropped. Restricting buyer
    // reads is only correct if the seller can still manage their own methods,
    // and the restored production profiles all predate the Clerk migration --
    // every identity_sub is null -- so this seeds its own owner rather than
    // depending on what the database happens to contain.
    const sub = "test_owner_" + Date.now();

    const visible = await withSeededClaims(
      sub,
      async (c) => {
        await c.query(
          `insert into user_profiles (id, email, identity_sub)
           values ('11111111-1111-4111-8111-111111111111', $1, $2)`,
          [`owner-${Date.now()}@example.test`, sub],
        );
        await c.query(
          `insert into seller_payment_methods
             (seller_id, name_en, name_es, display_blocks, form_fields, is_active)
           values ('11111111-1111-4111-8111-111111111111',
                   'Test method', 'Metodo de prueba', '[]'::jsonb, '[]'::jsonb, true)`,
        );
      },
      async (c) => {
        const r = await c.query<{ count: string }>(
          "select count(*)::text as count from seller_payment_methods",
        );
        return Number(r.rows[0]?.count ?? 0);
      },
    );

    expect(visible).toBe(1);
  });

  it("is not readable by an anonymous client", async () => {
    const visible = await withClaims(null, async (c) => {
      const r = await c.query<{ count: string }>(
        "select count(*)::text as count from seller_payment_methods",
      );
      return Number(r.rows[0]?.count ?? 0);
    });

    expect(visible).toBe(0);
  });

  it("is not readable by an authenticated user who owns none of it", async () => {
    const visible = await withClaims("user_owns_nothing", async (c) => {
      const r = await c.query<{ count: string }>(
        "select count(*)::text as count from seller_payment_methods",
      );
      return Number(r.rows[0]?.count ?? 0);
    });

    expect(visible).toBe(0);
  });

  it("has no SELECT policy that ignores who is asking", async () => {
    // The same rule stated so it survives an empty table: a policy is safe
    // when its qualifier is scoped to the caller. `current_user_id()` is how
    // this schema asks "who is this", so a SELECT qualifier that never
    // mentions it lets every client read every row.
    //
    // Applying to PUBLIC is not itself the problem -- `spm_seller_select` does
    // and is correct, because its qualifier is `current_user_id() = seller_id`.
    const unscoped = await withSuperuser(async (c) => {
      const r = await c.query<{ polname: string; qual: string }>(
        `select polname, coalesce(pg_get_expr(polqual, polrelid), '') as qual
           from pg_policy
          where polrelid = 'public.seller_payment_methods'::regclass
            and polcmd = 'r'
          order by 1`,
      );
      return r.rows
        .filter((row) => !row.qual.includes("current_user_id()"))
        .map((row) => `${row.polname}: ${row.qual}`);
    });

    expect(unscoped).toEqual([]);
  });
});
