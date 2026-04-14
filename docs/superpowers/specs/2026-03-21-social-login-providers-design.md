# Social Login Providers: Discord, Google

**Date:** 2026-03-21
**Status:** Approved
**Branch:** feat/GH-2_Supabase-Setup-Core-Schema

---

## Summary

Replace Facebook with Discord as a social login provider alongside Google. Both are native Supabase OAuth providers with no custom integration required.

## Providers

| Provider | OAuth Key | Button Style                                   |
| -------- | --------- | ---------------------------------------------- |
| Google   | `google`  | White bg, Google "G" icon, dark text           |
| Discord  | `discord` | #5865F2 (blurple) bg, Discord icon, white text |

## Changes

### 1. `packages/auth/src/client/useAuth.ts`

- Update `AuthProvider` type from `"google" | "facebook"` to `"google" | "discord"`

### 2. `apps/store/src/features/auth/presentation/components/SocialLoginButtons.tsx`

- Replace the provider list with Google and Discord entries
- Add branded button styling per provider using Tailwind classes
- Add inline SVG icons for each provider (Google "G", Discord logo)
- Remove Facebook references

### 3. i18n Messages (`en.json` + `es.json`)

- Remove `auth.login.facebook`
- Add `auth.login.discord`: "Continue with Discord" / "Continuar con Discord"

### 4. `supabase/config.toml`

- Enable `[auth.external.google]`, `[auth.external.discord]`
- Disable or remove `[auth.external.apple]`
- Client IDs/secrets use env vars (placeholders for local dev)

### 5. No Changes Required

- Callback routes (provider-agnostic)
- Proxy middleware (provider-agnostic)
- Login page layout
- ProtectedRoute component
- Supabase client helpers

## Data Flow (unchanged)

```text
User clicks provider button
  -> signInWithOAuth({ provider })
  -> Supabase redirects to provider
  -> Provider authenticates user
  -> Redirects to /auth/callback?code=XXX
  -> exchangeCodeForSession(code)
  -> Session stored in cookies
  -> Redirect to destination
```

## TODO: E2E Auth Testing Strategy

**Goal:** E2E tests run with real Supabase sessions without touching OAuth flows.

**Approach:** Use Supabase service role (admin API) to create test users and generate sessions programmatically.

### Steps to implement

1. **Create E2E auth helper** (`e2e/fixtures/auth.fixture.ts`)
   - Use `@supabase/supabase-js` with the service role key
   - `createTestUser(email)` creates a user via `supabase.auth.admin.createUser()`
   - `getTestSession(userId)` generates a session via `supabase.auth.admin.generateLink()`
   - `deleteTestUser(userId)` cleans up after tests

2. **Inject session into browser context**
   - In Playwright `beforeEach`, create a test user and session
   - Set `sb-access-token` and `sb-refresh-token` cookies on the browser context
   - Tests start already authenticated with no login UI interaction needed

3. **Seed realistic test data**
   - Extend `supabase/seed.sql` with test users and related data (orders, tickets, etc.)
   - Or use the admin API in test setup for dynamic data
   - All data respects RLS since sessions are real

4. **Cleanup**
   - `afterEach` / `afterAll` deletes test users via admin API
   - Or use `pnpm supabase:reset` between test runs for a clean slate

### Environment

- Tests use `SUPABASE_SERVICE_ROLE_KEY` (already in `.env.example`)
- Service role bypasses RLS and is only used for test setup/teardown, never in app code
- Test users use fake emails like `e2e-{uuid}@test.invalid`
