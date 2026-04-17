-- =============================================================================
-- CRUD Permissions: Granular permission model with has_permission() helper
-- =============================================================================
-- 1. Add depends_on column to permissions table
-- 2. Create has_permission() function
-- 3. Seed 43 permission keys + global resource_permissions
-- 4. Drop ALL existing RLS policies and recreate with has_permission() checks
-- 5. Bootstrap: grant all permissions to existing users (dev environment)
-- See: docs/superpowers/specs/2026-03-28-permissions-model-design.md
-- =============================================================================

-- =============================================================================
-- 1. Schema changes
-- =============================================================================

alter table public.permissions
  add column if not exists depends_on text;

-- =============================================================================
-- 2. has_permission() function
-- =============================================================================

create or replace function public.has_permission(
  p_user_id uuid,
  p_permission_key text
) returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'grant'
      and (up.expires_at is null or up.expires_at > now())
  )
  and not exists (
    select 1 from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'deny'
      and (up.expires_at is null or up.expires_at > now())
  );
$$;

-- =============================================================================
-- 3. Seed 43 permission keys
-- =============================================================================

-- Upsert permissions (old seed had view, purchase, check-in, uncheck, audit-view, manage)
insert into public.permissions (key, name_en, name_es, description_en, description_es, depends_on) values
  -- Products & Commerce
  ('products.create',          'Create Products',          'Crear Productos',             'Create new products in Studio',                'Crear nuevos productos en Studio',               null),
  ('products.read',            'Read Products',            'Ver Productos',               'Browse and view products',                     'Navegar y ver productos',                         null),
  ('products.update',          'Update Products',          'Editar Productos',            'Edit own products',                            'Editar productos propios',                        null),
  ('products.delete',          'Delete Products',          'Eliminar Productos',          'Delete own products',                          'Eliminar productos propios',                      null),
  ('product_reviews.create',   'Write Reviews',            'Escribir Resenas',            'Write product reviews',                        'Escribir resenas de producto',                    'orders.create'),
  ('product_reviews.read',     'Read Reviews',             'Ver Resenas',                 'Read product reviews',                         'Ver resenas de producto',                         null),
  ('product_reviews.update',   'Edit Reviews',             'Editar Resenas',              'Edit own review',                              'Editar resena propia',                            null),
  ('product_reviews.delete',   'Delete Reviews',           'Eliminar Resenas',            'Delete own review',                            'Eliminar resena propia',                          null),
  -- Orders & Payments
  ('orders.create',            'Place Orders',             'Hacer Pedidos',               'Place orders (checkout)',                       'Hacer pedidos (checkout)',                         null),
  ('orders.read',              'View Orders',              'Ver Pedidos',                 'View own orders / received orders',             'Ver pedidos propios / recibidos',                 null),
  ('orders.update',            'Manage Orders',            'Gestionar Pedidos',           'Approve/reject orders',                        'Aprobar/rechazar pedidos',                        'products.create'),
  ('receipts.create',          'Upload Receipts',          'Subir Recibos',               'Upload payment receipts',                      'Subir recibos de pago',                           'orders.create'),
  ('receipts.read',            'View Receipts',            'Ver Recibos',                 'View receipts',                                'Ver recibos',                                     null),
  ('receipts.delete',          'Delete Receipts',          'Eliminar Recibos',            'Delete own receipts',                          'Eliminar recibos propios',                        null),
  -- Seller Configuration
  ('seller_payment_methods.create', 'Add Payment Methods',     'Agregar Metodos de Pago',     'Add payment methods',                     'Agregar metodos de pago',                         'products.create'),
  ('seller_payment_methods.read',   'View Payment Methods',    'Ver Metodos de Pago',         'View own payment methods',                'Ver metodos de pago propios',                     'products.create'),
  ('seller_payment_methods.update', 'Edit Payment Methods',    'Editar Metodos de Pago',      'Edit payment methods',                    'Editar metodos de pago',                          'products.create'),
  ('seller_payment_methods.delete', 'Remove Payment Methods',  'Eliminar Metodos de Pago',    'Remove payment methods',                  'Eliminar metodos de pago',                        'products.create'),
  -- Admin: Platform Configuration
  ('payment_method_types.create',   'Create Payment Types',    'Crear Tipos de Pago',         'Create payment type catalog entries',      'Crear entradas en catalogo de tipos de pago',     null),
  ('payment_method_types.read',     'View Payment Types',      'Ver Tipos de Pago',           'View payment types',                      'Ver tipos de pago',                               null),
  ('payment_method_types.update',   'Edit Payment Types',      'Editar Tipos de Pago',        'Edit payment types',                      'Editar tipos de pago',                            null),
  ('payment_method_types.delete',   'Delete Payment Types',    'Eliminar Tipos de Pago',      'Delete payment types',                    'Eliminar tipos de pago',                          null),
  ('payment_settings.read',         'View Payment Settings',   'Ver Config. de Pagos',        'View timeout settings',                   'Ver configuracion de tiempos',                    null),
  ('payment_settings.update',       'Edit Payment Settings',   'Editar Config. de Pagos',     'Change timeout settings',                 'Cambiar configuracion de tiempos',                null),
  ('templates.create',              'Create Templates',        'Crear Plantillas',            'Create product templates',                'Crear plantillas de producto',                    null),
  ('templates.read',                'View Templates',          'Ver Plantillas',              'View product templates',                  'Ver plantillas de producto',                      null),
  ('templates.update',              'Edit Templates',          'Editar Plantillas',           'Edit product templates',                  'Editar plantillas de producto',                   null),
  ('templates.delete',              'Delete Templates',        'Eliminar Plantillas',         'Delete product templates',                'Eliminar plantillas de producto',                 null),
  -- Admin: User & Audit Management
  ('audit.read',                    'View Audit Log',          'Ver Registro de Auditoria',   'View audit log',                          'Ver registro de auditoria',                       null),
  ('user_permissions.create',       'Grant Permissions',       'Otorgar Permisos',            'Grant permissions to users',              'Otorgar permisos a usuarios',                     null),
  ('user_permissions.read',         'View Permissions',        'Ver Permisos',                'View user permissions',                   'Ver permisos de usuarios',                        null),
  ('user_permissions.update',       'Modify Permissions',      'Modificar Permisos',          'Modify permission grants',                'Modificar concesiones de permisos',               null),
  ('user_permissions.delete',       'Revoke Permissions',      'Revocar Permisos',            'Revoke permissions',                      'Revocar permisos',                                null),
  -- Events & Check-ins
  ('events.create',                 'Create Events',           'Crear Eventos',               'Create events',                           'Crear eventos',                                   null),
  ('events.read',                   'View Events',             'Ver Eventos',                 'View events',                             'Ver eventos',                                     null),
  ('events.update',                 'Edit Events',             'Editar Eventos',              'Edit events',                             'Editar eventos',                                  null),
  ('events.delete',                 'Delete Events',           'Eliminar Eventos',            'Delete events',                           'Eliminar eventos',                                null),
  ('check_ins.create',              'Check In',                'Registrar Entrada',           'Check in attendees',                      'Registrar entrada de asistentes',                 null),
  ('check_ins.read',                'View Check-ins',          'Ver Check-ins',               'View check-in status',                    'Ver estado de check-in',                          null),
  ('check_ins.update',              'Undo Check-in',           'Deshacer Check-in',           'Undo check-in',                           'Deshacer check-in',                               null)
on conflict (key) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  depends_on = excluded.depends_on;

-- Create global resource_permissions for each permission key
insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in (
  'products.create', 'products.read', 'products.update', 'products.delete',
  'product_reviews.create', 'product_reviews.read', 'product_reviews.update', 'product_reviews.delete',
  'orders.create', 'orders.read', 'orders.update',
  'receipts.create', 'receipts.read', 'receipts.delete',
  'check_ins.create', 'check_ins.read', 'check_ins.update',
  'seller_payment_methods.create', 'seller_payment_methods.read', 'seller_payment_methods.update', 'seller_payment_methods.delete',
  'payment_method_types.create', 'payment_method_types.read', 'payment_method_types.update', 'payment_method_types.delete',
  'payment_settings.read', 'payment_settings.update',
  'templates.create', 'templates.read', 'templates.update', 'templates.delete',
  'audit.read',
  'user_permissions.create', 'user_permissions.read', 'user_permissions.update', 'user_permissions.delete',
  'events.create', 'events.read', 'events.update', 'events.delete'
)
on conflict (permission_id, resource_type, resource_id) do nothing;

-- =============================================================================
-- 4. Drop ALL existing RLS policies
-- =============================================================================

-- ---- core_schema.sql policies ----
drop policy if exists "events_public_read"                  on public.events;
drop policy if exists "products_public_read"                on public.products;
drop policy if exists "entitlements_public_read"             on public.product_entitlements;
drop policy if exists "permissions_public_read"              on public.permissions;
drop policy if exists "resource_permissions_public_read"     on public.resource_permissions;
drop policy if exists "orders_own_read"                      on public.orders;
drop policy if exists "order_items_own_read"                 on public.order_items;
drop policy if exists "check_ins_own_read"                   on public.check_ins;
drop policy if exists "user_permissions_own_read"            on public.user_permissions;
drop policy if exists "transfers_own_read"                   on public.ticket_transfers;
drop policy if exists "audit_service_read"                   on public.check_in_audit;

-- ---- studio_schema.sql policies ----
drop policy if exists "products_auth_insert"                 on public.products;
drop policy if exists "products_auth_update"                 on public.products;
drop policy if exists "products_auth_delete"                 on public.products;
drop policy if exists "reviews_public_read"                  on public.product_reviews;
drop policy if exists "reviews_own_insert"                   on public.product_reviews;
drop policy if exists "reviews_own_update"                   on public.product_reviews;
drop policy if exists "reviews_own_delete"                   on public.product_reviews;
-- ---- seller_id.sql policies ----
drop policy if exists "Products: update own"                 on public.products;
drop policy if exists "Products: delete own"                 on public.products;
drop policy if exists "Products: insert own"                 on public.products;

-- ---- audit_system.sql policies ----
drop policy if exists "Audit: admin read only"               on audit.logged_actions;

-- ---- user_profiles.sql policies ----
drop policy if exists "Profiles: read all"                   on public.user_profiles;
drop policy if exists "Profiles: insert own"                 on public.user_profiles;
drop policy if exists "Profiles: update own"                 on public.user_profiles;

-- ---- product_templates.sql policies ----
drop policy if exists "Authenticated users can read templates"   on public.product_templates;
drop policy if exists "Authenticated users can insert templates" on public.product_templates;
drop policy if exists "Authenticated users can update templates" on public.product_templates;
drop policy if exists "Authenticated users can delete templates" on public.product_templates;

-- ---- payment_methods.sql policies ----
drop policy if exists "Payment types: read all"              on public.payment_method_types;
drop policy if exists "Payment types: insert auth"           on public.payment_method_types;
drop policy if exists "Payment types: update auth"           on public.payment_method_types;
drop policy if exists "Payment types: delete auth"           on public.payment_method_types;
drop policy if exists "Seller methods: read all"             on public.seller_payment_methods;
drop policy if exists "Seller methods: insert own"           on public.seller_payment_methods;
drop policy if exists "Seller methods: update own"           on public.seller_payment_methods;
drop policy if exists "Seller methods: delete own"           on public.seller_payment_methods;
drop policy if exists "Settings: read all"                   on public.payment_settings;
drop policy if exists "Settings: write auth"                 on public.payment_settings;
drop policy if exists "Settings: update auth"                on public.payment_settings;

-- ---- checkout_orders.sql policies ----
drop policy if exists "orders_seller_read"                   on public.orders;
drop policy if exists "orders_buyer_insert"                  on public.orders;
drop policy if exists "orders_buyer_update"                  on public.orders;
drop policy if exists "orders_seller_update"                 on public.orders;
drop policy if exists "receipts_buyer_upload"                on storage.objects;
drop policy if exists "receipts_auth_read"                   on storage.objects;
drop policy if exists "receipts_buyer_delete"                on storage.objects;

-- ---- order_items_insert_policy.sql policies ----
drop policy if exists "order_items_buyer_insert"             on public.order_items;

-- =============================================================================
-- 5. Recreate all RLS policies with has_permission() checks
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Events (public read, permission-gated writes)
-- ---------------------------------------------------------------------------
create policy "events_read" on public.events
  for select using (true);

create policy "events_insert" on public.events
  for insert with check (has_permission(auth.uid(), 'events.create'));

create policy "events_update" on public.events
  for update using (has_permission(auth.uid(), 'events.update'));

create policy "events_delete" on public.events
  for delete using (has_permission(auth.uid(), 'events.delete'));

-- ---------------------------------------------------------------------------
-- Products (public read, owner-scoped writes)
-- ---------------------------------------------------------------------------
create policy "products_read" on public.products
  for select using (true);

create policy "products_insert" on public.products
  for insert with check (
    has_permission(auth.uid(), 'products.create')
    and seller_id = auth.uid()
  );

create policy "products_update" on public.products
  for update using (
    has_permission(auth.uid(), 'products.update')
    and seller_id = auth.uid()
  );

create policy "products_delete" on public.products
  for delete using (
    has_permission(auth.uid(), 'products.delete')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Product Entitlements (public read, inherits from products)
-- ---------------------------------------------------------------------------
create policy "entitlements_read" on public.product_entitlements
  for select using (true);

-- ---------------------------------------------------------------------------
-- Product Reviews (public read, owner-scoped writes)
-- ---------------------------------------------------------------------------
create policy "reviews_read" on public.product_reviews
  for select using (true);

create policy "reviews_insert" on public.product_reviews
  for insert with check (
    has_permission(auth.uid(), 'product_reviews.create')
    and user_id = auth.uid()
  );

create policy "reviews_update" on public.product_reviews
  for update using (
    has_permission(auth.uid(), 'product_reviews.update')
    and user_id = auth.uid()
  );

create policy "reviews_delete" on public.product_reviews
  for delete using (
    has_permission(auth.uid(), 'product_reviews.delete')
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Orders (dual ownership: buyer reads own, seller reads received)
-- ---------------------------------------------------------------------------
create policy "orders_read" on public.orders
  for select using (
    has_permission(auth.uid(), 'orders.read')
    and (user_id = auth.uid() or seller_id = auth.uid())
  );

create policy "orders_buyer_insert" on public.orders
  for insert with check (
    has_permission(auth.uid(), 'orders.create')
    and user_id = auth.uid()
  );

create policy "orders_buyer_update" on public.orders
  for update using (
    has_permission(auth.uid(), 'orders.create')
    and user_id = auth.uid()
  );

create policy "orders_seller_update" on public.orders
  for update using (
    has_permission(auth.uid(), 'orders.update')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Order Items (inherited from orders via subquery)
-- ---------------------------------------------------------------------------
create policy "order_items_read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy "order_items_buyer_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Check-ins (owner-scoped read, permission-gated writes)
-- ---------------------------------------------------------------------------
create policy "check_ins_read" on public.check_ins
  for select using (
    has_permission(auth.uid(), 'check_ins.read')
    and order_item_id in (
      select oi.id from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = auth.uid() or o.seller_id = auth.uid()
    )
  );

create policy "check_ins_insert" on public.check_ins
  for insert with check (
    has_permission(auth.uid(), 'check_ins.create')
  );

create policy "check_ins_update" on public.check_ins
  for update using (
    has_permission(auth.uid(), 'check_ins.update')
  );

-- ---------------------------------------------------------------------------
-- Check-in Audit (append-only, read for owners)
-- ---------------------------------------------------------------------------
create policy "check_in_audit_read" on public.check_in_audit
  for select using (true);

-- ---------------------------------------------------------------------------
-- Ticket Transfers (owner-scoped read)
-- ---------------------------------------------------------------------------
create policy "transfers_read" on public.ticket_transfers
  for select using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Permissions (public read)
-- ---------------------------------------------------------------------------
create policy "permissions_read" on public.permissions
  for select using (true);

-- ---------------------------------------------------------------------------
-- Resource Permissions (public read)
-- ---------------------------------------------------------------------------
create policy "resource_permissions_read" on public.resource_permissions
  for select using (true);

-- ---------------------------------------------------------------------------
-- User Permissions (admin-gated + users can read their own)
-- ---------------------------------------------------------------------------
create policy "user_permissions_read" on public.user_permissions
  for select using (
    user_id = auth.uid()
    or has_permission(auth.uid(), 'user_permissions.read')
  );

create policy "user_permissions_insert" on public.user_permissions
  for insert with check (
    has_permission(auth.uid(), 'user_permissions.create')
  );

create policy "user_permissions_update" on public.user_permissions
  for update using (
    has_permission(auth.uid(), 'user_permissions.update')
  );

create policy "user_permissions_delete" on public.user_permissions
  for delete using (
    has_permission(auth.uid(), 'user_permissions.delete')
  );

-- ---------------------------------------------------------------------------
-- User Profiles (ownership only, no permission check)
-- ---------------------------------------------------------------------------
create policy "profiles_read" on public.user_profiles
  for select using (true);

create policy "profiles_insert" on public.user_profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on public.user_profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Product Templates (permission-gated)
-- ---------------------------------------------------------------------------
create policy "templates_read" on public.product_templates
  for select using (has_permission(auth.uid(), 'templates.read'));

create policy "templates_insert" on public.product_templates
  for insert with check (has_permission(auth.uid(), 'templates.create'));

create policy "templates_update" on public.product_templates
  for update using (has_permission(auth.uid(), 'templates.update'));

create policy "templates_delete" on public.product_templates
  for delete using (has_permission(auth.uid(), 'templates.delete'));

-- ---------------------------------------------------------------------------
-- Payment Method Types (public read, permission-gated writes)
-- ---------------------------------------------------------------------------
create policy "payment_method_types_read" on public.payment_method_types
  for select using (true);

create policy "payment_method_types_insert" on public.payment_method_types
  for insert with check (has_permission(auth.uid(), 'payment_method_types.create'));

create policy "payment_method_types_update" on public.payment_method_types
  for update using (has_permission(auth.uid(), 'payment_method_types.update'));

create policy "payment_method_types_delete" on public.payment_method_types
  for delete using (has_permission(auth.uid(), 'payment_method_types.delete'));

-- ---------------------------------------------------------------------------
-- Seller Payment Methods (public read, owner-scoped + permission-gated writes)
-- ---------------------------------------------------------------------------
create policy "seller_payment_methods_read" on public.seller_payment_methods
  for select using (true);

create policy "seller_payment_methods_insert" on public.seller_payment_methods
  for insert with check (
    has_permission(auth.uid(), 'seller_payment_methods.create')
    and seller_id = auth.uid()
  );

create policy "seller_payment_methods_update" on public.seller_payment_methods
  for update using (
    has_permission(auth.uid(), 'seller_payment_methods.update')
    and seller_id = auth.uid()
  );

create policy "seller_payment_methods_delete" on public.seller_payment_methods
  for delete using (
    has_permission(auth.uid(), 'seller_payment_methods.delete')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Payment Settings (permission-gated)
-- ---------------------------------------------------------------------------
create policy "settings_read" on public.payment_settings
  for select using (has_permission(auth.uid(), 'payment_settings.read'));

create policy "settings_insert" on public.payment_settings
  for insert with check (has_permission(auth.uid(), 'payment_settings.update'));

create policy "settings_update" on public.payment_settings
  for update using (has_permission(auth.uid(), 'payment_settings.update'));

-- ---------------------------------------------------------------------------
-- Audit log (permission-gated read)
-- ---------------------------------------------------------------------------
create policy "audit_read" on audit.logged_actions
  for select using (has_permission(auth.uid(), 'audit.read'));

-- ---------------------------------------------------------------------------
-- Storage: Receipts (permission-gated)
-- ---------------------------------------------------------------------------
create policy "receipts_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'receipts.create')
  );

create policy "receipts_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'receipts.read')
  );

create policy "receipts_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'receipts.delete')
  );

-- =============================================================================
-- 6. Bootstrap: Grant ALL permissions to ALL existing users (dev environment)
-- =============================================================================

do $$
declare
  v_user record;
  v_rp record;
begin
  for v_user in (select id from auth.users) loop
    for v_rp in (select rp.id from public.resource_permissions rp where rp.resource_type = 'global') loop
      insert into public.user_permissions (user_id, resource_permission_id, mode, granted_by, reason)
      values (v_user.id, v_rp.id, 'grant', v_user.id, 'Bootstrap: dev migration')
      on conflict (user_id, resource_permission_id) do nothing;
    end loop;
  end loop;
end;
$$;
