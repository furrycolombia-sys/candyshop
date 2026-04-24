-- =============================================================================
-- Fix: is_receipt_delegate must handle two storage path prefixes.
--
-- The initial checkout uploads to {checkoutSessionId}/{filename}, so the
-- previous implementation joining on orders.checkout_session_id worked for
-- the first upload. However, the resubmit-evidence flow calls uploadReceipt
-- with orderId as the prefix, producing {orderId}/{filename}. In that case
-- split_part(name,'/',1)::uuid equals the order id, not its checkout session
-- id, causing the join to find nothing and denying delegate access.
--
-- Fix: add `or o.id = p_uuid` so both path patterns are covered.
-- =============================================================================

create or replace function public.is_receipt_delegate(p_uuid uuid)
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
    where o.checkout_session_id = p_uuid
       or o.id = p_uuid
  );
$$;
