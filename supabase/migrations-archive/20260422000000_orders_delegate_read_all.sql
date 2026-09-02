-- =============================================================================
-- Allow delegates to read ALL orders from sellers they manage, not only
-- actionable ones. Tighten the update policy to require at least one
-- management permission (orders.approve OR orders.request_proof).
-- =============================================================================

-- Read: no status filter — delegates can see full order history
drop policy if exists "orders_delegate_read" on public.orders;

create policy "orders_delegate_read" on public.orders
  for select using (
    exists (
      select 1 from public.seller_admins sa
      where sa.admin_user_id = auth.uid()
        and sa.seller_id = orders.seller_id
    )
  );

-- Update: still limited to actionable statuses, but now also requires
-- the delegate to hold orders.approve or orders.request_proof
drop policy if exists "orders_delegate_update" on public.orders;

create policy "orders_delegate_update" on public.orders
  for update using (
    payment_status in ('pending_verification', 'evidence_requested')
    and exists (
      select 1 from public.seller_admins sa
      where sa.admin_user_id = auth.uid()
        and sa.seller_id = orders.seller_id
        and (
          'orders.approve'       = any(sa.permissions)
          or 'orders.request_proof' = any(sa.permissions)
        )
    )
  );
