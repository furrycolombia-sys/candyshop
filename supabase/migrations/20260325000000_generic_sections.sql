-- =============================================================================
-- Generic Sections: Replace hardcoded highlight/faq/screenshots/type_details
-- with a single sections JSONB array
-- =============================================================================

-- Drop old columns
alter table public.products
  drop column if exists highlights,
  drop column if exists faq,
  drop column if exists screenshots,
  drop column if exists type_details;

-- Add generic sections column
alter table public.products
  add column sections jsonb not null default '[]';

comment on column public.products.sections is 'Generic product sections: [{name_en, name_es, type, sort_order, items: [{title_en, title_es, description_en, description_es, icon?, image_url?, sort_order}]}]';
