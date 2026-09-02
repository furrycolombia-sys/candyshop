-- =============================================================================
-- Fix: audit.log_changes() silently records user_id = NULL for every write
-- =============================================================================
-- audit.log_changes() called auth.uid() wrapped in
-- `exception when others then null`. Under Third-Party Auth, auth.uid() casts
-- a Clerk sub to uuid and raises 22P02 for every authenticated caller — the
-- catch-all swallowed that error and silently recorded user_id = NULL for
-- every audited write on all 16 audited tables. The audit trail still wrote
-- rows, so nothing looked broken; attribution was just gone.
--
-- Fix: resolve the caller through public.current_user_id() instead, and drop
-- the blanket exception handler.
--
-- Why the catch-all can go away: current_user_id() is a plain SQL SELECT
-- keyed on identity_sub = auth.jwt() ->> 'sub'. auth.jwt() reads
-- request.jwt.claim(s) via current_setting(..., true) (missing_ok), so it
-- never raises when there is no JWT context (service role, migrations,
-- background jobs) — it just yields NULL, which the WHERE clause turns into
-- "no matching profile", i.e. a clean NULL user_id. There is no uuid cast
-- left in this path, so there is no longer a known failure mode to catch.
-- Keeping `exception when others then null` here would just re-create
-- exactly the bug this migration fixes: it would silently absorb the next
-- unrelated error too and keep writing NULL-attributed audit rows without
-- any signal that something is wrong. For a payments audit trail, a loud
-- failure on an unexpected error is preferable to a silent, wrong row.
-- =============================================================================

create or replace function audit.log_changes()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields jsonb;
  v_user_id uuid;
begin
  v_user_id := public.current_user_id();

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
$function$;
