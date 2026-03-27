# Seller Payment Methods & Admin Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sellers configure custom payment methods in Studio; admins configure payment timeout settings.

**Architecture:** New `seller_payment_methods` + `payment_settings` tables. Studio gets a new payment-methods feature. Admin gets a new settings feature. Both follow existing Clean Architecture patterns.

**Tech Stack:** Supabase, React Query, react-hook-form, next-intl, Zod

**Spec:** `docs/superpowers/specs/2026-03-26-payment-methods-design.md`

---

## File Map

### New Files

| File                                                                                       | Responsibility                             |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `supabase/migrations/20260326000000_payment_methods.sql`                                   | Tables, RLS, indexes, audit, seed settings |
| `apps/studio/src/features/payment-methods/domain/types.ts`                                 | SellerPaymentMethod interface              |
| `apps/studio/src/features/payment-methods/domain/constants.ts`                             | Query key, form defaults                   |
| `apps/studio/src/features/payment-methods/infrastructure/paymentMethodQueries.ts`          | Supabase CRUD                              |
| `apps/studio/src/features/payment-methods/application/hooks/usePaymentMethods.ts`          | Fetch hook                                 |
| `apps/studio/src/features/payment-methods/application/hooks/usePaymentMethodMutations.ts`  | CUD mutations                              |
| `apps/studio/src/features/payment-methods/presentation/pages/PaymentMethodsPage.tsx`       | Main page                                  |
| `apps/studio/src/features/payment-methods/presentation/components/PaymentMethodTable.tsx`  | List table                                 |
| `apps/studio/src/features/payment-methods/presentation/components/PaymentMethodEditor.tsx` | Create/edit form                           |
| `apps/studio/src/features/payment-methods/index.ts`                                        | Barrel exports                             |
| `apps/studio/src/app/[locale]/payment-methods/page.tsx`                                    | Route                                      |
| `apps/admin/src/features/settings/domain/types.ts`                                         | PaymentSettings interface                  |
| `apps/admin/src/features/settings/domain/constants.ts`                                     | Query key, setting keys                    |
| `apps/admin/src/features/settings/infrastructure/settingsQueries.ts`                       | Supabase read/write                        |
| `apps/admin/src/features/settings/application/hooks/usePaymentSettings.ts`                 | Fetch hook                                 |
| `apps/admin/src/features/settings/application/hooks/useUpdateSettings.ts`                  | Update mutation                            |
| `apps/admin/src/features/settings/presentation/pages/SettingsPage.tsx`                     | Settings page                              |
| `apps/admin/src/features/settings/presentation/components/TimeoutSettings.tsx`             | Timeout form                               |
| `apps/admin/src/features/settings/index.ts`                                                | Barrel exports                             |
| `apps/admin/src/app/[locale]/settings/page.tsx`                                            | Route                                      |

### Modified Files

| File                                                             | Change                |
| ---------------------------------------------------------------- | --------------------- |
| `apps/admin/src/shared/presentation/components/AdminSidebar.tsx` | Add Settings nav item |
| `apps/admin/src/shared/infrastructure/i18n/messages/en.json`     | Settings i18n keys    |
| `apps/admin/src/shared/infrastructure/i18n/messages/es.json`     | Settings i18n keys    |
| `apps/studio/src/shared/infrastructure/i18n/messages/en.json`    | Payment methods i18n  |
| `apps/studio/src/shared/infrastructure/i18n/messages/es.json`    | Payment methods i18n  |

---

## Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20260326000000_payment_methods.sql`

Create both tables, RLS, indexes, audit, and seed default timeout settings. Follow exact patterns from `20260325700000_product_templates.sql`.

---

## Task 2: Studio — Payment Methods Feature (domain + infrastructure + hooks)

**Files:**

- Create: All files under `apps/studio/src/features/payment-methods/` (domain, infrastructure, application layers)

Domain types match the DB schema. Infrastructure uses `SupabaseClient<Database>` pattern from `productQueries.ts`. Hooks use `useQuery`/`useMutation` with memoized Supabase client.

---

## Task 3: Studio — Payment Methods UI + Route + i18n

**Files:**

- Create: `PaymentMethodsPage.tsx`, `PaymentMethodTable.tsx`, `PaymentMethodEditor.tsx`, route page, barrel export
- Modify: Studio i18n en.json + es.json

Page layout: header with "Add Method" button, table with toggle/edit/delete, editor form. Follow the admin TemplatesPage pattern but adapted for studio (no sidebar — use a back link to products like EditorToolbar does).

---

## Task 4: Admin — Settings Feature (domain + infrastructure + hooks)

**Files:**

- Create: All files under `apps/admin/src/features/settings/` (domain, infrastructure, application layers)

Key-value settings from `payment_settings` table. Read all settings as a record, update individual settings.

---

## Task 5: Admin — Settings UI + Route + Sidebar + i18n

**Files:**

- Create: `SettingsPage.tsx`, `TimeoutSettings.tsx`, route page, barrel export
- Modify: AdminSidebar (add "Settings" under new "Configuration" section), admin i18n en.json + es.json

Settings page with a "Payment Timeouts" card containing 3 number inputs (hours) and a save button.

---

## Task 6: Final Verification

Run format, lint, typecheck, test, build. Fix any issues.

---

## Dependency Graph

```
Task 1 (migration) ─────┐
Task 2 (studio domain) ──┤  (parallel after Task 1)
Task 3 (studio UI) ──────┘
Task 4 (admin domain) ───┐  (parallel with studio track)
Task 5 (admin UI) ───────┘
Task 6 (verification)
```

Studio (Tasks 2-3) and Admin (Tasks 4-5) tracks are independent and can run in parallel after the migration.
