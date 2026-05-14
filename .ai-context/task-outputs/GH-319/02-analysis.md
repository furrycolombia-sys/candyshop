# Analysis: GH-319

## Branch Context

| Field         | Value                                          |
|---------------|------------------------------------------------|
| **Branch**    | `feat/GH-319_Show-Seller-Info-On-Product-Pages` |
| **Type**      | `feat`                                         |
| **Source**    | `develop`                                      |
| **PR Target** | `develop`                                      |

---

## Relevant Files

| File | Purpose | Action Needed |
|------|---------|---------------|
| `apps/store/src/features/products/presentation/pages/ProductDetailPage.tsx` | Product detail page — lines 77-79 are where seller card slots in | Modify: add `<SellerCard>` after `<ProductSections>` |
| `apps/store/src/features/cart/application/hooks/useSellerProfiles.ts` | Fetches `Record<sellerId, displayName>` for a list of IDs | Reference only — create a new product-scoped hook instead (it only returns display name, not avatar) |
| `apps/store/src/features/products/domain/` | Product domain types | Reference: `seller_id: string \| null` on `Product` |
| `packages/ui/src/components/avatar.tsx` | `<Avatar>` + `<AvatarImage>` + `<AvatarFallback>` | Use as-is |
| `packages/shared/src/config/appUrls.ts` | `appUrls.auth` — resolved from env | Use `appUrls.auth` for profile link |
| `apps/store/src/shared/infrastructure/i18n/messages/en.json` | Translation keys — namespace `products.detail` | Add: `viewProfile` key (existing `seller` key covers the title) |
| `apps/store/src/shared/infrastructure/i18n/messages/es.json` | Spanish translations | Add: matching `viewProfile` key |
| `apps/store/src/features/products/presentation/components/ProductDetail/HeroSection.test.tsx` | Reference test pattern | Follow for new component tests |

---

## Existing Patterns

### useSellerProfiles (cart feature)

**Location:** `apps/store/src/features/cart/application/hooks/useSellerProfiles.ts`

- Takes `string[]` (array of seller IDs), returns `Record<sellerId, displayName>` via React Query
- Queries `user_profiles` selecting `id, display_name, email`
- Fallback: `display_name ?? email.split("@")[0]`
- staleTime: 60s, disabled when no IDs

**Gap:** Only fetches `display_name` — does **not** fetch `display_avatar_url` or `avatar_url`. A new hook is needed.

### Avatar Component

**Location:** `packages/ui/src/components/avatar.tsx`

Composite API: `<Avatar>` + `<AvatarImage src={...} />` + `<AvatarFallback>{initials}</AvatarFallback>`

### appUrls

**Location:** `packages/shared/src/config/appUrls.ts`

`appUrls.auth` resolves to the auth app base URL. Profile link pattern:
```typescript
`${appUrls.auth}/${locale}/profile/${sellerId}`
```

### i18n Namespace

**Location:** `apps/store/src/shared/infrastructure/i18n/messages/en.json` — namespace `products.detail`

Existing relevant keys:
- `"seller": "About the Seller"` — use as section title
- Add: `"viewProfile": "View profile"`

### Test Pattern

**Reference:** `HeroSection.test.tsx`
- `vi.mock()` all external hooks
- `vi.mock("shared", ...)` with `tid` returning `{ "data-testid": id }`
- `vi.mock("next-intl", ...)` returning key strings
- Factory function `makeProduct(overrides)` for test data
- Assertions via `data-testid`

---

## Requirements Analysis

| Requirement | Existing Support | Gap / Action |
|-------------|-----------------|--------------|
| Fetch seller display name | `useSellerProfiles()` ✅ | Must also fetch `display_avatar_url` + `avatar_url` — extend or new hook |
| Fetch seller avatar URL | Nothing in store ❌ | New hook queries both name + avatar fields |
| Render avatar with fallback | `<Avatar>` in ui package ✅ | None |
| Link to public profile | `appUrls.auth` ✅ | Compose URL with locale + seller_id |
| Hide when seller_id is null | Pattern in cart ✅ | Guard in `ProductDetailPage` |
| i18n section title | `products.detail.seller` ✅ | None |
| i18n "View profile" label | Missing ❌ | Add key to en.json + es.json |
| Unit tests | Pattern established ✅ | Create `SellerCard.test.tsx` |

---

## Technical Considerations

- **Hook placement:** Create `useSellerInfo(sellerId: string | null)` in `apps/store/src/features/products/application/hooks/`. It wraps a Supabase query for a single seller, returning `{ displayName, avatarUrl }`. Keep it in the products feature — no need to share with cart yet.
- **Avatar fallback:** Use first letter of display name (uppercased) as the `<AvatarFallback>` initials.
- **Profile URL:** Must include locale from `useLocale()` — the auth app uses `/[locale]/profile/[id]`.
- **Null guard:** `ProductDetailPage` already receives the full `product` object. Check `product.seller_id` before rendering `<SellerCard>`.
- **No breaking changes** — purely additive UI change.

---

## Implementation Summary

### Files to Create

| File | Description |
|------|-------------|
| `apps/store/src/features/products/application/hooks/useSellerInfo.ts` | New hook: queries `user_profiles` for a single seller, returns `displayName` + `avatarUrl` |
| `apps/store/src/features/products/presentation/components/SellerCard/SellerCard.tsx` | New component: avatar, name, profile link |
| `apps/store/src/features/products/presentation/components/SellerCard/SellerCard.test.tsx` | Unit tests |
| `apps/store/src/features/products/presentation/components/SellerCard/index.ts` | Barrel export |

### Files to Modify

| File | Change |
|------|--------|
| `apps/store/src/features/products/presentation/pages/ProductDetailPage.tsx` | Add `<SellerCard sellerId={product.seller_id} />` after `<ProductSections>` |
| `apps/store/src/shared/infrastructure/i18n/messages/en.json` | Add `products.detail.viewProfile` |
| `apps/store/src/shared/infrastructure/i18n/messages/es.json` | Add `products.detail.viewProfile` (Spanish) |

### Key Insights

1. The `useSellerProfiles` cart hook won't work as-is — it takes an array and doesn't return avatar URLs. A dedicated single-seller hook is cleaner for the product detail use case.
2. All required infrastructure (Avatar component, appUrls, i18n namespace) exists — this is a pure presentation-layer gap.
3. The slot in `ProductDetailPage` is obvious: after `<ProductSections product={product} />` on line 77, before `<MobileBarWithCart>`.

## Questions / Blockers

- None
