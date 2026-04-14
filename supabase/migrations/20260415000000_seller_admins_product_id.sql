-- =============================================================================
-- Seller Admins: Add product_id for Per-Product Delegation
-- =============================================================================
-- 1. Add product_id column referencing products(id)
-- 2. Drop old UNIQUE constraint (seller_id, admin_user_id)
-- 3. Create new UNIQUE constraint (seller_id, admin_user_id, product_id)
-- 4. Add index on product_id
-- 5. Update RLS policies to include product_id awareness
-- 6. Update order delegate policies to join through order_items
-- =============================================================================

-- =============================================================================
-- 1. Add product_id column
-- =============================================================================

alter table public.seller_admins
  add column product_id uuid not null references public.products(id) on delete cascade;

-- =============================================================================
-- 2. Drop old UNIQUE constraint and create new one
-- =============================================================================

alter table public.seller_admins
  drop constraint seller_admins_seller_admin_unique;

alter table public.seller_admins
  add constraint seller_admins_seller_admin_product_unique
    unique (seller_id, admin_user_id, product_id);

-- =============================================================================
-- 3. Add index on product_id
-- =============================================================================

create index idx_seller_admins_product_id on public.seller_admins(product_id);

-- =============================================================================
-- 4. Update RLS policies to include product_id awareness
-- =============================================================================

-- Drop existing policies
drop policy if exists "seller_admins_select" on public.seller_admins;
drop policy if exists "seller_admins_insert" on public.seller_admins;
drop policy if exists "seller_admins_update" on public.seller_admins;
drop policy if exists "seller_admins_delete" on public.seller_admins;

-- Seller or delegate can read their shared delegation rows
-- product_id is included so delegates only see rows for products they are assigned to
create policy "seller_admins_select" on public.seller_admins
  for select using (
    auth.uid() = seller_id
    or (
      auth.uid() = admin_user_id
      and product_id in (
        select id from public.products where seller_id = seller_admins.seller_id
      )
    )
  );

-- Only the seller can create delegation rows (must be their own seller_id)
-- product_id must reference a product owned by the seller
create policy "seller_admins_insert" on public.seller_admins
  for insert with check (
    auth.uid() = seller_id
    and product_id in (
      select id from public.products where seller_id = auth.uid()
    )
  );

-- Only the seller can update delegation rows
-- product_id must still reference a product owned by the seller
create policy "seller_admins_update" on public.seller_admins
  for update using (
    auth.uid() = seller_id
  ) with check (
    auth.uid() = seller_id
    and product_id in (
      select id from public.products where seller_id = auth.uid()
    )
  );

-- Only the seller can delete delegation rows
create policy "seller_admins_delete" on public.seller_admins
  for delete using (
    auth.uid() = seller_id
  );

-- =============================================================================
-- 5. Update order delegate policies to join through order_items
-- =============================================================================

-- Drop existing order delegate policies
drop policy if exists "orders_delegate_read" on public.orders;
drop policy if exists "orders_delegate_update" on public.orders;

-- Delegates can read ONLY actionable orders that contain items for their delegated products
create policy "orders_delegate_read" on public.orders
  for select using (
    payment_status in ('pending_verification', 'evidence_requested')
    and exists (
      select 1
      from public.order_items oi
      join public.seller_admins sa
        on sa.admin_user_id = auth.uid()
        and sa.seller_id = orders.seller_id
        and sa.product_id = oi.product_id
      where oi.order_id = orders.id
    )
  );

-- Delegates can update ONLY actionable orders that contain items for their delegated products
create policy "orders_delegate_update" on public.orders
  for update using (
    payment_status in ('pending_verification', 'evidence_requested')
    and exists (
      select 1
      from public.order_items oi
      join public.seller_admins sa
        on sa.admin_user_id = auth.uid()
        and sa.seller_id = orders.seller_id
        and sa.product_id = oi.product_id
      where oi.order_id = orders.id
    )
  );
