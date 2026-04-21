ALTER TABLE public.seller_payment_methods
  ADD COLUMN requires_transfer_number boolean NOT NULL DEFAULT false;
