-- =============================================================================
-- Fix: Delegate receipt access was broken because the receipt storage path
-- uses {checkoutSessionId}/{filename} as the prefix, not {orderId}/{filename}.
--
-- The previous receipts_read policy called is_order_delegate() with the path
-- prefix, treating it as an orderId — but that lookup always failed because
-- the orders table has no row with id = checkoutSessionId.
--
-- Fix: add is_receipt_delegate(checkoutSessionId) that looks up the order via
-- checkout_session_id, then checks the caller is a seller_admin for that seller.
-- =============================================================================

-- Helper: check if the current user is a delegate for the order identified by
-- its checkout_session_id (the first path segment of the receipt storage path).
-- SECURITY DEFINER bypasses RLS on orders/seller_admins.
create or replace function public.is_receipt_delegate(p_session_id uuid)
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
    where o.checkout_session_id = p_session_id
  );
$$;

-- Replace the broken receipts_read policy
drop policy if exists "receipts_read" on storage.objects;

create policy "receipts_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (
      -- Sellers and users with explicit receipts.read permission
      public.has_permission(auth.uid(), 'receipts.read')
      or (
        -- Delegates: path must start with a valid UUID (the checkoutSessionId)
        name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        and public.is_receipt_delegate(split_part(name, '/', 1)::uuid)
      )
    )
  );
