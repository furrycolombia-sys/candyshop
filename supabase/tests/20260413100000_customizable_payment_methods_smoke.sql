-- =============================================================================
-- Smoke Test: Customizable Payment Methods Migration
-- =============================================================================
-- Verifies that:
--   1. The new seller_payment_methods table exists with the correct columns
--   2. The old payment_method_types table is gone
--   3. RLS is enabled on seller_payment_methods
--   4. The expected RLS policies are present
--
-- Run against the local DB:
--   psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/tests/20260413100000_customizable_payment_methods_smoke.sql
-- =============================================================================

do $$
declare
  v_count integer;
  v_rls_enabled boolean;
begin

  -- -------------------------------------------------------------------------
  -- 1. New seller_payment_methods table exists
  -- -------------------------------------------------------------------------
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name   = 'seller_payment_methods';

  assert v_count = 1,
    'FAIL: seller_payment_methods table does not exist';

  -- -------------------------------------------------------------------------
  -- 2. Required columns are present with correct types
  -- -------------------------------------------------------------------------
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'seller_payment_methods'
    and column_name  in (
      'id', 'seller_id', 'name_en', 'name_es',
      'display_blocks', 'form_fields',
      'is_active', 'sort_order', 'created_at', 'updated_at'
    );

  assert v_count = 10,
    'FAIL: seller_payment_methods is missing one or more required columns';

  -- display_blocks and form_fields must be jsonb
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'seller_payment_methods'
    and column_name  in ('display_blocks', 'form_fields')
    and data_type    = 'jsonb';

  assert v_count = 2,
    'FAIL: display_blocks and/or form_fields are not of type jsonb';

  -- -------------------------------------------------------------------------
  -- 3. Old payment_method_types table is gone
  -- -------------------------------------------------------------------------
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name   = 'payment_method_types';

  assert v_count = 0,
    'FAIL: payment_method_types table still exists (should have been dropped)';

  -- -------------------------------------------------------------------------
  -- 4. RLS is enabled on seller_payment_methods
  -- -------------------------------------------------------------------------
  select relrowsecurity into v_rls_enabled
  from pg_class
  where oid = 'public.seller_payment_methods'::regclass;

  assert v_rls_enabled = true,
    'FAIL: RLS is not enabled on seller_payment_methods';

  -- -------------------------------------------------------------------------
  -- 5. Expected RLS policies exist
  -- -------------------------------------------------------------------------
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'seller_payment_methods'
    and policyname in (
      'spm_seller_select',
      'spm_seller_insert',
      'spm_seller_update',
      'spm_seller_delete',
      'spm_buyer_select_active'
    );

  assert v_count = 5,
    'FAIL: one or more expected RLS policies are missing on seller_payment_methods';

  -- -------------------------------------------------------------------------
  -- 6. orders.payment_method_id FK points to new table
  -- -------------------------------------------------------------------------
  select count(*) into v_count
  from information_schema.referential_constraints rc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = rc.constraint_name
   and kcu.constraint_schema = rc.constraint_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = rc.unique_constraint_name
   and ccu.constraint_schema = rc.unique_constraint_schema
  where kcu.table_schema  = 'public'
    and kcu.table_name    = 'orders'
    and kcu.column_name   = 'payment_method_id'
    and ccu.table_name    = 'seller_payment_methods';

  assert v_count = 1,
    'FAIL: orders.payment_method_id FK does not reference the new seller_payment_methods table';

  raise notice 'All smoke tests passed for migration 20260413100000_customizable_payment_methods';

end $$;
