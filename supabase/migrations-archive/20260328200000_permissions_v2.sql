-- =============================================================================
-- Permissions V2: Collapse 43 CRUD keys → 17 capability-based keys
-- =============================================================================
-- 1. Clean slate: delete all user_permissions, resource_permissions, permissions
-- 2. Insert 17 new permission keys
-- 3. Insert 17 global resource_permissions
-- 4. Drop ALL existing RLS policies
-- 5. Recreate RLS policies with new capability keys
-- 6. Bootstrap: grant all 17 to existing dev users
-- =============================================================================

-- =============================================================================
-- 1. Clean slate
-- =============================================================================

delete from public.user_permissions;
delete from public.resource_permissions;
delete from public.permissions;

-- =============================================================================
-- 2. Insert 17 capability-based permission keys
-- =============================================================================

insert into public.permissions (key, name_en, name_es, description_en, description_es, depends_on) values
  ('products.create',           'Create Products',       'Crear Productos',           'Create new products + images + pricing + stock',       'Crear productos + imagenes + precios + stock',         null),
  ('products.read',             'View Products',         'Ver Productos',             'View products in Studio',                              'Ver productos en Studio',                               null),
  ('products.update',           'Edit Products',         'Editar Productos',          'Edit products + images + stock + pricing',              'Editar productos + imagenes + stock + precios',        null),
  ('products.delete',           'Delete Products',       'Eliminar Productos',        'Delete products',                                      'Eliminar productos',                                    null),
  ('reviews.write',             'Write Reviews',         'Escribir Resenas',          'Write, edit, and delete own reviews',                  'Escribir, editar y eliminar resenas propias',          null),
  ('orders.place',              'Place Orders',          'Hacer Pedidos',             'Checkout and upload receipts',                         'Hacer pedidos y subir comprobantes',                    null),
  ('orders.view',               'View Orders',           'Ver Pedidos',               'View own orders and receipts',                         'Ver pedidos y comprobantes propios',                    null),
  ('orders.manage',             'Manage Orders',         'Gestionar Pedidos',         'Approve or reject received orders',                    'Aprobar o rechazar pedidos recibidos',                  null),
  ('seller.payment_methods',    'Payment Methods',       'Metodos de Pago',           'Full CRUD on seller payment methods',                  'CRUD completo en metodos de pago del vendedor',        null),
  ('admin.payment_types',       'Payment Types',         'Tipos de Pago',             'Manage payment type catalog',                          'Gestionar catalogo de tipos de pago',                   null),
  ('admin.templates',           'Templates',             'Plantillas',                'Manage product templates',                             'Gestionar plantillas de producto',                      null),
  ('admin.settings',            'Settings',              'Configuracion',             'Manage platform settings',                             'Gestionar configuracion de plataforma',                 null),
  ('admin.audit',               'Audit Log',             'Registro de Auditoria',     'View audit log',                                      'Ver registro de auditoria',                             null),
  ('admin.users',               'User Permissions',      'Permisos de Usuario',       'Manage user permissions',                              'Gestionar permisos de usuario',                         null),
  ('events.manage',             'Manage Events',         'Gestionar Eventos',         'Create, edit, and delete events',                     'Crear, editar y eliminar eventos',                      null),
  ('events.read',               'View Events',           'Ver Eventos',               'View events',                                         'Ver eventos',                                           null),
  ('checkins.manage',           'Check-ins',             'Check-ins',                 'Check-in, view, and undo',                            'Registrar entrada, ver y deshacer',                     null)
on conflict (key) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  depends_on = excluded.depends_on;

-- =============================================================================
-- 3. Insert global resource_permissions for each new key
-- =============================================================================

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in (
  'products.create', 'products.read', 'products.update', 'products.delete',
  'reviews.write',
  'orders.place', 'orders.view', 'orders.manage',
  'seller.payment_methods',
  'admin.payment_types', 'admin.templates', 'admin.settings', 'admin.audit', 'admin.users',
  'events.manage', 'events.read', 'checkins.manage'
)
on conflict (permission_id, resource_type, resource_id) do nothing;

-- =============================================================================
-- 4. Drop ALL existing RLS policies
-- =============================================================================

-- ---- Events ----
drop policy if exists "events_read"     on public.events;
drop policy if exists "events_insert"   on public.events;
drop policy if exists "events_update"   on public.events;
drop policy if exists "events_delete"   on public.events;

-- ---- Products ----
drop policy if exists "products_read"   on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;

-- ---- Product Entitlements ----
drop policy if exists "entitlements_read" on public.product_entitlements;

-- ---- Product Reviews ----
drop policy if exists "reviews_read"    on public.product_reviews;
drop policy if exists "reviews_insert"  on public.product_reviews;
drop policy if exists "reviews_update"  on public.product_reviews;
drop policy if exists "reviews_delete"  on public.product_reviews;

-- ---- Orders ----
drop policy if exists "orders_read"           on public.orders;
drop policy if exists "orders_buyer_insert"   on public.orders;
drop policy if exists "orders_buyer_update"   on public.orders;
drop policy if exists "orders_seller_update"  on public.orders;

-- ---- Order Items ----
drop policy if exists "order_items_read"          on public.order_items;
drop policy if exists "order_items_buyer_insert"  on public.order_items;

-- ---- Check-ins ----
drop policy if exists "check_ins_read"    on public.check_ins;
drop policy if exists "check_ins_insert"  on public.check_ins;
drop policy if exists "check_ins_update"  on public.check_ins;

-- ---- Check-in Audit ----
drop policy if exists "check_in_audit_read" on public.check_in_audit;

-- ---- Ticket Transfers ----
drop policy if exists "transfers_read" on public.ticket_transfers;

-- ---- Permissions (catalog) ----
drop policy if exists "permissions_read" on public.permissions;

-- ---- Resource Permissions (catalog) ----
drop policy if exists "resource_permissions_read" on public.resource_permissions;

-- ---- User Permissions ----
drop policy if exists "user_permissions_read"    on public.user_permissions;
drop policy if exists "user_permissions_insert"  on public.user_permissions;
drop policy if exists "user_permissions_update"  on public.user_permissions;
drop policy if exists "user_permissions_delete"  on public.user_permissions;

-- ---- User Profiles ----
drop policy if exists "profiles_read"    on public.user_profiles;
drop policy if exists "profiles_insert"  on public.user_profiles;
drop policy if exists "profiles_update"  on public.user_profiles;

-- ---- Product Templates ----
drop policy if exists "templates_read"    on public.product_templates;
drop policy if exists "templates_insert"  on public.product_templates;
drop policy if exists "templates_update"  on public.product_templates;
drop policy if exists "templates_delete"  on public.product_templates;

-- ---- Payment Method Types ----
drop policy if exists "payment_method_types_read"    on public.payment_method_types;
drop policy if exists "payment_method_types_insert"  on public.payment_method_types;
drop policy if exists "payment_method_types_update"  on public.payment_method_types;
drop policy if exists "payment_method_types_delete"  on public.payment_method_types;

-- ---- Seller Payment Methods ----
drop policy if exists "seller_payment_methods_read"    on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_insert"  on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_update"  on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_delete"  on public.seller_payment_methods;

-- ---- Payment Settings ----
drop policy if exists "settings_read"    on public.payment_settings;
drop policy if exists "settings_insert"  on public.payment_settings;
drop policy if exists "settings_update"  on public.payment_settings;

-- ---- Audit Log ----
drop policy if exists "audit_read" on audit.logged_actions;

-- ---- Storage: Receipts ----
drop policy if exists "receipts_upload"  on storage.objects;
drop policy if exists "receipts_read"    on storage.objects;
drop policy if exists "receipts_delete"  on storage.objects;

-- =============================================================================
-- 5. Recreate ALL RLS policies with capability-based keys
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Events (public read, capability-gated writes)
-- ---------------------------------------------------------------------------
create policy "events_read" on public.events
  for select using (true);

create policy "events_insert" on public.events
  for insert with check (has_permission(auth.uid(), 'events.manage'));

create policy "events_update" on public.events
  for update using (has_permission(auth.uid(), 'events.manage'));

create policy "events_delete" on public.events
  for delete using (has_permission(auth.uid(), 'events.manage'));

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
-- Product Entitlements (public read)
-- ---------------------------------------------------------------------------
create policy "entitlements_read" on public.product_entitlements
  for select using (true);

-- ---------------------------------------------------------------------------
-- Product Reviews (public read, owner-scoped writes via reviews.write)
-- ---------------------------------------------------------------------------
create policy "reviews_read" on public.product_reviews
  for select using (true);

create policy "reviews_insert" on public.product_reviews
  for insert with check (
    has_permission(auth.uid(), 'reviews.write')
    and user_id = auth.uid()
  );

create policy "reviews_update" on public.product_reviews
  for update using (
    has_permission(auth.uid(), 'reviews.write')
    and user_id = auth.uid()
  );

create policy "reviews_delete" on public.product_reviews
  for delete using (
    has_permission(auth.uid(), 'reviews.write')
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Orders (dual ownership: buyer/seller reads, capability-gated writes)
-- ---------------------------------------------------------------------------
create policy "orders_read" on public.orders
  for select using (
    has_permission(auth.uid(), 'orders.view')
    and (user_id = auth.uid() or seller_id = auth.uid())
  );

create policy "orders_buyer_insert" on public.orders
  for insert with check (
    has_permission(auth.uid(), 'orders.place')
    and user_id = auth.uid()
  );

create policy "orders_buyer_update" on public.orders
  for update using (
    has_permission(auth.uid(), 'orders.place')
    and user_id = auth.uid()
  );

create policy "orders_seller_update" on public.orders
  for update using (
    has_permission(auth.uid(), 'orders.manage')
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
-- Check-ins (owner-scoped read, capability-gated writes via checkins.manage)
-- ---------------------------------------------------------------------------
create policy "check_ins_read" on public.check_ins
  for select using (
    has_permission(auth.uid(), 'checkins.manage')
    and order_item_id in (
      select oi.id from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = auth.uid() or o.seller_id = auth.uid()
    )
  );

create policy "check_ins_insert" on public.check_ins
  for insert with check (
    has_permission(auth.uid(), 'checkins.manage')
  );

create policy "check_ins_update" on public.check_ins
  for update using (
    has_permission(auth.uid(), 'checkins.manage')
  );

-- ---------------------------------------------------------------------------
-- Check-in Audit (public read)
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
-- Permissions catalog (public read)
-- ---------------------------------------------------------------------------
create policy "permissions_read" on public.permissions
  for select using (true);

-- ---------------------------------------------------------------------------
-- Resource Permissions catalog (public read)
-- ---------------------------------------------------------------------------
create policy "resource_permissions_read" on public.resource_permissions
  for select using (true);

-- ---------------------------------------------------------------------------
-- User Permissions (admin.users capability + users can read their own)
-- ---------------------------------------------------------------------------
create policy "user_permissions_read" on public.user_permissions
  for select using (
    user_id = auth.uid()
    or has_permission(auth.uid(), 'admin.users')
  );

create policy "user_permissions_insert" on public.user_permissions
  for insert with check (
    has_permission(auth.uid(), 'admin.users')
  );

create policy "user_permissions_update" on public.user_permissions
  for update using (
    has_permission(auth.uid(), 'admin.users')
  );

create policy "user_permissions_delete" on public.user_permissions
  for delete using (
    has_permission(auth.uid(), 'admin.users')
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
-- Product Templates (admin.templates capability)
-- ---------------------------------------------------------------------------
create policy "templates_read" on public.product_templates
  for select using (has_permission(auth.uid(), 'admin.templates'));

create policy "templates_insert" on public.product_templates
  for insert with check (has_permission(auth.uid(), 'admin.templates'));

create policy "templates_update" on public.product_templates
  for update using (has_permission(auth.uid(), 'admin.templates'));

create policy "templates_delete" on public.product_templates
  for delete using (has_permission(auth.uid(), 'admin.templates'));

-- ---------------------------------------------------------------------------
-- Payment Method Types (public read, admin.payment_types writes)
-- ---------------------------------------------------------------------------
create policy "payment_method_types_read" on public.payment_method_types
  for select using (true);

create policy "payment_method_types_insert" on public.payment_method_types
  for insert with check (has_permission(auth.uid(), 'admin.payment_types'));

create policy "payment_method_types_update" on public.payment_method_types
  for update using (has_permission(auth.uid(), 'admin.payment_types'));

create policy "payment_method_types_delete" on public.payment_method_types
  for delete using (has_permission(auth.uid(), 'admin.payment_types'));

-- ---------------------------------------------------------------------------
-- Seller Payment Methods (public read, seller.payment_methods writes)
-- ---------------------------------------------------------------------------
create policy "seller_payment_methods_read" on public.seller_payment_methods
  for select using (true);

create policy "seller_payment_methods_insert" on public.seller_payment_methods
  for insert with check (
    has_permission(auth.uid(), 'seller.payment_methods')
    and seller_id = auth.uid()
  );

create policy "seller_payment_methods_update" on public.seller_payment_methods
  for update using (
    has_permission(auth.uid(), 'seller.payment_methods')
    and seller_id = auth.uid()
  );

create policy "seller_payment_methods_delete" on public.seller_payment_methods
  for delete using (
    has_permission(auth.uid(), 'seller.payment_methods')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Payment Settings (admin.settings capability)
-- ---------------------------------------------------------------------------
create policy "settings_read" on public.payment_settings
  for select using (auth.role() = 'authenticated');

create policy "settings_insert" on public.payment_settings
  for insert with check (has_permission(auth.uid(), 'admin.settings'));

create policy "settings_update" on public.payment_settings
  for update using (has_permission(auth.uid(), 'admin.settings'));

-- ---------------------------------------------------------------------------
-- Audit log (admin.audit capability)
-- ---------------------------------------------------------------------------
create policy "audit_read" on audit.logged_actions
  for select using (has_permission(auth.uid(), 'admin.audit'));

-- ---------------------------------------------------------------------------
-- Storage: Receipts (orders.place for upload/delete, orders.view for read)
-- ---------------------------------------------------------------------------
create policy "receipts_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'orders.place')
  );

create policy "receipts_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'orders.view')
  );

create policy "receipts_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'orders.place')
  );

-- =============================================================================
-- 6. Bootstrap: Grant ALL 17 permissions to ALL existing dev users
-- =============================================================================

do $$
declare
  v_user record;
  v_rp record;
begin
  for v_user in (select id from auth.users) loop
    for v_rp in (select rp.id from public.resource_permissions rp where rp.resource_type = 'global') loop
      insert into public.user_permissions (user_id, resource_permission_id, mode, granted_by, reason)
      values (v_user.id, v_rp.id, 'grant', v_user.id, 'Bootstrap: permissions v2 migration')
      on conflict (user_id, resource_permission_id) do nothing;
    end loop;
  end loop;
end;
$$;
