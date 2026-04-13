-- =============================================================================
-- Seed Data: Moonfest 2026 + Core Permissions
-- =============================================================================

-- Permissions are seeded by the permissions migrations, not here.

-- -----------------------------------------------------------------------------
-- Event: Moonfest 2026
-- -----------------------------------------------------------------------------
-- Guarded: the events table may not exist in minimal migration setups.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'events') then
    insert into public.events (
      slug,
      name_en,
      name_es,
      description_en,
      description_es,
      location,
      starts_at,
      ends_at
    ) values (
      'moonfest-2026',
      'Moonfest 2026',
      'Moonfest 2026',
      'A four-day furry convention in Paipa, Boyaca, Colombia. Includes parties, panels, artist market, and round-trip transportation from Bogota.',
      'Una convencion furry de cuatro dias en Paipa, Boyaca, Colombia. Incluye fiestas, paneles, mercado de artistas y transporte ida y vuelta desde Bogota.',
      'Estelar Paipa Hotel & Convention Center, Boyaca, Colombia',
      '2026-07-10T14:00:00-05:00',
      '2026-07-13T12:00:00-05:00'
    ) on conflict (slug) do nothing;
  end if;
end $$;

-- Products are created manually by users in the app, not by the seed.
-- Resource permissions are seeded by the permissions migrations, not here.
