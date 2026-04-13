-- =============================================================================
-- Customizable Payment Methods: Replace fixed-schema payment method system
-- =============================================================================
-- Drops the admin-managed payment_method_types catalog and the old
-- seller_payment_methods table (which referenced it). Creates a new
-- seller_payment_methods table where each seller fully owns their payment
-- method records, including bilingual names, display blocks (JSONB), and
-- form fields (JSONB).
--
-- orders.buyer_info (added in 20260413000000_nequi_buyer_fields.sql) is kept.
-- orders.payment_method_id FK is re-pointed to the new table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop FK on orders that references the old seller_payment_methods table
-- ---------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_payment_method_id_fkey;

-- ---------------------------------------------------------------------------
-- 2. Drop old seller_payment_methods table (and its audit trigger / policies)
-- ---------------------------------------------------------------------------
drop table if exists public.seller_payment_methods cascade;

-- ---------------------------------------------------------------------------
-- 3. Drop old payment_method_types table (and its audit trigger / policies)
-- ---------------------------------------------------------------------------
drop table if exists public.payment_method_types cascade;

-- ---------------------------------------------------------------------------
-- 4. Create new seller_payment_methods table
-- ---------------------------------------------------------------------------
create table public.seller_payment_methods (
  id             uuid        primary key default gen_random_uuid(),
  seller_id      uuid        not null references auth.users(id) on delete cascade,
  name_en        text        not null,
  name_es        text,
  display_blocks jsonb       not null default '[]'::jsonb,
  form_fields    jsonb       not null default '[]'::jsonb,
  is_active      boolean     not null default true,
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------
create index seller_payment_methods_seller_sort_idx
  on public.seller_payment_methods(seller_id, sort_order);

create index seller_payment_methods_seller_active_idx
  on public.seller_payment_methods(seller_id, is_active);

-- ---------------------------------------------------------------------------
-- 6. Auto-update updated_at
-- ---------------------------------------------------------------------------
create trigger set_seller_payment_methods_updated_at
  before update on public.seller_payment_methods
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.seller_payment_methods enable row level security;

-- Sellers: full CRUD on their own rows
create policy "spm_seller_select"
  on public.seller_payment_methods for select
  using (auth.uid() = seller_id);

create policy "spm_seller_insert"
  on public.seller_payment_methods for insert
  with check (auth.uid() = seller_id);

create policy "spm_seller_update"
  on public.seller_payment_methods for update
  using (auth.uid() = seller_id);

create policy "spm_seller_delete"
  on public.seller_payment_methods for delete
  using (auth.uid() = seller_id);

-- Buyers (unauthenticated or authenticated): read active rows for a given seller.
-- This policy is intentionally permissive for SELECT so the checkout API (which
-- uses the service role) and any authenticated buyer can read active methods.
-- The checkout API route further filters by seller_id in the query.
create policy "spm_buyer_select_active"
  on public.seller_payment_methods for select
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- 8. Audit tracking
-- ---------------------------------------------------------------------------
select audit.enable_tracking('public.seller_payment_methods'::regclass);

-- ---------------------------------------------------------------------------
-- 9. Re-add FK on orders pointing to the new table
-- ---------------------------------------------------------------------------
alter table public.orders
  add constraint orders_payment_method_id_fkey
  foreign key (payment_method_id)
  references public.seller_payment_methods(id)
  on delete set null;
