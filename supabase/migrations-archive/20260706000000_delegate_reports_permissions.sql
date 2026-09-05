-- Add granular permissions for delegated sales reports (payments app).
-- reports.read  -> a delegate can view the Delegated Reports page
-- reports.export -> a delegate can export the .xls from that page

insert into public.permissions (
  key, name_en, name_es, description_en, description_es, depends_on
)
select
  'reports.read',
  'View Delegated Reports',
  'Ver Reportes Delegados',
  'View the sales report for delegated products',
  'Ver el reporte de ventas de los productos delegados',
  'orders.read'
where not exists (
  select 1 from public.permissions where key = 'reports.read'
);

insert into public.permissions (
  key, name_en, name_es, description_en, description_es, depends_on
)
select
  'reports.export',
  'Export Delegated Reports',
  'Exportar Reportes Delegados',
  'Export the delegated sales report to Excel',
  'Exportar el reporte de ventas delegado a Excel',
  'reports.read'
where not exists (
  select 1 from public.permissions where key = 'reports.export'
);

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in ('reports.read', 'reports.export')
and not exists (
  select 1 from public.resource_permissions rp
  where rp.permission_id = p.id
    and rp.resource_type = 'global'
    and rp.resource_id is null
);
