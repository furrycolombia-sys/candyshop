-- Fix: Allow buyers to insert order items for their own orders.
-- The checkout flow creates orders first, then inserts order items.
-- Without this policy, the order_items insert fails with RLS violation.

create policy "order_items_buyer_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );
