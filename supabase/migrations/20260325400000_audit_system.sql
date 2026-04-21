-- =============================================================================
-- Audit System: Row-level change tracking for all tables
-- =============================================================================
-- Captures every INSERT/UPDATE/DELETE with full before/after JSONB snapshots.
-- Designed for financial-grade auditing (SOX/PCI-ready foundation).
-- =============================================================================

-- Schema
create schema if not exists audit;

-- Grant read access to authenticated roles only (needed for PostgREST to query via Accept-Profile: audit)
-- NOTE: anon is deliberately excluded — audit data is admin-only
grant usage on schema audit to authenticated;
grant select on all tables in schema audit to authenticated;

-- -----------------------------------------------------------------------------
-- Audit log table
-- -----------------------------------------------------------------------------
create table if not exists audit.logged_actions (
  event_id bigserial primary key,
  schema_name text not null,
  table_name text not null,
  -- Actor info
  user_id uuid,                          -- auth.uid() (Supabase user)
  db_user text not null default session_user,
  -- Operation
  action_type text not null check (action_type in ('INSERT', 'UPDATE', 'DELETE')),
  -- Data snapshots (JSONB)
  row_data jsonb,                        -- full row after change (INSERT/UPDATE) or before (DELETE)
  changed_fields jsonb,                  -- only the diff on UPDATE (null for INSERT/DELETE)
  -- Metadata
  action_timestamp timestamptz not null default now(),
  transaction_id bigint default txid_current(),
  client_ip inet default inet_client_addr()
);

-- Indexes for efficient querying
create index if not exists logged_actions_timestamp on audit.logged_actions
  using brin(action_timestamp);
create index if not exists logged_actions_table on audit.logged_actions
  using btree(table_name);
create index if not exists logged_actions_user_id on audit.logged_actions
  using btree(user_id) where user_id is not null;
create index if not exists logged_actions_action_type on audit.logged_actions
  using btree(action_type);
create index if not exists logged_actions_row_data on audit.logged_actions
  using gin(row_data);

-- RLS: restrict audit access to admin users only
alter table audit.logged_actions enable row level security;

-- Only users with 'audit-view' or 'manage' permission can read audit entries
drop policy if exists "Audit: admin read only" on audit.logged_actions;
create policy "Audit: admin read only"
  on audit.logged_actions for select
  using (
    auth.uid() in (
      select up.user_id from public.user_permissions up
      inner join public.resource_permissions rp on rp.id = up.resource_permission_id
      inner join public.permissions p on p.id = rp.permission_id
      where p.key in ('audit-view', 'manage')
        and up.mode = 'grant'
        and (up.expires_at is null or up.expires_at > now())
    )
  );

-- -----------------------------------------------------------------------------
-- Trigger function: captures INSERT/UPDATE/DELETE
-- -----------------------------------------------------------------------------
create or replace function audit.log_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields jsonb;
  v_user_id uuid;
begin
  -- Get current Supabase user (null for service role / background jobs)
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

    -- Calculate only changed fields
    select jsonb_object_agg(key, value)
    into v_changed_fields
    from (
      select key, value from jsonb_each(v_new_data)
      where v_new_data->key is distinct from v_old_data->key
    ) as changed;

    -- Skip if nothing actually changed
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
-- Helper: enable/disable tracking on any table
-- -----------------------------------------------------------------------------
create or replace function audit.enable_tracking(target_table regclass)
returns void
language plpgsql
as $$
declare
  v_trigger_name text;
begin
  v_trigger_name := 'audit_' || target_table::text;
  -- Replace dots and quotes for valid trigger name
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

create or replace function audit.disable_tracking(target_table regclass)
returns void
language plpgsql
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
-- Enable tracking on all current tables
-- -----------------------------------------------------------------------------
select audit.enable_tracking('public.products'::regclass);
select audit.enable_tracking('public.events'::regclass);
select audit.enable_tracking('public.product_entitlements'::regclass);
select audit.enable_tracking('public.permissions'::regclass);
select audit.enable_tracking('public.product_reviews'::regclass);
select audit.enable_tracking('public.orders'::regclass);
select audit.enable_tracking('public.order_items'::regclass);
select audit.enable_tracking('public.check_ins'::regclass);
select audit.enable_tracking('public.check_in_audit'::regclass);
select audit.enable_tracking('public.ticket_transfers'::regclass);
select audit.enable_tracking('public.resource_permissions'::regclass);
select audit.enable_tracking('public.user_permissions'::regclass);

-- -----------------------------------------------------------------------------
-- Archive table (for retention management)
-- -----------------------------------------------------------------------------
create schema if not exists audit_archive;

create table if not exists audit_archive.logged_actions (like audit.logged_actions including all);

-- Archive function: moves records older than retention_days in batches
create or replace function audit.archive_old_logs(
  retention_days int default 90,
  batch_size int default 10000
)
returns bigint
language plpgsql
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
-- PGAudit extension (Layer 2: statement-level logging)
-- -----------------------------------------------------------------------------
-- Enable the extension (configuration must be set via supabase dashboard
-- or config.toml since ALTER SYSTEM cannot run inside migrations):
--   pgaudit.log = 'ddl, role, write'
--   pgaudit.log_catalog = off
--   pgaudit.log_parameter = on
--   pgaudit.log_relation = on
create extension if not exists pgaudit;
