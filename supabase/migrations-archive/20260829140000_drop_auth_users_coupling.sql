-- =============================================================================
-- Remove the last dependencies on Supabase Auth
-- =============================================================================
-- Under Third-Party Auth there is no auth.users row for a signed-in person, so
-- the sync trigger can never fire and the insert policy keyed on auth.uid() can
-- never pass. Profile creation moves to the server (resolveProfile), which runs
-- with the service role.
-- =============================================================================

drop trigger if exists on_auth_user_change on auth.users;
drop function if exists public.sync_user_profile();

-- Keyed on auth.uid() = id, which cannot hold under Third-Party Auth.
drop policy if exists profiles_insert on public.user_profiles;

-- profiles_update is deliberately kept — it is now the only policy governing
-- client writes to a profile row (see 20260829150000_protect_identity_sub.sql
-- for the column-level grants that constrain what it lets a client change).
