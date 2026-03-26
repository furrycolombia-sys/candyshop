-- =============================================================================
-- User Profiles: Synced from auth.users, user-editable display fields
-- =============================================================================

-- Table
create table public.user_profiles (
  id uuid primary key,
  email text not null check (email ~* '^.+@.+$'),
  avatar_url text,
  provider text,
  display_name text,
  display_email text check (display_email is null or display_email ~* '^.+@.+$'),
  display_avatar_url text check (display_avatar_url is null or display_avatar_url ~* '^https://'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique index on email
create unique index user_profiles_email_idx on public.user_profiles(email);

-- updated_at trigger (reuse existing function from studio schema migration)
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function trigger_set_updated_at();

-- RLS
alter table public.user_profiles enable row level security;

create policy "Profiles: read all"
  on public.user_profiles for select
  using (true);

create policy "Profiles: insert own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Profiles: update own"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No DELETE policy — profiles cannot be deleted via the API

-- Sync trigger: fires on auth.users INSERT/UPDATE
create or replace function public.sync_user_profile()
returns trigger
security definer
language plpgsql
as $$
begin
  insert into public.user_profiles (
    id, email, avatar_url, provider, display_name,
    first_seen_at, last_seen_at
  ) values (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_user_meta_data->>'full_name',
    now(), now()
  )
  on conflict (id) do update set
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    provider = EXCLUDED.provider,
    last_seen_at = now(),
    display_name = coalesce(user_profiles.display_name, EXCLUDED.display_name);

  return NEW;
end;
$$;

create trigger on_auth_user_change
  after insert or update on auth.users
  for each row execute function public.sync_user_profile();

-- Enable audit tracking
select audit.enable_tracking('public.user_profiles'::regclass);

-- Backfill existing users
insert into public.user_profiles (id, email, first_seen_at, last_seen_at)
select
  id,
  email,
  created_at,
  coalesce(last_sign_in_at, created_at)
from auth.users
on conflict do nothing;

-- Replace audit view: JOIN user_profiles instead of function call
create or replace view audit.logged_actions_with_user as
select
  la.*,
  coalesce(up.display_email, up.email) as user_email,
  coalesce(up.display_name, split_part(up.email, '@', 1)) as user_display_name,
  coalesce(up.display_avatar_url, up.avatar_url) as user_avatar
from audit.logged_actions la
left join public.user_profiles up on up.id = la.user_id;

-- Grant access to view (replacing old grants)
grant select on audit.logged_actions_with_user to authenticated;

-- Clean up old function
drop function if exists audit.get_user_email(uuid);
