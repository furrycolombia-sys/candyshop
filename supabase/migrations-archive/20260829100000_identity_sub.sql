-- =============================================================================
-- AeleOS identity: link a local profile to a Clerk identity
-- =============================================================================
-- Nullable on purpose. A profile restored from backup has no identity_sub until
-- its owner signs in and claims it by verified email. Null means "not yet
-- claimed", which is an ordinary state and not an error.
-- =============================================================================

alter table public.user_profiles
  add column if not exists identity_sub text;

comment on column public.user_profiles.identity_sub is
  'Clerk subject claim (auth.jwt()->>''sub''). Null until the person signs in '
  'and claims this profile. Unique so two identities cannot claim one profile.';

-- Unique but not a primary key: nulls are permitted and do not collide.
create unique index if not exists user_profiles_identity_sub_idx
  on public.user_profiles (identity_sub);
