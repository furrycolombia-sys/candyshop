# Database integration tests

Assertions about the database itself: row level security, column privileges,
and the invariants the app's rules claim hold. They talk to Postgres directly
rather than through PostgREST.

Run with `pnpm test:db`. Needs the local Supabase up (`pnpm supabase:start`).

## Why direct SQL rather than a Supabase client

The local stack validates tokens against Clerk's JWKS, so there is no secret a
test could sign an `authenticated` token with. Setting `request.jwt.claims`
inside a transaction reaches the same policies -- this schema's RLS reads
`auth.jwt() ->> 'sub'` -- with no Clerk dependency and no network round trip.

Every helper rolls its transaction back, so the suite leaves the database as it
found it and the files may run in any order.

## Write catalog-level assertions where you can

A test that names a table proves only the tables that existed when it was
written. `exposure-invariants.test.ts` asks the catalog instead: does *any*
relation in `public` let a client role read a linkability column? That keeps
holding as the schema grows, which is where the next leak comes from -- the
audit view that was exposing 2995 rows got in exactly that way, added after the
tests that would have covered it.

## Not in CI yet

Deliberately. It needs a running database, and wiring it in is a separate
change from writing it. The first thing it found was a live exposure, which is
argument enough for wiring it in soon: `seller_payment_methods` had a SELECT
policy qualified only on `is_active = true`, so any anonymous client could read
every active seller's payment instructions. Fixed in
`20260902100000_restrict_seller_payment_method_reads.sql`.
