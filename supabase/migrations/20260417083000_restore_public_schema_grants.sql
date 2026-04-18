-- =============================================================================
-- Restore public schema/table grants for Supabase API roles
-- =============================================================================
-- Incident context:
--   PostgREST returning 42501 "permission denied for table products"
--   for anon/authenticated/service-role API keys in production.
--
-- RLS policies do not work if base table privileges are missing. This migration
-- restores the standard Supabase grants and default privileges in `public`.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
