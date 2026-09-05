-- =============================================================================
-- Stop clients writing identity_sub directly
-- =============================================================================
-- profiles_update is `using (id = current_user_id())` with no `with check`, so
-- Postgres reuses USING as the check clause. That means any signed-in person
-- can UPDATE every column of their own row, including identity_sub.
--
-- Setting identity_sub to a victim's Clerk sub would hijack that victim's next
-- sign-in onto the attacker's profile, and the unique index on identity_sub
-- would then permanently block the victim's real profile from ever being
-- claimed. identity_sub must only ever be written by the server (resolveProfile,
-- via the service role) — never by the client whose row it lives on.
--
-- A plain column-level REVOKE of just `identity_sub` is not enough: Postgres
-- table-level UPDATE privilege already covers every column, and a narrower
-- column-level REVOKE does not subtract from a broader table-level GRANT. The
-- table-level UPDATE privilege for anon/authenticated must be revoked first,
-- then re-granted only for the columns the client is meant to edit (the same
-- three fields accepted by apps/auth's profileFormSchema: display_name,
-- display_email, display_avatar_url). service_role keeps its own separate
-- table-level UPDATE grant untouched, so the server can still write
-- identity_sub via resolveProfile.
-- =============================================================================

revoke update on public.user_profiles from anon, authenticated;

grant update (display_name, display_email, display_avatar_url)
  on public.user_profiles
  to anon, authenticated;
