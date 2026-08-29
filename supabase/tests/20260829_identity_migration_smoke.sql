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
