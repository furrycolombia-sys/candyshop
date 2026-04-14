-- Checkout payment details must never be publicly readable.
-- Buyers can only receive seller payment information through the
-- server-side checkout validation route after stock has been verified.

drop policy if exists "seller_payment_methods_read" on public.seller_payment_methods;

create policy "seller_payment_methods_read" on public.seller_payment_methods
  for select using (
    has_permission(auth.uid(), 'seller_payment_methods.read')
    and seller_id = auth.uid()
  );
