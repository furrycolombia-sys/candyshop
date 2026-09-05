-- Add granular permission for exporting users data from admin users page
insert into public.permissions (
  key,
  name_en,
  name_es,
  description_en,
  description_es,
  depends_on
)
select
  'users.export',
  'Export Users',
  'Exportar Usuarios',
  'Export selected users and receipt backups',
  'Exportar usuarios seleccionados y respaldos de comprobantes',
  'user_permissions.read'
where not exists (
  select 1 from public.permissions where key = 'users.export'
);

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key = 'users.export'
and not exists (
  select 1
  from public.resource_permissions rp
  where rp.permission_id = p.id
    and rp.resource_type = 'global'
    and rp.resource_id is null
);
