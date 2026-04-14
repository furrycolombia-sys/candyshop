# User Profile Entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a user profile entity that syncs from auth on login, supports user-editable display fields, tracks all changes via the audit system, and replaces direct auth.users lookups in the audit log.

**Architecture:** Database trigger on `auth.users` upserts `public.user_profiles` on every login. The existing audit system tracks all changes. The admin audit log view JOINs `user_profiles` instead of calling a security-definer function. The auth app's existing AccountPage is extended with editable profile fields.

**Tech Stack:** PostgreSQL (Supabase), Next.js 16, React 19, TypeScript, TanStack Query, react-hook-form, Zod, next-intl

**Spec:** `docs/superpowers/specs/2026-03-25-user-profile-entity-design.md`

---

## File Map

### New Files

| File                                                                        | Responsibility                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------- |
| `supabase/migrations/20260325600000_user_profiles.sql`                      | Table, trigger, RLS, audit view replacement     |
| `apps/auth/src/features/account/domain/types.ts`                            | UserProfile interface, Zod validation schema    |
| `apps/auth/src/features/account/infrastructure/profileQueries.ts`           | Supabase fetch/update for user_profiles         |
| `apps/auth/src/features/account/application/hooks/useProfile.ts`            | TanStack Query hook to fetch profile            |
| `apps/auth/src/features/account/application/hooks/useUpdateProfile.ts`      | TanStack Mutation hook to update display fields |
| `apps/auth/src/features/account/presentation/components/ProfileCard.tsx`    | Read-only auth info card                        |
| `apps/auth/src/features/account/presentation/components/ProfileForm.tsx`    | Editable display fields form                    |
| `apps/auth/src/features/account/presentation/pages/AccountSettingsPage.tsx` | Page composing ProfileCard + ProfileForm        |
| `apps/auth/src/features/account/index.ts`                                   | Barrel export                                   |

### Modified Files

| File                                                                       | Change                                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/auth/src/features/auth/presentation/pages/AccountPage.tsx`           | Replace with import from new account feature, or redirect to new page |
| `apps/auth/src/shared/infrastructure/i18n/messages/en.json`                | Add account settings i18n keys                                        |
| `apps/auth/src/shared/infrastructure/i18n/messages/es.json`                | Add account settings i18n keys (Spanish)                              |
| `apps/admin/src/features/audit/domain/types.ts`                            | Add `user_display_name`, `user_avatar` to AuditEntry                  |
| `apps/admin/src/features/audit/presentation/components/AuditTable.tsx`     | Show display_name in "Who" column                                     |
| `apps/admin/src/features/audit/presentation/components/AuditRowDetail.tsx` | Show avatar + name + email in detail                                  |
| `apps/admin/src/shared/infrastructure/i18n/messages/en.json`               | Add i18n key for display name label                                   |
| `apps/admin/src/shared/infrastructure/i18n/messages/es.json`               | Add i18n key for display name label (Spanish)                         |

### Deleted After Migration

| File                                                       | Reason                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `supabase/migrations/20260325500000_audit_user_emails.sql` | Replaced by new migration (get_user_email function superseded by JOIN) |

---

## Task 1: Database Migration — user_profiles table + sync trigger

**Files:**

- Create: `supabase/migrations/20260325600000_user_profiles.sql`

- [ ] **Step 1: Write the migration**

```sql
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
grant select on audit.logged_actions_with_user to anon, authenticated;

-- Clean up old function
drop function if exists audit.get_user_email(uuid);
```

- [ ] **Step 2: Apply migration locally**

Run: `cd Z:/Github/candystore && npx supabase db reset --local`
Expected: All migrations apply successfully, seed data loads.

- [ ] **Step 3: Verify the trigger works**

Run:

```bash
npx supabase db query "select id::text, email, display_name, provider, first_seen_at::text from public.user_profiles limit 5" --local
```

Expected: Backfilled rows from auth.users appear. If no auth users exist yet, table is empty (trigger will fire on next signup/login).

- [ ] **Step 4: Verify the view works**

Run:

```bash
npx supabase db query "select event_id, user_email, user_display_name, user_avatar, table_name from audit.logged_actions_with_user limit 3" --local
```

Expected: Rows returned with user_email populated (or NULL for system/seed entries).

- [ ] **Step 5: Delete old migration file**

Delete: `supabase/migrations/20260325500000_audit_user_emails.sql`
The new migration replaces it entirely.

> **Note:** This deletion is safe for local/fresh databases only. The old migration has never been deployed to production. If it had been, we'd keep it and make the new migration idempotent.

- [ ] **Step 6: Re-apply to verify clean slate**

Run: `npx supabase db reset --local`
Expected: All migrations apply cleanly without the old file.

- [ ] **Step 7: Commit**

```
feat(db): add user_profiles table with auth sync trigger [GH-11]
```

---

## Task 2: Update admin audit types and queries

**Files:**

- Modify: `apps/admin/src/features/audit/domain/types.ts`
- Modify: `apps/admin/src/features/audit/infrastructure/auditQueries.ts`

- [ ] **Step 1: Update AuditEntry type**

In `apps/admin/src/features/audit/domain/types.ts`, replace the interface:

```typescript
/** A row from audit.logged_actions_with_user (view with profile data) */
export interface AuditEntry {
  event_id: number;
  schema_name: string;
  table_name: string;
  user_id: string | null;
  user_email: string | null;
  user_display_name: string | null;
  user_avatar: string | null;
  db_user: string;
  action_type: "INSERT" | "UPDATE" | "DELETE";
  row_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown> | null;
  action_timestamp: string;
  transaction_id: number;
  client_ip: string | null;
}

export interface AuditFilters {
  tableName: string;
  actionType: string;
}
```

- [ ] **Step 2: Verify auditQueries.ts already uses the view**

Check `apps/admin/src/features/audit/infrastructure/auditQueries.ts` — it should already query `logged_actions_with_user`. No changes needed if it does. The new view returns the same column name `user_email` plus two new columns `user_display_name` and `user_avatar`.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck --filter admin`
Expected: PASS (new optional fields don't break existing usage).

- [ ] **Step 4: Commit**

```
feat(admin): add display_name and avatar to AuditEntry type [GH-11]
```

---

## Task 3: Update admin audit UI — "Who" column and row detail

**Files:**

- Modify: `apps/admin/src/features/audit/presentation/components/AuditTable.tsx` (lines ~148-157)
- Modify: `apps/admin/src/features/audit/presentation/components/AuditRowDetail.tsx` (lines ~38-57)
- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Update the "Who" column in AuditTable.tsx**

Find the User column rendering (around line 152) and replace with:

```tsx
{
  /* User */
}
<span
  className="truncate px-4 py-2.5 font-mono text-xs"
  title={entry.user_email ?? entry.user_id ?? entry.db_user}
>
  {entry.user_display_name ??
    (entry.user_id
      ? entry.user_id.slice(0, UUID_PREVIEW_LENGTH)
      : entry.db_user)}
</span>;
```

This shows: display name (from profile) → truncated UUID → db_user.

- [ ] **Step 2: Update AuditRowDetail.tsx metadata section**

Find the metadata div (around line 38) and update the user section to show avatar + name + email:

```tsx
{
  /* Metadata row */
}
<div className="mb-3 flex items-center gap-4 font-mono text-xs text-muted-foreground">
  {(entry.user_email ?? entry.user_id) && (
    <span className="flex items-center gap-2">
      {entry.user_avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.user_avatar}
          alt=""
          className="size-5 rounded-full border border-foreground/20"
        />
      )}
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {t("user")}
      </span>
      <span className="text-foreground">
        {entry.user_display_name ?? entry.user_email ?? entry.user_id}
      </span>
      {entry.user_email && entry.user_display_name && (
        <span className="text-muted-foreground/60">({entry.user_email})</span>
      )}
      {entry.user_id && (
        <button
          onClick={handleCopyUserId}
          className="transition-colors hover:text-foreground"
          {...tid("audit-copy-user-id")}
        >
          <Copy className="size-3" />
        </button>
      )}
    </span>
  )}
  <span>
    {t("transactionId")}: {entry.transaction_id}
  </span>
  {entry.client_ip && (
    <span>
      {t("ip")}: {entry.client_ip}
    </span>
  )}
</div>;
```

- [ ] **Step 3: Add i18n key for "name" label in admin (if not already present)**

Check `apps/admin/src/shared/infrastructure/i18n/messages/en.json` — the `audit.detail.user` key already exists from earlier work. No new keys needed.

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck --filter admin && npx eslint apps/admin/src/features/audit`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(admin): show user display name and avatar in audit log [GH-11]
```

---

## Task 4: Account feature — domain and infrastructure layers

**Files:**

- Create: `apps/auth/src/features/account/domain/types.ts`
- Create: `apps/auth/src/features/account/infrastructure/profileQueries.ts`
- Create: `apps/auth/src/features/account/index.ts`

- [ ] **Step 1: Create domain types and validation schema**

Create `apps/auth/src/features/account/domain/types.ts`:

```typescript
import { z } from "zod";

/** User profile row from public.user_profiles */
export interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  provider: string | null;
  display_name: string | null;
  display_email: string | null;
  display_avatar_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

/** Editable fields for the profile form */
export const profileFormSchema = z.object({
  display_name: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v?.trim() || null),
  display_email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || null),
  display_avatar_url: z
    .string()
    .url()
    .startsWith("https://")
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || null),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
```

- [ ] **Step 2: Create infrastructure queries**

Create `apps/auth/src/features/account/infrastructure/profileQueries.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProfileFormValues,
  UserProfile,
} from "@/features/account/domain/types";

/** Fetch the current user's profile */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/** Update the current user's display fields */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  values: ProfileFormValues,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(values)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}
```

- [ ] **Step 3: Create barrel export**

Create `apps/auth/src/features/account/index.ts`:

```typescript
export { AccountSettingsPage } from "./presentation/pages/AccountSettingsPage";
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck --filter auth`
Expected: May fail on missing presentation files — that's OK, they come in the next tasks.

- [ ] **Step 5: Commit**

```
feat(auth): add account feature domain and infrastructure layers [GH-11]
```

---

## Task 5: Account feature — application hooks

**Files:**

- Create: `apps/auth/src/features/account/application/hooks/useProfile.ts`
- Create: `apps/auth/src/features/account/application/hooks/useUpdateProfile.ts`

- [ ] **Step 0: Create domain constants**

Create `apps/auth/src/features/account/domain/constants.ts`:

```typescript
export const PROFILE_QUERY_KEY = "user-profile";
```

- [ ] **Step 1: Create useProfile hook**

Create `apps/auth/src/features/account/application/hooks/useProfile.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PROFILE_QUERY_KEY } from "@/features/account/domain/constants";
import { fetchProfile } from "@/features/account/infrastructure/profileQueries";

export function useProfile(userId: string | undefined) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PROFILE_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return fetchProfile(supabase, userId);
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Create useUpdateProfile hook**

Create `apps/auth/src/features/account/application/hooks/useUpdateProfile.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PROFILE_QUERY_KEY } from "@/features/account/domain/constants";
import type { ProfileFormValues } from "@/features/account/domain/types";
import { updateProfile } from "@/features/account/infrastructure/profileQueries";

export function useUpdateProfile(userId: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile(supabase, userId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [PROFILE_QUERY_KEY, userId],
      });
    },
  });
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck --filter auth`
Expected: May still fail on missing presentation — that's OK.

- [ ] **Step 4: Commit**

```
feat(auth): add useProfile and useUpdateProfile hooks [GH-11]
```

---

## Task 6: Account feature — i18n keys

**Files:**

- Modify: `apps/auth/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/auth/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add English keys**

Add to `en.json` inside the `"auth"` object, after the existing `"account"` block:

```json
"accountSettings": {
  "title": "Account Settings",
  "subtitle": "Manage your public profile",
  "authInfo": "Login Info",
  "loginEmail": "Login Email",
  "provider": "Sign-in Method",
  "memberSince": "Member Since",
  "publicProfile": "Public Profile",
  "displayName": "Display Name",
  "displayNamePlaceholder": "How others see your name",
  "contactEmail": "Contact Email",
  "contactEmailPlaceholder": "Public email for inquiries",
  "customAvatar": "Custom Avatar",
  "customAvatarPlaceholder": "https://example.com/avatar.jpg",
  "save": "Save Changes",
  "saving": "Saving...",
  "saved": "Profile updated",
  "error": "Failed to save profile"
}
```

- [ ] **Step 2: Add Spanish keys**

Add to `es.json` inside the `"auth"` object:

```json
"accountSettings": {
  "title": "Configuración de Cuenta",
  "subtitle": "Administra tu perfil público",
  "authInfo": "Datos de Acceso",
  "loginEmail": "Email de Acceso",
  "provider": "Método de Acceso",
  "memberSince": "Miembro Desde",
  "publicProfile": "Perfil Público",
  "displayName": "Nombre Público",
  "displayNamePlaceholder": "Cómo otros ven tu nombre",
  "contactEmail": "Email de Contacto",
  "contactEmailPlaceholder": "Email público para consultas",
  "customAvatar": "Avatar Personalizado",
  "customAvatarPlaceholder": "https://example.com/avatar.jpg",
  "save": "Guardar Cambios",
  "saving": "Guardando...",
  "saved": "Perfil actualizado",
  "error": "Error al guardar el perfil"
}
```

- [ ] **Step 3: Commit**

```
feat(auth): add account settings i18n keys [GH-11]
```

---

## Task 7: Account feature — ProfileCard component

**Files:**

- Create: `apps/auth/src/features/account/presentation/components/ProfileCard.tsx`

- [ ] **Step 1: Create ProfileCard**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { UserProfile } from "@/features/account/domain/types";

interface ProfileCardProps {
  profile: UserProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const t = useTranslations("auth.accountSettings");

  const memberSince = new Date(profile.first_seen_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long" },
  );

  return (
    <div
      className="border-3 border-foreground bg-background p-6 nb-shadow-sm"
      {...tid("profile-card")}
    >
      <h2 className="mb-4 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t("authInfo")}
      </h2>

      <div className="flex items-center gap-4">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt=""
            className="size-14 rounded-full border-3 border-foreground"
          />
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("loginEmail")}
            </span>
            <span className="font-mono text-sm" {...tid("profile-email")}>
              {profile.email}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("provider")}
            </span>
            <span
              className="font-mono text-sm capitalize"
              {...tid("profile-provider")}
            >
              {profile.provider ?? "email"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("memberSince")}
            </span>
            <span className="font-mono text-sm">{memberSince}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
feat(auth): add ProfileCard component [GH-11]
```

---

## Task 8: Account feature — ProfileForm component

**Files:**

- Create: `apps/auth/src/features/account/presentation/components/ProfileForm.tsx`

- [ ] **Step 1: Create ProfileForm**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import {
  profileFormSchema,
  type ProfileFormValues,
  type UserProfile,
} from "@/features/account/domain/types";

interface ProfileFormProps {
  profile: UserProfile;
  onSubmit: (values: ProfileFormValues) => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function ProfileForm({
  profile,
  onSubmit,
  isPending,
  isSuccess,
  isError,
}: ProfileFormProps) {
  const t = useTranslations("auth.accountSettings");

  const { register, handleSubmit, formState } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: profile.display_name ?? "",
      display_email: profile.display_email ?? "",
      display_avatar_url: profile.display_avatar_url ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-3 border-foreground bg-background p-6 nb-shadow-sm"
      {...tid("profile-form")}
    >
      <h2 className="mb-4 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t("publicProfile")}
      </h2>

      <div className="flex flex-col gap-4">
        {/* Display Name */}
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("displayName")}
          </span>
          <Input
            placeholder={t("displayNamePlaceholder")}
            {...register("display_name")}
            {...tid("profile-display-name")}
          />
          {formState.errors.display_name && (
            <span className="font-mono text-xs text-destructive">
              {formState.errors.display_name.message}
            </span>
          )}
        </label>

        {/* Contact Email */}
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("contactEmail")}
          </span>
          <Input
            type="email"
            placeholder={t("contactEmailPlaceholder")}
            {...register("display_email")}
            {...tid("profile-display-email")}
          />
          {formState.errors.display_email && (
            <span className="font-mono text-xs text-destructive">
              {formState.errors.display_email.message}
            </span>
          )}
        </label>

        {/* Custom Avatar URL */}
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("customAvatar")}
          </span>
          <Input
            type="url"
            placeholder={t("customAvatarPlaceholder")}
            {...register("display_avatar_url")}
            {...tid("profile-display-avatar")}
          />
          {formState.errors.display_avatar_url && (
            <span className="font-mono text-xs text-destructive">
              {formState.errors.display_avatar_url.message}
            </span>
          )}
        </label>
      </div>

      {/* Status messages */}
      {isSuccess && (
        <p className="mt-3 font-mono text-xs text-success">{t("saved")}</p>
      )}
      {isError && (
        <p className="mt-3 font-mono text-xs text-destructive">{t("error")}</p>
      )}

      {/* Save button */}
      <button
        type="submit"
        disabled={isPending}
        className="nb-btn nb-btn-press-sm mt-6 w-full justify-center border-3 border-foreground bg-foreground py-2.5 font-display text-sm font-extrabold uppercase tracking-widest text-background disabled:opacity-50"
        {...tid("profile-save")}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```
feat(auth): add ProfileForm component [GH-11]
```

---

## Task 9: Account feature — AccountSettingsPage + route

**Files:**

- Create: `apps/auth/src/features/account/presentation/pages/AccountSettingsPage.tsx`
- Modify: `apps/auth/src/features/auth/presentation/pages/AccountPage.tsx`
- Update: `apps/auth/src/features/account/index.ts`

- [ ] **Step 1: Create AccountSettingsPage**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Skeleton } from "ui";

import { useProfile } from "@/features/account/application/hooks/useProfile";
import { useUpdateProfile } from "@/features/account/application/hooks/useUpdateProfile";
import { ProfileCard } from "@/features/account/presentation/components/ProfileCard";
import { ProfileForm } from "@/features/account/presentation/components/ProfileForm";
import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

export function AccountSettingsPage() {
  const t = useTranslations("auth.accountSettings");
  const tAuth = useTranslations("auth");
  const { user, signOut } = useSupabaseAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateMutation = useUpdateProfile(user?.id ?? "");

  if (isLoading || !profile) {
    return (
      <main className="flex flex-1 items-center justify-center bg-dots p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col items-center bg-dots px-4 py-10"
      {...tid("account-settings-page")}
    >
      <div className="w-full max-w-lg">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <div className="flex flex-col gap-6">
          <ProfileCard profile={profile} />

          <ProfileForm
            profile={profile}
            onSubmit={updateMutation.mutate}
            isPending={updateMutation.isPending}
            isSuccess={updateMutation.isSuccess}
            isError={updateMutation.isError}
          />

          {/* Sign out button */}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              globalThis.location.href = "/login";
            }}
            className="nb-btn nb-btn-press-sm w-full justify-center border-2 border-foreground px-6 py-3 text-sm"
            {...tid("sign-out")}
          >
            {tAuth("signOut")}
          </button>
        </div>
      </div>
    </main>
  );
}
```

Note: `t("signOut")` should use the existing `auth.signOut` key. Adjust namespace if needed.

- [ ] **Step 2: Update AccountPage.tsx to use the new page**

Replace `apps/auth/src/features/auth/presentation/pages/AccountPage.tsx`:

```tsx
"use client";

import { AccountSettingsPage } from "@/features/account";

export function AccountPage() {
  return <AccountSettingsPage />;
}
```

This preserves the import in `apps/auth/src/app/[locale]/page.tsx` which already conditionally renders `<AccountPage />` for authenticated users.

- [ ] **Step 3: Update barrel export**

Confirm `apps/auth/src/features/account/index.ts` exports correctly:

```typescript
export { AccountSettingsPage } from "./presentation/pages/AccountSettingsPage";
```

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck --filter auth && npx eslint apps/auth/src`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(auth): add account settings page with profile editor [GH-11]
```

---

## Task 10: Verify end-to-end

- [ ] **Step 1: Reset database and start all services**

```bash
npx supabase db reset --local
pnpm dev:auth &
pnpm dev:admin &
```

- [ ] **Step 2: Sign up a test user via browser**

Navigate to `http://localhost:5000/en/login`, sign up. After redirect, verify you land on the account settings page showing your profile data.

- [ ] **Step 3: Verify profile was auto-created**

```bash
npx supabase db query "select id::text, email, display_name, provider from public.user_profiles" --local
```

Expected: Row with the test user's email, display_name from provider metadata.

- [ ] **Step 4: Edit display fields**

On the account page, set a custom display name and contact email. Click Save. Verify success message appears.

- [ ] **Step 5: Check audit log captured the change**

Navigate to `http://localhost:5002/en/audit`. Filter by table = `user_profiles`. Verify the UPDATE entry shows the user's email in the "Who" column with the changed fields in the detail.

- [ ] **Step 6: Run full quality checks**

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Expected: All pass.

- [ ] **Step 7: Final commit if any cleanup needed**

```
chore: cleanup and verify user profile entity [GH-11]
```
