-- =============================================================================
-- Restore Granular Permissions
-- =============================================================================
-- Replaces the collapsed capability model with the CRUD-style permission model
-- that matches the current app sections, RLS checks, and E2E expectations.
-- =============================================================================

delete from public.user_permissions;
delete from public.resource_permissions;
delete from public.permissions;

insert into public.permissions (
  key,
  name_en,
  name_es,
  description_en,
  description_es,
  depends_on
) values
  ('products.create', 'Create Products', 'Crear Productos', 'Create new products in Studio', 'Crear nuevos productos en Studio', null),
  ('products.read', 'Read Products', 'Ver Productos', 'Browse and view products', 'Navegar y ver productos', null),
  ('products.update', 'Update Products', 'Editar Productos', 'Edit own products', 'Editar productos propios', null),
  ('products.delete', 'Delete Products', 'Eliminar Productos', 'Delete own products', 'Eliminar productos propios', null),
  ('product_images.create', 'Upload Product Images', 'Subir Imagenes de Producto', 'Upload product images', 'Subir imagenes de producto', 'products.create'),
  ('product_images.read', 'View Product Images', 'Ver Imagenes de Producto', 'View product images', 'Ver imagenes de producto', null),
  ('product_images.delete', 'Delete Product Images', 'Eliminar Imagenes', 'Delete product images', 'Eliminar imagenes de producto', 'products.create'),
  ('product_reviews.create', 'Write Reviews', 'Escribir Resenas', 'Write product reviews', 'Escribir resenas de producto', 'orders.create'),
  ('product_reviews.read', 'Read Reviews', 'Ver Resenas', 'Read product reviews', 'Ver resenas de producto', null),
  ('product_reviews.update', 'Edit Reviews', 'Editar Resenas', 'Edit own review', 'Editar resena propia', null),
  ('product_reviews.delete', 'Delete Reviews', 'Eliminar Resenas', 'Delete own review', 'Eliminar resena propia', null),
  ('orders.create', 'Place Orders', 'Hacer Pedidos', 'Place orders (checkout)', 'Hacer pedidos (checkout)', null),
  ('orders.read', 'View Orders', 'Ver Pedidos', 'View own orders / received orders', 'Ver pedidos propios / recibidos', null),
  ('orders.update', 'Manage Orders', 'Gestionar Pedidos', 'Approve or reject received orders', 'Aprobar o rechazar pedidos recibidos', 'products.create'),
  ('receipts.create', 'Upload Receipts', 'Subir Recibos', 'Upload payment receipts', 'Subir recibos de pago', 'orders.create'),
  ('receipts.read', 'View Receipts', 'Ver Recibos', 'View receipts', 'Ver recibos', null),
  ('receipts.delete', 'Delete Receipts', 'Eliminar Recibos', 'Delete own receipts', 'Eliminar recibos propios', null),
  ('seller_payment_methods.create', 'Add Payment Methods', 'Agregar Metodos de Pago', 'Add payment methods', 'Agregar metodos de pago', 'products.create'),
  ('seller_payment_methods.read', 'View Payment Methods', 'Ver Metodos de Pago', 'View own payment methods', 'Ver metodos de pago propios', 'products.create'),
  ('seller_payment_methods.update', 'Edit Payment Methods', 'Editar Metodos de Pago', 'Edit payment methods', 'Editar metodos de pago', 'products.create'),
  ('seller_payment_methods.delete', 'Remove Payment Methods', 'Eliminar Metodos de Pago', 'Remove payment methods', 'Eliminar metodos de pago', 'products.create'),
  ('payment_method_types.create', 'Create Payment Types', 'Crear Tipos de Pago', 'Create payment type catalog entries', 'Crear entradas en catalogo de tipos de pago', null),
  ('payment_method_types.read', 'View Payment Types', 'Ver Tipos de Pago', 'View payment types', 'Ver tipos de pago', null),
  ('payment_method_types.update', 'Edit Payment Types', 'Editar Tipos de Pago', 'Edit payment types', 'Editar tipos de pago', null),
  ('payment_method_types.delete', 'Delete Payment Types', 'Eliminar Tipos de Pago', 'Delete payment types', 'Eliminar tipos de pago', null),
  ('payment_settings.read', 'View Payment Settings', 'Ver Config. de Pagos', 'View timeout settings', 'Ver configuracion de tiempos', null),
  ('payment_settings.update', 'Edit Payment Settings', 'Editar Config. de Pagos', 'Change timeout settings', 'Cambiar configuracion de tiempos', null),
  ('templates.create', 'Create Templates', 'Crear Plantillas', 'Create product templates', 'Crear plantillas de producto', null),
  ('templates.read', 'View Templates', 'Ver Plantillas', 'View product templates', 'Ver plantillas de producto', null),
  ('templates.update', 'Edit Templates', 'Editar Plantillas', 'Edit product templates', 'Editar plantillas de producto', null),
  ('templates.delete', 'Delete Templates', 'Eliminar Plantillas', 'Delete product templates', 'Eliminar plantillas de producto', null),
  ('audit.read', 'View Audit Log', 'Ver Registro de Auditoria', 'View audit log', 'Ver registro de auditoria', null),
  ('user_permissions.create', 'Grant Permissions', 'Otorgar Permisos', 'Grant permissions to users', 'Otorgar permisos a usuarios', null),
  ('user_permissions.read', 'View Permissions', 'Ver Permisos', 'View user permissions', 'Ver permisos de usuarios', null),
  ('user_permissions.update', 'Modify Permissions', 'Modificar Permisos', 'Modify permission grants', 'Modificar concesiones de permisos', null),
  ('user_permissions.delete', 'Revoke Permissions', 'Revocar Permisos', 'Revoke permissions', 'Revocar permisos', null),
  ('events.create', 'Create Events', 'Crear Eventos', 'Create events', 'Crear eventos', null),
  ('events.read', 'View Events', 'Ver Eventos', 'View events', 'Ver eventos', null),
  ('events.update', 'Edit Events', 'Editar Eventos', 'Edit events', 'Editar eventos', null),
  ('events.delete', 'Delete Events', 'Eliminar Eventos', 'Delete events', 'Eliminar eventos', null),
  ('check_ins.create', 'Check In', 'Registrar Entrada', 'Check in attendees', 'Registrar entrada de asistentes', null),
  ('check_ins.read', 'View Check-ins', 'Ver Check-ins', 'View check-in status', 'Ver estado de check-in', null),
  ('check_ins.update', 'Undo Check-in', 'Deshacer Check-in', 'Undo check-in', 'Deshacer check-in', null)
on conflict (key) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  depends_on = excluded.depends_on;

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in (
  'products.create', 'products.read', 'products.update', 'products.delete',
  'product_images.create', 'product_images.read', 'product_images.delete',
  'product_reviews.create', 'product_reviews.read', 'product_reviews.update', 'product_reviews.delete',
  'orders.create', 'orders.read', 'orders.update',
  'receipts.create', 'receipts.read', 'receipts.delete',
  'seller_payment_methods.create', 'seller_payment_methods.read', 'seller_payment_methods.update', 'seller_payment_methods.delete',
  'payment_method_types.create', 'payment_method_types.read', 'payment_method_types.update', 'payment_method_types.delete',
  'payment_settings.read', 'payment_settings.update',
  'templates.create', 'templates.read', 'templates.update', 'templates.delete',
  'audit.read',
  'user_permissions.create', 'user_permissions.read', 'user_permissions.update', 'user_permissions.delete',
  'events.create', 'events.read', 'events.update', 'events.delete',
  'check_ins.create', 'check_ins.read', 'check_ins.update'
)
on conflict (permission_id, resource_type, resource_id) do nothing;

drop policy if exists "events_read" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;
drop policy if exists "products_read" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;
drop policy if exists "entitlements_read" on public.product_entitlements;
drop policy if exists "reviews_read" on public.product_reviews;
drop policy if exists "reviews_insert" on public.product_reviews;
drop policy if exists "reviews_update" on public.product_reviews;
drop policy if exists "reviews_delete" on public.product_reviews;
drop policy if exists "orders_read" on public.orders;
drop policy if exists "orders_buyer_insert" on public.orders;
drop policy if exists "orders_buyer_update" on public.orders;
drop policy if exists "orders_seller_update" on public.orders;
drop policy if exists "order_items_read" on public.order_items;
drop policy if exists "order_items_buyer_insert" on public.order_items;
drop policy if exists "check_ins_read" on public.check_ins;
drop policy if exists "check_ins_insert" on public.check_ins;
drop policy if exists "check_ins_update" on public.check_ins;
drop policy if exists "check_in_audit_read" on public.check_in_audit;
drop policy if exists "transfers_read" on public.ticket_transfers;
drop policy if exists "permissions_read" on public.permissions;
drop policy if exists "resource_permissions_read" on public.resource_permissions;
drop policy if exists "user_permissions_read" on public.user_permissions;
drop policy if exists "user_permissions_insert" on public.user_permissions;
drop policy if exists "user_permissions_update" on public.user_permissions;
drop policy if exists "user_permissions_delete" on public.user_permissions;
drop policy if exists "profiles_read" on public.user_profiles;
drop policy if exists "profiles_insert" on public.user_profiles;
drop policy if exists "profiles_update" on public.user_profiles;
drop policy if exists "templates_read" on public.product_templates;
drop policy if exists "templates_insert" on public.product_templates;
drop policy if exists "templates_update" on public.product_templates;
drop policy if exists "templates_delete" on public.product_templates;
drop policy if exists "payment_method_types_read" on public.payment_method_types;
drop policy if exists "payment_method_types_insert" on public.payment_method_types;
drop policy if exists "payment_method_types_update" on public.payment_method_types;
drop policy if exists "payment_method_types_delete" on public.payment_method_types;
drop policy if exists "seller_payment_methods_read" on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_insert" on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_update" on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_delete" on public.seller_payment_methods;
drop policy if exists "settings_read" on public.payment_settings;
drop policy if exists "settings_insert" on public.payment_settings;
drop policy if exists "settings_update" on public.payment_settings;
drop policy if exists "audit_read" on audit.logged_actions;
drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_upload" on storage.objects;
drop policy if exists "product_images_delete" on storage.objects;
drop policy if exists "receipts_upload" on storage.objects;
drop policy if exists "receipts_read" on storage.objects;
drop policy if exists "receipts_delete" on storage.objects;

create policy "events_read" on public.events
  for select using (true);

create policy "events_insert" on public.events
  for insert with check (has_permission(auth.uid(), 'events.create'));

create policy "events_update" on public.events
  for update using (has_permission(auth.uid(), 'events.update'));

create policy "events_delete" on public.events
  for delete using (has_permission(auth.uid(), 'events.delete'));

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

create policy "entitlements_read" on public.product_entitlements
  for select using (true);

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
  for insert with check (has_permission(auth.uid(), 'check_ins.create'));

create policy "check_ins_update" on public.check_ins
  for update using (has_permission(auth.uid(), 'check_ins.update'));

create policy "check_in_audit_read" on public.check_in_audit
  for select using (true);

create policy "transfers_read" on public.ticket_transfers
  for select using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy "permissions_read" on public.permissions
  for select using (true);

create policy "resource_permissions_read" on public.resource_permissions
  for select using (true);

create policy "user_permissions_read" on public.user_permissions
  for select using (
    user_id = auth.uid()
    or has_permission(auth.uid(), 'user_permissions.read')
  );

create policy "user_permissions_insert" on public.user_permissions
  for insert with check (has_permission(auth.uid(), 'user_permissions.create'));

create policy "user_permissions_update" on public.user_permissions
  for update using (has_permission(auth.uid(), 'user_permissions.update'));

create policy "user_permissions_delete" on public.user_permissions
  for delete using (has_permission(auth.uid(), 'user_permissions.delete'));

create policy "profiles_read" on public.user_profiles
  for select using (true);

create policy "profiles_insert" on public.user_profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on public.user_profiles
  for update using (id = auth.uid());

create policy "templates_read" on public.product_templates
  for select using (has_permission(auth.uid(), 'templates.read'));

create policy "templates_insert" on public.product_templates
  for insert with check (has_permission(auth.uid(), 'templates.create'));

create policy "templates_update" on public.product_templates
  for update using (has_permission(auth.uid(), 'templates.update'));

create policy "templates_delete" on public.product_templates
  for delete using (has_permission(auth.uid(), 'templates.delete'));

create policy "payment_method_types_read" on public.payment_method_types
  for select using (true);

create policy "payment_method_types_insert" on public.payment_method_types
  for insert with check (has_permission(auth.uid(), 'payment_method_types.create'));

create policy "payment_method_types_update" on public.payment_method_types
  for update using (has_permission(auth.uid(), 'payment_method_types.update'));

create policy "payment_method_types_delete" on public.payment_method_types
  for delete using (has_permission(auth.uid(), 'payment_method_types.delete'));

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

create policy "settings_read" on public.payment_settings
  for select using (has_permission(auth.uid(), 'payment_settings.read'));

create policy "settings_insert" on public.payment_settings
  for insert with check (has_permission(auth.uid(), 'payment_settings.update'));

create policy "settings_update" on public.payment_settings
  for update using (has_permission(auth.uid(), 'payment_settings.update'));

create policy "audit_read" on audit.logged_actions
  for select using (has_permission(auth.uid(), 'audit.read'));

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_upload" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and has_permission(auth.uid(), 'product_images.create')
  );

create policy "product_images_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and has_permission(auth.uid(), 'product_images.delete')
  );

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

-- Intentionally do not backfill grants for all existing users.
-- Permissions must be assigned explicitly to avoid privilege escalation.
