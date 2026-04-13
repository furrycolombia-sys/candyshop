-- =============================================================================
-- Checkout Orders: Extend orders for multi-seller payment flow
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend payment_status enum
-- ---------------------------------------------------------------------------
alter type public.payment_status add value if not exists 'awaiting_payment';
alter type public.payment_status add value if not exists 'pending_verification';
alter type public.payment_status add value if not exists 'evidence_requested';
alter type public.payment_status add value if not exists 'approved';
alter type public.payment_status add value if not exists 'rejected';
alter type public.payment_status add value if not exists 'expired';

-- ---------------------------------------------------------------------------
-- 2. Add columns to orders table
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists seller_id uuid references auth.users(id),
  add column if not exists payment_method_id uuid references public.seller_payment_methods(id),
  add column if not exists transfer_number text,
  add column if not exists receipt_url text,
  add column if not exists seller_note text,
  add column if not exists expires_at timestamptz,
  add column if not exists checkout_session_id uuid;

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index if not exists orders_seller_id_idx on public.orders(seller_id);
create index if not exists orders_checkout_session_idx on public.orders(checkout_session_id);
create index if not exists orders_user_status_idx on public.orders(user_id, payment_status);
create index if not exists orders_expires_at_idx on public.orders(expires_at) where expires_at is not null;

-- ---------------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------------

-- Sellers can read orders where they are the seller
create policy "orders_seller_read" on public.orders
  for select using (auth.uid() = seller_id);

-- Buyers can insert orders (checkout creates them)
create policy "orders_buyer_insert" on public.orders
  for insert with check (auth.uid() = user_id);

-- Buyers can update their own orders (submit receipt, re-upload)
create policy "orders_buyer_update" on public.orders
  for update using (auth.uid() = user_id);

-- Sellers can update orders they received (approve, reject, request evidence)
create policy "orders_seller_update" on public.orders
  for update using (auth.uid() = seller_id);

-- ---------------------------------------------------------------------------
-- 5. Receipts storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_buyer_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

create policy "receipts_auth_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

create policy "receipts_buyer_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

-- ---------------------------------------------------------------------------
-- 6. Atomic stock reservation RPC
-- ---------------------------------------------------------------------------
create or replace function public.reserve_stock(
  p_product_id uuid,
  p_quantity integer
) returns boolean
language plpgsql
security definer
as $$
declare
  v_max_quantity integer;
begin
  -- Lock the row to prevent race conditions
  select max_quantity into v_max_quantity
  from public.products
  where id = p_product_id
  for update;

  -- Unlimited stock
  if v_max_quantity is null then
    return true;
  end if;

  -- Not enough stock
  if v_max_quantity < p_quantity then
    return false;
  end if;

  -- Reserve
  update public.products
  set max_quantity = max_quantity - p_quantity
  where id = p_product_id;

  return true;
end;
$$;

create or replace function public.release_stock(
  p_product_id uuid,
  p_quantity integer
) returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set max_quantity = max_quantity + p_quantity
  where id = p_product_id
  and max_quantity is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Audit tracking for orders
-- ---------------------------------------------------------------------------
-- Orders and order_items may already have audit triggers from core schema.
-- Use DO block to skip if trigger already exists.
do $$ begin
  perform audit.enable_tracking('public.orders'::regclass);
exception when duplicate_object then null;
end $$;
do $$ begin
  perform audit.enable_tracking('public.order_items'::regclass);
exception when duplicate_object then null;
end $$;
