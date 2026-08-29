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

do $$
declare
  v_id uuid;
  v_profile uuid;
begin
  -- A caller whose sub matches a claimed profile resolves to that profile.
  select id into v_profile from public.user_profiles limit 1;

  -- Guard: if no rows in user_profiles (empty database), skip this test block
  if v_profile is null then
    raise notice 'current_user_id: skipped (no rows)';
    return;
  end if;

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
