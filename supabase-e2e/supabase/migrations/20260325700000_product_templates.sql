-- =============================================================================
-- Product Templates: Reusable section layouts for sellers
-- =============================================================================
-- Allows admins to define product section templates that sellers can apply
-- to their listings for consistent presentation across the storefront.
-- =============================================================================

-- Table
create table public.product_templates (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  sections jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sort order index for efficient ordering
create index product_templates_sort_order_idx on public.product_templates(sort_order);

-- updated_at trigger (reuse existing function from studio schema migration)
create trigger set_product_templates_updated_at
  before update on public.product_templates
  for each row execute function trigger_set_updated_at();

-- RLS
alter table public.product_templates enable row level security;

create policy "Authenticated users can read templates"
  on public.product_templates for select
  to authenticated
  using (true);

create policy "Authenticated users can insert templates"
  on public.product_templates for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update templates"
  on public.product_templates for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete templates"
  on public.product_templates for delete
  to authenticated
  using (true);

-- Audit tracking
select audit.enable_tracking('public.product_templates'::regclass);

-- =============================================================================
-- Seed data: 5 templates for common furry marketplace product types
-- NOTE: Descriptions are GUIDELINES telling sellers what to fill in,
--       not actual content. Icon names must match lucideIconMap.ts keys.
-- =============================================================================

insert into public.product_templates (name_en, name_es, description_en, description_es, sort_order, sections) values

-- 1. Art Commission (service) — the bread and butter of furry marketplaces
(
  'Art Commission',
  'Comision de Arte',
  'For custom artwork: pricing tiers, process steps, and terms',
  'Para arte personalizado: niveles de precio, pasos del proceso y terminos',
  1,
  '[
    {
      "name_en": "What You Get",
      "name_es": "Que Incluye",
      "type": "cards",
      "sort_order": 0,
      "items": [
        {
          "title_en": "Base Package",
          "title_es": "Paquete Base",
          "description_en": "Describe what the buyer gets at the listed price (e.g. single character, flat color, simple bg)",
          "description_es": "Describe que obtiene el comprador al precio listado (ej. un personaje, color plano, fondo simple)",
          "icon": "Palette",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Add-ons",
          "title_es": "Extras",
          "description_en": "List available upgrades and their prices (e.g. extra character +$X, complex bg +$X)",
          "description_es": "Lista las mejoras disponibles y sus precios (ej. personaje extra +$X, fondo complejo +$X)",
          "icon": "Sparkles",
          "image_url": "",
          "sort_order": 1
        }
      ]
    },
    {
      "name_en": "How It Works",
      "name_es": "Como Funciona",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        {
          "title_en": "Placing Your Order",
          "title_es": "Hacer Tu Pedido",
          "description_en": "Explain what references or info the buyer needs to provide (ref sheet, pose ideas, color palette)",
          "description_es": "Explica que referencias o informacion debe proporcionar el comprador (ref sheet, ideas de pose, paleta de color)",
          "icon": "FileText",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Turnaround Time",
          "title_es": "Tiempo de Entrega",
          "description_en": "State your typical delivery window and how many revision rounds are included",
          "description_es": "Indica tu tiempo de entrega tipico y cuantas rondas de revision estan incluidas",
          "icon": "Clock",
          "image_url": "",
          "sort_order": 1
        },
        {
          "title_en": "Terms & Revisions",
          "title_es": "Terminos y Revisiones",
          "description_en": "Clarify your policy on revisions, cancellations, and usage rights for the finished piece",
          "description_es": "Aclara tu politica de revisiones, cancelaciones y derechos de uso de la pieza terminada",
          "icon": "Shield",
          "image_url": "",
          "sort_order": 2
        }
      ]
    }
  ]'::jsonb
),

-- 2. Fursuit / Craft Commission (service) — high-value custom orders
(
  'Fursuit Commission',
  'Comision de Fursuit',
  'For fursuits and wearables: features, process, and care guide',
  'Para fursuits y accesorios: caracteristicas, proceso y guia de cuidado',
  2,
  '[
    {
      "name_en": "Features & Specs",
      "name_es": "Caracteristicas",
      "type": "cards",
      "sort_order": 0,
      "items": [
        {
          "title_en": "Materials",
          "title_es": "Materiales",
          "description_en": "Describe the fur type, foam, and other materials you use (e.g. NFT fur, EVA foam, resin)",
          "description_es": "Describe el tipo de pelaje, espuma y otros materiales que usas (ej. pelaje NFT, espuma EVA, resina)",
          "icon": "Star",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Included Parts",
          "title_es": "Partes Incluidas",
          "description_en": "List what comes in this commission (head, paws, tail, bodysuit, etc.)",
          "description_es": "Lista que incluye esta comision (cabeza, patas, cola, bodysuit, etc.)",
          "icon": "Package",
          "image_url": "",
          "sort_order": 1
        },
        {
          "title_en": "Customization",
          "title_es": "Personalizacion",
          "description_en": "Explain what the buyer can customize (eye color, jaw style, LED options, etc.)",
          "description_es": "Explica que puede personalizar el comprador (color de ojos, tipo de mandibula, opciones LED, etc.)",
          "icon": "Brush",
          "image_url": "",
          "sort_order": 2
        }
      ]
    },
    {
      "name_en": "Production Process",
      "name_es": "Proceso de Produccion",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        {
          "title_en": "Timeline",
          "title_es": "Cronograma",
          "description_en": "Break down the production stages and estimated duration for each (e.g. sculpt 2w, fur 3w, assembly 1w)",
          "description_es": "Desglosa las etapas de produccion y duracion estimada de cada una (ej. escultura 2s, pelaje 3s, ensamble 1s)",
          "icon": "Clock",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Payment Plan",
          "title_es": "Plan de Pago",
          "description_en": "Explain your payment structure (e.g. 50% deposit, 50% before shipping)",
          "description_es": "Explica tu estructura de pago (ej. 50% deposito, 50% antes del envio)",
          "icon": "Shield",
          "image_url": "",
          "sort_order": 1
        }
      ]
    },
    {
      "name_en": "Care Guide",
      "name_es": "Guia de Cuidado",
      "type": "two-column",
      "sort_order": 2,
      "items": [
        {
          "title_en": "Cleaning",
          "title_es": "Limpieza",
          "description_en": "How to clean and maintain the fursuit (spot clean, brush, wash frequency)",
          "description_es": "Como limpiar y mantener el fursuit (limpieza puntual, cepillado, frecuencia de lavado)",
          "icon": "Wind",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Storage",
          "title_es": "Almacenamiento",
          "description_en": "Recommend proper storage conditions (cool/dry, head on stand, tail hanging)",
          "description_es": "Recomienda condiciones de almacenamiento adecuadas (fresco/seco, cabeza en soporte, cola colgando)",
          "icon": "Package",
          "image_url": "",
          "sort_order": 1
        }
      ]
    }
  ]'::jsonb
),

-- 3. Merch / Physical Product (merch) — prints, pins, plushies, apparel
(
  'Merch Item',
  'Articulo de Merch',
  'For physical goods: product details, sizing, and shipping info',
  'Para productos fisicos: detalles del producto, tallas e informacion de envio',
  3,
  '[
    {
      "name_en": "Product Details",
      "name_es": "Detalles del Producto",
      "type": "two-column",
      "sort_order": 0,
      "items": [
        {
          "title_en": "Material & Quality",
          "title_es": "Material y Calidad",
          "description_en": "Describe materials and finish (e.g. 100% cotton, holographic vinyl, resin-cast)",
          "description_es": "Describe materiales y acabado (ej. 100% algodon, vinilo holografico, resina moldeada)",
          "icon": "Star",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Dimensions",
          "title_es": "Dimensiones",
          "description_en": "List sizes or dimensions (e.g. 2-inch pin, A4 print, S/M/L/XL)",
          "description_es": "Lista tallas o dimensiones (ej. pin de 5cm, impresion A4, S/M/L/XL)",
          "icon": "Package",
          "image_url": "",
          "sort_order": 1
        },
        {
          "title_en": "Shipping",
          "title_es": "Envio",
          "description_en": "Shipping options and estimated delivery times (domestic and international)",
          "description_es": "Opciones de envio y tiempos de entrega estimados (nacional e internacional)",
          "icon": "Truck",
          "image_url": "",
          "sort_order": 2
        }
      ]
    },
    {
      "name_en": "FAQ",
      "name_es": "Preguntas Frecuentes",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        {
          "title_en": "Returns & Exchanges",
          "title_es": "Devoluciones y Cambios",
          "description_en": "State your return/exchange policy and conditions",
          "description_es": "Indica tu politica de devoluciones y cambios y sus condiciones",
          "icon": "",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Care Instructions",
          "title_es": "Instrucciones de Cuidado",
          "description_en": "How to care for the product to keep it in good condition",
          "description_es": "Como cuidar el producto para mantenerlo en buen estado",
          "icon": "",
          "image_url": "",
          "sort_order": 1
        }
      ]
    }
  ]'::jsonb
),

-- 4. Digital Download (digital) — art packs, ref sheets, assets
(
  'Digital Download',
  'Descarga Digital',
  'For digital products: what is included, file formats, and usage terms',
  'Para productos digitales: que incluye, formatos de archivo y terminos de uso',
  4,
  '[
    {
      "name_en": "What You Get",
      "name_es": "Que Incluye",
      "type": "cards",
      "sort_order": 0,
      "items": [
        {
          "title_en": "File Contents",
          "title_es": "Contenido del Archivo",
          "description_en": "List everything included in the download (number of files, variations, bonus content)",
          "description_es": "Lista todo lo incluido en la descarga (cantidad de archivos, variaciones, contenido extra)",
          "icon": "Download",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "File Formats",
          "title_es": "Formatos de Archivo",
          "description_en": "Specify formats and resolutions (e.g. PNG 4000x4000, PSD layers, PDF)",
          "description_es": "Especifica formatos y resoluciones (ej. PNG 4000x4000, capas PSD, PDF)",
          "icon": "Image",
          "image_url": "",
          "sort_order": 1
        }
      ]
    },
    {
      "name_en": "License & Usage",
      "name_es": "Licencia y Uso",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        {
          "title_en": "Personal Use",
          "title_es": "Uso Personal",
          "description_en": "Explain what the buyer can do with the files for personal use (avatars, prints for self, etc.)",
          "description_es": "Explica que puede hacer el comprador con los archivos para uso personal (avatares, impresiones propias, etc.)",
          "icon": "Heart",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Commercial Use",
          "title_es": "Uso Comercial",
          "description_en": "State whether commercial use is allowed and any restrictions or additional licensing required",
          "description_es": "Indica si el uso comercial esta permitido y cualquier restriccion o licencia adicional requerida",
          "icon": "Shield",
          "image_url": "",
          "sort_order": 1
        }
      ]
    }
  ]'::jsonb
),

-- 5. Con / Meetup Ticket (ticket) — furry cons, meetups, live events
(
  'Event Ticket',
  'Boleto de Evento',
  'For cons, meetups, and live events: highlights, schedule, and venue info',
  'Para convenciones, meetups y eventos en vivo: destacados, horario e informacion del lugar',
  5,
  '[
    {
      "name_en": "Event Highlights",
      "name_es": "Destacados del Evento",
      "type": "cards",
      "sort_order": 0,
      "items": [
        {
          "title_en": "Main Attraction",
          "title_es": "Atraccion Principal",
          "description_en": "Describe the main activity or feature of the event (live drawing, panel, workshop)",
          "description_es": "Describe la actividad o caracteristica principal del evento (dibujo en vivo, panel, taller)",
          "icon": "Zap",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Meet & Greet",
          "title_es": "Meet & Greet",
          "description_en": "Will there be a meet-and-greet? Describe what attendees can expect",
          "description_es": "Habra un meet-and-greet? Describe que pueden esperar los asistentes",
          "icon": "Users",
          "image_url": "",
          "sort_order": 1
        },
        {
          "title_en": "Exclusive Items",
          "title_es": "Articulos Exclusivos",
          "description_en": "List any event-exclusive merch, prints, or giveaways available only at this event",
          "description_es": "Lista cualquier merch, impresiones o regalos exclusivos del evento disponibles solo ahi",
          "icon": "Award",
          "image_url": "",
          "sort_order": 2
        }
      ]
    },
    {
      "name_en": "Venue & Schedule",
      "name_es": "Lugar y Horario",
      "type": "two-column",
      "sort_order": 1,
      "items": [
        {
          "title_en": "Location",
          "title_es": "Ubicacion",
          "description_en": "Venue name, address, and how to find your booth or table (e.g. Artist Alley, Table A-42)",
          "description_es": "Nombre del lugar, direccion y como encontrar tu stand o mesa (ej. Artist Alley, Mesa A-42)",
          "icon": "MapPin",
          "image_url": "",
          "sort_order": 0
        },
        {
          "title_en": "Date & Hours",
          "title_es": "Fecha y Horario",
          "description_en": "Event dates and your hours of attendance",
          "description_es": "Fechas del evento y tus horas de asistencia",
          "icon": "Clock",
          "image_url": "",
          "sort_order": 1
        }
      ]
    }
  ]'::jsonb
);
