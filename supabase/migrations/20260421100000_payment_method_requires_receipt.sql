-- Add requires_receipt flag to seller_payment_methods.
-- When true, the checkout flow shows a mandatory receipt upload instead of
-- the (now-removed) broken "file" form field type.

ALTER TABLE public.seller_payment_methods
  ADD COLUMN requires_receipt boolean NOT NULL DEFAULT false;
