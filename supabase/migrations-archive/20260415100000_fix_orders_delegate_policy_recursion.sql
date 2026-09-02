-- =============================================================================
-- Fix: Infinite recursion in orders_delegate_read/update policies
-- =============================================================================
-- The orders_delegate_read policy queries order_items, which has a policy
-- that queries orders — creating a circular RLS dependency.
--
-- Fix: wrap the order_items subquery in a SECURITY DEFINER function so it
-- bypasses RLS and breaks the cycle.
-- =============================================================================

-- Helper: check if the current user is a delegate for any product in an order.
-- SECURITY DEFINER bypasses RLS on order_items, breaking the circular dependency.
create or replace function public.is_order_delegate(p_order_id uuid)
returns boolean
language sql
security definer
stable
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

-- Drop and recreate the delegate policies using the helper function
drop policy if exists "orders_delegate_read"   on public.orders;
drop policy if exists "orders_delegate_update" on public.orders;

create policy "orders_delegate_read" on public.orders
  for select using (
    payment_status in ('pending_verification', 'evidence_requested')
    and public.is_order_delegate(id)
  );

create policy "orders_delegate_update" on public.orders
  for update using (
    payment_status in ('pending_verification', 'evidence_requested')
    and public.is_order_delegate(id)
  );
