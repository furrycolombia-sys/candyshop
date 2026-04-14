-- =============================================================================
-- Add sort_order column to products for manual reordering
-- =============================================================================

alter table public.products
  add column sort_order integer not null default 0;

-- Backfill existing rows with sequential values based on creation order
with numbered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.products
)
update public.products p
set sort_order = n.rn
from numbered n
where p.id = n.id;

-- Index for efficient ordering
create index idx_products_sort_order on public.products(sort_order);
