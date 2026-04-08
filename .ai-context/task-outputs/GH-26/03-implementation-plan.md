# Implementation Plan: GH-26

## Scope Reconciliation

Issue [#26](https://github.com/furrycolombia-sys/candyshop/issues/26) was reviewed on branch `feat/GH-25_CRUD-Permissions`, but the current branch `chore/GH-26_Full-Project-Code-Review` is based on `develop`.

That means findings fall into three buckets:

1. **Still open on current branch**: the code exists here and the problem is still present.
2. **Partially addressed / changed shape**: the code exists, but the exact issue is narrower than the issue text suggests.
3. **Not applicable on current branch**: the reported feature/file does not exist here.

---

## Critical Issues Status

| ID                                           | Status                           | Evidence                                                                                                                                         | Action                                                                           |
| -------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| ARCH-001 Dashboard imports from Audit        | Open                             | `apps/admin/src/features/dashboard/presentation/pages/DashboardPage.tsx:7` imports `useAuditLog` from `@/features/audit/application/useAuditLog` | Extract recent-activity query into shared or dashboard-owned application layer   |
| ARCH-002 Hardcoded dashboard stats           | Open                             | `apps/admin/src/features/dashboard/presentation/pages/DashboardPage.tsx:15` defines `STAT_CARDS` with fake values                                | Replace with real queries or remove stats section until data exists              |
| SEC-001 Supabase anon key in `.env.example`  | Open                             | `.env.example:107` still contains a real-looking publishable key                                                                                 | Replace with `YOUR_SUPABASE_ANON_KEY` placeholder                                |
| BUG-001 `getInitials()` crash on empty email | Not applicable on current branch | `apps/admin/src/features/users/` does not exist on this branch                                                                                   | Defer to GH-25 or re-check after merge                                           |
| BUG-002 No app error boundaries              | Open                             | No `error.tsx` or `global-error.tsx` files found under `apps/*/src/app/`                                                                         | Add route-level and global error boundaries, at minimum for admin/store/payments |

---

## High-Signal Warnings Status

### Architecture / SOLID

| ID                                       | Status      | Evidence                                                                                                                                                                              | Action                                                            |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ARCH-003 Products imports Cart           | Open        | `apps/store/src/features/products/presentation/pages/ProductDetailPage.tsx:6` imports `CartDrawer` from cart feature                                                                  | Move drawer composition to layout/shared shell                    |
| ARCH-004 Products imports Orders         | Open        | `apps/studio/src/features/products/presentation/pages/ProductListPage.tsx:10` imports `PendingOrdersBadge` from orders feature                                                        | Move badge to shared/app shell or expose data through shared hook |
| ARCH-005 Auth imports Account            | Open        | `apps/auth/src/features/auth/presentation/pages/AccountPage.tsx:3` imports `AccountSettingsPage` from account feature                                                                 | Revisit auth/account feature boundaries                           |
| SOLID-003 Checkout page too stateful     | Likely open | Report cites `CheckoutPage`; hook surface is still broad and `useCartFromCookie` remains custom-state heavy                                                                           | Split orchestration from rendering after security fixes           |
| SOLID-004 Double casts in infrastructure | Open        | Multiple `as unknown as` remain, e.g. `apps/admin/src/features/templates/infrastructure/templateQueries.ts:23`, `apps/payments/src/features/orders/infrastructure/orderQueries.ts:35` | Remove unsafe casts with typed query mapping helpers              |
| SOLID-005 TemplateEditor manual state    | Open        | `apps/admin/src/features/templates/presentation/components/TemplateEditor.tsx:49` and repeated `setForm(...)` updates                                                                 | Migrate to `react-hook-form` plus field arrays                    |

### DRY / KISS

| ID                                            | Status         | Evidence                                                                                                                                 | Action                                                            |
| --------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| DRY-002 Duplicate `getItemName()`             | Open           | Duplicated in `OrderItemsList.tsx:13` and `ReceivedOrderCard.tsx:22`                                                                     | Replace with shared `i18nField()` helper                          |
| DRY-003 `locale === "es"` pattern             | Open           | Examples: `payment-methods/domain/utils.ts:11`, `PaymentMethodSelector.tsx:27`, `PaymentMethodTypeTable.tsx:85`, `TemplatePicker.tsx:68` | Normalize on shared localization helpers                          |
| DRY-006 Receipt constants duplicated          | Partially open | Receipt constants are centralized in checkout domain, but receipt behavior/security logic is still split across files                    | Consolidate validation + sanitization in one receipt module       |
| DRY-008 Repeated pill/table styling constants | Open           | `PILL_BASE` repeated in store/admin/payments/studio filters; `TABLE_HEADER_CLASS` duplicated in product/payment method tables            | Extract shared UI primitives (`FilterPill`, table header helpers) |

### Styling

| ID                                               | Status | Evidence                                                                                                | Action                                                         |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| STYLE-002 Arbitrary `border-t-[3px]`             | Open   | Landing components still use it in `CtaSection.tsx:14`, `FeaturesSection.tsx:22`, `RolesSection.tsx:38` | Replace with semantic utility or supported token               |
| STYLE-003 `text-white` on destructive action     | Open   | `apps/payments/src/features/orders/presentation/components/ResubmitEvidenceForm.tsx:140`                | Use semantic foreground token                                  |
| STYLE-004 Hardcoded hex in `bg-dots`             | Open   | `packages/ui/src/styles/utilities.css:126` and `:131` use raw hex values                                | Replace with theme tokens / CSS vars                           |
| STYLE-005 Hardcoded brand colors in social login | Open   | `apps/auth/src/features/auth/presentation/components/SocialLoginButtons.tsx:34` and `:40`               | Decide whether to keep brand exceptions or encode semantically |

### Testing / Security / Bugs

| ID                                                 | Status                           | Evidence                                                                                                                                                                          | Action                                                              |
| -------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| TEST-001 Admin users feature has zero tests        | Not applicable on current branch | `apps/admin/src/features/users/` does not exist here                                                                                                                              | Defer to GH-25                                                      |
| TEST-002 Landing has zero tests                    | Open                             | No `*.test.ts(x)` files found under `apps/landing/src/`                                                                                                                           | Add smoke tests for landing sections and i18n rendering             |
| TEST-003 Critical payment hooks missing tests      | Partially open                   | `useSubmitPayment.test.tsx` exists, but hooks like `useCartFromCookie`, `useMyOrders`, `useResubmitEvidence`, `useReceivedOrders`, `useOrderActions` do not have co-located tests | Add tests for remaining critical hooks                              |
| SEC-002 Receipt accepts `image/*` only client-side | Open                             | `apps/payments/src/features/checkout/domain/constants.ts:8`                                                                                                                       | Enforce MIME and extension validation in upload path                |
| SEC-003 Unsanitized storage path                   | Open                             | `apps/payments/src/features/checkout/infrastructure/receiptStorage.ts:13` uses `${orderId}/${file.name}`                                                                          | Sanitize filename and normalize path generation                     |
| SEC-004 Unsanitized receipt href                   | Open                             | `apps/payments/src/features/received-orders/presentation/components/ReceiptViewer.tsx:41`                                                                                         | Validate/normalize URLs before rendering                            |
| BUG-004 Cookie cache never invalidates             | Open                             | `apps/payments/src/features/checkout/application/hooks/useCartFromCookie.ts:20-26` caches forever                                                                                 | Replace with storage/cookie sync mechanism or explicit invalidation |
| BUG-005 New Supabase client per mount              | Open                             | Pattern persists across many hooks/components via `useMemo(() => createBrowserSupabaseClient(), [])`                                                                              | Centralize browser client retrieval                                 |
| BUG-006 Hardcoded English time format              | Open                             | `apps/payments/src/features/orders/presentation/components/ExpirationLabel.tsx:21` builds `1h 5m` strings manually                                                                | Localize relative time formatting                                   |
| BUG-007 ProtectedRoute redirect race               | Open                             | `packages/auth/src/client/ProtectedRoute.tsx:36-38` redirects in effect after auth check                                                                                          | Stabilize auth resolution and strict-mode redirect behavior         |

---

## Suggested Execution Order

### Phase 1: Security and correctness

- [ ] Replace `.env.example` anon key placeholder
- [ ] Add receipt validation and filename sanitization
- [ ] Sanitize or whitelist receipt URLs before rendering
- [ ] Fix `useCartFromCookie` invalidation model
- [ ] Add app error boundaries

### Phase 2: Architecture boundaries

- [ ] Remove dashboard -> audit dependency
- [ ] Remove store products -> cart dependency
- [ ] Remove studio products -> orders dependency
- [ ] Rework auth/account feature ownership
- [ ] Replace repeated browser-client creation with shared client access

### Phase 3: DRY and maintainability

- [ ] Replace `locale === "es"` branches with `i18nField()` or equivalent
- [ ] Extract shared receipt helpers
- [ ] Extract shared filter pill and table header primitives
- [ ] Migrate `TemplateEditor` to `react-hook-form`
- [ ] Reduce infrastructure `as unknown as` casts

### Phase 4: UX and styling

- [ ] Replace hardcoded dashboard stats with real data or remove section
- [ ] Fix arbitrary landing borders
- [ ] Replace semantic-incorrect `text-white`
- [ ] Tokenize `bg-dots`
- [ ] Decide policy for auth-provider brand colors

### Phase 5: Tests

- [ ] Add landing smoke tests
- [ ] Add tests for payment hooks still missing coverage
- [ ] Add tests for any new shared helpers introduced during refactor

---

## Acceptance Criteria for Current Branch

- [ ] All applicable critical issues resolved (`ARCH-001`, `ARCH-002`, `SEC-001`, `BUG-002`)
- [ ] Branch-specific non-applicable items explicitly deferred (`BUG-001`, `TEST-001`)
- [ ] Security warnings around receipts resolved
- [ ] Cross-feature imports removed or formally restructured
- [ ] Landing and critical payments coverage improved
- [ ] Quality gates pass: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
