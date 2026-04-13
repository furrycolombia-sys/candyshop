-- =============================================================================
-- Nequi Buyer Fields: Add required_buyer_fields to payment_method_types
-- and buyer_info to orders for collecting structured buyer data at checkout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add required_buyer_fields to payment_method_types
-- ---------------------------------------------------------------------------
-- JSON array of field descriptors, e.g.:
-- [{"key":"cedula","type":"text"},{"key":"email","type":"email"},...]
alter table public.payment_method_types
  add column if not exists required_buyer_fields jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Add buyer_info to orders
-- ---------------------------------------------------------------------------
-- Stores the buyer-provided fields as a JSON object, e.g.:
-- {"cedula":"12345678","email":"buyer@example.com","tracking":"REF-001",...}
alter table public.orders
  add column if not exists buyer_info jsonb;

-- ---------------------------------------------------------------------------
-- 3. Update Nequi to require buyer fields
-- ---------------------------------------------------------------------------
update public.payment_method_types
set required_buyer_fields = '[
  {"key": "cedula",      "type": "text",  "required": true},
  {"key": "email",       "type": "email", "required": true},
  {"key": "tracking",    "type": "text",  "required": true},
  {"key": "name",        "type": "text",  "required": true},
  {"key": "sender_name", "type": "text",  "required": true}
]'::jsonb
where name_en = 'Nequi';
