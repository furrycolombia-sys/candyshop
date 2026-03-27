-- =============================================================================
-- Payment Methods System
-- =============================================================================
-- Admin catalog of payment method types + seller-specific payment methods
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. payment_method_types — admin-managed catalog
-- ---------------------------------------------------------------------------
create table public.payment_method_types (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  icon text,
  requires_receipt boolean not null default true,
  requires_transfer_number boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_payment_method_types_updated_at
  before update on public.payment_method_types
  for each row execute function trigger_set_updated_at();

create index payment_method_types_sort_order_idx on public.payment_method_types(sort_order);

alter table public.payment_method_types enable row level security;

create policy "Payment types: read all"
  on public.payment_method_types for select using (true);

create policy "Payment types: insert auth"
  on public.payment_method_types for insert
  with check (auth.role() = 'authenticated');

create policy "Payment types: update auth"
  on public.payment_method_types for update
  using (auth.role() = 'authenticated');

create policy "Payment types: delete auth"
  on public.payment_method_types for delete
  using (auth.role() = 'authenticated');

select audit.enable_tracking('public.payment_method_types'::regclass);

-- ---------------------------------------------------------------------------
-- 2. seller_payment_methods — seller picks type + adds details
-- ---------------------------------------------------------------------------
create table public.seller_payment_methods (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  type_id uuid not null references public.payment_method_types(id) on delete cascade,
  account_details_en text,
  account_details_es text,
  seller_note_en text,
  seller_note_es text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_seller_payment_methods_updated_at
  before update on public.seller_payment_methods
  for each row execute function trigger_set_updated_at();

create index seller_payment_methods_seller_idx on public.seller_payment_methods(seller_id, sort_order);

alter table public.seller_payment_methods enable row level security;

create policy "Seller methods: read all"
  on public.seller_payment_methods for select using (true);

create policy "Seller methods: insert own"
  on public.seller_payment_methods for insert
  with check (auth.uid() = seller_id);

create policy "Seller methods: update own"
  on public.seller_payment_methods for update
  using (auth.uid() = seller_id);

create policy "Seller methods: delete own"
  on public.seller_payment_methods for delete
  using (auth.uid() = seller_id);

select audit.enable_tracking('public.seller_payment_methods'::regclass);

-- ---------------------------------------------------------------------------
-- 3. payment_settings — global key-value config
-- ---------------------------------------------------------------------------
create table public.payment_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.payment_settings enable row level security;

create policy "Settings: read all"
  on public.payment_settings for select using (true);

create policy "Settings: write auth"
  on public.payment_settings for insert
  with check (auth.role() = 'authenticated');

create policy "Settings: update auth"
  on public.payment_settings for update
  using (auth.role() = 'authenticated');

select audit.enable_tracking('public.payment_settings'::regclass);

-- ---------------------------------------------------------------------------
-- 4. Seed data
-- ---------------------------------------------------------------------------

-- Default timeout settings
insert into public.payment_settings (key, value) values
  ('timeout_awaiting_payment_hours', '48'),
  ('timeout_pending_verification_hours', '72'),
  ('timeout_evidence_requested_hours', '24');

-- Seed payment method types for Colombian market
insert into public.payment_method_types (name_en, name_es, description_en, description_es, icon, requires_receipt, requires_transfer_number, sort_order) values
  ('Bancolombia Transfer', 'Transferencia Bancolombia', 'Bank transfer via Bancolombia', 'Transferencia bancaria via Bancolombia', 'Building', true, true, 1),
  ('Nequi', 'Nequi', 'Mobile payment via Nequi', 'Pago movil via Nequi', 'Smartphone', true, true, 2),
  ('Daviplata', 'Daviplata', 'Mobile payment via Daviplata', 'Pago movil via Daviplata', 'Smartphone', true, true, 3),
  ('Davivienda Transfer', 'Transferencia Davivienda', 'Bank transfer via Davivienda', 'Transferencia bancaria via Davivienda', 'Building', true, true, 4),
  ('BBVA Transfer', 'Transferencia BBVA', 'Bank transfer via BBVA Colombia', 'Transferencia bancaria via BBVA Colombia', 'Building', true, true, 5),
  ('PayPal', 'PayPal', 'International payment via PayPal', 'Pago internacional via PayPal', 'Globe', true, false, 6),
  ('TuLlave / BREB', 'TuLlave / BREB', 'Bogota transit card top-up as payment', 'Recarga de tarjeta de transporte de Bogota como pago', 'CreditCard', true, true, 7);
