-- =============================================================================
-- Seed Data: Moonfest 2026 + Core Permissions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permissions (seed)
-- -----------------------------------------------------------------------------
insert into public.permissions (key, name_en, name_es, description_en, description_es) values
  ('view',       'View',             'Ver',                 'Can see the resource',                              'Puede ver el recurso'),
  ('purchase',   'Purchase',         'Comprar',             'Can buy products from the resource',                'Puede comprar productos del recurso'),
  ('check-in',   'Check In',         'Registrar entrada',   'Can mark entitlements as used',                     'Puede marcar beneficios como usados'),
  ('uncheck',    'Uncheck',          'Desmarcar entrada',   'Can reverse a check-in (requires reason)',          'Puede revertir un registro (requiere motivo)'),
  ('audit-view', 'View Audit Log',   'Ver registro de auditoría', 'Can view the audit log',                     'Puede ver el registro de auditoría'),
  ('manage',     'Manage',           'Administrar',         'Full access (dashboard, export, user management)',  'Acceso completo (panel, exportar, gestión de usuarios)');

-- -----------------------------------------------------------------------------
-- Event: Moonfest 2026
-- -----------------------------------------------------------------------------
insert into public.events (slug, name_en, name_es, description_en, description_es, location, starts_at, ends_at) values
  ('moonfest-2026',
   'Moonfest 2026',
   'Moonfest 2026',
   'A four-day furry convention in Paipa, Boyacá, Colombia. Includes parties, panels, artist market, and round-trip transportation from Bogotá.',
   'Una convención furry de cuatro días en Paipa, Boyacá, Colombia. Incluye fiestas, paneles, mercado de artistas y transporte ida y vuelta desde Bogotá.',
   'Estelar Paipa Hotel & Convention Center, Boyacá, Colombia',
   '2026-07-10T14:00:00-05:00',
   '2026-07-13T12:00:00-05:00');

-- -----------------------------------------------------------------------------
-- Product: Moonfest 2026 Ticket
-- -----------------------------------------------------------------------------
insert into public.products (event_id, slug, name_en, name_es, description_en, description_es, type, price_cop, price_usd) values
  ((select id from public.events where slug = 'moonfest-2026'),
   'moonfest-2026-ticket',
   'Moonfest 2026 Entry Ticket',
   'Entrada Moonfest 2026',
   'Includes official merch package, access to all parties, panels, artist market, and round-trip bus from Bogotá.',
   'Incluye paquete de merch oficial, acceso a todas las fiestas, paneles, mercado de artistas y transporte ida y vuelta desde Bogotá.',
   'ticket',
   300000,
   80);

-- -----------------------------------------------------------------------------
-- Product Entitlements: What the ticket includes
-- -----------------------------------------------------------------------------
insert into public.product_entitlements (product_id, name_en, name_es, type, sort_order) values
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Bus departure: Bogotá → Paipa',     'Bus ida: Bogotá → Paipa',           'transport', 1),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Event entry: Day 1',                 'Entrada al evento: Día 1',          'entry',     2),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Event entry: Day 2',                 'Entrada al evento: Día 2',          'entry',     3),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Event entry: Day 3',                 'Entrada al evento: Día 3',          'entry',     4),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Event entry: Day 4',                 'Entrada al evento: Día 4',          'entry',     5),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Breakfast: Day 1',                   'Desayuno: Día 1',                   'meal',      6),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Breakfast: Day 2',                   'Desayuno: Día 2',                   'meal',      7),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Breakfast: Day 3',                   'Desayuno: Día 3',                   'meal',      8),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Official merch package',             'Paquete de merch oficial',          'merch',     9),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Welcome party',                      'Fiesta de bienvenida',              'party',    10),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Closing party',                      'Fiesta de cierre',                  'party',    11),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Artist market access',               'Acceso al mercado de artistas',     'entry',    12),
  ((select id from public.products where slug = 'moonfest-2026-ticket'), 'Bus return: Paipa → Bogotá',         'Bus vuelta: Paipa → Bogotá',        'transport',13);

-- -----------------------------------------------------------------------------
-- Resource Permissions: Scoped to Moonfest event
-- -----------------------------------------------------------------------------
insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'event', e.id
from public.permissions p, public.events e
where e.slug = 'moonfest-2026'
  and p.key in ('view', 'purchase', 'check-in', 'uncheck', 'audit-view', 'manage');

-- Global store permissions
insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'store', null
from public.permissions p
where p.key in ('view', 'purchase', 'manage');
