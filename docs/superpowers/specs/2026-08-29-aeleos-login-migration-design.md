# Libra → AeleOS Login Migration — Design Spec

**Date:** 2026-08-29
**Apps:** `apps/auth`, `packages/auth`, `packages/api`, `supabase/`
**Status:** Draft — awaiting review

---

## Summary

Move Libra's authentication from Supabase Auth to **Clerk**, the identity
provider AeleOS already runs for the platform, and re-key Libra's data on its
own `user_profiles` table instead of `auth.users`.

This is not an improvement we are choosing to make. Libra's production Supabase
project no longer exists, only its `public` schema was ever backed up, and every
user column in the schema is a foreign key to `auth.users(id)` — rows that are
gone and cannot be recovered. **The reshape described here is what makes the
backup restorable at all.** Doing it the old way would mean reconstructing
`auth.users` by hand purely to throw it away later.

Scope is **login only**. Libra consumes the identity half of AeleOS and nothing
else: no actor mirror, no picker, no acting-as-a-fursona.

---

## Goals

- Every one of the 196 people in the backup signs in with the same Google or
  Discord account and lands in their existing account — orders, receipts,
  permissions and seller role intact.
- Libra trusts the same Clerk instance as AeleOS, so one login works across the
  platform and social connectors stay configured in one place.
- Libra's domain data keys on a **local** user id it owns, so a future change of
  identity provider is a column backfill and not a data migration.
- Production is restorable from the verified July backup into a fresh Supabase
  project, repeatably.

## Non-Goals

- **The actor registry and the picker.** No `/api/actors/mine` sync, no
  `actor_ref`, no acting-as. Libra treats a person as a person. Adding it later
  does not invalidate anything here — the mirror is additive.
- **Promoting Clerk to a production instance.** Libra runs against AeleOS's
  development instance for now; see _Risks_.
- **Restoring hosting.** This spec ends at a working database and a working
  login. Where the apps run is a separate problem.
- **Password migration.** There are no passwords — all 196 users are Google
  (170) or Discord (26).

---

## Current state (verified 2026-08-29)

| Fact                                             | Evidence                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Prod and dev Supabase projects are gone          | `NXDOMAIN` on three resolvers; both PATs `401` on `/v1/projects`                                               |
| `auth.users` is unrecoverable                    | `backup-prod.mjs` dumps `table_schema = 'public'` only                                                         |
| The July 15 backup is the database's final state | Aug 9 backup run logged _"DB content unchanged since last upload"_, with row counts identical to the July file |
| The backup is complete and consistent            | 17/17 tables, 196 profiles, 154/154 receipts on disk, 8/8 user FK columns with zero orphans                    |
| Email is a usable linking key                    | 196/196 present, unique (case-insensitive), well-formed                                                        |
| The restore path works                           | Fixed and proven end to end — commit `6f66997`                                                                 |

The scale is small: 196 users, 147 orders, 1 seller, 1 event, 1799 permission
rows.

---

## Target identity model

Following the platform design's `identity_sub` pattern
(AeleOS repo: `docs/superpowers/specs/2026-07-26-aeleos-central-auth-design.md`, §5),
with one deviation noted below.

- **`user_profiles.id`** — Libra's local user primary key. Domain data FKs to
  **this**. Values are unchanged from production: the same UUIDs `auth.users`
  used, because migration `20260325600000` created `user_profiles` with
  `id = auth.users.id` and backfilled every existing row.
- **`user_profiles.identity_sub`** — new, `text`, unique, indexed, **nullable**.
  Stores Clerk's `sub`. Null means "restored but not yet claimed".
- Supabase Third-Party Auth trusts Clerk; `auth.jwt()->>'sub'` carries the Clerk
  user id.

**Deviation from the platform spec:** it assumes app data already keys on a
local id. Libra's does not — it keys on `auth.users(id)` directly. Because the
values are identical, this is resolved by **repointing the constraints**, not by
remapping rows.

### Why `auth.uid()` cannot survive

`auth.uid()` is `current_setting('request.jwt.claim.sub')::uuid`. A Clerk `sub`
(`user_2abc…`) is not a UUID, so every existing policy does not merely return
false — it fails the cast. This is a hard break, and a loud one, which is the
outcome we want: there is no silent-wrong-answer mode where policies quietly
permit or deny the wrong rows.

Policies resolve the caller through one helper instead:

```sql
create or replace function public.current_user_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.user_profiles
  where identity_sub = auth.jwt()->>'sub'
$$;
```

---

## Schema changes

Additive migrations on top of the existing 38. **No history rewriting** — dev
and CI keep working and the diff stays reviewable.

1. **Add `identity_sub`** to `user_profiles`, nullable, with a unique index.
2. **Repoint every foreign key** to `auth.users(id)` so it targets
   `user_profiles(id)`. Eight carry data today — `orders.user_id`,
   `orders.seller_id`, `products.seller_id`, `seller_admins.seller_id`,
   `seller_admins.admin_user_id`, `seller_payment_methods.seller_id`,
   `user_permissions.user_id`, `user_permissions.granted_by` — and four are on
   tables that are empty in the backup: `check_ins.checked_in_by`,
   `check_in_audit.performed_by`, `ticket_transfers.from_user_id` and
   `.to_user_id`. Twelve in total. Values are untouched; only the constraint
   target changes.
3. **Add `current_user_id()`** and rewrite every RLS policy that calls
   `auth.uid()` to call it instead.
4. **Drop `sync_user_profile`** and its trigger on `auth.users` — that table
   stops existing. Provisioning moves into the app.
5. **Drop the `user_profiles` insert policy** keyed on `auth.uid() = id`;
   profile creation becomes a server-side concern.

`user_profiles` becomes the root parent of the FK graph. The restore's
topological ordering already handles this and is covered by a test that pins the
post-reshape shape.

---

## Rebuild and restore sequence

Safety here is **repeatability**, not reversibility: there is no live system, so
the whole sequence can be run against a throwaway project and discarded as many
times as needed. That is a stronger guarantee than a rollback path.

1. Create a fresh Supabase project.
2. Apply all migrations, existing plus the reshape.
3. Configure Third-Party Auth to trust the Clerk instance.
4. `node scripts/backup-prod.mjs --restore <backup>` with the target env vars.
   All 196 profiles land with `identity_sub` null.
5. Verify row counts and referential integrity against the manifest.
6. Point the apps at the new project and the Clerk instance.
7. Open the doors.

### Claiming an account

On a person's first authenticated request, the app resolves their profile:

1. Look up `identity_sub = <clerk sub>`. Found → done.
2. Not found → look up by the Clerk account's verified primary email,
   case-insensitively. Found and `identity_sub is null` → set it. **This is the
   claim.**
3. Found but `identity_sub` already set to a _different_ sub → refuse and log.
   Two Clerk accounts claiming one profile is a real conflict, not something to
   paper over.
4. No match → provision a new profile. This is a genuinely new customer.

The claim must be **idempotent and re-runnable**, because it will be run more
than once: Clerk's development and production instances are separate user pools,
so promoting the instance changes every `sub`. A re-run is then "clear
`identity_sub`, let people re-claim by email" and not a migration.

Only a **verified** email may claim. An unverified address is an account
takeover of somebody's order history.

### One sequencing rule

Restore **truncates** `user_profiles`. `identity_sub` is populated after restore,
as people sign in. Restoring a newer backup later would therefore wipe every
claim and silently log all 196 people out of their own accounts.

**Restore the final backup before anyone signs in.** If a restore over a live
system is ever needed, it must merge on email and preserve `identity_sub` rather
than truncate — out of scope here, and worth building before it is needed.

---

## Application changes

| Area                          | Change                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/supabase/*` | Clients attach the Clerk session token as the Supabase access token instead of managing Supabase auth cookies                                                  |
| `packages/auth`               | `useSupabaseAuth` / session / redirect helpers move onto Clerk's session; the token-cookie machinery in `server/session.ts` goes away                          |
| `apps/auth`                   | Login page renders Clerk's sign-in with Google and Discord; the callback route resolves-or-claims the profile                                                  |
| Permissions                   | `user_permissions` is unchanged and still keyed on the local id — the permission cache and `PermissionsContext` keep working once `current_user_id()` resolves |

The Supabase client seam is already centralised in `packages/api/src/supabase/`,
which is where nearly all of this lands.

---

## Local development and testing

Clerk is hosted-only; there is no local build. Nothing blocks local work:

- Clerk's **development instance** accepts `http://localhost:*` origins without
  allowlisting — that is its purpose.
- **Local Supabase can trust Clerk directly.** `supabase/config.toml.template`
  already carries `[auth.third_party.clerk]`; set `enabled = true` and
  `domain`, and local Supabase validates real Clerk JWTs against Clerk's JWKS.
- `@clerk/testing` supplies testing tokens for Playwright, and dev instances
  support test emails and codes, so E2E needs no real inbox.
- Libra's local stack runs on port base **54331** (`.env.dev`), clear of
  AeleOS's 54321, so both run side by side.

So the whole model — `identity_sub`, `current_user_id()`, RLS — is testable
locally against real Clerk tokens with no cloud project.

## Test plan (TDD)

- **RLS policies.** For each rewritten policy: a caller whose `identity_sub`
  resolves sees their rows; a caller with a null or unknown `identity_sub` sees
  none. The second case is the one that matters — `current_user_id()` returning
  null must deny, never match.
- **Claim logic.** Claim by verified email; refuse an unverified email; refuse a
  second sub claiming a taken profile; provision a genuinely new user; and
  re-running a claim is a no-op.
- **Restore.** Already covered by `scripts/__tests__/restore-order.test.mjs`,
  including the post-reshape FK shape.
- **Migration.** Apply all migrations to an empty database, restore the July
  backup, assert manifest row counts and zero orphans — the check already run
  by hand, made repeatable.

---

## Risks

1. **The Clerk instance is a development instance.** Dev instances are not
   intended for production traffic and have lower limits. Accepted for now;
   promoting later changes every `sub`, which the re-runnable claim absorbs. The
   decision to promote is AeleOS's, not Libra's.
2. **RLS cost.** Every policy evaluation does an indexed lookup on
   `user_profiles.identity_sub`. At 196 users and 147 orders this is
   irrelevant; noted so it is not rediscovered later.
3. **`security definer` on `current_user_id()`.** Required so the lookup is not
   itself gated by `user_profiles` RLS. `search_path` is pinned, matching
   migration `20260422200000`.
4. **Email mismatch at claim time.** The backup side is clean — 196 unique,
   valid, non-colliding addresses — so nothing on our side blocks a match. What
   is _not_ verified is the Clerk side: a person whose Clerk primary email
   differs from the address Supabase recorded (a different Google account, a
   changed Discord email) will not match and will be provisioned as a new user
   holding none of their history. Unmeasurable until people actually sign in.
   With 196 users and one seller, manual reconciliation is tractable; at larger
   scale it would not be.
5. **The backup is one file.** Until it is restored into a live project it is
   the only copy of the business. The backup workflow is `disabled_manually` and
   points at a dead project; it needs re-pointing once the new project exists.

---

## Success criteria

- A fresh project, migrated and restored, reports 196 / 147 / 147 / 1799 / 154
  and zero orphaned references.
- A person who signs in with the Google account they used in June sees their
  June orders.
- A seller signs in and still has their seller permissions and delegated admins.
- No policy anywhere calls `auth.uid()`.
- The claim can be run twice with no change on the second run.

---

## Related

- AeleOS repo, `docs/integrating.md` — the actor half, deliberately not used
  here
- AeleOS repo, `docs/superpowers/specs/2026-07-26-aeleos-central-auth-design.md`
  — the `identity_sub` model. Written around **Logto**; Clerk shipped instead,
  so its architecture holds and its vendor-specific steps do not.
- [Production status](../../production-status.md) — the outage. Predates the
  discovery that the database itself is gone; needs updating.
