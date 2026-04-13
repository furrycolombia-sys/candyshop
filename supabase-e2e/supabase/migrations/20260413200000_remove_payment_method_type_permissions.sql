-- =============================================================================
-- Remove payment_method_types permissions
-- =============================================================================
-- The payment_method_types table was dropped in 20260413100000. These
-- permission rows are now dead weight. Remove them and their resource
-- permission + user permission links.

-- 1. Delete user_permissions that reference payment_method_types resource_permissions
delete from public.user_permissions
where resource_permission_id in (
  select rp.id
  from public.resource_permissions rp
  join public.permissions p on p.id = rp.permission_id
  where p.key in (
    'payment_method_types.create',
    'payment_method_types.read',
    'payment_method_types.update',
    'payment_method_types.delete'
  )
);

-- 2. Delete resource_permissions for payment_method_types
delete from public.resource_permissions
where permission_id in (
  select id from public.permissions
  where key in (
    'payment_method_types.create',
    'payment_method_types.read',
    'payment_method_types.update',
    'payment_method_types.delete'
  )
);

-- 3. Delete the permission definitions themselves
delete from public.permissions
where key in (
  'payment_method_types.create',
  'payment_method_types.read',
  'payment_method_types.update',
  'payment_method_types.delete'
);
