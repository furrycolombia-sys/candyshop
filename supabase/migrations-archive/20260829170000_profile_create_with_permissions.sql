-- =============================================================================
-- create_profile_with_default_permissions(): atomic profile creation for a
-- brand-new Clerk identity
-- =============================================================================
-- auth.users is now permanently empty (Task 7 of the AeleOS login migration),
-- so the trigger that used to grant default buyer permissions after every
-- auth.users insert (on_auth_user_default_permissions ->
-- handle_auth_user_default_permissions, see
-- 20260408203000_default_buyer_permissions.sql) can never fire again.
--
-- resolveProfile()'s "created" branch (packages/auth/src/server/resolveProfile.ts)
-- is now the only place a brand-new person's profile comes into existence.
-- This function inserts the profile and grants default buyer permissions in
-- the SAME transaction: a single SQL function body executes as one implicit
-- transaction, so a failure in either half rolls back both. Two separate
-- PostgREST calls (insert, then rpc) would NOT share a transaction — that is
-- why this is one function instead of two client-side calls.
--
-- Without this, a new signup can neither place nor read an order — every
-- buyer policy gates on has_permission(current_user_id(), ...).
--
-- SECURITY DEFINER: the insert and the permission grant must not themselves
-- be gated by RLS — the caller has no local user_profiles.id yet, so
-- current_user_id() is NULL and every RLS check on user_profiles/
-- user_permissions would fail. search_path is pinned to 'public', matching
-- 20260829110000_current_user_id.sql: every identifier below is already
-- schema-qualified, so the pin only hardens name resolution against
-- search-path injection.
--
-- EXECUTE is restricted to service_role only: this function accepts an
-- arbitrary identity_sub, so anon/authenticated must never be able to call
-- it directly (that would let a signed-in caller mint a profile for any sub
-- they choose). Note: Supabase's ALTER DEFAULT PRIVILEGES auto-grants EXECUTE
-- on every new public-schema function to anon/authenticated/service_role, in
-- addition to the implicit PUBLIC grant — both must be revoked explicitly, or
-- anon/authenticated keep the ability to call this function directly.
-- =============================================================================

create or replace function public.create_profile_with_default_permissions(
  p_email text,
  p_identity_sub text,
  p_display_name text default null,
  p_avatar_url text default null
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.user_profiles;
begin
  insert into public.user_profiles (id, email, identity_sub, display_name, avatar_url)
  values (gen_random_uuid(), p_email, p_identity_sub, p_display_name, p_avatar_url)
  returning * into v_profile;

  perform public.grant_default_buyer_permissions(
    v_profile.id,
    v_profile.id,
    'Default buyer permissions'
  );

  return v_profile;
end;
$$;

comment on function public.create_profile_with_default_permissions(text, text, text, text) is
  'Creates a user_profiles row for a brand-new Clerk identity and grants '
  'default buyer permissions in the same transaction. Replaces the '
  'on_auth_user_default_permissions trigger, which can never fire again now '
  'that auth.users is permanently empty. Callable by service_role only.';

revoke all on function public.create_profile_with_default_permissions(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_profile_with_default_permissions(text, text, text, text) to service_role;
