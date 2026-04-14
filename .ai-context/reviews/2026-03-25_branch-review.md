# Code Review Report

**Branch:** `feat/GH-11_Studio-App`
**Base:** `develop`
**Reviewed:** 2026-03-25
**Scope:** 3 committed changes + uncommitted studio scaffold + infrastructure wiring

## Summary

| Severity   | Count |
| ---------- | ----- |
| Critical   | 2     |
| Warning    | 6     |
| Suggestion | 7     |
| Info       | 3     |

---

## Critical Issues

### SEC-001: RLS policies allow any authenticated user to mutate any product

**File:** `supabase/migrations/20260324000000_studio_schema.sql` (lines 84-92)
**Severity:** Critical

The `products_auth_insert`, `products_auth_update`, and `products_auth_delete` policies use only `auth.role() = 'authenticated'` as their guard. This means any logged-in user (including buyers with no seller profile) can create, modify, or delete any product in the database.

The comment says "restrict to sellers via permissions table later," but shipping this migration to a shared database means the window of vulnerability exists until that follow-up is done.

**Fix:** At minimum, add a `seller_id` column check or a join against a sellers/permissions table. If that table doesn't exist yet, defer the write policies to a later migration and keep the products table write-locked until the authorization model is in place. Alternatively, use a Supabase custom claim or a `user_metadata` field:

```sql
-- Example: only product owner can update/delete
create policy "products_owner_update" on public.products
  for update using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
```

---

### SEC-002: Storage policies allow any authenticated user to delete any product image

**File:** `supabase/migrations/20260324000000_studio_schema.sql` (lines 117-119)
**Severity:** Critical

The `product_images_auth_delete` policy allows any authenticated user to delete any object in the `product-images` bucket. There is no ownership check. A malicious authenticated user could delete all product images.

**Fix:** Scope deletions to objects uploaded by the current user. Supabase stores the uploader in `storage.objects.owner`:

```sql
create policy "product_images_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.uid() = owner);
```

---

## Warnings

### ARCH-001: CLAUDE.md not updated with studio app entry

**File:** `CLAUDE.md`
**Severity:** Warning

The monorepo structure section, app ports table, and workspace commands in CLAUDE.md do not include the studio app (port 5006, `pnpm dev:studio`). All other apps are listed. This is the primary developer reference and should stay current.

**Fix:** Add studio to the structure tree, the app ports table (studio | 5006 | Seller dashboard (`/studio`)), and the workspace commands section.

---

### SQL-001: No `product_type` enum used in the new migration for `type_details`

**File:** `supabase/migrations/20260324000000_studio_schema.sql` (line 35)
**Severity:** Warning

The migration adds `type_details jsonb` as an untyped JSON blob. The existing `products.type` column uses the `product_type` enum (`merch`, `digital`, `service`, `ticket`), but there is no database-level constraint linking `type_details` structure to the product type. This means a `merch` product could have `service`-shaped type_details with no DB validation.

**Fix:** This is acceptable for an MVP where validation happens at the application layer, but document this design decision explicitly. Consider adding a CHECK constraint or a trigger that validates the JSONB shape matches the product type.

---

### SQL-002: Missing `UPDATE` and `DELETE` policies for `product_reviews`

**File:** `supabase/migrations/20260324000000_studio_schema.sql` (lines 94-99)
**Severity:** Warning

The migration creates `reviews_public_read` (SELECT) and `reviews_own_insert` (INSERT) policies but no UPDATE or DELETE policies. This means:

- Users cannot edit their own reviews
- Users cannot delete their own reviews
- Admins cannot moderate reviews

With RLS enabled and no UPDATE/DELETE policy, these operations will silently fail.

**Fix:** Add at minimum:

```sql
create policy "reviews_own_update" on public.product_reviews
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_own_delete" on public.product_reviews
  for delete using (auth.uid() = user_id);
```

---

### SQL-003: `update_updated_at()` function name is generic and could conflict

**File:** `supabase/migrations/20260324000000_studio_schema.sql` (line 43)
**Severity:** Warning

The function `update_updated_at()` is created in `public` schema with a very generic name. If another table or migration creates the same function with different behavior, `CREATE OR REPLACE` will silently overwrite it. This is a latent risk as the project grows.

**Fix:** Namespace the function: `products_update_updated_at()` or place it in a utility schema. Alternatively, keep the generic name but ensure it's used project-wide as a convention (document in a comment).

---

### CSS-001: Studio `globals.css` missing theme variables

**File:** `apps/studio/src/app/globals.css`
**Severity:** Warning

The studio `globals.css` imports `ui/styles` (which provides the theme variables), matching the store. However, if any app-specific CSS variable overrides are needed later, there is no `@theme inline` block or `:root` / `.dark` variable section. This is fine for now since `ui/styles` provides everything, but diverges from the pattern described in `css-consistency.md` which mentions checking `:root` and `.dark` variables across apps.

**Fix:** No immediate action needed. The file matches store exactly, which is correct. Just be aware that any future theme customization must be synced.

---

### DRY-001: `vitest.config.ts` alias block duplicated across all apps

**File:** `apps/studio/vitest.config.ts`
**Severity:** Warning

The vitest config is a near-identical copy of the store's vitest config. The `resolve.alias` block with 8 aliases is duplicated in every app. This is an existing codebase pattern, not introduced by this PR, but worth noting as the monorepo grows.

**Fix:** Consider extracting a shared vitest config preset in a future task. Not blocking for this PR.

---

## Suggestions

### KISS-001: `mockServiceWorker.js` included but MSW is not used

**File:** `apps/studio/public/mockServiceWorker.js`
**Severity:** Suggestion

The studio app has a passthrough `MSWProvider` (no-op) and includes MSW as a dev dependency, but the MSW service worker file is still copied to `public/`. This is dead weight.

**Fix:** If MSW won't be used in studio, remove `public/mockServiceWorker.js` and consider removing `msw` from devDependencies. If MSW will be added later, keep it but add a comment.

---

### ARCH-002: `request.ts` uses redundant path in dynamic import

**File:** `apps/studio/src/shared/infrastructure/i18n/request.ts` (line 18)
**Severity:** Suggestion

The import path `../../../shared/infrastructure/i18n/messages/${locale}.json` traverses up from `shared/infrastructure/i18n/` to `src/` and back down to `shared/infrastructure/i18n/messages/`. This works but is unnecessarily verbose.

**Fix:** Use `./messages/${locale}.json` since the file is in the same directory tree. Note: This pattern is likely copied from another app - verify the store uses the same path.

---

### PERF-001: `i18nField` utility has no input validation

**File:** `packages/shared/src/utils/i18nField.ts`
**Severity:** Suggestion

The `i18nField` function converts any value to string via `String()`, which means `undefined` becomes `"undefined"` if both the locale field and English fallback are missing (the `?? ""` handles this). However, if `obj` is null/undefined, this will throw. Consider adding a null guard.

**Fix:**

```typescript
export function i18nField(
  obj: Record<string, unknown> | null | undefined,
  field: string,
  locale: string,
): string {
  if (!obj) return "";
  return String(obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "");
}
```

---

### TEST-001: No unit tests for new shared utilities

**File:** `packages/shared/src/utils/i18nField.ts`
**Severity:** Suggestion

The `i18nField` utility is a new public export from the shared package but has no accompanying test file. It handles locale fallback logic that should be verified.

**Fix:** Create `packages/shared/src/utils/i18nField.test.ts` covering:

- Happy path (locale match)
- Fallback to English
- Missing both locale and English
- Null/undefined object

---

### TEST-002: No unit tests for new shared types

**File:** `packages/shared/src/types/product.ts`
**Severity:** Suggestion

The new `ProductType` and `ProductCategory` types are re-exported through the barrel. While types don't need runtime tests, a type-level test (using `expectTypeOf` from vitest) would catch drift between the shared types and the DB enum values.

**Fix:** Optional - add a type assertion test that verifies the union members match expected values.

---

### NAME-001: `es.json` missing accent marks

**Files:** `apps/studio/src/shared/infrastructure/i18n/messages/es.json` (multiple lines)
**Severity:** Suggestion

Several Spanish translations are missing accent marks:

- Line 4: `"catalogo"` should be `"catalogo"` (actually `"cat\u00e1logo"`)
- Line 8: `"Gestion"` should be `"Gesti\u00f3n"`, `"proximamente"` should be `"pr\u00f3ximamente"`
- Line 21: `"sesion"` should be `"sesi\u00f3n"` (appears twice)
- Line 22: `"metodo"` should be `"m\u00e9todo"`
- Line 32: `"Ocurrio"` should be `"Ocurri\u00f3"`
- Line 40: `"Estas"` should be `"\u00bfEst\u00e1s"`

Note: This is an existing pattern in other apps' es.json files too, not introduced by this PR.

**Fix:** Fix accent marks across all `es.json` files in a separate chore task.

---

### COMP-001: Studio page component has inline logic instead of feature module

**File:** `apps/studio/src/app/[locale]/page.tsx`
**Severity:** Suggestion

The studio page directly uses `getTranslations` and renders JSX inline instead of delegating to a feature presentation page. Per the architecture rules, route files should be thin wrappers importing from features.

**Fix:** This is acceptable for a scaffold/placeholder page. When real features are built, refactor to:

```typescript
// app/[locale]/page.tsx
import { StudioDashboardPage } from '@/features/dashboard';
export default function Page() {
  return <StudioDashboardPage />;
}
```

---

## Info

### INFO-001: Shared `ProductType` and `ProductCategory` now single source of truth

**Files:** `packages/shared/src/types/product.ts`, `apps/store/src/shared/domain/categoryTypes.ts`

The types were previously defined inline in the store and are now in `packages/shared/src/types/product.ts`. The store re-exports them. The DB enums match: `product_type` enum has `merch, digital, service, ticket`; `product_category` enum has `fursuits, merch, art, events, digital, deals`. The shared TypeScript types match both.

---

### INFO-002: Store rename from physical/commission to merch/service is thorough

The rename touched all relevant files:

- Domain types (`PhysicalDetails` -> `MerchDetails`, `CommissionDetails` -> `ServiceDetails`)
- Domain functions (`buildPhysicalRows` -> `buildMerchRows`, `buildCommissionRows` -> `buildServiceRows`)
- Presentation components (all type checks updated)
- Mock data (all product types updated)
- i18n keys (both en.json and es.json)
- Test stubs

No leftover references to `physical` or `commission` were found in the changed files.

---

### INFO-003: CI/Docker/nginx wiring is complete and consistent

The studio app is properly wired into:

- `.env.example` (port 5006)
- `ci.yml` (change detection, all 5 script invocations)
- `Dockerfile` (build stage, runtime stage)
- `docker/nginx.conf` (upstream + location block)
- `docker/supervisord.conf` (process management)
- `package.json` (dev, build, lint, test, coverage, fix, jscpd, madge scripts)
- `scripts/select-workspaces.sh` (positional argument 9)
- `scripts/check-css-sync.mjs` (APPS array)
- `packages/shared/src/config/appUrls.ts` (studio URL)
- `packages/app-components/src/components/AppNavigation.tsx` (AppId union + APP_ORDER)
- All 6 existing apps' `en.json` and `es.json` (nav.studio key added)

---

## TODO Checklist

### Must Fix Before Merge

- [ ] **SEC-001**: Scope product write RLS policies to product owner (add `seller_id` or equivalent)
- [ ] **SEC-002**: Scope storage delete policy to object owner (`auth.uid() = owner`)

### Should Fix Before Merge

- [ ] **ARCH-001**: Update `CLAUDE.md` with studio app in structure, ports table, and commands
- [ ] **SQL-002**: Add UPDATE/DELETE policies for `product_reviews` table
- [ ] **SQL-003**: Consider namespacing `update_updated_at()` function or documenting convention

### Consider for This PR or Follow-up

- [ ] **KISS-001**: Remove unused `mockServiceWorker.js` from studio public if MSW not planned
- [ ] **PERF-001**: Add null guard to `i18nField` utility
- [ ] **TEST-001**: Add unit tests for `i18nField` utility
- [ ] **SQL-001**: Document the `type_details` JSONB validation strategy (app-level vs DB-level)

### Deferred (Separate Tasks)

- [ ] **NAME-001**: Fix accent marks in all `es.json` files across apps
- [ ] **DRY-001**: Extract shared vitest config preset
- [ ] **TEST-002**: Add type assertion tests for shared enums
- [ ] **COMP-001**: Refactor studio page to use feature module pattern when features are built
