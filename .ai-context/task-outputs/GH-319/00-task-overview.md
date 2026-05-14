# Task Overview: GH-319

## Issue Details

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| **Issue**    | [#319](https://github.com/furrycolombia-sys/candyshop/issues/319) |
| **Title**    | feat(store): show seller/creator info on product pages            |
| **Type**     | feat                                                              |
| **Labels**   | enhancement                                                       |
| **Assignee** | —                                                                 |
| **Created**  | 2026-05-14                                                        |

## Description

Product pages in the store don't show who created/sells the item. We should display the seller's avatar, display name, and a link to their read-only profile on the product detail page.

## Current State

The infrastructure is already in place but not wired up to the UI:

| What                                                                       | Status                        |
| -------------------------------------------------------------------------- | ----------------------------- |
| `user_profiles` table (`display_name`, `display_avatar_url`, `avatar_url`) | ✅ exists                     |
| `products.seller_id` FK to `auth.users`                                    | ✅ exists                     |
| `useSellerProfiles()` hook in store                                        | ✅ exists (used in cart only) |
| Public read-only profile page at `auth/[locale]/profile/[id]`              | ✅ exists                     |
| Seller info on product detail page                                         | ❌ missing                    |
| Seller info on product cards                                               | ❌ missing                    |

## Acceptance Criteria

- [ ] Product detail page shows a **seller card** with:
  - Avatar (`display_avatar_url` → fallback `avatar_url` → initials placeholder)
  - Display name (`display_name` → fallback to email prefix)
  - Link to their public profile at `auth/[locale]/profile/[seller_id]`
- [ ] The seller card is **read-only** — no edit affordances for buyers
- [ ] Loading and empty states handled gracefully (`seller_id` may be null on legacy products)
- [ ] Seller info is **not** shown if `seller_id` is null
- [ ] Unit tests for the new component

## Out of Scope

- Seller-specific product listing page (browse all products by a seller)
- Seller badges or ratings
- Contact seller functionality

## Technical Notes

- Reuse the existing `useSellerProfiles()` hook (`apps/store/src/features/cart/application/hooks/useSellerProfiles.ts`) or extract it to a more shared location if needed
- `user_profiles` has public RLS read access — no auth required to fetch seller info
- The profile link should point to the auth app URL (`NEXT_PUBLIC_AUTH_URL/[locale]/profile/[id]`)

## Dependencies

- None

## Missing Information

- None — requirements are clear
