# Libra → AeleOS Login Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-key Libra's data on `user_profiles` instead of the vanished `auth.users`, and move login to the Clerk instance AeleOS runs, so the July backup can be restored and all 196 users can sign back in to their own accounts.

**Architecture:** Additive migrations repoint 11 foreign keys from `auth.users(id)` to `user_profiles(id)` (identical UUIDs — a constraint swap, not a data migration), add a nullable `identity_sub` column, and move all 43 RLS policies from `auth.uid()` onto a `current_user_id()` helper that resolves the caller through `identity_sub`. The app then trusts Clerk instead of Supabase Auth, and each restored profile is claimed on first sign-in by verified email.

**Tech Stack:** Postgres 17 / Supabase (local via Docker), Clerk (`@clerk/nextjs`), Next.js 16, TypeScript, Vitest, pgSQL `assert` smoke tests.

**Spec:** `docs/superpowers/specs/2026-08-29-aeleos-login-migration-design.md`

## Global Constraints

- **Scope is login only.** No actor mirror, no picker, no `actor_ref`, no acting-as-a-fursona.
- **No migration history rewriting.** Every schema change is a new migration file appended to `supabase/migrations/`.
- **`identity_sub` is nullable.** A restored profile is unclaimed until its owner signs in. Code must treat null as an ordinary state, never an error.
- **`current_user_id()` returning NULL must deny, never match.** This is the single most dangerous failure mode in the plan: `owner_id = null` is `NULL`, not `true`, but any policy written as `coalesce(...)` or `is not distinct from` could turn "unknown caller" into "matches everyone".
- **Only a verified email may claim a profile.** An unverified address is an account takeover of somebody's order history.
- **Local Supabase runs on port base 54331** (`.env.dev`); the database is `54332`, container `supabase_db_libra-dev`. AeleOS's stack occupies 54321–54329 — do not reuse those.
- **psql is not installed on the dev machine.** Run SQL via `docker exec -i supabase_db_libra-dev psql -U postgres -d postgres`.
- Commit messages follow `type(scope): description [GH-000]` per `.claude/rules/git-workflow.md`.

---

## File Structure

| File                                                              | Responsibility                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `supabase/migrations/20260829100000_identity_sub.sql`             | Add `identity_sub` column + unique index                    |
| `supabase/migrations/20260829110000_current_user_id.sql`          | The `current_user_id()` resolver                            |
| `supabase/migrations/20260829120000_repoint_user_fks.sql`         | 11 FK constraints → `user_profiles(id)`                     |
| `supabase/migrations/20260829130000_rls_current_user_id.sql`      | 43 policies → `current_user_id()`                           |
| `supabase/migrations/20260829140000_drop_auth_users_coupling.sql` | Drop `sync_user_profile` trigger + `profiles_insert` policy |
| `supabase/tests/20260829_identity_migration_smoke.sql`            | One smoke test asserting the whole reshaped schema          |
| `packages/auth/src/server/resolveProfile.ts`                      | Resolve-or-claim a profile from a Clerk identity            |
| `packages/auth/src/server/resolveProfile.test.ts`                 | Its tests                                                   |
| `packages/api/src/supabase/browser.ts`, `server.ts`               | Send the Clerk token as the Supabase access token           |
| `apps/auth/src/features/auth/...`                                 | Clerk sign-in UI replacing Supabase social buttons          |
| `supabase/config.toml.template`                                   | Templated `[auth.third_party.clerk]` block                  |
| `scripts/supabase-docker.mjs`                                     | Maps the two new Clerk placeholders                         |
| `scripts/verify-restore.mjs` (+ test)                             | Compare restored counts against the manifest                |
| `packages/api/src/supabase/supabaseProfileStore.ts` (+ test)      | Supabase-backed `ProfileStore`                              |

---

## Task 1: Add `identity_sub`

**Files:**

- Create: `supabase/migrations/20260829100000_identity_sub.sql`
- Create: `supabase/tests/20260829_identity_migration_smoke.sql`

**Interfaces:**

- Produces: `public.user_profiles.identity_sub text` — unique, nullable, indexed. Every later task depends on this column.

- [ ] **Step 1: Write the failing smoke test**

Create `supabase/tests/20260829_identity_migration_smoke.sql`:

```sql
-- =============================================================================
-- Smoke Test: AeleOS identity migration
-- =============================================================================
-- Run against the local DB:
--   docker exec -i supabase_db_libra-dev psql -U postgres -d postgres \
--     -f - < supabase/tests/20260829_identity_migration_smoke.sql
-- =============================================================================

do $$
declare
  v_count integer;
begin
  -- 1. identity_sub exists, is text, and is nullable
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'user_profiles'
    and column_name  = 'identity_sub'
    and data_type    = 'text'
    and is_nullable  = 'YES';

  assert v_count = 1,
    'FAIL: user_profiles.identity_sub missing, wrong type, or NOT NULL';

  -- 2. It is unique, so two Clerk accounts cannot claim one profile
  select count(*) into v_count
  from pg_indexes
  where schemaname = 'public'
    and tablename  = 'user_profiles'
    and indexdef like '%UNIQUE%identity_sub%';

  assert v_count = 1,
    'FAIL: no unique index on user_profiles.identity_sub';

  raise notice 'identity_sub: OK';
end $$;
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `ERROR: FAIL: user_profiles.identity_sub missing, wrong type, or NOT NULL`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260829100000_identity_sub.sql`:

```sql
-- =============================================================================
-- AeleOS identity: link a local profile to a Clerk identity
-- =============================================================================
-- Nullable on purpose. A profile restored from backup has no identity_sub until
-- its owner signs in and claims it by verified email. Null means "not yet
-- claimed", which is an ordinary state and not an error.
-- =============================================================================

alter table public.user_profiles
  add column if not exists identity_sub text;

comment on column public.user_profiles.identity_sub is
  'Clerk subject claim (auth.jwt()->>''sub''). Null until the person signs in '
  'and claims this profile. Unique so two identities cannot claim one profile.';

-- Unique but not a primary key: nulls are permitted and do not collide.
create unique index if not exists user_profiles_identity_sub_idx
  on public.user_profiles (identity_sub);
```

- [ ] **Step 4: Apply and verify it passes**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260829100000_identity_sub.sql
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `NOTICE: identity_sub: OK`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260829100000_identity_sub.sql supabase/tests/20260829_identity_migration_smoke.sql
git commit -m "feat(db): add user_profiles.identity_sub for Clerk linkage [GH-000]"
```

---

## Task 2: The `current_user_id()` resolver

**Files:**

- Create: `supabase/migrations/20260829110000_current_user_id.sql`
- Modify: `supabase/tests/20260829_identity_migration_smoke.sql`

**Interfaces:**

- Consumes: `user_profiles.identity_sub` (Task 1).
- Produces: `public.current_user_id() returns uuid` — every rewritten policy calls this.

- [ ] **Step 1: Write the failing test**

Append inside a new `do $$ ... end $$;` block at the end of the smoke test:

```sql
do $$
declare
  v_id uuid;
  v_profile uuid;
begin
  -- A caller whose sub matches a claimed profile resolves to that profile.
  select id into v_profile from public.user_profiles limit 1;
  update public.user_profiles set identity_sub = 'user_smoketest' where id = v_profile;

  perform set_config('request.jwt.claims', '{"sub":"user_smoketest"}', true);
  select public.current_user_id() into v_id;
  assert v_id = v_profile,
    format('FAIL: current_user_id() returned %s, expected %s', v_id, v_profile);

  -- An unknown sub resolves to NULL. This is the case that must never match.
  perform set_config('request.jwt.claims', '{"sub":"user_nobody"}', true);
  select public.current_user_id() into v_id;
  assert v_id is null,
    format('FAIL: unknown sub resolved to %s, expected NULL', v_id);

  -- No JWT at all also resolves to NULL.
  perform set_config('request.jwt.claims', '', true);
  select public.current_user_id() into v_id;
  assert v_id is null, 'FAIL: absent JWT did not resolve to NULL';

  update public.user_profiles set identity_sub = null where id = v_profile;
  raise notice 'current_user_id: OK';
end $$;
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `ERROR: function public.current_user_id() does not exist`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260829110000_current_user_id.sql`:

```sql
-- =============================================================================
-- current_user_id(): the caller's local user id, from their Clerk identity
-- =============================================================================
-- Replaces auth.uid() everywhere. auth.uid() casts the JWT sub to uuid, and a
-- Clerk sub ("user_2abc...") is not a uuid, so it does not merely return false
-- under Third-Party Auth — it fails the cast.
--
-- SECURITY DEFINER because the lookup must not itself be gated by RLS on
-- user_profiles. search_path is pinned, matching 20260422200000.
--
-- Returns NULL for an unknown or absent identity. Every caller must treat NULL
-- as "deny", never as "match".
-- =============================================================================

create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.user_profiles
  where identity_sub = nullif(auth.jwt() ->> 'sub', '')
$$;

comment on function public.current_user_id() is
  'The signed-in person''s user_profiles.id, resolved from the Clerk sub. '
  'NULL when unknown or signed out — callers must treat NULL as deny.';

revoke all on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated, service_role;
```

- [ ] **Step 4: Apply and verify it passes**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260829110000_current_user_id.sql
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `NOTICE: current_user_id: OK`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260829110000_current_user_id.sql supabase/tests/20260829_identity_migration_smoke.sql
git commit -m "feat(db): resolve the caller via identity_sub [GH-000]"
```

---

## Task 3: Repoint the 11 foreign keys

**Files:**

- Create: `supabase/migrations/20260829120000_repoint_user_fks.sql`
- Modify: `supabase/tests/20260829_identity_migration_smoke.sql`

**Interfaces:**

- Consumes: nothing from earlier tasks — `user_profiles.id` already holds the same UUIDs.
- Produces: a `public` schema with **zero** foreign keys to `auth.users`.

> `seller_admins` is already repointed (`seller_admins_seller_id_fkey` and
> `seller_admins_admin_user_id_fkey` reference `user_profiles` today). It is the
> precedent to copy, not work to redo. Do not touch it.

- [ ] **Step 1: Write the failing test**

Append to the smoke test:

```sql
do $$
declare
  v_count integer;
begin
  -- No public table may reference auth.users any more.
  select count(*) into v_count
  from pg_constraint
  where contype = 'f'
    and connamespace = 'public'::regnamespace
    and confrelid = 'auth.users'::regclass;

  assert v_count = 0,
    format('FAIL: %s public foreign keys still reference auth.users', v_count);

  -- And the user columns must reference user_profiles instead.
  select count(*) into v_count
  from pg_constraint
  where contype = 'f'
    and connamespace = 'public'::regnamespace
    and confrelid = 'public.user_profiles'::regclass;

  assert v_count = 13,
    format('FAIL: expected 13 FKs to user_profiles (11 repointed + 2 on seller_admins), found %s', v_count);

  raise notice 'foreign keys: OK';
end $$;
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `ERROR: FAIL: 11 public foreign keys still reference auth.users`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260829120000_repoint_user_fks.sql`:

```sql
-- =============================================================================
-- Repoint user foreign keys from auth.users(id) to user_profiles(id)
-- =============================================================================
-- The production auth schema died with the Supabase project and only the public
-- schema was ever backed up, so the auth.users rows these constraints reference
-- no longer exist. user_profiles carries the SAME uuids — migration
-- 20260325600000 created it with id = auth.users.id and backfilled every row —
-- so this changes the constraint target and touches no data.
--
-- ON DELETE behaviour is preserved exactly as each constraint had it.
-- seller_admins is deliberately absent: it already references user_profiles.
-- =============================================================================

-- orders
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

alter table public.orders drop constraint if exists orders_seller_id_fkey;
alter table public.orders add constraint orders_seller_id_fkey
  foreign key (seller_id) references public.user_profiles(id) on delete cascade;

-- products
alter table public.products drop constraint if exists products_seller_id_fkey;
alter table public.products add constraint products_seller_id_fkey
  foreign key (seller_id) references public.user_profiles(id) on delete set null;

-- product_reviews
alter table public.product_reviews drop constraint if exists product_reviews_user_id_fkey;
alter table public.product_reviews add constraint product_reviews_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

-- seller_payment_methods
alter table public.seller_payment_methods drop constraint if exists seller_payment_methods_seller_id_fkey;
alter table public.seller_payment_methods add constraint seller_payment_methods_seller_id_fkey
  foreign key (seller_id) references public.user_profiles(id) on delete cascade;

-- user_permissions
alter table public.user_permissions drop constraint if exists user_permissions_user_id_fkey;
alter table public.user_permissions add constraint user_permissions_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

alter table public.user_permissions drop constraint if exists user_permissions_granted_by_fkey;
alter table public.user_permissions add constraint user_permissions_granted_by_fkey
  foreign key (granted_by) references public.user_profiles(id);

-- check_ins / check_in_audit
alter table public.check_ins drop constraint if exists check_ins_checked_in_by_fkey;
alter table public.check_ins add constraint check_ins_checked_in_by_fkey
  foreign key (checked_in_by) references public.user_profiles(id);

alter table public.check_in_audit drop constraint if exists check_in_audit_performed_by_fkey;
alter table public.check_in_audit add constraint check_in_audit_performed_by_fkey
  foreign key (performed_by) references public.user_profiles(id);

-- ticket_transfers
alter table public.ticket_transfers drop constraint if exists ticket_transfers_from_user_id_fkey;
alter table public.ticket_transfers add constraint ticket_transfers_from_user_id_fkey
  foreign key (from_user_id) references public.user_profiles(id);

alter table public.ticket_transfers drop constraint if exists ticket_transfers_to_user_id_fkey;
alter table public.ticket_transfers add constraint ticket_transfers_to_user_id_fkey
  foreign key (to_user_id) references public.user_profiles(id);
```

> **Before writing the `on delete` clauses above, confirm each one against the
> live schema** so behaviour is preserved rather than guessed:
>
> ```bash
> docker exec supabase_db_libra-dev psql -U postgres -d postgres -tAc "
> select conrelid::regclass||'.'||conname||' confdeltype='||confdeltype
> from pg_constraint where contype='f' and confrelid='auth.users'::regclass
> and connamespace='public'::regnamespace order by 1"
> ```
>
> `confdeltype` is `a` = NO ACTION, `c` = CASCADE, `n` = SET NULL, `r` = RESTRICT.
> Adjust the migration to match; the clauses above are the expected values, not
> a substitute for checking.

- [ ] **Step 4: Apply and verify it passes**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260829120000_repoint_user_fks.sql
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `NOTICE: foreign keys: OK`. If the `ALTER TABLE ... ADD CONSTRAINT`
fails with a foreign-key violation, a row references a user that is not in
`user_profiles` — stop and investigate rather than dropping the constraint.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260829120000_repoint_user_fks.sql supabase/tests/20260829_identity_migration_smoke.sql
git commit -m "feat(db): repoint user foreign keys to user_profiles [GH-000]"
```

---

## Task 4: Move all RLS policies onto `current_user_id()`

**Files:**

- Create: `supabase/migrations/20260829130000_rls_current_user_id.sql`
- Modify: `supabase/tests/20260829_identity_migration_smoke.sql`

**Interfaces:**

- Consumes: `public.current_user_id()` (Task 2).
- Produces: a `public` schema where no policy references `auth.uid()`.

There are **43 policies across 13 tables**. They are not hand-transcribed here —
that would be 43 chances to mistype a predicate. The migration is _generated_
from the applied schema by a verified query, then reviewed.

- [ ] **Step 1: Write the failing test**

Append to the smoke test:

```sql
do $$
declare
  v_count integer;
  v_offenders text;
begin
  select count(*), string_agg(tablename || '.' || policyname, ', ')
  into v_count, v_offenders
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || coalesce(with_check, '')) like '%auth.uid()%';

  assert v_count = 0,
    format('FAIL: %s policies still call auth.uid(): %s', v_count, v_offenders);

  -- And the replacement is actually in use.
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || coalesce(with_check, '')) like '%current_user_id()%';

  assert v_count = 43,
    format('FAIL: expected 43 policies on current_user_id(), found %s', v_count);

  raise notice 'rls policies: OK';
end $$;
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `ERROR: FAIL: 43 policies still call auth.uid(): check_ins.check_ins_insert, ...`

- [ ] **Step 3: Generate the migration**

Run this against a database that still has the original policies. It emits a
`drop`/`create` pair per policy with `auth.uid()` replaced:

```bash
docker exec supabase_db_libra-dev psql -U postgres -d postgres -tAc "
select string_agg(stmt, E'\n' order by tablename, policyname)
from (
  select tablename, policyname,
    format('drop policy if exists %I on public.%I;', policyname, tablename) || E'\n' ||
    format('create policy %I on public.%I for %s to %s%s%s;',
      policyname, tablename, cmd,
      array_to_string(roles, ', '),
      coalesce(E'\n  using (' || replace(qual, 'auth.uid()', 'public.current_user_id()') || ')', ''),
      coalesce(E'\n  with check (' || replace(with_check, 'auth.uid()', 'public.current_user_id()') || ')', '')
    ) as stmt
  from pg_policies
  where schemaname='public' and (coalesce(qual,'')||coalesce(with_check,'')) like '%auth.uid()%'
) s" > /tmp/policies.sql
```

Prepend this header and save as `supabase/migrations/20260829130000_rls_current_user_id.sql`:

```sql
-- =============================================================================
-- Move every RLS policy from auth.uid() to current_user_id()
-- =============================================================================
-- Generated from the applied schema, so each predicate is preserved exactly and
-- only the caller-identity expression changes. Under Third-Party Auth,
-- auth.uid() casts a Clerk sub to uuid and fails; current_user_id() resolves the
-- caller through user_profiles.identity_sub instead.
--
-- has_permission(uuid, text) is unchanged — it takes a local user id, which is
-- exactly what current_user_id() returns.
-- =============================================================================
```

- [ ] **Step 4: Review the generated SQL before applying**

Read the whole file. Confirm every occurrence of `auth.uid()` became
`public.current_user_id()`, that no predicate was otherwise altered, and that
`for INSERT` policies carry only `with check` while `for SELECT`/`DELETE` carry
only `using`. Check specifically that no predicate was rewritten into a form
where a NULL caller matches rows — search for `coalesce`, `is not distinct
from`, and `or true`.

- [ ] **Step 5: Apply and verify it passes**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260829130000_rls_current_user_id.sql
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `NOTICE: rls policies: OK`

- [ ] **Step 6: Prove an unresolved caller is denied**

This is the constraint that matters most. Append to the smoke test and run it:

```sql
do $$
declare
  v_visible integer;
  v_profile uuid;
begin
  select o.user_id into v_profile from public.orders o limit 1;

  -- Claimed caller sees their own orders.
  update public.user_profiles set identity_sub = 'user_smoketest' where id = v_profile;
  perform set_config('request.jwt.claims', '{"sub":"user_smoketest"}', true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_visible from public.orders;
  assert v_visible > 0, 'FAIL: a claimed caller sees none of their own orders';

  -- Unknown caller sees nothing. NULL must deny, not match.
  perform set_config('request.jwt.claims', '{"sub":"user_nobody"}', true);
  select count(*) into v_visible from public.orders;
  assert v_visible = 0,
    format('FAIL: unresolved caller saw %s orders — NULL is matching rows', v_visible);

  perform set_config('role', 'postgres', true);
  update public.user_profiles set identity_sub = null where id = v_profile;
  raise notice 'rls denial: OK';
end $$;
```

Expected: `NOTICE: rls denial: OK`

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260829130000_rls_current_user_id.sql supabase/tests/20260829_identity_migration_smoke.sql
git commit -m "feat(db): move RLS policies onto current_user_id [GH-000]"
```

---

## Task 5: Drop the `auth.users` coupling

**Files:**

- Create: `supabase/migrations/20260829140000_drop_auth_users_coupling.sql`
- Modify: `supabase/tests/20260829_identity_migration_smoke.sql`

**Interfaces:**

- Produces: a schema with no trigger on `auth.users` and no `auth.uid()`-keyed insert policy on `user_profiles`.

- [ ] **Step 1: Write the failing test**

Append to the smoke test:

```sql
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'sync_user_profile';

  assert v_count = 0, 'FAIL: sync_user_profile still exists';

  select count(*) into v_count
  from pg_policies
  where schemaname = 'public' and tablename = 'user_profiles'
    and policyname = 'profiles_insert';

  assert v_count = 0, 'FAIL: profiles_insert policy still exists';

  raise notice 'auth.users coupling: OK';
end $$;
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `ERROR: FAIL: sync_user_profile still exists`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260829140000_drop_auth_users_coupling.sql`:

```sql
-- =============================================================================
-- Remove the last dependencies on Supabase Auth
-- =============================================================================
-- Under Third-Party Auth there is no auth.users row for a signed-in person, so
-- the sync trigger can never fire and the insert policy keyed on auth.uid() can
-- never pass. Profile creation moves to the server (resolveProfile), which runs
-- with the service role.
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop function if exists public.sync_user_profile();

-- Keyed on auth.uid() = id, which cannot hold under Third-Party Auth.
drop policy if exists profiles_insert on public.user_profiles;
```

> Confirm the trigger names first — they may differ from the guesses above:
>
> ```bash
> docker exec supabase_db_libra-dev psql -U postgres -d postgres -tAc "
> select tgname from pg_trigger
> where tgrelid = 'auth.users'::regclass and not tgisinternal"
> ```

- [ ] **Step 4: Apply and verify it passes**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260829140000_drop_auth_users_coupling.sql
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: `NOTICE: auth.users coupling: OK`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260829140000_drop_auth_users_coupling.sql supabase/tests/20260829_identity_migration_smoke.sql
git commit -m "feat(db): drop the auth.users trigger and insert policy [GH-000]"
```

---

## Task 6: Prove a clean migrate-and-restore

**Files:**

- Create: `scripts/verify-restore.mjs`
- Create: `scripts/__tests__/verify-restore.test.mjs`
- Modify: `package.json` (add `verify:restore` script)

**Interfaces:**

- Consumes: `topologicalTableOrder` from `scripts/lib/restore-order.mjs` (already shipped in commit `6f66997`).
- Produces: `compareCounts(manifestTables, actualCounts)` → `{ ok: boolean, mismatches: Array<{table, expected, actual}> }`.

This turns the by-hand verification into something repeatable, on a database
built from scratch with the reshaped schema and **no synthesised `auth.users`** —
which is the whole point of the reshape.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/verify-restore.test.mjs`:

```javascript
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
    // it would turn a total failure into a pass.
    const result = compareCounts({ orders: 147 }, {});

    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual([
      { table: "orders", expected: 147, actual: 0 },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run -c vitest.config.scripts.js scripts/__tests__/verify-restore.test.mjs
```

Expected: `Cannot find module '../verify-restore.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/verify-restore.mjs`:

```javascript
/**
 * Compares restored row counts against a backup manifest.
 *
 * A table missing from `actual` counts as zero rather than being skipped: a
 * table that failed to restore reports no count, and skipping it would turn a
 * total failure into a pass.
 */
export function compareCounts(manifestTables, actualCounts) {
  const mismatches = [];

  for (const [table, expected] of Object.entries(manifestTables)) {
    const actual = actualCounts[table] ?? 0;
    if (actual !== expected) mismatches.push({ table, expected, actual });
  }

  return { ok: mismatches.length === 0, mismatches };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run -c vitest.config.scripts.js scripts/__tests__/verify-restore.test.mjs
```

Expected: 3 passed

- [ ] **Step 5: Wire it into CI**

In `package.json`, append the new test file to `test:workflows`:

```json
"test:workflows": "vitest run -c vitest.config.scripts.js scripts/__tests__/sync-secrets-workflow.test.mjs scripts/__tests__/restore-order.test.mjs scripts/__tests__/sql-statement.test.mjs scripts/__tests__/verify-restore.test.mjs",
```

- [ ] **Step 6: Run the full restore end to end on the reshaped schema**

```bash
docker exec supabase_db_libra-dev psql -U postgres -d postgres -c \
  "truncate auth.users cascade"   # prove the restore needs no auth.users at all
SUPABASE_URL=http://127.0.0.1:54331 \
PROD_SUPABASE_SERVICE_ROLE_KEY="$(docker exec supabase_storage_libra-dev env | grep '^SERVICE_KEY=' | cut -d= -f2-)" \
  node scripts/backup-prod.mjs --restore <path-to-backup>
```

Expected: every table restored, `user_profiles` inserted before `orders`, and
**no foreign-key errors despite `auth.users` being empty**. Then confirm counts:
196 / 147 / 147 / 1799 / 154 with zero orphans.

- [ ] **Step 7: Commit**

```bash
git add scripts/verify-restore.mjs scripts/__tests__/verify-restore.test.mjs package.json
git commit -m "test(scripts): verify a restore against the backup manifest [GH-000]"
```

---

## Task 7: Trust Clerk in Supabase

**Files:**

- Modify: `supabase/config.toml.template`
- Modify: `.env.dev`, `.env.ci`, `.env.prod`, `.env.staging`

**Interfaces:**

- Produces: a Supabase instance that accepts Clerk-signed JWTs, so
  `auth.jwt() ->> 'sub'` carries the Clerk subject that `current_user_id()`
  (Task 2) resolves against.

Without this, every Clerk token is rejected and every policy sees a NULL caller.
Nothing in Tasks 8-10 can be exercised for real until this lands.

- [ ] **Step 1: Add the Clerk domain to every env file**

`pnpm lint:env` requires identical keys across all four files, so add it to each
even where the value is empty:

```
SUPABASE_CLERK_ENABLED=true
SUPABASE_CLERK_DOMAIN=<your-instance>.clerk.accounts.dev
```

Verify: `pnpm lint:env` -> `OK All env files have matching keys.`

- [ ] **Step 2: Template the third-party block**

`supabase/config.toml.template` already carries a commented `[auth.third_party.clerk]`
section. Replace it with templated values, matching how every other port and id
in this file is templated:

```toml
[auth.third_party.clerk]
enabled = {{SUPABASE_CLERK_ENABLED}}
domain = "{{SUPABASE_CLERK_DOMAIN}}"
```

- [ ] **Step 3: Map the placeholders in the generator**

In `scripts/supabase-docker.mjs`, `generateConfig()` replaces each `{{...}}`
placeholder. Add the two new ones alongside the existing replacements, reading
from `process.env` so they flow from the env files:

```javascript
template = template.replace(
  "{{SUPABASE_CLERK_ENABLED}}",
  process.env.SUPABASE_CLERK_ENABLED ?? "false",
);
template = template.replace(
  "{{SUPABASE_CLERK_DOMAIN}}",
  process.env.SUPABASE_CLERK_DOMAIN ?? "",
);
```

- [ ] **Step 4: Regenerate and verify the config**

```bash
node scripts/supabase-docker.mjs --env dev restart
grep -A2 "auth.third_party.clerk" supabase/config.toml
```

Expected: `enabled = true` and the real domain, with no `{{` placeholders left.
A leftover placeholder means Step 3 missed a replacement and the stack will
either refuse to start or silently run with Clerk disabled.

- [ ] **Step 5: Confirm the stack came up**

```bash
docker ps --format '{{.Names}}' | grep libra-dev | wc -l
```

Expected: the full stack (12 containers). If the database failed to start, check
for a port collision with the AeleOS stack before anything else.

- [ ] **Step 6: Commit**

```bash
git add supabase/config.toml.template scripts/supabase-docker.mjs .env.dev .env.ci .env.prod .env.staging
git commit -m "feat(db): trust Clerk as a third-party auth provider [GH-000]"
```

---

## Task 8: Resolve-or-claim a profile from a Clerk identity

**Files:**

- Create: `packages/auth/src/server/resolveProfile.ts`
- Create: `packages/auth/src/server/resolveProfile.test.ts`
- Modify: `packages/auth/src/server/index.ts`

**Interfaces:**

- Consumes: `user_profiles.identity_sub` (Task 1).
- Produces:
  ```ts
  type ClerkIdentity = {
    sub: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    avatarUrl: string | null;
  };
  type ProfileStore = {
    findBySub(sub: string): Promise<UserProfile | null>;
    findByEmail(email: string): Promise<UserProfile | null>;
    claim(id: string, sub: string): Promise<UserProfile>;
    create(identity: ClerkIdentity): Promise<UserProfile>;
  };
  type ResolveResult =
    | { status: "matched"; profile: UserProfile }
    | { status: "claimed"; profile: UserProfile }
    | { status: "created"; profile: UserProfile }
    | { status: "conflict"; email: string };
  async function resolveProfile(
    identity: ClerkIdentity,
    store: ProfileStore,
  ): Promise<ResolveResult>;
  ```
  `UserProfile` is `{ id: string; email: string; identity_sub: string | null }`.

`ProfileStore` is injected so the logic is testable without a database, per
`.claude/rules/solid-principles.md` (dependency inversion). Task 8 supplies the
Supabase-backed implementation.

- [ ] **Step 1: Write the failing tests**

Create `packages/auth/src/server/resolveProfile.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

import { resolveProfile } from "./resolveProfile";
import type {
  ClerkIdentity,
  ProfileStore,
  UserProfile,
} from "./resolveProfile";

const PROFILE: UserProfile = {
  id: "0240da35-b657-4b9a-af7e-6b174acc3e18",
  email: "buyer@example.com",
  identity_sub: null,
};

function makeStore(overrides: Partial<ProfileStore> = {}): ProfileStore {
  return {
    findBySub: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    claim: vi.fn(async (id: string, sub: string) => ({
      ...PROFILE,
      id,
      identity_sub: sub,
    })),
    create: vi.fn(async (identity: ClerkIdentity) => ({
      id: "new-id",
      email: identity.email ?? "",
      identity_sub: identity.sub,
    })),
    ...overrides,
  };
}

const IDENTITY: ClerkIdentity = {
  sub: "user_2abc",
  email: "buyer@example.com",
  emailVerified: true,
  displayName: "Buyer",
  avatarUrl: null,
};

describe("resolveProfile", () => {
  it("matches an already-claimed profile by sub without touching email", async () => {
    const claimed = { ...PROFILE, identity_sub: "user_2abc" };
    const store = makeStore({ findBySub: vi.fn().mockResolvedValue(claimed) });

    const result = await resolveProfile(IDENTITY, store);

    expect(result).toEqual({ status: "matched", profile: claimed });
    expect(store.findByEmail).not.toHaveBeenCalled();
  });

  it("claims an unclaimed profile by verified email", async () => {
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
    });

    const result = await resolveProfile(IDENTITY, store);

    expect(result.status).toBe("claimed");
    expect(store.claim).toHaveBeenCalledWith(PROFILE.id, "user_2abc");
  });

  it("refuses to claim on an unverified email", async () => {
    // An unverified address is an account takeover of somebody's order history.
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
    });

    const result = await resolveProfile(
      { ...IDENTITY, emailVerified: false },
      store,
    );

    expect(result.status).toBe("created");
    expect(store.claim).not.toHaveBeenCalled();
  });

  it("reports a conflict when the profile belongs to a different identity", async () => {
    const taken = { ...PROFILE, identity_sub: "user_someone_else" };
    const store = makeStore({ findByEmail: vi.fn().mockResolvedValue(taken) });

    const result = await resolveProfile(IDENTITY, store);

    expect(result).toEqual({ status: "conflict", email: "buyer@example.com" });
    expect(store.claim).not.toHaveBeenCalled();
  });

  it("creates a profile when nothing matches", async () => {
    const store = makeStore();

    const result = await resolveProfile(IDENTITY, store);

    expect(result.status).toBe("created");
    expect(store.create).toHaveBeenCalledWith(IDENTITY);
  });

  it("matches case-insensitively on email", async () => {
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
    });

    await resolveProfile({ ...IDENTITY, email: "Buyer@Example.COM" }, store);

    expect(store.findByEmail).toHaveBeenCalledWith("buyer@example.com");
  });

  it("is a no-op the second time, so it can be re-run after a Clerk promotion", async () => {
    const claimed = { ...PROFILE, identity_sub: "user_2abc" };
    const store = makeStore({ findBySub: vi.fn().mockResolvedValue(claimed) });

    const first = await resolveProfile(IDENTITY, store);
    const second = await resolveProfile(IDENTITY, store);

    expect(first).toEqual(second);
    expect(store.claim).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx vitest run packages/auth/src/server/resolveProfile.test.ts
```

Expected: `Cannot find module './resolveProfile'`

- [ ] **Step 3: Write the implementation**

Create `packages/auth/src/server/resolveProfile.ts`:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  identity_sub: string | null;
}

export interface ClerkIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ProfileStore {
  findBySub(sub: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  claim(id: string, sub: string): Promise<UserProfile>;
  create(identity: ClerkIdentity): Promise<UserProfile>;
}

export type ResolveResult =
  | { status: "matched"; profile: UserProfile }
  | { status: "claimed"; profile: UserProfile }
  | { status: "created"; profile: UserProfile }
  | { status: "conflict"; email: string };

/**
 * Resolves a Clerk identity to a local profile, claiming a restored one if this
 * is the person's first sign-in since the migration.
 *
 * Idempotent: once claimed, later calls match on `sub` and never re-claim. That
 * matters because this runs again after a Clerk instance promotion, which
 * changes every `sub`.
 */
export async function resolveProfile(
  identity: ClerkIdentity,
  store: ProfileStore,
): Promise<ResolveResult> {
  const bySub = await store.findBySub(identity.sub);
  if (bySub) return { status: "matched", profile: bySub };

  // Only a verified address may claim an existing profile — an unverified one
  // would hand somebody else's order history to whoever typed the address.
  if (identity.email && identity.emailVerified) {
    const email = identity.email.toLowerCase();
    const byEmail = await store.findByEmail(email);

    if (byEmail) {
      if (byEmail.identity_sub === null) {
        return {
          status: "claimed",
          profile: await store.claim(byEmail.id, identity.sub),
        };
      }
      // Someone else already claimed this profile. Refuse rather than reassign.
      return { status: "conflict", email };
    }
  }

  return { status: "created", profile: await store.create(identity) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run packages/auth/src/server/resolveProfile.test.ts
```

Expected: 7 passed

- [ ] **Step 5: Export it**

Add to `packages/auth/src/server/index.ts`:

```typescript
export { resolveProfile } from "./resolveProfile";
export type {
  ClerkIdentity,
  ProfileStore,
  ResolveResult,
  UserProfile,
} from "./resolveProfile";
```

- [ ] **Step 6: Commit**

```bash
git add packages/auth/src/server/resolveProfile.ts packages/auth/src/server/resolveProfile.test.ts packages/auth/src/server/index.ts
git commit -m "feat(auth): resolve or claim a profile from a Clerk identity [GH-000]"
```

---

## Task 9: Supabase clients send the Clerk token

**Files:**

- Modify: `packages/api/src/supabase/browser.ts`, `packages/api/src/supabase/server.ts`
- Create: `packages/api/src/supabase/supabaseProfileStore.ts`
- Create: `packages/api/src/supabase/supabaseProfileStore.test.ts`

**Interfaces:**

- Consumes: `ProfileStore` (Task 8).
- Produces: `createSupabaseProfileStore(client): ProfileStore` — the Supabase-backed store `resolveProfile` needs.

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/supabase/supabaseProfileStore.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

import { createSupabaseProfileStore } from "./supabaseProfileStore";

function makeClient(row: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq };
}

describe("createSupabaseProfileStore", () => {
  it("looks a profile up by identity_sub", async () => {
    const { client, from, eq } = makeClient({
      id: "abc",
      email: "a@b.com",
      identity_sub: "user_2abc",
    });

    const profile = await createSupabaseProfileStore(client as never).findBySub(
      "user_2abc",
    );

    expect(from).toHaveBeenCalledWith("user_profiles");
    expect(eq).toHaveBeenCalledWith("identity_sub", "user_2abc");
    expect(profile).toEqual({
      id: "abc",
      email: "a@b.com",
      identity_sub: "user_2abc",
    });
  });

  it("returns null when no profile matches", async () => {
    const { client } = makeClient(null);

    const profile = await createSupabaseProfileStore(client as never).findBySub(
      "user_nobody",
    );

    expect(profile).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run packages/api/src/supabase/supabaseProfileStore.test.ts
```

Expected: `Cannot find module './supabaseProfileStore'`

- [ ] **Step 3: Write the store**

Create `packages/api/src/supabase/supabaseProfileStore.ts`:

```typescript
import type { ClerkIdentity, ProfileStore, UserProfile } from "auth/server";

import type { SupabaseClient } from "@supabase/supabase-js";

const COLUMNS = "id, email, identity_sub";

/**
 * Supabase-backed ProfileStore. Must be constructed with a service-role client:
 * claiming and creating profiles happen before the caller has an identity the
 * RLS policies can resolve.
 */
export function createSupabaseProfileStore(
  client: SupabaseClient,
): ProfileStore {
  async function one(
    column: string,
    value: string,
  ): Promise<UserProfile | null> {
    const { data, error } = await client
      .from("user_profiles")
      .select(COLUMNS)
      .eq(column, value)
      .maybeSingle();

    // A read failure is not "not found" — collapsing the two would silently
    // create a duplicate profile for somebody who already has one.
    if (error) throw new Error(`Profile lookup failed: ${error.message}`);
    return (data as UserProfile | null) ?? null;
  }

  return {
    findBySub: (sub) => one("identity_sub", sub),
    findByEmail: (email) => one("email", email),

    async claim(id, sub) {
      const { data, error } = await client
        .from("user_profiles")
        .update({ identity_sub: sub })
        .eq("id", id)
        .is("identity_sub", null) // lost race → no row, not an overwrite
        .select(COLUMNS)
        .maybeSingle();

      if (error) throw new Error(`Claim failed: ${error.message}`);
      if (!data)
        throw new Error(`Profile ${id} was claimed by another identity`);
      return data as UserProfile;
    },

    async create(identity: ClerkIdentity) {
      const { data, error } = await client
        .from("user_profiles")
        .insert({
          email: identity.email,
          identity_sub: identity.sub,
          display_name: identity.displayName,
          avatar_url: identity.avatarUrl,
        })
        .select(COLUMNS)
        .single();

      if (error) throw new Error(`Profile creation failed: ${error.message}`);
      return data as UserProfile;
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run packages/api/src/supabase/supabaseProfileStore.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Send the Clerk token from the Supabase clients**

In `packages/api/src/supabase/server.ts`, replace the cookie-based session with
Clerk's token. Keep the function name and signature so callers do not change:

```typescript
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_REST_URL } from "./config";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Under Third-Party Auth the Clerk session token *is* the Supabase access
 * token — there is no Supabase session and no auth cookie to refresh.
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient<Database>(SUPABASE_REST_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => (await getToken()) ?? null,
  });
}
```

Apply the equivalent change in `browser.ts` using `useAuth()` from
`@clerk/nextjs`. Delete `getServerUserEmail`'s Supabase-auth implementation and
re-source it from Clerk.

- [ ] **Step 6: Typecheck and run the package tests**

```bash
pnpm typecheck
npx vitest run packages/api packages/auth
```

Expected: no type errors; all tests pass. Anything still importing
`@supabase/ssr` cookie helpers will surface here — fix those call sites.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/supabase packages/auth
git commit -m "feat(api): authenticate Supabase with the Clerk session token [GH-000]"
```

---

## Task 10: Clerk sign-in in the auth app

**Files:**

- Modify: `apps/auth/src/app/layout.tsx` (add `ClerkProvider`)
- Modify: `apps/auth/src/features/auth/presentation/components/SocialLoginButtons.tsx`
- Modify: `apps/auth/src/features/auth/presentation/components/SocialLoginButtons.test.tsx`
- Modify: `apps/auth/src/app/[locale]/callback/route.ts`
- Modify: `.env.dev`, `.env.ci`, `.env.prod`, `.env.staging`

**Interfaces:**

- Consumes: `resolveProfile` (Task 8), `createSupabaseProfileStore` (Task 9).

- [ ] **Step 1: Add the Clerk env keys to all four env files**

`pnpm lint:env` requires identical keys across every env file, so add all three
to each one even where the value is empty:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_DOMAIN=<your>.clerk.accounts.dev
```

Verify: `pnpm lint:env` → `✓ All env files have matching keys.`

- [ ] **Step 2: Write the failing test**

Replace the Supabase mock in `SocialLoginButtons.test.tsx` with Clerk's, and
assert the buttons trigger Clerk's OAuth:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const authenticateWithRedirect = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: { authenticateWithRedirect },
  }),
}));

import { SocialLoginButtons } from "./SocialLoginButtons";

describe("SocialLoginButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts a Google sign-in through Clerk", async () => {
    const user = userEvent.setup();
    render(<SocialLoginButtons />);

    await user.click(screen.getByTestId("login-provider-google"));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "oauth_google" }),
    );
  });

  it("starts a Discord sign-in through Clerk", async () => {
    const user = userEvent.setup();
    render(<SocialLoginButtons />);

    await user.click(screen.getByTestId("login-provider-discord"));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "oauth_discord" }),
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npx vitest run apps/auth/src/features/auth/presentation/components/SocialLoginButtons.test.tsx
```

Expected: FAIL — the component still calls `useSupabaseAuth`.

- [ ] **Step 4: Install Clerk and wrap the app**

```bash
pnpm --filter auth-app add @clerk/nextjs
```

In `apps/auth/src/app/layout.tsx`, wrap the tree in `<ClerkProvider>`.

- [ ] **Step 5: Rewrite the buttons onto Clerk**

Keep the existing `tid()` test ids (`login-provider-google`,
`login-provider-discord`) so E2E selectors keep working, per
`.claude/rules/e2e-selectors.md`. Swap `signInWithProvider(provider, …)` for:

```typescript
await signIn.authenticateWithRedirect({
  strategy: provider === "google" ? "oauth_google" : "oauth_discord",
  redirectUrl: `/${locale}/callback`,
  redirectUrlComplete: returnTo ?? `/${locale}/profile`,
});
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx vitest run apps/auth/src/features/auth/presentation/components/SocialLoginButtons.test.tsx
```

Expected: 2 passed

- [ ] **Step 7: Resolve the profile in the callback**

In `apps/auth/src/app/[locale]/callback/route.ts`, after Clerk completes, call
`resolveProfile` with a service-role store and act on the result: `matched`,
`claimed` and `created` continue to the return URL; `conflict` renders an error
telling the person to contact support, and logs the email — never silently
reassigns.

- [ ] **Step 8: Commit**

```bash
git add apps/auth packages .env.dev .env.ci .env.prod .env.staging
git commit -m "feat(auth): sign in with Clerk instead of Supabase Auth [GH-000]"
```

---

## Task 11: Remove the Supabase Auth session machinery

**Files:**

- Delete: `packages/auth/src/server/session.ts`, `packages/auth/src/server/session.test.ts`
- Delete: `packages/auth/src/client/useSupabaseAuth.ts`, `packages/auth/src/client/accessToken.ts` (+ tests)
- Modify: `packages/auth/src/client/index.ts`, `packages/auth/src/index.ts`
- Modify: `apps/auth/src/app/api/auth/refresh/route.ts` (delete the route)

**Interfaces:**

- Produces: a `packages/auth` public API with no Supabase-session exports.

Doing this **after** Task 10 rather than during it means the app is never in a
state where neither auth path works.

- [ ] **Step 1: Find every consumer**

```bash
grep -rn "useSupabaseAuth\|AUTH_COOKIE\|createSessionCookieOptions\|accessToken" \
  apps packages --include="*.ts" --include="*.tsx" | grep -v node_modules
```

- [ ] **Step 2: Delete the modules and their exports**

Remove the files above and their lines from `packages/auth/src/client/index.ts`.

- [ ] **Step 3: Verify nothing references them**

```bash
pnpm typecheck
```

Expected: no errors. Any that appear are call sites still on the old path — port
them to Clerk rather than re-adding the export.

- [ ] **Step 4: Run the full suite**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm run test:workflows
```

Expected: all green. `pnpm knip` (via `pnpm check:tools`) should also report no
newly-unused exports.

- [ ] **Step 5: Commit**

```bash
git add -A packages/auth apps/auth
git commit -m "refactor(auth): drop the Supabase Auth session layer [GH-000]"
```

---

## Task 12: Full rehearsal on a throwaway project

**Files:**

- Modify: `docs/production-status.md`

No code. This is the run that decides whether the migration is real, and it is
the last chance to find a problem while nothing is at stake.

- [ ] **Step 1: Reset the local database completely**

```bash
node scripts/supabase-docker.mjs --env dev reset
```

(Note: `--env dev` is required — `supabase-docker.mjs:75` mis-parses its command
without it.)

- [ ] **Step 2: Confirm the schema built from migrations alone**

```bash
docker exec -i supabase_db_libra-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/20260829_identity_migration_smoke.sql
```

Expected: every `NOTICE: ... OK`, with no synthesised `auth.users` rows anywhere.

- [ ] **Step 3: Restore the backup**

Run the restore as in Task 6, Step 6. Confirm 196 / 147 / 147 / 1799 / 154 and
zero orphans, and that every `identity_sub` is null.

- [ ] **Step 4: Sign in as a real user and confirm the claim**

Start the apps (`pnpm dev`), sign in with a Google account whose address is one
of the 196, and confirm: `identity_sub` is now set on that person's row, their
past orders are visible, and a second sign-in changes nothing.

- [ ] **Step 5: Confirm a stranger sees nothing**

Sign in with an address that is _not_ in the backup. Expect a new profile, an
empty order list, and no visibility of anybody else's rows.

- [ ] **Step 6: Update the production status doc**

`docs/production-status.md` still reads as though only the host was lost. Add
that the Supabase projects are gone, that the July 15 backup is the database's
final state, and that restoring now means a new project plus this migration.

- [ ] **Step 7: Commit**

```bash
git add docs/production-status.md
git commit -m "docs: record that the database is gone, not just the host [GH-000]"
```

---

## Deferred, deliberately

- **Re-point the backup workflow.** `backup-scheduled.yml` is `disabled_manually`
  and targets a dead project. Re-enable it once the new project exists — until
  then it can only fail.
- **A merge-mode restore.** Restore truncates `user_profiles`, so restoring over
  a live system would wipe every `identity_sub`. Needed only if a restore is ever
  required after go-live; the rule until then is _restore before anyone signs in_.
- **Promoting Clerk to a production instance.** Changes every `sub`; absorbed by
  re-running the claim, which Task 8 makes idempotent.
- **`supabase-cmd.mjs` exits 0 on failure**, and `supabase-docker.mjs:75`
  mis-parses its command without `--env`. Both cost time during this work; both
  are unrelated bugs worth their own fix.
