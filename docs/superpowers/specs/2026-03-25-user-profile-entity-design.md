# User Profile Entity — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Related Issue:** GH-11 (Admin Audit Log)

---

## Problem

The audit log needs to show who performed each action. Currently it resolves `user_id` → email via a `security definer` function that queries `auth.users` directly. This is fragile:

- `auth.users` is Supabase-managed and not designed for application queries
- If a user is deleted from auth, their audit trail loses the "who" data
- There's no place to store user-editable profile data (display name, contact email, custom avatar)
- User data changes over time (provider name changes, email changes) with no history

## Solution

Create a `public.user_profiles` table that:

1. Syncs auth data (email, avatar, provider) on every login via a database trigger
2. Stores user-editable display fields (display name, contact email, custom avatar)
3. Is tracked by the existing audit system for full change history
4. Replaces direct `auth.users` lookups in the audit log view

---

## Database Schema

### `public.user_profiles`

| Column               | Type        | Nullable | Default | Notes                                                                 |
| -------------------- | ----------- | -------- | ------- | --------------------------------------------------------------------- |
| `id`                 | uuid        | NO       | —       | PK, same as `auth.users.id`                                           |
| `email`              | text        | NO       | —       | Login email, synced from auth. CHECK: must contain `@`                |
| `avatar_url`         | text        | YES      | NULL    | Auth provider avatar, synced on every login                           |
| `provider`           | text        | YES      | NULL    | Last auth provider used (`google`, `discord`)                         |
| `display_name`       | text        | YES      | NULL    | User-editable. Set from provider on first login, preserved after      |
| `display_email`      | text        | YES      | NULL    | User-editable contact email. CHECK: must contain `@` if set           |
| `display_avatar_url` | text        | YES      | NULL    | User-editable custom avatar. CHECK: must start with `https://` if set |
| `first_seen_at`      | timestamptz | NO       | `now()` | Set once on first login, never updated                                |
| `last_seen_at`       | timestamptz | NO       | `now()` | Updated on every login                                                |
| `created_at`         | timestamptz | NO       | `now()` | Row creation timestamp                                                |
| `updated_at`         | timestamptz | NO       | `now()` | Auto-updated via existing `trigger_set_updated_at()`                  |

### Constraints

```sql
CHECK (email ~* '^.+@.+$')
CHECK (display_email IS NULL OR display_email ~* '^.+@.+$')
CHECK (display_avatar_url IS NULL OR display_avatar_url ~* '^https://')
```

### Indexes

- `user_profiles_email_idx` UNIQUE on `email` (Supabase enforces email uniqueness in auth)

### RLS Policies

- **SELECT:** All authenticated users can read all profiles
- **INSERT:** Users can insert their own row (`auth.uid() = id`) — needed as fallback; primary insert is via trigger
- **UPDATE:** Users can only update their own row (`auth.uid() = id`)
- **DELETE:** No policy — profiles cannot be deleted via the API

### Display Field Fallbacks

Applied in the audit view at the database level:

| Display context | SQL                                                 |
| --------------- | --------------------------------------------------- |
| Name            | `COALESCE(display_name, split_part(email, '@', 1))` |
| Email           | `COALESCE(display_email, email)`                    |
| Avatar          | `COALESCE(display_avatar_url, avatar_url)`          |

### Audit Tracking

Enable the existing audit trigger:

```sql
SELECT audit.enable_tracking('public.user_profiles'::regclass);
```

Every INSERT and UPDATE is captured in `audit.logged_actions` with full field-level diffs.

**Volume note:** Every login updates `last_seen_at`, generating an audit entry. This is acceptable for our scale. If volume becomes a concern, `last_seen_at` updates can be excluded from the audit trigger in the future.

---

## Sync Flow

### Trigger Point

A **database trigger** on `auth.users` that fires after INSERT or UPDATE. This is the cleanest approach because:

- It fires regardless of which app the user logs in through (auth, store, studio, admin all share `handleOAuthCallback` in `packages/api`)
- No app code changes needed for the sync
- Runs as `security definer` so RLS is bypassed for the system upsert
- No package purity violation (sync logic lives in the database, not in a shared package)

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, email, avatar_url, provider, display_name,
    first_seen_at, last_seen_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_user_meta_data->>'full_name',
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    provider = EXCLUDED.provider,
    last_seen_at = now(),
    -- Only set display_name if it's still NULL (user hasn't customized it)
    display_name = COALESCE(user_profiles.display_name, EXCLUDED.display_name);
  -- Never touch: display_email, display_avatar_url (user-owned)

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_change
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile();
```

### Error Handling

Trigger failures MUST NOT block the auth operation. The trigger uses `SECURITY DEFINER` and operates on a simple public table — failures are unlikely but if they occur, Postgres will log them. The auth session proceeds regardless because this is an AFTER trigger (the auth.users row is already committed).

### Field Ownership Rules

| Field                | Owner                   | Sync behavior                                                           |
| -------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `email`              | Auth provider           | Overwritten every login                                                 |
| `avatar_url`         | Auth provider           | Overwritten every login                                                 |
| `provider`           | Auth provider           | Overwritten every login                                                 |
| `last_seen_at`       | System                  | Overwritten every login                                                 |
| `display_name`       | User (after first edit) | Set on first login via `COALESCE`, never overwritten after user sets it |
| `display_email`      | User                    | Never touched by sync                                                   |
| `display_avatar_url` | User                    | Never touched by sync                                                   |

---

## Audit Log Integration

### Current State

```sql
-- security definer function hitting auth.users
audit.get_user_email(user_id uuid) → text

-- View using the function
audit.logged_actions_with_user AS
  SELECT la.*, audit.get_user_email(la.user_id) AS user_email
  FROM audit.logged_actions la;
```

### New State

```sql
audit.logged_actions_with_user AS
  SELECT
    la.*,
    up.email AS user_email,
    COALESCE(up.display_name, split_part(up.email, '@', 1)) AS user_display_name,
    COALESCE(up.display_avatar_url, up.avatar_url) AS user_avatar
  FROM audit.logged_actions la
  LEFT JOIN public.user_profiles up ON up.id = la.user_id;
```

### Cleanup

Remove:

- `audit.get_user_email()` function
- Associated grants on the function

### Benefits

- No `security definer` needed — `user_profiles` is a public table with RLS
- Faster — simple JOIN vs function call per row
- Persistent — data survives `auth.users` deletion
- Richer — name and avatar available, not just email
- Fallbacks applied at DB level — consistent across all consumers

---

## Account Settings Page

### Location

Auth app: `apps/auth/src/features/account/`

### Route

`/[locale]/account` — accessible via the existing "Account" link in AppNavigation.

### Architecture

```
features/account/
├── domain/
│   └── types.ts                 # UserProfile interface, validation schema
├── application/
│   └── hooks/
│       ├── useProfile.ts        # Fetch current user's profile
│       └── useUpdateProfile.ts  # Mutation to update display fields
├── infrastructure/
│   └── profileQueries.ts        # Fetch/update via Supabase client
├── presentation/
│   ├── pages/
│   │   └── AccountPage.tsx      # Main page
│   └── components/
│       ├── ProfileCard.tsx      # Read-only auth info (login email, provider, member since)
│       └── ProfileForm.tsx      # Editable display fields
└── index.ts
```

### Page Layout

Two sections:

1. **Profile Card** (read-only) — shows login email, auth provider, avatar from provider, member since date
2. **Profile Form** (editable) — display name, contact email, custom avatar URL, with Save button

### Validation (Zod)

- `display_name`: optional string, max 100 characters
- `display_email`: optional string, valid email format
- `display_avatar_url`: optional string, valid HTTPS URL format

### Save Behavior

Direct Supabase update: `supabase.from('user_profiles').update({ ... }).eq('id', user.id)`

RLS ensures `auth.uid() = id`. The existing audit trigger captures the UPDATE automatically with full before/after diffs.

### i18n Keys

New translation keys needed in `apps/auth/src/shared/infrastructure/i18n/messages/`:

- `account.title` — "Account Settings" / "Configuración de Cuenta"
- `account.profileCard.*` — login email, provider, member since labels
- `account.form.*` — display name, contact email, avatar URL labels + placeholders
- `account.form.save` — "Save Changes" / "Guardar Cambios"
- `account.form.success` — "Profile updated" / "Perfil actualizado"

---

## Admin Audit Log UI Update

The "Who" column and expanded row detail use the richer profile data:

### Table Row ("Who" column)

Priority: `user_display_name` → truncated UUID → `db_user`

### Expanded Row Detail

Shows:

- **User:** avatar + display_name + (email) with copy UUID button
- **Transaction:** ID
- **IP:** address

---

## Migration Plan

Single migration file: `20260325600000_user_profiles.sql`

1. Create `public.user_profiles` table with CHECK constraints
2. Add `updated_at` trigger using existing `trigger_set_updated_at()` function
3. Create RLS policies (SELECT all, INSERT own, UPDATE own, no DELETE)
4. Create index (UNIQUE on email)
5. Create `sync_user_profile()` trigger function
6. Attach trigger to `auth.users`
7. Enable audit tracking on `user_profiles`
8. Backfill existing users from `auth.users`:
   ```sql
   INSERT INTO public.user_profiles (id, email, first_seen_at, last_seen_at)
   SELECT id, email, created_at, COALESCE(last_sign_in_at, created_at)
   FROM auth.users
   ON CONFLICT DO NOTHING;
   ```
9. Replace `audit.logged_actions_with_user` view (JOIN instead of function)
10. Drop `audit.get_user_email()` function and grants

---

## What Changes Where

| File/Area                                       | Change                                                       |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `supabase/migrations/`                          | New migration for user_profiles, trigger, updated audit view |
| `apps/auth/src/features/account/`               | New feature: account settings page (full Clean Architecture) |
| `apps/auth/src/app/[locale]/account/page.tsx`   | New route                                                    |
| `apps/auth/src/shared/infrastructure/i18n/`     | Add i18n keys for account page                               |
| `apps/admin/src/features/audit/domain/types.ts` | Add `user_display_name`, `user_avatar` to AuditEntry         |
| `apps/admin/src/features/audit/presentation/`   | Update table and detail to show name + avatar                |
| `apps/admin/src/shared/infrastructure/i18n/`    | Add i18n keys for new audit display fields                   |

### What stays untouched

- Store app — no changes
- Studio app — no changes
- Payments app — no changes
- Landing app — no changes
- AppNavigation — already links to auth app ("Account")
- OAuth flow — unchanged, trigger handles sync automatically
- `packages/api/src/supabase/callback.ts` — no changes needed
- Existing audit entries — work via LEFT JOIN (null profile = fallback to UUID/db_user)
