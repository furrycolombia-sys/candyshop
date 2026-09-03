-- Consolidated baseline: the schema the 51 migrations in
-- supabase/migrations-archive/ produced, as one file.
--
-- Squashed because there is no database left to migrate. Production is gone
-- (docs/production-status.md); what exists is a July backup of the DATA, which
-- gets restored into a schema built from scratch. An incremental history has
-- nothing to migrate from, and 51 files take 51 round trips to apply.
--
-- Verified equivalent rather than assumed. The archived migrations were
-- applied to one database and this file to another, then both were dumped and
-- diffed: every table, policy, function, view, grant and revoke matches. The
-- only differences were artifacts of how the comparison database was created
-- -- pg_dump's session nonce, `public` schema ownership, and the ALTER DEFAULT
-- PRIVILEGES that Supabase's own bootstrap sets rather than our migrations.
--
-- Verified compatible with the backup, which is the point of the exercise. The
-- restored production data loaded into this schema with zero errors and
-- matching row counts: 196 user_profiles, 147 orders, 147 order_items, 1799
-- user_permissions, 2 seller_payment_methods.
--
-- One thing to know when restoring. A plain `pg_dump --data-only` emits
-- INSERTs in alphabetical table order, not dependency order, which produced
-- 2153 foreign key violations here; deferring constraint checks removed all
-- of them, so they were ordering and never schema mismatch. Restore through
-- `scripts/backup-prod.mjs --restore`, which sorts tables topologically, or
-- set `session_replication_role = replica` for the load.
--
-- HOW TO CHANGE THE SCHEMA FROM HERE. Not by editing this file.
--
-- Every object is now defined exactly once, which makes "change the function"
-- look like an edit to the file that already defines it. It is not. Supabase
-- records an applied migration by name and never re-runs it, so an in-place
-- edit reaches this file and never reaches any database that has already run
-- it -- silently, and without ever failing. The file and the database then
-- disagree, and the file is the one everybody reads.
--
-- tests/db cannot catch this. It builds a fresh database from these files,
-- where the two agree by construction. That is the same blind spot aeleos
-- found the expensive way: a function on its live project was missing an
-- entire validation block for five merged pull requests, while every check
-- passed, because every check was reading a database built from the file.
--
-- So: add a new timestamped migration for every change, including changes to
-- something defined here. Edit this file only when no database has applied it
-- yet -- which today is true, and stops being true the moment production is
-- restored.
--
-- The archived files are kept for their reasoning, not for replay. Several
-- carry the argument for a security decision -- why identity_sub is revoked
-- from client roles, why the audit view stopped being SECURITY DEFINER, why
-- the buyer-select policy on seller_payment_methods was dropped -- which a
-- schema dump cannot express. Read them there; do not apply them.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "audit";


ALTER SCHEMA "audit" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "audit_archive";


ALTER SCHEMA "audit_archive" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgaudit" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."audit_action" AS ENUM (
    'check-in',
    'uncheck',
    'transfer'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."currency_code" AS ENUM (
    'USD',
    'EUR',
    'GBP',
    'COP',
    'MXN',
    'BRL',
    'ARS',
    'CLP',
    'PEN',
    'CAD',
    'AUD',
    'JPY',
    'CNY',
    'KRW',
    'INR',
    'CHF',
    'SEK',
    'NOK',
    'DKK',
    'NZD',
    'SGD',
    'HKD',
    'CZK',
    'HUF',
    'PLN',
    'RON',
    'TRY',
    'ZAR',
    'ILS',
    'SAR',
    'AED',
    'THB',
    'IDR',
    'MYR',
    'PHP',
    'VND',
    'NGN',
    'KES',
    'GHS',
    'UYU',
    'BOB',
    'PYG',
    'GTQ',
    'HNL',
    'NIO',
    'CRC',
    'DOP',
    'CUP',
    'JMD',
    'TTD',
    'BBD',
    'XCD'
);


ALTER TYPE "public"."currency_code" OWNER TO "postgres";


CREATE TYPE "public"."entitlement_type" AS ENUM (
    'transport',
    'entry',
    'meal',
    'merch',
    'party',
    'other'
);


ALTER TYPE "public"."entitlement_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'awaiting_payment',
    'pending_verification',
    'evidence_requested',
    'approved',
    'rejected',
    'expired'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."permission_mode" AS ENUM (
    'grant',
    'deny'
);


ALTER TYPE "public"."permission_mode" OWNER TO "postgres";


CREATE TYPE "public"."product_category" AS ENUM (
    'fursuits',
    'merch',
    'art',
    'events',
    'digital',
    'deals'
);


ALTER TYPE "public"."product_category" OWNER TO "postgres";


CREATE TYPE "public"."product_type" AS ENUM (
    'ticket',
    'merch',
    'digital',
    'service'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";


CREATE TYPE "public"."transfer_status" AS ENUM (
    'pending',
    'claimed',
    'expired'
);


ALTER TYPE "public"."transfer_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "audit"."archive_old_logs"("retention_days" integer DEFAULT 90, "batch_size" integer DEFAULT 10000) RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "audit"."archive_old_logs"("retention_days" integer, "batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "audit"."disable_tracking"("target_table" "regclass") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "audit"."disable_tracking"("target_table" "regclass") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "audit"."enable_tracking"("target_table" "regclass") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "audit"."enable_tracking"("target_table" "regclass") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "audit"."log_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "audit"."log_changes"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "provider" "text",
    "display_name" "text",
    "display_email" "text",
    "display_avatar_url" "text",
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "identity_sub" "text",
    CONSTRAINT "user_profiles_display_avatar_url_check" CHECK ((("display_avatar_url" IS NULL) OR ("display_avatar_url" ~* '^https://'::"text"))),
    CONSTRAINT "user_profiles_display_email_check" CHECK ((("display_email" IS NULL) OR ("display_email" ~* '^.+@.+$'::"text"))),
    CONSTRAINT "user_profiles_email_check" CHECK (("email" ~* '^.+@.+$'::"text"))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."identity_sub" IS 'Clerk subject claim (auth.jwt()->>''sub''). Null until the person signs in and claims this profile. Unique so two identities cannot claim one profile.';



CREATE OR REPLACE FUNCTION "public"."create_profile_with_default_permissions"("p_email" "text", "p_identity_sub" "text", "p_display_name" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text") RETURNS "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_profile_with_default_permissions"("p_email" "text", "p_identity_sub" "text", "p_display_name" "text", "p_avatar_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_profile_with_default_permissions"("p_email" "text", "p_identity_sub" "text", "p_display_name" "text", "p_avatar_url" "text") IS 'Creates a user_profiles row for a brand-new Clerk identity and grants default buyer permissions in the same transaction. Replaces the on_auth_user_default_permissions trigger, which can never fire again now that auth.users is permanently empty. Callable by service_role only.';



CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id
  from public.user_profiles
  where identity_sub = nullif(auth.jwt() ->> 'sub', '')
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_user_id"() IS 'The signed-in person''s user_profiles.id, resolved from the Clerk sub. NULL when unknown or signed out — callers must treat NULL as deny.';



CREATE OR REPLACE FUNCTION "public"."grant_default_buyer_permissions"("p_user_id" "uuid", "p_granted_by" "uuid", "p_reason" "text" DEFAULT 'Default buyer permissions'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."grant_default_buyer_permissions"("p_user_id" "uuid", "p_granted_by" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_default_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.grant_default_buyer_permissions(
    NEW.id,
    NEW.id,
    'Default buyer permissions'
  );

  return NEW;
end;
$$;


ALTER FUNCTION "public"."handle_auth_user_default_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_order_delegate"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.order_items oi
    join public.seller_admins sa
      on sa.admin_user_id = public.current_user_id()
      and sa.seller_id = (
        select seller_id from public.orders where id = p_order_id
      )
      and sa.product_id = oi.product_id
    where oi.order_id = p_order_id
  );
$$;


ALTER FUNCTION "public"."is_order_delegate"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_receipt_delegate"("p_session_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.orders o
    join public.seller_admins sa
      on sa.admin_user_id = public.current_user_id()
      and sa.seller_id = o.seller_id
    where o.checkout_session_id = p_session_id
  );
$$;


ALTER FUNCTION "public"."is_receipt_delegate"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_receipt_delegate_by_order_id"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.orders o
    join public.seller_admins sa
      on sa.admin_user_id = public.current_user_id()
      and sa.seller_id = o.seller_id
    where o.id = p_order_id
  );
$$;


ALTER FUNCTION "public"."is_receipt_delegate_by_order_id"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_audit_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'check_in_audit is immutable: % operations are not allowed', TG_OP;
end;
$$;


ALTER FUNCTION "public"."prevent_audit_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_stock"("p_product_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.products
  set max_quantity = max_quantity + p_quantity
  where id = p_product_id
  and max_quantity is not null;
end;
$$;


ALTER FUNCTION "public"."release_stock"("p_product_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_quantity" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resubmit_evidence"("p_order_id" "uuid", "p_transfer_number" "text", "p_receipt_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."resubmit_evidence"("p_order_id" "uuid", "p_transfer_number" "text", "p_receipt_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_seller_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_seller_note" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "audit"."logged_actions" (
    "event_id" bigint NOT NULL,
    "schema_name" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "user_id" "uuid",
    "db_user" "text" DEFAULT SESSION_USER NOT NULL,
    "action_type" "text" NOT NULL,
    "row_data" "jsonb",
    "changed_fields" "jsonb",
    "action_timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transaction_id" bigint DEFAULT "txid_current"(),
    "client_ip" "inet" DEFAULT "inet_client_addr"(),
    CONSTRAINT "logged_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "audit"."logged_actions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "audit"."logged_actions_event_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "audit"."logged_actions_event_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "audit"."logged_actions_event_id_seq" OWNED BY "audit"."logged_actions"."event_id";



CREATE OR REPLACE VIEW "audit"."logged_actions_with_user" WITH ("security_invoker"='true') AS
 SELECT "la"."event_id",
    "la"."schema_name",
    "la"."table_name",
    "la"."user_id",
    "la"."db_user",
    "la"."action_type",
    "la"."row_data",
    "la"."changed_fields",
    "la"."action_timestamp",
    "la"."transaction_id",
    "la"."client_ip",
    COALESCE("up"."display_email", "up"."email") AS "user_email",
    COALESCE("up"."display_name", "split_part"("up"."email", '@'::"text", 1)) AS "user_display_name",
    COALESCE("up"."display_avatar_url", "up"."avatar_url") AS "user_avatar"
   FROM ("audit"."logged_actions" "la"
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."id" = "la"."user_id")));


ALTER VIEW "audit"."logged_actions_with_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "audit_archive"."logged_actions" (
    "event_id" bigint DEFAULT "nextval"('"audit"."logged_actions_event_id_seq"'::"regclass") NOT NULL,
    "schema_name" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "user_id" "uuid",
    "db_user" "text" DEFAULT SESSION_USER NOT NULL,
    "action_type" "text" NOT NULL,
    "row_data" "jsonb",
    "changed_fields" "jsonb",
    "action_timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transaction_id" bigint DEFAULT "txid_current"(),
    "client_ip" "inet" DEFAULT "inet_client_addr"(),
    CONSTRAINT "logged_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "audit_archive"."logged_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_in_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_in_id" "uuid" NOT NULL,
    "action" "public"."audit_action" NOT NULL,
    "performed_by" "uuid" NOT NULL,
    "reason" "text",
    "ip_address" "text" DEFAULT ''::"text" NOT NULL,
    "user_agent" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."check_in_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."check_in_audit" IS 'Immutable append-only log. Never update or delete rows.';



CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "entitlement_id" "uuid" NOT NULL,
    "qr_code" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "checked_in" boolean DEFAULT false NOT NULL,
    "checked_in_at" timestamp with time zone,
    "checked_in_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


COMMENT ON TABLE "public"."check_ins" IS 'One row per entitlement per order item. Each has its own QR code.';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text" NOT NULL,
    "description_en" "text" DEFAULT ''::"text" NOT NULL,
    "description_es" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "max_capacity" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Event definitions (conventions, meetups, etc.)';



CREATE OR REPLACE VIEW "public"."logged_actions_with_user" WITH ("security_invoker"='true') AS
 SELECT "event_id",
    "schema_name",
    "table_name",
    "user_id",
    "db_user",
    "action_type",
    "row_data",
    "changed_fields",
    "action_timestamp",
    "transaction_id",
    "client_ip",
    "user_email",
    "user_display_name",
    "user_avatar"
   FROM "audit"."logged_actions_with_user";


ALTER VIEW "public"."logged_actions_with_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit_price" integer NOT NULL,
    "currency" "public"."currency_code" NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_items" IS 'Products in an order. metadata holds event-specific data (reservation_code, room_type)';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_session_id" "text",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "seller_id" "uuid",
    "payment_method_id" "uuid",
    "transfer_number" "text",
    "receipt_url" "text",
    "seller_note" "text",
    "expires_at" timestamp with time zone,
    "checkout_session_id" "uuid",
    "buyer_info" "jsonb",
    "total" integer NOT NULL,
    "currency" "public"."currency_code" NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'User purchases with Stripe payment tracking';



CREATE TABLE IF NOT EXISTS "public"."payment_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text" NOT NULL,
    "description_en" "text" DEFAULT ''::"text" NOT NULL,
    "description_es" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "depends_on" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."permissions" IS 'First-class permission definitions (check-in, uncheck, manage, etc.)';



CREATE TABLE IF NOT EXISTS "public"."product_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text" NOT NULL,
    "type" "public"."entitlement_type" DEFAULT 'other'::"public"."entitlement_type" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_entitlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_entitlements" IS 'What a product includes (bus, meals, entry, merch pickup, etc.)';



CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "text" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_reviews" IS 'Customer reviews for products. Rating 1-5 with text.';



CREATE TABLE IF NOT EXISTS "public"."product_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text" NOT NULL,
    "description_en" "text",
    "description_es" "text",
    "sections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "slug" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text" NOT NULL,
    "description_en" "text" DEFAULT ''::"text" NOT NULL,
    "description_es" "text" DEFAULT ''::"text" NOT NULL,
    "type" "public"."product_type" NOT NULL,
    "max_quantity" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "public"."product_category" DEFAULT 'merch'::"public"."product_category" NOT NULL,
    "long_description_en" "text" DEFAULT ''::"text" NOT NULL,
    "long_description_es" "text" DEFAULT ''::"text" NOT NULL,
    "tagline_en" "text" DEFAULT ''::"text" NOT NULL,
    "tagline_es" "text" DEFAULT ''::"text" NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "rating" numeric(3,2),
    "review_count" integer DEFAULT 0 NOT NULL,
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "refundable" boolean,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "seller_id" "uuid",
    "price" integer NOT NULL,
    "currency" "public"."currency_code" NOT NULL,
    "compare_at_price" integer,
    CONSTRAINT "products_rating_range" CHECK ((("rating" >= 1.00) AND ("rating" <= 5.00)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Generic product catalog (tickets, merch, digital goods, services)';



COMMENT ON COLUMN "public"."products"."sections" IS 'Generic product sections: [{name_en, name_es, type, sort_order, items: [{title_en, title_es, description_en, description_es, icon?, image_url?, sort_order}]}]';



COMMENT ON COLUMN "public"."products"."refundable" IS 'null = not specified, true = refundable, false = non-refundable';



CREATE TABLE IF NOT EXISTS "public"."resource_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resource_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."resource_permissions" IS 'Scopes a permission to a resource type and optional specific instance';



CREATE TABLE IF NOT EXISTS "public"."seller_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    CONSTRAINT "seller_admins_no_self_delegation" CHECK (("seller_id" <> "admin_user_id"))
);


ALTER TABLE "public"."seller_admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."seller_admins" IS 'Links sellers to delegated administrators with scoped permissions';



CREATE TABLE IF NOT EXISTS "public"."seller_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text",
    "display_blocks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "form_fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "requires_receipt" boolean DEFAULT false NOT NULL,
    "requires_transfer_number" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."seller_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "transfer_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(20), 'hex'::"text") NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid",
    "status" "public"."transfer_status" DEFAULT 'pending'::"public"."transfer_status" NOT NULL,
    "claimed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_transfers" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_transfers" IS 'Transfer links for gifting tickets. QR codes regenerate on claim.';



CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_permission_id" "uuid" NOT NULL,
    "mode" "public"."permission_mode" DEFAULT 'grant'::"public"."permission_mode" NOT NULL,
    "reason" "text",
    "granted_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_permissions" IS 'Links users to resource permissions with grant/deny mode';



ALTER TABLE ONLY "audit"."logged_actions" ALTER COLUMN "event_id" SET DEFAULT "nextval"('"audit"."logged_actions_event_id_seq"'::"regclass");



ALTER TABLE ONLY "audit"."logged_actions"
    ADD CONSTRAINT "logged_actions_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "audit_archive"."logged_actions"
    ADD CONSTRAINT "logged_actions_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."check_in_audit"
    ADD CONSTRAINT "check_in_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_order_item_id_entitlement_id_key" UNIQUE ("order_item_id", "entitlement_id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_settings"
    ADD CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_entitlements"
    ADD CONSTRAINT "product_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_templates"
    ADD CONSTRAINT "product_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_permission_id_resource_type_resource_i_key" UNIQUE ("permission_id", "resource_type", "resource_id");



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_admins"
    ADD CONSTRAINT "seller_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_admins"
    ADD CONSTRAINT "seller_admins_seller_admin_product_unique" UNIQUE ("seller_id", "admin_user_id", "product_id");



ALTER TABLE ONLY "public"."seller_payment_methods"
    ADD CONSTRAINT "seller_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_transfers"
    ADD CONSTRAINT "ticket_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_transfers"
    ADD CONSTRAINT "ticket_transfers_transfer_token_key" UNIQUE ("transfer_token");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_resource_permission_id_key" UNIQUE ("user_id", "resource_permission_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "logged_actions_action_type" ON "audit"."logged_actions" USING "btree" ("action_type");



CREATE INDEX "logged_actions_row_data" ON "audit"."logged_actions" USING "gin" ("row_data");



CREATE INDEX "logged_actions_table" ON "audit"."logged_actions" USING "btree" ("table_name");



CREATE INDEX "logged_actions_timestamp" ON "audit"."logged_actions" USING "brin" ("action_timestamp");



CREATE INDEX "logged_actions_user_id" ON "audit"."logged_actions" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "logged_actions_action_timestamp_idx" ON "audit_archive"."logged_actions" USING "brin" ("action_timestamp");



CREATE INDEX "logged_actions_action_type_idx" ON "audit_archive"."logged_actions" USING "btree" ("action_type");



CREATE INDEX "logged_actions_row_data_idx" ON "audit_archive"."logged_actions" USING "gin" ("row_data");



CREATE INDEX "logged_actions_table_name_idx" ON "audit_archive"."logged_actions" USING "btree" ("table_name");



CREATE INDEX "logged_actions_user_id_idx" ON "audit_archive"."logged_actions" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_check_in_audit_check_in_id" ON "public"."check_in_audit" USING "btree" ("check_in_id");



CREATE INDEX "idx_check_ins_order_item_id" ON "public"."check_ins" USING "btree" ("order_item_id");



CREATE INDEX "idx_check_ins_qr_code" ON "public"."check_ins" USING "btree" ("qr_code");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_payment_status" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_product_reviews_product_id" ON "public"."product_reviews" USING "btree" ("product_id");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_currency" ON "public"."products" USING "btree" ("currency");



CREATE INDEX "idx_products_event_id" ON "public"."products" USING "btree" ("event_id");



CREATE INDEX "idx_products_featured" ON "public"."products" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX "idx_products_seller_id" ON "public"."products" USING "btree" ("seller_id");



CREATE INDEX "idx_products_sort_order" ON "public"."products" USING "btree" ("sort_order");



CREATE INDEX "idx_products_type" ON "public"."products" USING "btree" ("type");



CREATE INDEX "idx_products_updated_at" ON "public"."products" USING "btree" ("updated_at");



CREATE INDEX "idx_resource_permissions_type" ON "public"."resource_permissions" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_seller_admins_admin_user_id" ON "public"."seller_admins" USING "btree" ("admin_user_id");



CREATE INDEX "idx_seller_admins_product_id" ON "public"."seller_admins" USING "btree" ("product_id");



CREATE INDEX "idx_seller_admins_seller_id" ON "public"."seller_admins" USING "btree" ("seller_id");



CREATE INDEX "idx_ticket_transfers_order_item" ON "public"."ticket_transfers" USING "btree" ("order_item_id");



CREATE INDEX "idx_ticket_transfers_token" ON "public"."ticket_transfers" USING "btree" ("transfer_token");



CREATE INDEX "idx_user_permissions_user_id" ON "public"."user_permissions" USING "btree" ("user_id");



CREATE INDEX "orders_checkout_session_idx" ON "public"."orders" USING "btree" ("checkout_session_id");



CREATE INDEX "orders_expires_at_idx" ON "public"."orders" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "orders_seller_id_idx" ON "public"."orders" USING "btree" ("seller_id");



CREATE INDEX "orders_user_status_idx" ON "public"."orders" USING "btree" ("user_id", "payment_status");



CREATE INDEX "product_templates_sort_order_idx" ON "public"."product_templates" USING "btree" ("sort_order");



CREATE INDEX "seller_payment_methods_seller_active_idx" ON "public"."seller_payment_methods" USING "btree" ("seller_id", "is_active");



CREATE INDEX "seller_payment_methods_seller_sort_idx" ON "public"."seller_payment_methods" USING "btree" ("seller_id", "sort_order");



CREATE UNIQUE INDEX "user_profiles_email_lower_idx" ON "public"."user_profiles" USING "btree" ("lower"("email"));



COMMENT ON INDEX "public"."user_profiles_email_lower_idx" IS 'Case-insensitive uniqueness on email. Replaces the case-sensitive user_profiles_email_idx: resolveProfile() always looks up by lowercased email, so two differently-cased rows for the same address must never both be able to exist.';



CREATE UNIQUE INDEX "user_profiles_identity_sub_idx" ON "public"."user_profiles" USING "btree" ("identity_sub");



CREATE OR REPLACE TRIGGER "audit_check_in_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."check_in_audit" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_check_ins" AFTER INSERT OR DELETE OR UPDATE ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_order_items" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_orders" AFTER INSERT OR DELETE OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_payment_settings" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_settings" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_permissions" AFTER INSERT OR DELETE OR UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_product_entitlements" AFTER INSERT OR DELETE OR UPDATE ON "public"."product_entitlements" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_product_reviews" AFTER INSERT OR DELETE OR UPDATE ON "public"."product_reviews" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_product_templates" AFTER INSERT OR DELETE OR UPDATE ON "public"."product_templates" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_products" AFTER INSERT OR DELETE OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_resource_permissions" AFTER INSERT OR DELETE OR UPDATE ON "public"."resource_permissions" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_seller_payment_methods" AFTER INSERT OR DELETE OR UPDATE ON "public"."seller_payment_methods" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_ticket_transfers" AFTER INSERT OR DELETE OR UPDATE ON "public"."ticket_transfers" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_user_permissions" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "audit_user_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "audit"."log_changes"();



CREATE OR REPLACE TRIGGER "check_in_audit_no_delete" BEFORE DELETE ON "public"."check_in_audit" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_mutation"();



CREATE OR REPLACE TRIGGER "check_in_audit_no_update" BEFORE UPDATE ON "public"."check_in_audit" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_mutation"();



CREATE OR REPLACE TRIGGER "products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_product_templates_updated_at" BEFORE UPDATE ON "public"."product_templates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_seller_admins_updated_at" BEFORE UPDATE ON "public"."seller_admins" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_seller_payment_methods_updated_at" BEFORE UPDATE ON "public"."seller_payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



ALTER TABLE ONLY "public"."check_in_audit"
    ADD CONSTRAINT "check_in_audit_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_in_audit"
    ADD CONSTRAINT "check_in_audit_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "public"."product_entitlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."seller_payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_entitlements"
    ADD CONSTRAINT "product_entitlements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_admins"
    ADD CONSTRAINT "seller_admins_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_admins"
    ADD CONSTRAINT "seller_admins_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_admins"
    ADD CONSTRAINT "seller_admins_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_payment_methods"
    ADD CONSTRAINT "seller_payment_methods_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_transfers"
    ADD CONSTRAINT "ticket_transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."ticket_transfers"
    ADD CONSTRAINT "ticket_transfers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_transfers"
    ADD CONSTRAINT "ticket_transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_resource_permission_id_fkey" FOREIGN KEY ("resource_permission_id") REFERENCES "public"."resource_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



CREATE POLICY "audit_read" ON "audit"."logged_actions" FOR SELECT USING ("public"."has_permission"("public"."current_user_id"(), 'audit.read'::"text"));



ALTER TABLE "audit"."logged_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."check_in_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_in_audit_read" ON "public"."check_in_audit" FOR SELECT USING (true);



ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_ins_insert" ON "public"."check_ins" FOR INSERT WITH CHECK ("public"."has_permission"("public"."current_user_id"(), 'check_ins.create'::"text"));



CREATE POLICY "check_ins_read" ON "public"."check_ins" FOR SELECT USING (("public"."has_permission"("public"."current_user_id"(), 'check_ins.read'::"text") AND ("order_item_id" IN ( SELECT "oi"."id"
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
  WHERE (("o"."user_id" = "public"."current_user_id"()) OR ("o"."seller_id" = "public"."current_user_id"()))))));



CREATE POLICY "check_ins_update" ON "public"."check_ins" FOR UPDATE USING ("public"."has_permission"("public"."current_user_id"(), 'check_ins.update'::"text"));



CREATE POLICY "entitlements_read" ON "public"."product_entitlements" FOR SELECT USING (true);



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete" ON "public"."events" FOR DELETE USING ("public"."has_permission"("public"."current_user_id"(), 'events.delete'::"text"));



CREATE POLICY "events_insert" ON "public"."events" FOR INSERT WITH CHECK ("public"."has_permission"("public"."current_user_id"(), 'events.create'::"text"));



CREATE POLICY "events_read" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "events_update" ON "public"."events" FOR UPDATE USING ("public"."has_permission"("public"."current_user_id"(), 'events.update'::"text"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_buyer_insert" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = "public"."current_user_id"())))));



CREATE POLICY "order_items_delegate_read" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."seller_admins" "sa" ON ((("sa"."seller_id" = "o"."seller_id") AND ("sa"."admin_user_id" = "public"."current_user_id"()) AND ("sa"."product_id" = "order_items"."product_id"))))
  WHERE ("o"."id" = "order_items"."order_id"))));



CREATE POLICY "order_items_read" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."user_id" = "public"."current_user_id"()) OR ("o"."seller_id" = "public"."current_user_id"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_buyer_insert" ON "public"."orders" FOR INSERT WITH CHECK (("public"."has_permission"("public"."current_user_id"(), 'orders.create'::"text") AND ("user_id" = "public"."current_user_id"())));



CREATE POLICY "orders_buyer_update" ON "public"."orders" FOR UPDATE USING (("public"."has_permission"("public"."current_user_id"(), 'orders.create'::"text") AND ("user_id" = "public"."current_user_id"())));



CREATE POLICY "orders_delegate_read" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."seller_admins" "sa"
  WHERE (("sa"."admin_user_id" = "public"."current_user_id"()) AND ("sa"."seller_id" = "orders"."seller_id")))));



CREATE POLICY "orders_delegate_update" ON "public"."orders" FOR UPDATE USING ((("payment_status" = ANY (ARRAY['pending_verification'::"public"."payment_status", 'evidence_requested'::"public"."payment_status"])) AND (EXISTS ( SELECT 1
   FROM "public"."seller_admins" "sa"
  WHERE (("sa"."admin_user_id" = "public"."current_user_id"()) AND ("sa"."seller_id" = "orders"."seller_id") AND (('orders.approve'::"text" = ANY ("sa"."permissions")) OR ('orders.request_proof'::"text" = ANY ("sa"."permissions"))))))));



CREATE POLICY "orders_read" ON "public"."orders" FOR SELECT USING (("public"."has_permission"("public"."current_user_id"(), 'orders.read'::"text") AND (("user_id" = "public"."current_user_id"()) OR ("seller_id" = "public"."current_user_id"()))));



CREATE POLICY "orders_seller_update" ON "public"."orders" FOR UPDATE USING (("public"."has_permission"("public"."current_user_id"(), 'orders.update'::"text") AND ("seller_id" = "public"."current_user_id"())));



ALTER TABLE "public"."payment_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_read" ON "public"."permissions" FOR SELECT USING (true);



ALTER TABLE "public"."product_entitlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete" ON "public"."products" FOR DELETE USING (("public"."has_permission"("public"."current_user_id"(), 'products.delete'::"text") AND ("seller_id" = "public"."current_user_id"())));



CREATE POLICY "products_insert" ON "public"."products" FOR INSERT WITH CHECK (("public"."has_permission"("public"."current_user_id"(), 'products.create'::"text") AND ("seller_id" = "public"."current_user_id"())));



CREATE POLICY "products_read" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING (("public"."has_permission"("public"."current_user_id"(), 'products.update'::"text") AND ("seller_id" = "public"."current_user_id"())));



CREATE POLICY "profiles_read" ON "public"."user_profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update" ON "public"."user_profiles" FOR UPDATE USING (("id" = "public"."current_user_id"()));



ALTER TABLE "public"."resource_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "resource_permissions_read" ON "public"."resource_permissions" FOR SELECT USING (true);



CREATE POLICY "reviews_delete" ON "public"."product_reviews" FOR DELETE USING (("public"."has_permission"("public"."current_user_id"(), 'product_reviews.delete'::"text") AND ("user_id" = "public"."current_user_id"())));



CREATE POLICY "reviews_insert" ON "public"."product_reviews" FOR INSERT WITH CHECK (("public"."has_permission"("public"."current_user_id"(), 'product_reviews.create'::"text") AND ("user_id" = "public"."current_user_id"())));



CREATE POLICY "reviews_read" ON "public"."product_reviews" FOR SELECT USING (true);



CREATE POLICY "reviews_update" ON "public"."product_reviews" FOR UPDATE USING (("public"."has_permission"("public"."current_user_id"(), 'product_reviews.update'::"text") AND ("user_id" = "public"."current_user_id"())));



ALTER TABLE "public"."seller_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_admins_delete" ON "public"."seller_admins" FOR DELETE USING (("public"."current_user_id"() = "seller_id"));



CREATE POLICY "seller_admins_insert" ON "public"."seller_admins" FOR INSERT WITH CHECK ((("public"."current_user_id"() = "seller_id") AND ("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."seller_id" = "public"."current_user_id"())))));



CREATE POLICY "seller_admins_select" ON "public"."seller_admins" FOR SELECT USING ((("public"."current_user_id"() = "seller_id") OR (("public"."current_user_id"() = "admin_user_id") AND ("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."seller_id" = "seller_admins"."seller_id"))))));



CREATE POLICY "seller_admins_update" ON "public"."seller_admins" FOR UPDATE USING (("public"."current_user_id"() = "seller_id")) WITH CHECK ((("public"."current_user_id"() = "seller_id") AND ("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."seller_id" = "public"."current_user_id"())))));



ALTER TABLE "public"."seller_payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_insert" ON "public"."payment_settings" FOR INSERT WITH CHECK ("public"."has_permission"("public"."current_user_id"(), 'payment_settings.update'::"text"));



CREATE POLICY "settings_read" ON "public"."payment_settings" FOR SELECT USING ("public"."has_permission"("public"."current_user_id"(), 'payment_settings.read'::"text"));



CREATE POLICY "settings_update" ON "public"."payment_settings" FOR UPDATE USING ("public"."has_permission"("public"."current_user_id"(), 'payment_settings.update'::"text"));



CREATE POLICY "spm_seller_delete" ON "public"."seller_payment_methods" FOR DELETE USING (("public"."current_user_id"() = "seller_id"));



CREATE POLICY "spm_seller_insert" ON "public"."seller_payment_methods" FOR INSERT WITH CHECK (("public"."current_user_id"() = "seller_id"));



CREATE POLICY "spm_seller_select" ON "public"."seller_payment_methods" FOR SELECT USING (("public"."current_user_id"() = "seller_id"));



CREATE POLICY "spm_seller_update" ON "public"."seller_payment_methods" FOR UPDATE USING (("public"."current_user_id"() = "seller_id"));



CREATE POLICY "templates_delete" ON "public"."product_templates" FOR DELETE USING ("public"."has_permission"("public"."current_user_id"(), 'templates.delete'::"text"));



CREATE POLICY "templates_insert" ON "public"."product_templates" FOR INSERT WITH CHECK ("public"."has_permission"("public"."current_user_id"(), 'templates.create'::"text"));



CREATE POLICY "templates_read" ON "public"."product_templates" FOR SELECT USING ("public"."has_permission"("public"."current_user_id"(), 'templates.read'::"text"));



CREATE POLICY "templates_update" ON "public"."product_templates" FOR UPDATE USING ("public"."has_permission"("public"."current_user_id"(), 'templates.update'::"text"));



ALTER TABLE "public"."ticket_transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transfers_read" ON "public"."ticket_transfers" FOR SELECT USING ((("from_user_id" = "public"."current_user_id"()) OR ("to_user_id" = "public"."current_user_id"())));



ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_permissions_delete" ON "public"."user_permissions" FOR DELETE USING ("public"."has_permission"("public"."current_user_id"(), 'user_permissions.delete'::"text"));



CREATE POLICY "user_permissions_insert" ON "public"."user_permissions" FOR INSERT WITH CHECK ("public"."has_permission"("public"."current_user_id"(), 'user_permissions.create'::"text"));



CREATE POLICY "user_permissions_read" ON "public"."user_permissions" FOR SELECT USING ((("user_id" = "public"."current_user_id"()) OR "public"."has_permission"("public"."current_user_id"(), 'user_permissions.read'::"text")));



CREATE POLICY "user_permissions_update" ON "public"."user_permissions" FOR UPDATE USING ("public"."has_permission"("public"."current_user_id"(), 'user_permissions.update'::"text"));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "audit" TO "authenticated";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_profiles" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("id") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("email") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("email") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("avatar_url") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("avatar_url") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("provider") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("provider") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("display_name"),UPDATE("display_name") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("display_name"),UPDATE("display_name") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("display_email"),UPDATE("display_email") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("display_email"),UPDATE("display_email") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("display_avatar_url"),UPDATE("display_avatar_url") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("display_avatar_url"),UPDATE("display_avatar_url") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("first_seen_at") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("first_seen_at") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("last_seen_at") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("last_seen_at") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT("updated_at") ON TABLE "public"."user_profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_profile_with_default_permissions"("p_email" "text", "p_identity_sub" "text", "p_display_name" "text", "p_avatar_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_profile_with_default_permissions"("p_email" "text", "p_identity_sub" "text", "p_display_name" "text", "p_avatar_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_default_buyer_permissions"("p_user_id" "uuid", "p_granted_by" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_default_buyer_permissions"("p_user_id" "uuid", "p_granted_by" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_default_buyer_permissions"("p_user_id" "uuid", "p_granted_by" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_default_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_default_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_default_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_order_delegate"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_order_delegate"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_order_delegate"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_receipt_delegate"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_receipt_delegate"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_receipt_delegate"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_receipt_delegate_by_order_id"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_receipt_delegate_by_order_id"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_receipt_delegate_by_order_id"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_audit_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_audit_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_audit_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."release_stock"("p_product_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."release_stock"("p_product_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_stock"("p_product_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."resubmit_evidence"("p_order_id" "uuid", "p_transfer_number" "text", "p_receipt_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resubmit_evidence"("p_order_id" "uuid", "p_transfer_number" "text", "p_receipt_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resubmit_evidence"("p_order_id" "uuid", "p_transfer_number" "text", "p_receipt_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_seller_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_seller_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_seller_note" "text") TO "service_role";












GRANT SELECT ON TABLE "audit"."logged_actions" TO "authenticated";



GRANT SELECT ON TABLE "audit"."logged_actions_with_user" TO "authenticated";









GRANT ALL ON TABLE "public"."check_in_audit" TO "anon";
GRANT ALL ON TABLE "public"."check_in_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."check_in_audit" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."logged_actions_with_user" TO "anon";
GRANT ALL ON TABLE "public"."logged_actions_with_user" TO "authenticated";
GRANT ALL ON TABLE "public"."logged_actions_with_user" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_settings" TO "anon";
GRANT ALL ON TABLE "public"."payment_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_settings" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."product_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."product_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."product_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."product_templates" TO "anon";
GRANT ALL ON TABLE "public"."product_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."product_templates" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."resource_permissions" TO "anon";
GRANT ALL ON TABLE "public"."resource_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."seller_admins" TO "anon";
GRANT ALL ON TABLE "public"."seller_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_admins" TO "service_role";



GRANT ALL ON TABLE "public"."seller_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."seller_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_transfers" TO "anon";
GRANT ALL ON TABLE "public"."ticket_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- ---------------------------------------------------------------------------
-- Privileges that a schema dump cannot express
-- ---------------------------------------------------------------------------
--
-- pg_dump emits ACLs additively: it assumes a table starts with no privileges
-- and grants what the source had. That assumption does not hold here. Supabase
-- ships `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
-- GRANT ALL ON TABLES TO anon, authenticated`, so every table is created with
-- everything already granted, and an additive dump never takes it away.
--
-- The archived migrations revoked explicitly and were therefore correct. The
-- first cut of this baseline was not: tests/db/exposure-invariants.test.ts
-- failed immediately after the rebuild with anon and authenticated both able
-- to read user_profiles.identity_sub -- the Clerk subject, which correlates
-- every row in the database to one person's identity-provider account.
--
-- These restate the revokes verbatim from the archive. Keep them last: they
-- have to run after the grants above, which is exactly the ordering the
-- squash lost.

revoke select on public.user_profiles from anon, authenticated;
revoke update on public.user_profiles from anon, authenticated;
revoke all on function public.current_user_id() from public;
revoke all on function public.create_profile_with_default_permissions(text, text, text, text) from public, anon, authenticated;

-- Re-grant exactly what the archived migrations left in place. Copied from a
-- dump of the archive-built database rather than written by hand: the first
-- attempt at this list was wrong in two ways a schema diff caught and a human
-- would not have. It dropped UPDATE on the three display_* columns, which is
-- how a user edits their own profile, and it omitted first_seen_at and
-- last_seen_at entirely. identity_sub is absent, which is the whole point.
grant select ("id"), select ("email"), select ("avatar_url"), select ("provider")
  on public.user_profiles to anon, authenticated;
grant select ("display_name"), update ("display_name") on public.user_profiles to anon, authenticated;
grant select ("display_email"), update ("display_email") on public.user_profiles to anon, authenticated;
grant select ("display_avatar_url"), update ("display_avatar_url") on public.user_profiles to anon, authenticated;
grant select ("first_seen_at"), select ("last_seen_at") on public.user_profiles to anon, authenticated;
grant select ("created_at"), select ("updated_at") on public.user_profiles to anon, authenticated;

-- ===========================================================================
-- Seed and storage
-- ===========================================================================
-- `supabase db dump` covers the public schema's structure and nothing else,
-- so squashing through a dump silently dropped two things that the archived
-- migrations did create: the reference rows the application reads at runtime,
-- and the whole storage layer. A fresh database built from the baseline alone
-- came up with an empty permissions table and no receipts bucket. CI caught it
-- (Permission 'products.create' not found in DB); the schema diff could not,
-- because it was comparing structure.
--
-- Everything below was generated from a database built by replaying all 51
-- archived migrations, not written by hand.
--
-- Rows are seeded by natural key and never by id: permissions.id is
-- gen_random_uuid(), and user_permissions rows in a production backup point at
-- the ids that production generated. Hardcoding ids here would leave those
-- references dangling. Every statement is idempotent so re-running a migration
-- or seeding a database that already has rows is a no-op.

insert into public.permissions (key, name_en, name_es, description_en, description_es, depends_on) values
  ('admin.reports', 'Sales Reports', 'Reportes de Ventas', 'View and export the full sales report with all orders and receipts', 'Ver y exportar el reporte completo de ventas con todas las órdenes y recibos', 'orders.read'),
  ('audit.read', 'View Audit Log', 'Ver Registro de Auditoria', 'View audit log', 'Ver registro de auditoria', null),
  ('check_ins.create', 'Check In', 'Registrar Entrada', 'Check in attendees', 'Registrar entrada de asistentes', null),
  ('check_ins.read', 'View Check-ins', 'Ver Check-ins', 'View check-in status', 'Ver estado de check-in', null),
  ('check_ins.update', 'Undo Check-in', 'Deshacer Check-in', 'Undo check-in', 'Deshacer check-in', null),
  ('events.create', 'Create Events', 'Crear Eventos', 'Create events', 'Crear eventos', null),
  ('events.delete', 'Delete Events', 'Eliminar Eventos', 'Delete events', 'Eliminar eventos', null),
  ('events.read', 'View Events', 'Ver Eventos', 'View events', 'Ver eventos', null),
  ('events.update', 'Edit Events', 'Editar Eventos', 'Edit events', 'Editar eventos', null),
  ('orders.approve', 'Approve Orders', 'Aprobar Pedidos', 'Approve purchase orders on behalf of a seller', 'Aprobar pedidos de compra en nombre de un vendedor', null),
  ('orders.create', 'Place Orders', 'Hacer Pedidos', 'Place orders (checkout)', 'Hacer pedidos (checkout)', null),
  ('orders.read', 'View Orders', 'Ver Pedidos', 'View own orders / received orders', 'Ver pedidos propios / recibidos', null),
  ('orders.request_proof', 'Request Proof', 'Solicitar Comprobante', 'Request additional proof before approving an order', 'Solicitar comprobante adicional antes de aprobar un pedido', null),
  ('orders.update', 'Manage Orders', 'Gestionar Pedidos', 'Approve or reject received orders', 'Aprobar o rechazar pedidos recibidos', 'products.create'),
  ('payment_settings.read', 'View Payment Settings', 'Ver Config. de Pagos', 'View timeout settings', 'Ver configuracion de tiempos', null),
  ('payment_settings.update', 'Edit Payment Settings', 'Editar Config. de Pagos', 'Change timeout settings', 'Cambiar configuracion de tiempos', null),
  ('product_reviews.create', 'Write Reviews', 'Escribir Resenas', 'Write product reviews', 'Escribir resenas de producto', 'orders.create'),
  ('product_reviews.delete', 'Delete Reviews', 'Eliminar Resenas', 'Delete own review', 'Eliminar resena propia', null),
  ('product_reviews.read', 'Read Reviews', 'Ver Resenas', 'Read product reviews', 'Ver resenas de producto', null),
  ('product_reviews.update', 'Edit Reviews', 'Editar Resenas', 'Edit own review', 'Editar resena propia', null),
  ('products.create', 'Create Products', 'Crear Productos', 'Create new products in Studio', 'Crear nuevos productos en Studio', null),
  ('products.delete', 'Delete Products', 'Eliminar Productos', 'Delete own products', 'Eliminar productos propios', null),
  ('products.read', 'Read Products', 'Ver Productos', 'Browse and view products', 'Navegar y ver productos', null),
  ('products.update', 'Update Products', 'Editar Productos', 'Edit own products', 'Editar productos propios', null),
  ('receipts.create', 'Upload Receipts', 'Subir Recibos', 'Upload payment receipts', 'Subir recibos de pago', 'orders.create'),
  ('receipts.delete', 'Delete Receipts', 'Eliminar Recibos', 'Delete own receipts', 'Eliminar recibos propios', null),
  ('receipts.read', 'View Receipts', 'Ver Recibos', 'View receipts', 'Ver recibos', null),
  ('reports.export', 'Export Delegated Reports', 'Exportar Reportes Delegados', 'Export the delegated sales report to Excel', 'Exportar el reporte de ventas delegado a Excel', 'reports.read'),
  ('reports.read', 'View Delegated Reports', 'Ver Reportes Delegados', 'View the sales report for delegated products', 'Ver el reporte de ventas de los productos delegados', 'orders.read'),
  ('seller_admins.create', 'Add Delegates', 'Agregar Delegados', 'Add delegated administrators', 'Agregar administradores delegados', null),
  ('seller_admins.delete', 'Remove Delegates', 'Eliminar Delegados', 'Remove delegated administrators', 'Eliminar administradores delegados', null),
  ('seller_admins.read', 'View Delegates', 'Ver Delegados', 'View delegated administrators', 'Ver administradores delegados', null),
  ('seller_admins.update', 'Edit Delegates', 'Editar Delegados', 'Update delegate permissions', 'Actualizar permisos de delegados', null),
  ('seller_payment_methods.create', 'Add Payment Methods', 'Agregar Metodos de Pago', 'Add payment methods', 'Agregar metodos de pago', 'products.create'),
  ('seller_payment_methods.delete', 'Remove Payment Methods', 'Eliminar Metodos de Pago', 'Remove payment methods', 'Eliminar metodos de pago', 'products.create'),
  ('seller_payment_methods.read', 'View Payment Methods', 'Ver Metodos de Pago', 'View own payment methods', 'Ver metodos de pago propios', 'products.create'),
  ('seller_payment_methods.update', 'Edit Payment Methods', 'Editar Metodos de Pago', 'Edit payment methods', 'Editar metodos de pago', 'products.create'),
  ('templates.create', 'Create Templates', 'Crear Plantillas', 'Create product templates', 'Crear plantillas de producto', null),
  ('templates.delete', 'Delete Templates', 'Eliminar Plantillas', 'Delete product templates', 'Eliminar plantillas de producto', null),
  ('templates.read', 'View Templates', 'Ver Plantillas', 'View product templates', 'Ver plantillas de producto', null),
  ('templates.update', 'Edit Templates', 'Editar Plantillas', 'Edit product templates', 'Editar plantillas de producto', null),
  ('user_permissions.create', 'Grant Permissions', 'Otorgar Permisos', 'Grant permissions to users', 'Otorgar permisos a usuarios', null),
  ('user_permissions.delete', 'Revoke Permissions', 'Revocar Permisos', 'Revoke permissions', 'Revocar permisos', null),
  ('user_permissions.read', 'View Permissions', 'Ver Permisos', 'View user permissions', 'Ver permisos de usuarios', null),
  ('user_permissions.update', 'Modify Permissions', 'Modificar Permisos', 'Modify permission grants', 'Modificar concesiones de permisos', null),
  ('users.export', 'Export Users', 'Exportar Usuarios', 'Export selected users and receipt backups', 'Exportar usuarios seleccionados y respaldos de comprobantes', 'user_permissions.read')
on conflict (key) do nothing;

-- One global grant row per permission; that is the whole table (46 of 46 rows
-- are resource_type='global' with a null resource_id). The unique key includes
-- resource_id, and NULL is never equal to NULL in a unique index, so ON
-- CONFLICT cannot dedupe here — hence NOT EXISTS.
insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
  from public.permissions p
 where not exists (
   select 1 from public.resource_permissions rp
    where rp.permission_id = p.id
      and rp.resource_type = 'global'
      and rp.resource_id is null
 );

insert into public.payment_settings (key, value) values
  ('timeout_awaiting_payment_hours', '48'),
  ('timeout_pending_verification_hours', '72'),
  ('timeout_evidence_requested_hours', '24')
on conflict (key) do nothing;

insert into public.product_templates (name_en, name_es, description_en, description_es, sections, sort_order, is_active) values
  ('Art Commission', 'Comision de Arte', 'For custom artwork: pricing tiers, process steps, and terms', 'Para arte personalizado: niveles de precio, pasos del proceso y terminos', '[{"type": "cards", "items": [{"icon": "Palette", "title_en": "Base Package", "title_es": "Paquete Base", "image_url": "", "sort_order": 0, "description_en": "Describe what the buyer gets at the listed price (e.g. single character, flat color, simple bg)", "description_es": "Describe que obtiene el comprador al precio listado (ej. un personaje, color plano, fondo simple)"}, {"icon": "Sparkles", "title_en": "Add-ons", "title_es": "Extras", "image_url": "", "sort_order": 1, "description_en": "List available upgrades and their prices (e.g. extra character +$X, complex bg +$X)", "description_es": "Lista las mejoras disponibles y sus precios (ej. personaje extra +$X, fondo complejo +$X)"}], "name_en": "What You Get", "name_es": "Que Incluye", "sort_order": 0}, {"type": "accordion", "items": [{"icon": "FileText", "title_en": "Placing Your Order", "title_es": "Hacer Tu Pedido", "image_url": "", "sort_order": 0, "description_en": "Explain what references or info the buyer needs to provide (ref sheet, pose ideas, color palette)", "description_es": "Explica que referencias o informacion debe proporcionar el comprador (ref sheet, ideas de pose, paleta de color)"}, {"icon": "Clock", "title_en": "Turnaround Time", "title_es": "Tiempo de Entrega", "image_url": "", "sort_order": 1, "description_en": "State your typical delivery window and how many revision rounds are included", "description_es": "Indica tu tiempo de entrega tipico y cuantas rondas de revision estan incluidas"}, {"icon": "Shield", "title_en": "Terms & Revisions", "title_es": "Terminos y Revisiones", "image_url": "", "sort_order": 2, "description_en": "Clarify your policy on revisions, cancellations, and usage rights for the finished piece", "description_es": "Aclara tu politica de revisiones, cancelaciones y derechos de uso de la pieza terminada"}], "name_en": "How It Works", "name_es": "Como Funciona", "sort_order": 1}]'::jsonb, 1, true),
  ('Fursuit Commission', 'Comision de Fursuit', 'For fursuits and wearables: features, process, and care guide', 'Para fursuits y accesorios: caracteristicas, proceso y guia de cuidado', '[{"type": "cards", "items": [{"icon": "Star", "title_en": "Materials", "title_es": "Materiales", "image_url": "", "sort_order": 0, "description_en": "Describe the fur type, foam, and other materials you use (e.g. NFT fur, EVA foam, resin)", "description_es": "Describe el tipo de pelaje, espuma y otros materiales que usas (ej. pelaje NFT, espuma EVA, resina)"}, {"icon": "Package", "title_en": "Included Parts", "title_es": "Partes Incluidas", "image_url": "", "sort_order": 1, "description_en": "List what comes in this commission (head, paws, tail, bodysuit, etc.)", "description_es": "Lista que incluye esta comision (cabeza, patas, cola, bodysuit, etc.)"}, {"icon": "Brush", "title_en": "Customization", "title_es": "Personalizacion", "image_url": "", "sort_order": 2, "description_en": "Explain what the buyer can customize (eye color, jaw style, LED options, etc.)", "description_es": "Explica que puede personalizar el comprador (color de ojos, tipo de mandibula, opciones LED, etc.)"}], "name_en": "Features & Specs", "name_es": "Caracteristicas", "sort_order": 0}, {"type": "accordion", "items": [{"icon": "Clock", "title_en": "Timeline", "title_es": "Cronograma", "image_url": "", "sort_order": 0, "description_en": "Break down the production stages and estimated duration for each (e.g. sculpt 2w, fur 3w, assembly 1w)", "description_es": "Desglosa las etapas de produccion y duracion estimada de cada una (ej. escultura 2s, pelaje 3s, ensamble 1s)"}, {"icon": "Shield", "title_en": "Payment Plan", "title_es": "Plan de Pago", "image_url": "", "sort_order": 1, "description_en": "Explain your payment structure (e.g. 50% deposit, 50% before shipping)", "description_es": "Explica tu estructura de pago (ej. 50% deposito, 50% antes del envio)"}], "name_en": "Production Process", "name_es": "Proceso de Produccion", "sort_order": 1}, {"type": "two-column", "items": [{"icon": "Wind", "title_en": "Cleaning", "title_es": "Limpieza", "image_url": "", "sort_order": 0, "description_en": "How to clean and maintain the fursuit (spot clean, brush, wash frequency)", "description_es": "Como limpiar y mantener el fursuit (limpieza puntual, cepillado, frecuencia de lavado)"}, {"icon": "Package", "title_en": "Storage", "title_es": "Almacenamiento", "image_url": "", "sort_order": 1, "description_en": "Recommend proper storage conditions (cool/dry, head on stand, tail hanging)", "description_es": "Recomienda condiciones de almacenamiento adecuadas (fresco/seco, cabeza en soporte, cola colgando)"}], "name_en": "Care Guide", "name_es": "Guia de Cuidado", "sort_order": 2}]'::jsonb, 2, true),
  ('Merch Item', 'Articulo de Merch', 'For physical goods: product details, sizing, and shipping info', 'Para productos fisicos: detalles del producto, tallas e informacion de envio', '[{"type": "two-column", "items": [{"icon": "Star", "title_en": "Material & Quality", "title_es": "Material y Calidad", "image_url": "", "sort_order": 0, "description_en": "Describe materials and finish (e.g. 100% cotton, holographic vinyl, resin-cast)", "description_es": "Describe materiales y acabado (ej. 100% algodon, vinilo holografico, resina moldeada)"}, {"icon": "Package", "title_en": "Dimensions", "title_es": "Dimensiones", "image_url": "", "sort_order": 1, "description_en": "List sizes or dimensions (e.g. 2-inch pin, A4 print, S/M/L/XL)", "description_es": "Lista tallas o dimensiones (ej. pin de 5cm, impresion A4, S/M/L/XL)"}, {"icon": "Truck", "title_en": "Shipping", "title_es": "Envio", "image_url": "", "sort_order": 2, "description_en": "Shipping options and estimated delivery times (domestic and international)", "description_es": "Opciones de envio y tiempos de entrega estimados (nacional e internacional)"}], "name_en": "Product Details", "name_es": "Detalles del Producto", "sort_order": 0}, {"type": "accordion", "items": [{"icon": "", "title_en": "Returns & Exchanges", "title_es": "Devoluciones y Cambios", "image_url": "", "sort_order": 0, "description_en": "State your return/exchange policy and conditions", "description_es": "Indica tu politica de devoluciones y cambios y sus condiciones"}, {"icon": "", "title_en": "Care Instructions", "title_es": "Instrucciones de Cuidado", "image_url": "", "sort_order": 1, "description_en": "How to care for the product to keep it in good condition", "description_es": "Como cuidar el producto para mantenerlo en buen estado"}], "name_en": "FAQ", "name_es": "Preguntas Frecuentes", "sort_order": 1}]'::jsonb, 3, true),
  ('Digital Download', 'Descarga Digital', 'For digital products: what is included, file formats, and usage terms', 'Para productos digitales: que incluye, formatos de archivo y terminos de uso', '[{"type": "cards", "items": [{"icon": "Download", "title_en": "File Contents", "title_es": "Contenido del Archivo", "image_url": "", "sort_order": 0, "description_en": "List everything included in the download (number of files, variations, bonus content)", "description_es": "Lista todo lo incluido en la descarga (cantidad de archivos, variaciones, contenido extra)"}, {"icon": "Image", "title_en": "File Formats", "title_es": "Formatos de Archivo", "image_url": "", "sort_order": 1, "description_en": "Specify formats and resolutions (e.g. PNG 4000x4000, PSD layers, PDF)", "description_es": "Especifica formatos y resoluciones (ej. PNG 4000x4000, capas PSD, PDF)"}], "name_en": "What You Get", "name_es": "Que Incluye", "sort_order": 0}, {"type": "accordion", "items": [{"icon": "Heart", "title_en": "Personal Use", "title_es": "Uso Personal", "image_url": "", "sort_order": 0, "description_en": "Explain what the buyer can do with the files for personal use (avatars, prints for self, etc.)", "description_es": "Explica que puede hacer el comprador con los archivos para uso personal (avatares, impresiones propias, etc.)"}, {"icon": "Shield", "title_en": "Commercial Use", "title_es": "Uso Comercial", "image_url": "", "sort_order": 1, "description_en": "State whether commercial use is allowed and any restrictions or additional licensing required", "description_es": "Indica si el uso comercial esta permitido y cualquier restriccion o licencia adicional requerida"}], "name_en": "License & Usage", "name_es": "Licencia y Uso", "sort_order": 1}]'::jsonb, 4, true),
  ('Event Ticket', 'Boleto de Evento', 'For cons, meetups, and live events: highlights, schedule, and venue info', 'Para convenciones, meetups y eventos en vivo: destacados, horario e informacion del lugar', '[{"type": "cards", "items": [{"icon": "Zap", "title_en": "Main Attraction", "title_es": "Atraccion Principal", "image_url": "", "sort_order": 0, "description_en": "Describe the main activity or feature of the event (live drawing, panel, workshop)", "description_es": "Describe la actividad o caracteristica principal del evento (dibujo en vivo, panel, taller)"}, {"icon": "Users", "title_en": "Meet & Greet", "title_es": "Meet & Greet", "image_url": "", "sort_order": 1, "description_en": "Will there be a meet-and-greet? Describe what attendees can expect", "description_es": "Habra un meet-and-greet? Describe que pueden esperar los asistentes"}, {"icon": "Award", "title_en": "Exclusive Items", "title_es": "Articulos Exclusivos", "image_url": "", "sort_order": 2, "description_en": "List any event-exclusive merch, prints, or giveaways available only at this event", "description_es": "Lista cualquier merch, impresiones o regalos exclusivos del evento disponibles solo ahi"}], "name_en": "Event Highlights", "name_es": "Destacados del Evento", "sort_order": 0}, {"type": "two-column", "items": [{"icon": "MapPin", "title_en": "Location", "title_es": "Ubicacion", "image_url": "", "sort_order": 0, "description_en": "Venue name, address, and how to find your booth or table (e.g. Artist Alley, Table A-42)", "description_es": "Nombre del lugar, direccion y como encontrar tu stand o mesa (ej. Artist Alley, Mesa A-42)"}, {"icon": "Clock", "title_en": "Date & Hours", "title_es": "Fecha y Horario", "image_url": "", "sort_order": 1, "description_en": "Event dates and your hours of attendance", "description_es": "Fechas del evento y tus horas de asistencia"}], "name_en": "Venue & Schedule", "name_es": "Lugar y Horario", "sort_order": 1}]'::jsonb, 5, true)
on conflict do nothing;

-- Storage. `supabase db dump` does not emit the storage schema at all, so the
-- receipts bucket and its policies vanished in the squash. Three policies is
-- the correct final count: the archive created six across its history and
-- dropped three of them again.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for DELETE to public
  using (((bucket_id = 'receipts'::text) AND public.has_permission(public.current_user_id(), 'receipts.delete'::text)));
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for SELECT to public
  using (((bucket_id = 'receipts'::text) AND (public.has_permission(public.current_user_id(), 'receipts.read'::text) OR ((name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'::text) AND (public.is_receipt_delegate((split_part(name, '/'::text, 1))::uuid) OR public.is_receipt_delegate_by_order_id((split_part(name, '/'::text, 1))::uuid))))));
drop policy if exists receipts_upload on storage.objects;
create policy receipts_upload on storage.objects for INSERT to public
  with check (((bucket_id = 'receipts'::text) AND public.has_permission(public.current_user_id(), 'receipts.create'::text)));
