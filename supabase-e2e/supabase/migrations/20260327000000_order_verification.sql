-- =============================================================================
-- Order Verification: RPCs for seller actions and buyer evidence resubmission
-- =============================================================================

-- Seller action: update order status with validation
create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_seller_note text default null
) returns void
language plpgsql
security definer
as $$
declare
  v_order record;
  v_timeout_hours integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order is null then
    raise exception 'Order not found';
  end if;

  case p_new_status
    when 'approved' then
      if v_order.payment_status not in ('pending_verification', 'evidence_requested') then
        raise exception 'Cannot approve from status %', v_order.payment_status;
      end if;

    when 'rejected' then
      if v_order.payment_status not in ('pending_verification', 'evidence_requested') then
        raise exception 'Cannot reject from status %', v_order.payment_status;
      end if;
      -- Release stock
      perform public.release_stock(oi.product_id, oi.quantity)
      from public.order_items oi where oi.order_id = p_order_id;
      -- Clear receipt data
      update public.orders set transfer_number = null, receipt_url = null where id = p_order_id;

    when 'evidence_requested' then
      if v_order.payment_status not in ('pending_verification') then
        raise exception 'Cannot request evidence from status %', v_order.payment_status;
      end if;
      -- Reset timer
      select value::integer into v_timeout_hours
      from public.payment_settings where key = 'timeout_evidence_requested_hours';
      update public.orders set expires_at = now() + (coalesce(v_timeout_hours, 24) || ' hours')::interval where id = p_order_id;

    else
      raise exception 'Invalid status: %', p_new_status;
  end case;

  update public.orders
  set payment_status = p_new_status::payment_status,
      seller_note = coalesce(p_seller_note, seller_note)
  where id = p_order_id;
end;
$$;

-- Buyer action: resubmit evidence after seller requests it
create or replace function public.resubmit_evidence(
  p_order_id uuid,
  p_transfer_number text,
  p_receipt_url text
) returns void
language plpgsql
security definer
as $$
declare
  v_order record;
  v_timeout_hours integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order is null then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status != 'evidence_requested' then
    raise exception 'Can only resubmit when evidence is requested';
  end if;

  select value::integer into v_timeout_hours
  from public.payment_settings where key = 'timeout_pending_verification_hours';

  update public.orders
  set payment_status = 'pending_verification',
      transfer_number = p_transfer_number,
      receipt_url = p_receipt_url,
      expires_at = now() + (coalesce(v_timeout_hours, 72) || ' hours')::interval
  where id = p_order_id;
end;
$$;
