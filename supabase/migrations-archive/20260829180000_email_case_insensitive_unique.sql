-- =============================================================================
-- Case-insensitive uniqueness on user_profiles.email
-- =============================================================================
-- user_profiles_email_idx (from the original schema) is a plain unique btree
-- index on email, which is case-SENSITIVE. That let two rows exist for one
-- real person: "Rev.Probe@Example.COM" and "rev.probe@example.com" both
-- insert successfully today, because Postgres treats them as different
-- values even though they are the same mailbox.
--
-- This matters because resolveProfile()'s claim path always looks up by the
-- LOWERCASED address (packages/auth/src/server/resolveProfile.ts), so any
-- write path that stores a different case (the bug fixed in
-- supabaseProfileStore.ts's create(), same commit) orphans that profile:
-- neither findBySub (after a Clerk promotion changes the sub) nor
-- findByEmail (case-lowercased) will ever find it again, and a second,
-- duplicate profile gets minted instead — exactly the failure this whole
-- migration exists to prevent for the 196 restored accounts.
--
-- A functional unique index on lower(email) closes this at the database
-- level, independent of any application-layer lowercasing, so this class of
-- bug cannot recur through some other write path (an admin tool, a future
-- RPC, a manual `insert`, etc).
--
-- Verified before adding this index that it builds cleanly against the 196
-- restored rows: 0 rows where email <> lower(email), and 0 duplicate
-- lower(email) groups.
-- =============================================================================

drop index if exists public.user_profiles_email_idx;

create unique index user_profiles_email_lower_idx
  on public.user_profiles (lower(email));

comment on index public.user_profiles_email_lower_idx is
  'Case-insensitive uniqueness on email. Replaces the case-sensitive '
  'user_profiles_email_idx: resolveProfile() always looks up by lowercased '
  'email, so two differently-cased rows for the same address must never '
  'both be able to exist.';
