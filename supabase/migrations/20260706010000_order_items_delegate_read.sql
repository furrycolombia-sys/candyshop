-- =============================================================================
-- Allow delegates to read order_items for the products delegated to them.
--
-- Context: the existing `order_items_read` policy only grants read to the order's
-- buyer (o.user_id) or seller (o.seller_id). A delegate (seller_admins.admin_user_id)
-- is neither, so the delegated sales report — which reads order_items via the
-- client under RLS — received every order with zero line items and rendered as
-- empty. The owner report avoids this only because it runs through a service-role
-- route that bypasses RLS.
--
-- This policy is product-scoped (sa.product_id = order_items.product_id) so a
-- delegate can read ONLY the line items for products a seller delegated to them,
-- matching the per-product delegation model. It is additive (SELECT-only) and
-- does not alter the existing buyer/seller read policy.
-- =============================================================================

drop policy if exists "order_items_delegate_read" on public.order_items;

create policy "order_items_delegate_read" on public.order_items
  for select using (
    exists (
      select 1
      from public.orders o
      join public.seller_admins sa
        on sa.seller_id = o.seller_id
        and sa.admin_user_id = auth.uid()
        and sa.product_id = order_items.product_id
      where o.id = order_items.order_id
    )
  );
