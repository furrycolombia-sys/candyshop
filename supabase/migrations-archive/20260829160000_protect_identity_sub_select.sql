-- =============================================================================
-- Stop clients reading identity_sub directly
-- =============================================================================
-- profiles_read is `for select using (true)`, granted (by default, no `to`
-- clause) to `public` — which anon and authenticated both inherit. Combined
-- with the table-wide SELECT grant every role gets by default, that means
-- identity_sub — the Clerk subject a profile is claimed under — is readable
-- by any anonymous or signed-in caller, for every profile, not just their own.
--
-- That was harmless while every identity_sub was NULL (Task 1). It stops
-- being harmless the moment real Clerk subjects exist (this task, Task 7),
-- because a leaked subject is exactly the input needed to attempt hijacking
-- the sign-in of the profile that owns it (see 20260829150000, which closed
-- the matching write-side hole). The rest of the profile — display name,
-- avatar, email, etc. — is legitimately public and must stay readable.
--
-- A plain column-level REVOKE of just `identity_sub` is not enough: Postgres
-- table-level SELECT privilege already covers every column, and a narrower
-- column-level REVOKE does not subtract from a broader table-level GRANT
-- (same reasoning as 20260829150000 for UPDATE). The table-level SELECT
-- privilege for anon/authenticated must be revoked first, then re-granted
-- only for the columns that are meant to stay public — every column except
-- identity_sub. service_role keeps its own separate table-level SELECT
-- grant untouched, so the server can still read identity_sub via
-- resolveProfile.
--
-- Column list verified against real client read paths before writing this
-- (see task-7-report.md): every existing client select() against
-- user_profiles already asks for an explicit subset of these columns except
-- apps/auth's fetchProfile, which used `select("*")` — fixed in the same
-- commit to select the same explicit, non-identity_sub column list, since a
-- bare `*` would otherwise still fail after this revoke.
-- =============================================================================

revoke select on public.user_profiles from anon, authenticated;

grant select (
    id,
    email,
    avatar_url,
    provider,
    display_name,
    display_email,
    display_avatar_url,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
  )
  on public.user_profiles
  to anon, authenticated;
