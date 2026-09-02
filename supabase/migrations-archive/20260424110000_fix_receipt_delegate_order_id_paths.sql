-- =============================================================================
-- Fix: Receipts uploaded before the checkoutSessionId path migration were
-- stored under {orderId}/{filename}. The receipts_read policy only checked
-- is_receipt_delegate (which looks up by checkout_session_id), so delegates
-- could not view those older receipts even though the seller could.
--
-- Fix: add is_receipt_delegate_by_order_id(orderId) that looks up the order
-- directly by its primary key, then checks the caller is a seller_admin for
-- that seller. Update receipts_read to accept either path format.
-- =============================================================================

-- Helper: check if the current user is a delegate for the order identified
-- by its primary key (the first path segment of old-format receipt paths).
-- SECURITY DEFINER bypasses RLS on orders/seller_admins.
create or replace function public.is_receipt_delegate_by_order_id(p_order_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.seller_admins sa
      on sa.admin_user_id = auth.uid()
      and sa.seller_id = o.seller_id
    where o.id = p_order_id
  );
$$;

-- Replace receipts_read to handle both storage path formats:
--   new format: {checkoutSessionId}/{filename}  → resolved by is_receipt_delegate
--   old format: {orderId}/{filename}             → resolved by is_receipt_delegate_by_order_id
drop policy if exists "receipts_read" on storage.objects;

create policy "receipts_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (
      -- Sellers and users with explicit receipts.read permission
      public.has_permission(auth.uid(), 'receipts.read')
      or (
        -- Delegates: path must start with a valid UUID
        name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        and (
          -- New format: UUID is the checkout_session_id
          public.is_receipt_delegate(split_part(name, '/', 1)::uuid)
          or
          -- Old format: UUID is the order id
          public.is_receipt_delegate_by_order_id(split_part(name, '/', 1)::uuid)
        )
      )
    )
  );
