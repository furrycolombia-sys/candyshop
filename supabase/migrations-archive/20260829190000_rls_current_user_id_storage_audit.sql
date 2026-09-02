-- =============================================================================
-- Finish the auth.uid() -> current_user_id() sweep: storage and audit schemas
-- =============================================================================
-- 20260829130000_rls_current_user_id.sql was generated with
-- `where schemaname = 'public'`, so it never touched storage.objects or
-- audit.logged_actions, and never touched the SECURITY DEFINER functions that
-- back the receipt/order delegate checks. Under Third-Party Auth, auth.uid()
-- does not return NULL for a Clerk sub — it raises 22P02 (invalid input syntax
-- for type uuid), so every signed-in caller reading storage.objects for
-- receipts, or reading the audit log, errors out.
--
-- This migration ports the remaining auth.uid() call sites to
-- public.current_user_id(), preserving every predicate exactly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Functions (SECURITY DEFINER, SET search_path TO '' — references must stay
-- fully qualified)
-- ---------------------------------------------------------------------------

create or replace function public.is_receipt_delegate(p_session_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.orders o
    join public.seller_admins sa
      on sa.admin_user_id = public.current_user_id()
      and sa.seller_id = o.seller_id
    where o.checkout_session_id = p_session_id
  );
$function$;

create or replace function public.is_receipt_delegate_by_order_id(p_order_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.orders o
    join public.seller_admins sa
      on sa.admin_user_id = public.current_user_id()
      and sa.seller_id = o.seller_id
    where o.id = p_order_id
  );
$function$;

create or replace function public.is_order_delegate(p_order_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
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
$function$;

-- ---------------------------------------------------------------------------
-- storage.objects policies (receipts bucket)
-- ---------------------------------------------------------------------------

drop policy if exists receipts_upload on storage.objects;
create policy receipts_upload on storage.objects for INSERT to public
  with check ((bucket_id = 'receipts'::text) AND has_permission(public.current_user_id(), 'receipts.create'::text));

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for DELETE to public
  using ((bucket_id = 'receipts'::text) AND has_permission(public.current_user_id(), 'receipts.delete'::text));

drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for SELECT to public
  using ((bucket_id = 'receipts'::text) AND (has_permission(public.current_user_id(), 'receipts.read'::text) OR ((name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'::text) AND (is_receipt_delegate((split_part(name, '/'::text, 1))::uuid) OR is_receipt_delegate_by_order_id((split_part(name, '/'::text, 1))::uuid)))));

-- ---------------------------------------------------------------------------
-- audit.logged_actions policy
-- ---------------------------------------------------------------------------

drop policy if exists audit_read on audit.logged_actions;
create policy audit_read on audit.logged_actions for SELECT to public
  using (has_permission(public.current_user_id(), 'audit.read'::text));
