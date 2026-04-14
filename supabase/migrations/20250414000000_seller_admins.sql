-- =============================================================================
-- Seller Admin Delegation
-- =============================================================================
-- 1. Create seller_admins table with FK, CHECK, and UNIQUE constraints
-- 2. Enable RLS with policies for SELECT (seller or delegate), INSERT/UPDATE/DELETE (seller only)
-- 3. Insert new permission keys into permissions table
-- 4. Insert corresponding global resource_permissions rows
-- 5. Add updated_at trigger
-- =============================================================================

-- =============================================================================
-- 1. Create seller_admins table
-- =============================================================================

create table public.seller_admins (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.user_profiles(id) on delete cascade,
  admin_user_id uuid not null references public.user_profiles(id) on delete cascade,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A seller cannot delegate to themselves
  constraint seller_admins_no_self_delegation check (seller_id <> admin_user_id),

  -- One delegation row per seller-delegate pair
  constraint seller_admins_seller_admin_unique unique (seller_id, admin_user_id)
);

comment on table public.seller_admins is 'Links sellers to delegated administrators with scoped permissions';

-- Indexes for common query patterns
create index idx_seller_admins_seller_id on public.seller_admins(seller_id);
create index idx_seller_admins_admin_user_id on public.seller_admins(admin_user_id);

-- =============================================================================
-- 2. Row Level Security
-- =============================================================================

alter table public.seller_admins enable row level security;

-- Seller or delegate can read their shared delegation rows
create policy "seller_admins_select" on public.seller_admins
  for select using (
    auth.uid() = seller_id or auth.uid() = admin_user_id
  );

-- Only the seller can create delegation rows (must be their own seller_id)
create policy "seller_admins_insert" on public.seller_admins
  for insert with check (
    auth.uid() = seller_id
  );

-- Only the seller can update delegation rows
create policy "seller_admins_update" on public.seller_admins
  for update using (
    auth.uid() = seller_id
  );

-- Only the seller can delete delegation rows
create policy "seller_admins_delete" on public.seller_admins
  for delete using (
    auth.uid() = seller_id
  );

-- =============================================================================
-- 3. Insert new permission keys
-- =============================================================================

insert into public.permissions (
  key,
  name_en,
  name_es,
  description_en,
  description_es,
  depends_on
) values
  ('seller_admins.create', 'Add Delegates', 'Agregar Delegados', 'Add delegated administrators', 'Agregar administradores delegados', null),
  ('seller_admins.read', 'View Delegates', 'Ver Delegados', 'View delegated administrators', 'Ver administradores delegados', null),
  ('seller_admins.update', 'Edit Delegates', 'Editar Delegados', 'Update delegate permissions', 'Actualizar permisos de delegados', null),
  ('seller_admins.delete', 'Remove Delegates', 'Eliminar Delegados', 'Remove delegated administrators', 'Eliminar administradores delegados', null),
  ('orders.approve', 'Approve Orders', 'Aprobar Pedidos', 'Approve purchase orders on behalf of a seller', 'Aprobar pedidos de compra en nombre de un vendedor', null),
  ('orders.request_proof', 'Request Proof', 'Solicitar Comprobante', 'Request additional proof before approving an order', 'Solicitar comprobante adicional antes de aprobar un pedido', null)
on conflict (key) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  depends_on = excluded.depends_on;

-- =============================================================================
-- 4. Insert global resource_permissions for each new key
-- =============================================================================

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in (
  'seller_admins.create',
  'seller_admins.read',
  'seller_admins.update',
  'seller_admins.delete',
  'orders.approve',
  'orders.request_proof'
)
on conflict (permission_id, resource_type, resource_id) do nothing;

-- =============================================================================
-- 5. Auto-update updated_at (reuse existing trigger function)
-- =============================================================================

create trigger set_seller_admins_updated_at
  before update on public.seller_admins
  for each row execute function trigger_set_updated_at();
