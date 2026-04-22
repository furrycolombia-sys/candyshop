-- =============================================================================
-- Fix: function_search_path_mutable security warnings
-- =============================================================================
-- Adds SET search_path = '' to all functions that were missing it.
-- This prevents search-path injection attacks (Supabase security advisory).
-- Also moves pgaudit to the extensions schema (extension_in_public fix).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. trigger_set_updated_at (public)
-- -----------------------------------------------------------------------------
create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. prevent_audit_mutation (public)
-- -----------------------------------------------------------------------------
create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'check_in_audit is immutable: % operations are not allowed', TG_OP;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. sync_user_profile (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.sync_user_profile()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
begin
  insert into public.user_profiles (
    id, email, avatar_url, provider, display_name,
    first_seen_at, last_seen_at
  ) values (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_user_meta_data->>'full_name',
    now(), now()
  )
  on conflict (id) do update set
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    provider = EXCLUDED.provider,
    last_seen_at = now(),
    display_name = coalesce(public.user_profiles.display_name, EXCLUDED.display_name);

  return NEW;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. reserve_stock (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.reserve_stock(
  p_product_id uuid,
  p_quantity integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max_quantity integer;
begin
  select max_quantity into v_max_quantity
  from public.products
  where id = p_product_id
  for update;

  if v_max_quantity is null then
    return true;
  end if;

  if v_max_quantity < p_quantity then
    return false;
  end if;

  update public.products
  set max_quantity = max_quantity - p_quantity
  where id = p_product_id;

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. release_stock (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.release_stock(
  p_product_id uuid,
  p_quantity integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products
  set max_quantity = max_quantity + p_quantity
  where id = p_product_id
  and max_quantity is not null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. update_order_status (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_seller_note text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_timeout_hours integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order is null then
    raise exception 'Order not found';
  end if;

  case p_new_status
    when 'approved' then
      if v_order.payment_status not in ('pending_verification', 'evidence_requested') then
        raise exception 'Cannot approve from status %', v_order.payment_status;
      end if;

    when 'rejected' then
      if v_order.payment_status not in ('pending_verification', 'evidence_requested') then
        raise exception 'Cannot reject from status %', v_order.payment_status;
      end if;
      perform public.release_stock(oi.product_id, oi.quantity)
      from public.order_items oi where oi.order_id = p_order_id;
      update public.orders set transfer_number = null, receipt_url = null where id = p_order_id;

    when 'evidence_requested' then
      if v_order.payment_status not in ('pending_verification') then
        raise exception 'Cannot request evidence from status %', v_order.payment_status;
      end if;
      select value::integer into v_timeout_hours
      from public.payment_settings where key = 'timeout_evidence_requested_hours';
      update public.orders set expires_at = now() + (coalesce(v_timeout_hours, 24) || ' hours')::interval where id = p_order_id;

    else
      raise exception 'Invalid status: %', p_new_status;
  end case;

  update public.orders
  set payment_status = p_new_status::public.payment_status,
      seller_note = coalesce(p_seller_note, seller_note)
  where id = p_order_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. resubmit_evidence (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.resubmit_evidence(
  p_order_id uuid,
  p_transfer_number text,
  p_receipt_url text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_timeout_hours integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order is null then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status != 'evidence_requested' then
    raise exception 'Can only resubmit when evidence is requested';
  end if;

  select value::integer into v_timeout_hours
  from public.payment_settings where key = 'timeout_pending_verification_hours';

  update public.orders
  set payment_status = 'pending_verification',
      transfer_number = p_transfer_number,
      receipt_url = p_receipt_url,
      expires_at = now() + (coalesce(v_timeout_hours, 72) || ' hours')::interval
  where id = p_order_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. has_permission (public) — security definer, stable, language sql
-- -----------------------------------------------------------------------------
create or replace function public.has_permission(
  p_user_id uuid,
  p_permission_key text
) returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'grant'
      and (up.expires_at is null or up.expires_at > now())
  )
  and not exists (
    select 1 from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'deny'
      and (up.expires_at is null or up.expires_at > now())
  );
$$;

-- -----------------------------------------------------------------------------
-- 9. grant_default_buyer_permissions (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.grant_default_buyer_permissions(
  p_user_id uuid,
  p_granted_by uuid,
  p_reason text default 'Default buyer permissions'
)
returns void
security definer
language plpgsql
set search_path = ''
as $$
begin
  insert into public.user_permissions (
    user_id,
    resource_permission_id,
    mode,
    granted_by,
    reason
  )
  select
    p_user_id,
    rp.id,
    'grant',
    p_granted_by,
    p_reason
  from public.resource_permissions rp
  inner join public.permissions p on p.id = rp.permission_id
  where rp.resource_type = 'global'
    and p.key in (
      'products.read',
      'product_reviews.create',
      'product_reviews.read',
      'product_reviews.update',
      'product_reviews.delete',
      'orders.create',
      'orders.read',
      'receipts.create',
      'receipts.delete'
    )
  on conflict (user_id, resource_permission_id) do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. handle_auth_user_default_permissions (public) — security definer
-- -----------------------------------------------------------------------------
create or replace function public.handle_auth_user_default_permissions()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
begin
  perform public.grant_default_buyer_permissions(
    NEW.id,
    NEW.id,
    'Default buyer permissions'
  );

  return NEW;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. is_order_delegate (public) — security definer, stable, language sql
-- -----------------------------------------------------------------------------
create or replace function public.is_order_delegate(p_order_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.seller_admins sa
      on sa.admin_user_id = auth.uid()
      and sa.seller_id = (
        select seller_id from public.orders where id = p_order_id
      )
      and sa.product_id = oi.product_id
    where oi.order_id = p_order_id
  );
$$;

-- -----------------------------------------------------------------------------
-- 12. audit.log_changes — security definer
-- -----------------------------------------------------------------------------
create or replace function audit.log_changes()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
declare
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields jsonb;
  v_user_id uuid;
begin
  begin
    v_user_id := auth.uid();
  exception when others then
    v_user_id := null;
  end;

  if (TG_OP = 'INSERT') then
    v_new_data := to_jsonb(NEW);
    insert into audit.logged_actions (
      schema_name, table_name, user_id, action_type, row_data
    ) values (
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_user_id, 'INSERT', v_new_data
    );
    return NEW;

  elsif (TG_OP = 'UPDATE') then
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);

    select jsonb_object_agg(key, value)
    into v_changed_fields
    from (
      select key, value from jsonb_each(v_new_data)
      where v_new_data->key is distinct from v_old_data->key
    ) as changed;

    if v_changed_fields is null then
      return NEW;
    end if;

    insert into audit.logged_actions (
      schema_name, table_name, user_id, action_type, row_data, changed_fields
    ) values (
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_user_id, 'UPDATE', v_new_data, v_changed_fields
    );
    return NEW;

  elsif (TG_OP = 'DELETE') then
    v_old_data := to_jsonb(OLD);
    insert into audit.logged_actions (
      schema_name, table_name, user_id, action_type, row_data
    ) values (
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_user_id, 'DELETE', v_old_data
    );
    return OLD;
  end if;

  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 13. audit.enable_tracking
-- -----------------------------------------------------------------------------
create or replace function audit.enable_tracking(target_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_trigger_name text;
begin
  v_trigger_name := 'audit_' || target_table::text;
  v_trigger_name := replace(replace(v_trigger_name, '.', '_'), '"', '');

  execute format(
    'drop trigger if exists %I on %s',
    v_trigger_name, target_table
  );
  execute format(
    'create trigger %I after insert or update or delete on %s '
    'for each row execute function audit.log_changes()',
    v_trigger_name, target_table
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 14. audit.disable_tracking
-- -----------------------------------------------------------------------------
create or replace function audit.disable_tracking(target_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_trigger_name text;
begin
  v_trigger_name := 'audit_' || target_table::text;
  v_trigger_name := replace(replace(v_trigger_name, '.', '_'), '"', '');

  execute format(
    'drop trigger if exists %I on %s',
    v_trigger_name, target_table
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 15. audit.archive_old_logs
-- -----------------------------------------------------------------------------
create or replace function audit.archive_old_logs(
  retention_days int default 90,
  batch_size int default 10000
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_cutoff timestamptz;
  v_moved bigint := 0;
  v_batch bigint;
begin
  v_cutoff := now() - (retention_days || ' days')::interval;

  loop
    with moved as (
      delete from audit.logged_actions
      where event_id in (
        select event_id from audit.logged_actions
        where action_timestamp < v_cutoff
        order by event_id
        limit batch_size
      )
      returning *
    )
    insert into audit_archive.logged_actions select * from moved;

    get diagnostics v_batch = row_count;
    v_moved := v_moved + v_batch;

    exit when v_batch < batch_size;
  end loop;

  return v_moved;
end;
$$;

-- -----------------------------------------------------------------------------
-- 16. Move pgaudit to extensions schema (extension_in_public fix)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_extension
    where extname = 'pgaudit'
      and extnamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    alter extension pgaudit set schema extensions;
  end if;
end;
$$;
