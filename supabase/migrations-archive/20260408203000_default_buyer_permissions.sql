-- =============================================================================
-- Default buyer permissions for every new auth user
-- =============================================================================

create or replace function public.grant_default_buyer_permissions(
  p_user_id uuid,
  p_granted_by uuid,
  p_reason text default 'Default buyer permissions'
)
returns void
security definer
language plpgsql
as $$
begin
  insert into public.user_permissions (
    user_id,
    resource_permission_id,
    mode,
    granted_by,
    reason
  )
  select
    p_user_id,
    rp.id,
    'grant',
    p_granted_by,
    p_reason
  from public.resource_permissions rp
  inner join public.permissions p on p.id = rp.permission_id
  where rp.resource_type = 'global'
    and p.key in (
      'products.read',
      'product_reviews.create',
      'product_reviews.read',
      'product_reviews.update',
      'product_reviews.delete',
      'orders.create',
      'orders.read',
      'receipts.create',
      'receipts.delete'
    )
  on conflict (user_id, resource_permission_id) do nothing;
end;
$$;

create or replace function public.handle_auth_user_default_permissions()
returns trigger
security definer
language plpgsql
as $$
begin
  perform public.grant_default_buyer_permissions(
    NEW.id,
    NEW.id,
    'Default buyer permissions'
  );

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_default_permissions on auth.users;

create trigger on_auth_user_default_permissions
  after insert on auth.users
  for each row execute function public.handle_auth_user_default_permissions();

do $$
declare
  v_user record;
begin
  for v_user in select id from auth.users loop
    perform public.grant_default_buyer_permissions(
      v_user.id,
      v_user.id,
      'Backfill default buyer permissions'
    );
  end loop;
end;
$$;
