# Task Overview: GH-183

## Issue Details

| Field         | Value                                              |
| ------------- | -------------------------------------------------- |
| **Issue**     | #183                                               |
| **Title**     | E2E Test Suite — Deep Assertion-Level Coverage Map |
| **Type**      | chore                                              |
| **Labels**    | None                                               |
| **Assignee**  | None                                               |
| **Milestone** | None                                               |
| **Created**   | 2026-04-23                                         |

## Description

The E2E suite has grown organically. Some spec files look like "duplicates" of earlier specs — they are not. Each exists because it tests a behaviour that the earlier spec cannot reach without its unique setup (different users, different permissions, different DB seed). This issue documents every assertion at the mechanism level so the suite can be safely refactored without losing coverage.

**User context (from conversation):** We need to re-evaluate all test cases at the most granular level so we make fewer of them but still test the same things. There was a bug discovered thanks to having too many granular tests — when a buyer buys items from many sellers in a single go. That multi-seller cart path MUST remain covered.

## Acceptance Criteria

- [ ] Reduce total number of E2E tests without losing coverage of any critical behaviour
- [ ] Merge Wave 3 (`users-export-receipts-real.spec.ts`) into Wave 4 (`admin-users-export-receipts.spec.ts`) — only one duplicate pair identified
- [ ] Preserve multi-seller cart coverage: `cart-seller-group count=2`, `seller-checkout-* count=2`, `order-status-pending_verification count=2`, `order-status-approved count=2`
- [ ] Preserve data-isolation test in `seller-reports.spec.ts`
- [ ] Preserve ghost-write regression coverage in `checkout-order-integrity.spec.ts` (GH-179)
- [ ] Preserve SHA-256 byte-level receipt upload verification
- [ ] All remaining tests pass in CI

## Spec Files in Scope

| Spec File                                            | App      | Lines (approx) |
| ---------------------------------------------------- | -------- | -------------- |
| `apps/auth/e2e/auth-session.spec.ts`                 | auth     | ~80            |
| `apps/auth/e2e/smoke-all-apps.spec.ts`               | auth     | ~120           |
| `apps/auth/e2e/full-purchase-flow.spec.ts`           | auth     | ~600           |
| `apps/auth/e2e/receipt-reference-flow.spec.ts`       | auth     | ~200           |
| `apps/auth/e2e/studio-ux-improvements.spec.ts`       | auth     | ~250           |
| `apps/auth/e2e/permission-management.spec.ts`        | auth     | ~300           |
| `apps/auth/e2e/delegated-admin-flow.spec.ts`         | auth     | ~250           |
| `apps/auth/e2e/mobile-layout.spec.ts`                | auth     | ~100           |
| `apps/auth/e2e/admin-users-export-receipts.spec.ts`  | auth     | ~200           |
| `apps/store/e2e/theme-and-language.spec.ts`          | store    | ~150           |
| `apps/payments/e2e/checkout-order-integrity.spec.ts` | payments | ~150           |
| `apps/payments/e2e/seller-reports.spec.ts`           | payments | ~200           |
| `apps/admin/e2e/reports.spec.ts`                     | admin    | ~250           |
| `apps/admin/e2e/users-export-receipts-real.spec.ts`  | admin    | ~200           |

## Known Consolidation Opportunities (from issue)

| Gap                                     | Risk   | Recommended Action                                        |
| --------------------------------------- | ------ | --------------------------------------------------------- |
| Wave 3 vs Wave 4 duplication            | Medium | Merge; keep Wave 4 logic, delete Wave 3                   |
| Sidebar open state after mobile trigger | Low    | Add `data-open` attribute + assertion                     |
| Admin reports XLS content not verified  | Low    | Optional: add XML assertion to match seller-reports depth |

## Critical Paths That Must Not Be Lost

1. **Multi-seller cart** (`full-purchase-flow.spec.ts` Phases 3–6) — only coverage for 2-seller simultaneous purchase
2. **Ghost write regression** (`checkout-order-integrity.spec.ts`) — GH-179 regression guard
3. **Seller data isolation** (`seller-reports.spec.ts`) — only cross-seller data leak test
4. **SHA-256 receipt byte verification** (`receipt-reference-flow.spec.ts` Phase 5)
5. **Permission matrix** (`permission-management.spec.ts`) — 35-permission loop with fresh session
6. **Keyboard DnD** (`full-purchase-flow.spec.ts` Phase 2c, `studio-ux-improvements.spec.ts`)
7. **XLS XML content** (`admin-users-export-receipts.spec.ts`) — base64 receipt embedded in export

## Dependencies

- None

## Missing Information

- None — issue #183 is a complete coverage map
