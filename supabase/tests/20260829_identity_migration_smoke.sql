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

do $$
declare
  v_count integer;
  v_actual_names text[];
  v_expected_names text[] := array[
    'check_in_audit_performed_by_fkey',
    'check_ins_checked_in_by_fkey',
    'orders_seller_id_fkey',
    'orders_user_id_fkey',
    'product_reviews_user_id_fkey',
    'products_seller_id_fkey',
    'seller_admins_admin_user_id_fkey',
    'seller_admins_seller_id_fkey',
    'seller_payment_methods_seller_id_fkey',
    'ticket_transfers_from_user_id_fkey',
    'ticket_transfers_to_user_id_fkey',
    'user_permissions_granted_by_fkey',
    'user_permissions_user_id_fkey'
  ];
  v_deltype_mismatches text;
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

  -- The exact SET of constraint names must match, not just the count.
  -- A count alone still passes if one FK is dropped and a spurious one is
  -- added elsewhere.
  select array_agg(conname order by conname) into v_actual_names
  from pg_constraint
  where contype = 'f'
    and connamespace = 'public'::regnamespace
    and confrelid = 'public.user_profiles'::regclass;

  assert v_actual_names = v_expected_names,
    format('FAIL: FK name set on user_profiles does not match. actual=%s expected=%s',
      v_actual_names, v_expected_names);

  -- Pin ON DELETE behaviour for each of the 11 repointed constraints, verified
  -- against the live schema (see task-3-report.md), so a migration that
  -- repoints the table but writes the wrong delete clause (e.g. CASCADE where
  -- NO ACTION is required, as orders_seller_id_fkey nearly was) fails loudly
  -- instead of silently changing deletion semantics for real customer data.
  select string_agg(
    format('%s (expected=%s actual=%s)', t.conname, t.expected, coalesce(c.confdeltype::text, 'MISSING')),
    ', '
  )
  into v_deltype_mismatches
  from (
    values
      ('orders_user_id_fkey', 'c'),
      ('orders_seller_id_fkey', 'a'),
      ('products_seller_id_fkey', 'n'),
      ('product_reviews_user_id_fkey', 'c'),
      ('seller_payment_methods_seller_id_fkey', 'c'),
      ('user_permissions_user_id_fkey', 'c'),
      ('user_permissions_granted_by_fkey', 'a'),
      ('check_ins_checked_in_by_fkey', 'a'),
      ('check_in_audit_performed_by_fkey', 'a'),
      ('ticket_transfers_from_user_id_fkey', 'a'),
      ('ticket_transfers_to_user_id_fkey', 'a')
  ) as t(conname, expected)
  left join pg_constraint c
    on c.conname = t.conname
    and c.connamespace = 'public'::regnamespace
    and c.contype = 'f'
  where c.confdeltype::text is distinct from t.expected;

  assert v_deltype_mismatches is null,
    format('FAIL: ON DELETE behaviour mismatch on: %s', v_deltype_mismatches);

  raise notice 'foreign keys: OK';
end $$;
