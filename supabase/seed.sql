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
insert into public.products (
  event_id, slug, name_en, name_es, description_en, description_es,
  long_description_en, long_description_es, tagline_en, tagline_es,
  type, category, price_cop, price_usd, featured, tags, max_quantity,
  images, sections
) values (
  (select id from public.events where slug = 'moonfest-2026'),
  'moonfest-2026-ticket',
  'Moonfest 2026 Entry Ticket',
  'Entrada Moonfest 2026',
  'Includes official merch package, access to all parties, panels, artist market, and round-trip bus from Bogotá.',
  'Incluye paquete de merch oficial, acceso a todas las fiestas, paneles, mercado de artistas y transporte ida y vuelta desde Bogotá.',
  'Four unforgettable days in Paipa, Boyacá. Your ticket covers round-trip transportation from Bogotá, daily breakfasts, entry to all convention events, artist market access, official merch package, and both the welcome and closing parties. Whether you are an artist, fursuiter, or first-timer — this is the Colombian furry event of the year.',
  'Cuatro días inolvidables en Paipa, Boyacá. Tu entrada cubre transporte ida y vuelta desde Bogotá, desayunos diarios, acceso a todos los eventos de la convención, mercado de artistas, paquete de merch oficial, y las fiestas de bienvenida y cierre. Ya seas artista, fursuiter o primerizo — este es el evento furry colombiano del año.',
  'The Colombian furry event of the year',
  'El evento furry colombiano del año',
  'ticket',
  'events',
  300000,
  80,
  true,
  array['furry','convention','colombia','paipa','2026'],
  200,
  '[{"url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800", "alt": "Convention hall"}]'::jsonb,
  '[
    {
      "name_en": "What''s Included",
      "name_es": "Qué incluye",
      "type": "cards",
      "sort_order": 1,
      "items": [
        {"title_en": "Round-trip transport", "title_es": "Transporte ida y vuelta", "description_en": "Comfortable bus from Bogotá to Paipa and back", "description_es": "Bus cómodo de Bogotá a Paipa y de regreso", "icon": "Bus", "sort_order": 1},
        {"title_en": "Daily breakfasts", "title_es": "Desayunos diarios", "description_en": "Three hotel breakfasts included", "description_es": "Tres desayunos de hotel incluidos", "icon": "UtensilsCrossed", "sort_order": 2},
        {"title_en": "Two parties", "title_es": "Dos fiestas", "description_en": "Welcome party + closing party with DJ", "description_es": "Fiesta de bienvenida + fiesta de cierre con DJ", "icon": "PartyPopper", "sort_order": 3},
        {"title_en": "Artist market", "title_es": "Mercado de artistas", "description_en": "Browse and buy from furry artists and crafters", "description_es": "Explora y compra de artistas y artesanos furry", "icon": "Palette", "sort_order": 4},
        {"title_en": "Official merch", "title_es": "Merch oficial", "description_en": "Exclusive Moonfest 2026 merch package", "description_es": "Paquete exclusivo de merch Moonfest 2026", "icon": "Gift", "sort_order": 5}
      ]
    },
    {
      "name_en": "Event Details",
      "name_es": "Detalles del evento",
      "type": "two-column",
      "sort_order": 2,
      "items": [
        {"title_en": "Venue", "title_es": "Venue", "description_en": "Estelar Paipa Hotel & Convention Center", "description_es": "Estelar Paipa Hotel & Convention Center", "sort_order": 1},
        {"title_en": "Location", "title_es": "Ubicación", "description_en": "Paipa, Boyacá, Colombia", "description_es": "Paipa, Boyacá, Colombia", "sort_order": 2},
        {"title_en": "Doors open", "title_es": "Apertura de puertas", "description_en": "2:00 PM", "description_es": "2:00 PM", "sort_order": 3},
        {"title_en": "Age restriction", "title_es": "Restricción de edad", "description_en": "18+", "description_es": "18+", "sort_order": 4},
        {"title_en": "Capacity", "title_es": "Capacidad", "description_en": "200 attendees", "description_es": "200 asistentes", "sort_order": 5},
        {"title_en": "Tickets remaining", "title_es": "Entradas disponibles", "description_en": "142", "description_es": "142", "sort_order": 6}
      ]
    },
    {
      "name_en": "FAQ",
      "name_es": "Preguntas frecuentes",
      "type": "accordion",
      "sort_order": 3,
      "items": [
        {"title_en": "Where does the bus depart from?", "title_es": "¿De dónde sale el bus?", "description_en": "The bus departs from northern Bogotá (exact location TBA 2 weeks before the event).", "description_es": "El bus sale del norte de Bogotá (ubicación exacta por confirmar 2 semanas antes del evento).", "sort_order": 1},
        {"title_en": "Can I attend without the bus?", "title_es": "¿Puedo asistir sin el bus?", "description_en": "Yes! You can drive or arrange your own transport to Paipa. The ticket price is the same.", "description_es": "¡Sí! Puedes conducir o arreglar tu propio transporte a Paipa. El precio es el mismo.", "sort_order": 2},
        {"title_en": "Is there an age restriction?", "title_es": "¿Hay restricción de edad?", "description_en": "Attendees must be 18+. ID will be checked at registration.", "description_es": "Los asistentes deben ser mayores de 18 años. Se verificará identificación en el registro.", "sort_order": 3},
        {"title_en": "What about accommodation?", "title_es": "¿Qué hay del alojamiento?", "description_en": "Hotel rooms are available at a group rate but booked separately. We will share the booking link closer to the event.", "description_es": "Las habitaciones de hotel están disponibles a tarifa grupal pero se reservan por separado. Compartiremos el enlace de reserva cerca del evento.", "sort_order": 4}
      ]
    }
  ]'::jsonb
);

-- -----------------------------------------------------------------------------
-- Additional seed products for store demo
-- -----------------------------------------------------------------------------

-- Merch: Enamel pin set
insert into public.products (
  slug, name_en, name_es, description_en, description_es,
  type, category, price_cop, price_usd, tags,
  images, sections
) values (
  'paw-print-enamel-pins',
  'Paw Print Enamel Pin Set',
  'Set de Pines Esmaltados Huella',
  'Set of 4 kawaii paw print enamel pins. Gold plating, rubber clutch backs.',
  'Set de 4 pines esmaltados de huellas kawaii. Baño de oro, seguros de goma.',
  'merch', 'merch', 72000, 18,
  array['pins','enamel','kawaii','merch'],
  '[{"url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400", "alt": "Enamel pins"}]'::jsonb,
  '[
    {
      "name_en": "Product Details",
      "name_es": "Detalles del producto",
      "type": "two-column",
      "sort_order": 1,
      "items": [
        {"title_en": "Weight", "title_es": "Peso", "description_en": "50g", "description_es": "50g", "sort_order": 1},
        {"title_en": "Dimensions", "title_es": "Dimensiones", "description_en": "3x3cm each", "description_es": "3x3cm cada uno", "sort_order": 2},
        {"title_en": "Ships from", "title_es": "Envío desde", "description_en": "Bogotá, Colombia", "description_es": "Bogotá, Colombia", "sort_order": 3},
        {"title_en": "Material", "title_es": "Material", "description_en": "Zinc alloy + enamel", "description_es": "Aleación de zinc + esmalte", "sort_order": 4}
      ]
    }
  ]'::jsonb
);

-- Digital: Sticker pack
insert into public.products (
  slug, name_en, name_es, description_en, description_es,
  type, category, price_cop, price_usd, tags,
  images, sections
) values (
  'retro-sticker-pack',
  'Retro Sticker Pack Vol. 2',
  'Pack de Stickers Retro Vol. 2',
  'Digital sticker pack with 30 retro-style furry stickers for Telegram and Discord.',
  'Pack digital de stickers con 30 stickers furry estilo retro para Telegram y Discord.',
  'digital', 'digital', 32000, 8,
  array['stickers','digital','telegram','discord','retro'],
  '[{"url": "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400", "alt": "Digital stickers"}]'::jsonb,
  '[
    {
      "name_en": "File Details",
      "name_es": "Detalles del archivo",
      "type": "two-column",
      "sort_order": 1,
      "items": [
        {"title_en": "File size", "title_es": "Tamaño del archivo", "description_en": "12MB", "description_es": "12MB", "sort_order": 1},
        {"title_en": "Format", "title_es": "Formato", "description_en": "PNG + WebP", "description_es": "PNG + WebP", "sort_order": 2},
        {"title_en": "Resolution", "title_es": "Resolución", "description_en": "512x512px", "description_es": "512x512px", "sort_order": 3},
        {"title_en": "License", "title_es": "Licencia", "description_en": "Personal use", "description_es": "Uso personal", "sort_order": 4}
      ]
    }
  ]'::jsonb
);

-- Service: Illustration commission
insert into public.products (
  slug, name_en, name_es, description_en, description_es,
  type, category, price_cop, price_usd, featured, tags,
  images, sections
) values (
  'full-illustration-commission',
  'Full Illustration Commission',
  'Comisión de Ilustración Completa',
  'Full-body character illustration with detailed background. Includes 3 revision rounds and high-res files.',
  'Ilustración de personaje de cuerpo completo con fondo detallado. Incluye 3 rondas de revisión y archivos en alta resolución.',
  'service', 'art', 600000, 150, true,
  array['commission','illustration','art','furry'],
  '[{"url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400", "alt": "Digital art"}]'::jsonb,
  '[
    {
      "name_en": "Commission Details",
      "name_es": "Detalles de la comisión",
      "type": "two-column",
      "sort_order": 1,
      "items": [
        {"title_en": "Total slots", "title_es": "Cupos totales", "description_en": "5", "description_es": "5", "sort_order": 1},
        {"title_en": "Slots available", "title_es": "Cupos disponibles", "description_en": "3", "description_es": "3", "sort_order": 2},
        {"title_en": "Turnaround", "title_es": "Tiempo de entrega", "description_en": "14 days", "description_es": "14 días", "sort_order": 3},
        {"title_en": "Revisions included", "title_es": "Revisiones incluidas", "description_en": "3 rounds", "description_es": "3 rondas", "sort_order": 4},
        {"title_en": "Commercial use", "title_es": "Uso comercial", "description_en": "Not included", "description_es": "No incluido", "sort_order": 5}
      ]
    }
  ]'::jsonb
);

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
