-- =============================================================================
-- Migration: Replace dual price fields with single price + currency
-- =============================================================================
-- Products: price_cop + price_usd → price + currency
--           compare_at_price_cop + compare_at_price_usd → compare_at_price
-- Orders: total_cop → total + currency
-- Order items: unit_price_cop → unit_price + currency
-- =============================================================================

-- Popular currencies supported by the store
create type public.currency_code as enum (
  'USD', 'EUR', 'GBP', 'COP', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN',
  'CAD', 'AUD', 'JPY', 'CNY', 'KRW', 'INR', 'CHF', 'SEK', 'NOK',
  'DKK', 'NZD', 'SGD', 'HKD', 'CZK', 'HUF', 'PLN', 'RON', 'TRY',
  'ZAR', 'ILS', 'SAR', 'AED', 'THB', 'IDR', 'MYR', 'PHP', 'VND',
  'NGN', 'KES', 'GHS', 'UYU', 'BOB', 'PYG', 'GTQ', 'HNL', 'NIO',
  'CRC', 'DOP', 'CUP', 'JMD', 'TTD', 'BBD', 'XCD'
);

-- -----------------------------------------------------------------------------
-- Products table
-- -----------------------------------------------------------------------------

-- Add new columns
alter table public.products
  add column price integer not null default 0,
  add column currency public.currency_code not null default 'USD',
  add column compare_at_price integer;

-- Migrate data: prefer COP when non-zero (original primary currency), else USD
update public.products set
  price = case when price_cop <> 0 then price_cop else price_usd end,
  currency = case when price_cop <> 0 then 'COP'::public.currency_code else 'USD'::public.currency_code end,
  compare_at_price = case
    when price_cop <> 0 then compare_at_price_cop
    else compare_at_price_usd
  end;

-- Drop old columns
alter table public.products
  drop column price_cop,
  drop column price_usd,
  drop column compare_at_price_cop,
  drop column compare_at_price_usd;

-- Remove default now that data is migrated
alter table public.products
  alter column price drop default,
  alter column currency drop default;

-- -----------------------------------------------------------------------------
-- Orders table
-- -----------------------------------------------------------------------------

alter table public.orders
  add column total integer not null default 0,
  add column currency public.currency_code not null default 'USD';

update public.orders set
  total = total_cop,
  currency = 'COP'::public.currency_code;

alter table public.orders
  drop column total_cop;

alter table public.orders
  alter column total drop default,
  alter column currency drop default;

-- -----------------------------------------------------------------------------
-- Order items table
-- -----------------------------------------------------------------------------

alter table public.order_items
  add column unit_price integer not null default 0,
  add column currency public.currency_code not null default 'USD';

update public.order_items set
  unit_price = unit_price_cop,
  currency = (
    select o.currency from public.orders o
    where o.id = public.order_items.order_id
  )::public.currency_code;

alter table public.order_items
  drop column unit_price_cop;

alter table public.order_items
  alter column unit_price drop default,
  alter column currency drop default;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index idx_products_currency on public.products(currency);
