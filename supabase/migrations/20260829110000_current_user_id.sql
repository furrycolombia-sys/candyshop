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
