-- =============================================================================
-- Core Schema: Candy Shop MVP
-- =============================================================================
-- Events, products, orders, check-ins, permissions, transfers
-- See: docs/superpowers/specs/2026-03-18-candy-shop-mvp-design.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Events
-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_es text not null,
  description_en text not null default '',
  description_es text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_capacity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.events is 'Event definitions (conventions, meetups, etc.)';

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create type public.product_type as enum ('ticket', 'merch', 'digital', 'service');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  slug text not null unique,
  name_en text not null,
  name_es text not null,
  description_en text not null default '',
  description_es text not null default '',
  type public.product_type not null,
  price_cop integer not null,
  price_usd integer not null default 0,
  max_quantity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.products is 'Generic product catalog (tickets, merch, digital goods, services)';

-- -----------------------------------------------------------------------------
-- Product Entitlements
-- -----------------------------------------------------------------------------
create type public.entitlement_type as enum ('transport', 'entry', 'meal', 'merch', 'party', 'other');

create table public.product_entitlements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_en text not null,
  name_es text not null,
  type public.entitlement_type not null default 'other',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.product_entitlements is 'What a product includes (bus, meals, entry, merch pickup, etc.)';

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create type public.payment_status as enum ('pending', 'paid');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text,
  payment_status public.payment_status not null default 'pending',
  total_cop integer not null,
  created_at timestamptz not null default now()
);

comment on table public.orders is 'User purchases with Stripe payment tracking';

-- -----------------------------------------------------------------------------
-- Order Items
-- -----------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  unit_price_cop integer not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.order_items is 'Products in an order. metadata holds event-specific data (reservation_code, room_type)';

-- -----------------------------------------------------------------------------
-- Check-ins
-- -----------------------------------------------------------------------------
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  entitlement_id uuid not null references public.product_entitlements(id) on delete cascade,
  qr_code text not null unique default encode(gen_random_bytes(16), 'hex'),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (order_item_id, entitlement_id)
);

comment on table public.check_ins is 'One row per entitlement per order item. Each has its own QR code.';

-- -----------------------------------------------------------------------------
-- Check-in Audit (immutable, append-only)
-- -----------------------------------------------------------------------------
create type public.audit_action as enum ('check-in', 'uncheck', 'transfer');

create table public.check_in_audit (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  action public.audit_action not null,
  performed_by uuid not null references auth.users(id),
  reason text,
  ip_address text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.check_in_audit is 'Immutable append-only log. Never update or delete rows.';

-- Prevent UPDATE and DELETE on audit table
create or replace function prevent_audit_mutation()
returns trigger as $$
begin
  raise exception 'check_in_audit is immutable: % operations are not allowed', TG_OP;
end;
$$ language plpgsql;

create trigger check_in_audit_no_update
  before update on public.check_in_audit
  for each row execute function prevent_audit_mutation();

create trigger check_in_audit_no_delete
  before delete on public.check_in_audit
  for each row execute function prevent_audit_mutation();

-- -----------------------------------------------------------------------------
-- Ticket Transfers
-- -----------------------------------------------------------------------------
create type public.transfer_status as enum ('pending', 'claimed', 'expired');

create table public.ticket_transfers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  transfer_token text not null unique default encode(gen_random_bytes(20), 'hex'),
  from_user_id uuid not null references auth.users(id),
  to_user_id uuid references auth.users(id),
  status public.transfer_status not null default 'pending',
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

comment on table public.ticket_transfers is 'Transfer links for gifting tickets. QR codes regenerate on claim.';

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_en text not null,
  name_es text not null,
  description_en text not null default '',
  description_es text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.permissions is 'First-class permission definitions (check-in, uncheck, manage, etc.)';

create table public.resource_permissions (
  id uuid primary key default gen_random_uuid(),
  permission_id uuid not null references public.permissions(id) on delete cascade,
  resource_type text not null,
  resource_id uuid,
  created_at timestamptz not null default now(),
  unique (permission_id, resource_type, resource_id)
);

comment on table public.resource_permissions is 'Scopes a permission to a resource type and optional specific instance';

create type public.permission_mode as enum ('grant', 'deny');

create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_permission_id uuid not null references public.resource_permissions(id) on delete cascade,
  mode public.permission_mode not null default 'grant',
  reason text,
  granted_by uuid not null references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, resource_permission_id)
);

comment on table public.user_permissions is 'Links users to resource permissions with grant/deny mode';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index idx_products_event_id on public.products(event_id);
create index idx_products_type on public.products(type);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_payment_status on public.orders(payment_status);
create index idx_check_ins_order_item_id on public.check_ins(order_item_id);
create index idx_check_ins_qr_code on public.check_ins(qr_code);
create index idx_check_in_audit_check_in_id on public.check_in_audit(check_in_id);
create index idx_ticket_transfers_token on public.ticket_transfers(transfer_token);
create index idx_ticket_transfers_order_item on public.ticket_transfers(order_item_id);
create index idx_user_permissions_user_id on public.user_permissions(user_id);
create index idx_resource_permissions_type on public.resource_permissions(resource_type, resource_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.products enable row level security;
alter table public.product_entitlements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.check_ins enable row level security;
alter table public.check_in_audit enable row level security;
alter table public.ticket_transfers enable row level security;
alter table public.permissions enable row level security;
alter table public.resource_permissions enable row level security;
alter table public.user_permissions enable row level security;

-- Public read access for events, products, entitlements, permissions
create policy "events_public_read" on public.events for select using (true);
create policy "products_public_read" on public.products for select using (true);
create policy "entitlements_public_read" on public.product_entitlements for select using (true);
create policy "permissions_public_read" on public.permissions for select using (true);
create policy "resource_permissions_public_read" on public.resource_permissions for select using (true);

-- Users can read their own orders and items
create policy "orders_own_read" on public.orders for select using (auth.uid() = user_id);
create policy "order_items_own_read" on public.order_items for select
  using (order_id in (select id from public.orders where user_id = auth.uid()));

-- Users can read their own check-ins
create policy "check_ins_own_read" on public.check_ins for select
  using (order_item_id in (
    select oi.id from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.user_id = auth.uid()
  ));

-- Users can read their own permissions
create policy "user_permissions_own_read" on public.user_permissions for select
  using (user_id = auth.uid());

-- Users can read their own transfers
create policy "transfers_own_read" on public.ticket_transfers for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- Audit log: readable by users with audit-view permission (handled via service role for now)
create policy "audit_service_read" on public.check_in_audit for select using (true);

-- Service role bypasses RLS for webhook/admin operations
