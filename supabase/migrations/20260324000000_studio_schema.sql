-- =============================================================================
-- Studio Schema: Product enhancements for seller dashboard
-- =============================================================================
-- Adds category enum, new product columns (JSONB for images/highlights/faq),
-- product_reviews table, write RLS policies, storage bucket, updated_at trigger.
-- See: docs/superpowers/specs/2026-03-24-studio-app-design.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Category Enum
-- -----------------------------------------------------------------------------
create type public.product_category as enum (
  'fursuits', 'merch', 'art', 'events', 'digital', 'deals'
);

-- -----------------------------------------------------------------------------
-- New Columns on products
-- -----------------------------------------------------------------------------
alter table public.products
  add column category public.product_category not null default 'merch',
  add column long_description_en text not null default '',
  add column long_description_es text not null default '',
  add column tagline_en text not null default '',
  add column tagline_es text not null default '',
  add column compare_at_price_cop integer,
  add column compare_at_price_usd integer,
  add column featured boolean not null default false,
  add column tags text[] not null default '{}',
  add column rating numeric(3,2),
  add column review_count integer not null default 0,
  add column images jsonb not null default '[]',
  add column screenshots jsonb not null default '[]',
  add column highlights jsonb not null default '[]',
  add column faq jsonb not null default '[]',
  -- NOTE: type_details is an untyped JSONB column. Validation that its shape
  -- matches the product type (merch/digital/service/ticket) happens at the
  -- application layer via Zod schemas in the studio app, not at the DB level.
  add column type_details jsonb not null default '{}',
  add column updated_at timestamptz not null default now();

-- Rating constraint
alter table public.products
  add constraint products_rating_range check (rating between 1.00 and 5.00);

-- Auto-update updated_at on every UPDATE
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute function trigger_set_updated_at();

-- -----------------------------------------------------------------------------
-- Product Reviews
-- -----------------------------------------------------------------------------
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

alter table public.product_reviews enable row level security;

comment on table public.product_reviews is 'Customer reviews for products. Rating 1-5 with text.';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index idx_products_category on public.products(category);
create index idx_products_featured on public.products(featured) where featured = true;
create index idx_products_updated_at on public.products(updated_at);
create index idx_product_reviews_product_id on public.product_reviews(product_id);

-- -----------------------------------------------------------------------------
-- RLS: Product Write Policies (for Studio app)
-- -----------------------------------------------------------------------------
-- MVP NOTE: These policies intentionally allow ANY authenticated user to write.
-- There is no seller_id column yet — seller ownership and role-based permissions
-- will be enforced once the admin app introduces a sellers/permissions model.
-- Until then, product management is open to all logged-in users.
-- TODO(GH-11): Scope write policies to seller_id when permissions table exists.
create policy "products_auth_insert" on public.products
  for insert with check (auth.role() = 'authenticated');

create policy "products_auth_update" on public.products
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "products_auth_delete" on public.products
  for delete using (auth.role() = 'authenticated');

-- Reviews: public read, authenticated own-write
create policy "reviews_public_read" on public.product_reviews
  for select using (true);

create policy "reviews_own_insert" on public.product_reviews
  for insert with check (auth.uid() = user_id);

create policy "reviews_own_update" on public.product_reviews
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_own_delete" on public.product_reviews
  for delete using (auth.uid() = user_id);

