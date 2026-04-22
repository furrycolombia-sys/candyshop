-- =============================================================================
-- Allow delegates to generate signed URLs for receipts on orders they manage.
--
-- The receipts storage path is {orderId}/{filename}. Delegates can read orders
-- via is_order_delegate(), but the receipts_read storage policy only checked
-- has_permission(auth.uid(), 'receipts.read'), which delegates never hold.
-- =============================================================================

drop policy if exists "receipts_read" on storage.objects;

create policy "receipts_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (
      has_permission(auth.uid(), 'receipts.read')
      or (
        -- Only attempt the UUID cast when the path actually starts with one
        name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        and public.is_order_delegate(split_part(name, '/', 1)::uuid)
      )
    )
  );
