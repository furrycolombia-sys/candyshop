-- Add granular permission for accessing the sales report page in admin
insert into public.permissions (
  key,
  name_en,
  name_es,
  description_en,
  description_es,
  depends_on
)
select
  'admin.reports',
  'Sales Reports',
  'Reportes de Ventas',
  'View and export the full sales report with all orders and receipts',
  'Ver y exportar el reporte completo de ventas con todas las órdenes y recibos',
  'orders.read'
where not exists (
  select 1 from public.permissions where key = 'admin.reports'
);

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key = 'admin.reports'
and not exists (
  select 1
  from public.resource_permissions rp
  where rp.permission_id = p.id
    and rp.resource_type = 'global'
    and rp.resource_id is null
);
