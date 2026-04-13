-- =============================================================================
-- Add seller_id to products for ownership scoping
-- =============================================================================

alter table public.products
  add column seller_id uuid references auth.users(id) on delete set null;

-- Backfill: assign all existing products to the first user (dev seed)
update public.products
set seller_id = (select id from auth.users limit 1)
where seller_id is null;

-- Index for efficient seller-scoped queries
create index idx_products_seller_id on public.products(seller_id);

-- RLS: sellers can only update/delete their own products
drop policy if exists "Products: update own" on public.products;
create policy "Products: update own"
  on public.products for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Products: delete own" on public.products;
create policy "Products: delete own"
  on public.products for delete
  using (auth.uid() = seller_id);

drop policy if exists "Products: insert own" on public.products;
create policy "Products: insert own"
  on public.products for insert
  with check (auth.uid() = seller_id);
