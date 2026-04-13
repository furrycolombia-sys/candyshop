-- Add refundable flag to products (nullable: null = not specified, true/false = explicit)
alter table public.products
  add column refundable boolean;

comment on column public.products.refundable is 'null = not specified, true = refundable, false = non-refundable';
