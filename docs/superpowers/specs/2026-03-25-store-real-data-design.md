# Store → Real Supabase Data Design

**Date:** 2026-03-25
**Status:** Draft
**Branch:** `feat/GH-11_Studio-App`

---

## Summary

Replace the store's mock product data with real Supabase queries. The store adopts the DB row shape directly (`snake_case`, i18n field pairs, JSONB columns). No transformation layer. Components use shared utilities (`i18nField`, `i18nPrice`) to resolve locale-specific values at render time.

---

## Core Principle: Single Source of Truth

> **The database is the single source of truth for all product data.** Every consumer — store, studio, cart, payments — reads and writes the same shape. There is no mapping, no transformation, no parallel type definitions.

| System              | Role                  | Shape                                               |
| ------------------- | --------------------- | --------------------------------------------------- |
| **Supabase DB**     | Source of truth       | `products` table row                                |
| **Generated types** | TypeScript contract   | `Tables<"products">` from `database.ts`             |
| **Studio**          | Writes products       | Uses DB shape directly                              |
| **Store**           | Reads products        | Uses DB shape directly                              |
| **Cart**            | References products   | Stores `product_id` + snapshot fields from DB shape |
| **Payments**        | Reads cart + products | Uses DB shape directly                              |

When a field is needed by the front-end but missing from the DB, it is **added to the DB first** (migration), then the generated types update, then all consumers see it automatically. Never add front-end-only fields.

---

## 1. Shared Utilities

### 1.1 `i18nField` (exists)

`packages/shared/src/utils/i18nField.ts` — resolves `name_en`/`name_es` based on locale.

### 1.2 `i18nPrice` (new)

`packages/shared/src/utils/i18nPrice.ts`:

```typescript
const LOCALE_CURRENCY: Record<
  string,
  { field: "price_cop" | "price_usd"; currency: string; locale: string }
> = {
  en: { field: "price_usd", currency: "USD", locale: "en-US" },
  es: { field: "price_cop", currency: "COP", locale: "es-CO" },
};

export function i18nPrice(
  product: { price_cop: number; price_usd: number },
  locale: string,
): string {
  const config = LOCALE_CURRENCY[locale] ?? LOCALE_CURRENCY.en;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 0,
  }).format(product[config.field]);
}
```

### 1.3 `typeDetails` helper (new)

`packages/shared/src/utils/typeDetails.ts`:

```typescript
export function typeDetails<T>(product: { type_details: unknown }): T {
  return (product.type_details ?? {}) as T;
}
```

Type-specific interfaces for each product type's `type_details` shape:

```typescript
export interface MerchDetails {
  weight?: string;
  dimensions?: string;
  ships_from?: string;
  material?: string;
  care_instructions?: string;
}

export interface DigitalDetails {
  file_size?: string;
  format?: string;
  resolution?: string;
  license_type?: string;
}

export interface ServiceDetails {
  total_slots?: number;
  slots_available?: number;
  turnaround_days?: number;
  revisions_included?: number;
  commercial_use?: boolean;
}

export interface TicketDetails {
  venue?: string;
  location?: string;
  doors_open?: string;
  age_restriction?: string;
  capacity?: number;
  tickets_remaining?: number;
}
```

---

## 2. Store Infrastructure

### 2.1 Product Queries

`apps/store/src/features/products/infrastructure/productQueries.ts`:

```typescript
import { createBrowserSupabaseClient } from "api/supabase";

export async function fetchStoreProducts() {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchStoreProductById(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
```

### 2.2 React Query Hooks

`apps/store/src/features/products/application/useStoreProducts.ts`:

```typescript
export function useStoreProducts() {
  return useQuery({
    queryKey: ["store-products"],
    queryFn: fetchStoreProducts,
  });
}

export function useStoreProduct(id: string) {
  return useQuery({
    queryKey: ["store-product", id],
    queryFn: () => fetchStoreProductById(id),
  });
}
```

---

## 3. Component Migration

### 3.1 Field Mapping Reference

Every component access changes:

| Old (mock)                         | New (DB)                                                | How            |
| ---------------------------------- | ------------------------------------------------------- | -------------- |
| `product.name`                     | `i18nField(product, 'name', locale)`                    | Shared utility |
| `product.description`              | `i18nField(product, 'description', locale)`             | Shared utility |
| `product.longDescription`          | `i18nField(product, 'long_description', locale)`        | Shared utility |
| `product.tagline`                  | `i18nField(product, 'tagline', locale)`                 | Shared utility |
| `$${product.price}`                | `i18nPrice(product, locale)`                            | Shared utility |
| `product.compareAtPrice`           | `product.compare_at_price_usd` or `_cop`                | Direct access  |
| `product.inStock`                  | `product.is_active`                                     | Direct access  |
| `product.featured`                 | `product.featured`                                      | Same           |
| `product.createdAt`                | `product.created_at`                                    | Same (casing)  |
| `product.images[0]?.url`           | `(product.images as any[])?.[0]?.url`                   | JSONB cast     |
| `product.merch?.shipsFrom`         | `typeDetails<MerchDetails>(product).ships_from`         | Helper         |
| `product.service?.totalSlots`      | `typeDetails<ServiceDetails>(product).total_slots`      | Helper         |
| `product.ticket?.ticketsRemaining` | `typeDetails<TicketDetails>(product).tickets_remaining` | Helper         |
| `product.digital` (presence check) | `product.type === "digital"`                            | Same           |

### 3.2 Files to Update (~15)

| File                             | Changes                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- |
| `ProductCatalogPage.tsx`         | Replace `mockProducts` import with `useStoreProducts()` hook              |
| `ProductDetailPage.tsx`          | Replace `mockProducts.find()` with `useStoreProduct(id)`                  |
| `ProductCard.tsx`                | All field accesses + add `locale` from `useLocale()`                      |
| `ProductCardImage.tsx`           | `product.featured`, images JSONB access                                   |
| `ProductCardMeta.tsx`            | `type_details` access via helper                                          |
| `ProductGrid.tsx`                | Type changes (uses `featured` — same field)                               |
| `buildGridOrder.ts`              | Type changes (uses `featured` — same field)                               |
| `HeroSection.tsx`                | All field accesses + price display                                        |
| `MobileBar.tsx`                  | Price display                                                             |
| `MobileBarWithCart.tsx`          | Type pass-through                                                         |
| `PriceBlock.tsx`                 | Compare-at price logic                                                    |
| `DescriptionSection.tsx`         | `i18nField` for long description                                          |
| `SpecsSection.tsx`               | `type_details` access                                                     |
| `FaqSection.tsx` / `FaqItem.tsx` | `faq` JSONB access with i18n                                              |
| `HighlightsSection.tsx`          | `highlights` JSONB access with i18n                                       |
| `ImageGallery.tsx`               | Images from JSONB                                                         |
| `SellerSection.tsx`              | Remove (no seller table yet) or stub                                      |
| `ReviewsSection.tsx`             | Remove (reviews come from `product_reviews` table — separate query later) |
| `useAddToCart.ts`                | Update cart item fields to match DB shape                                 |

### 3.3 Cart Item Sync

The cart stores a snapshot of product fields. Update `CartItem` type:

```typescript
export interface CartItem {
  product_id: string; // was productId
  name_en: string; // was name
  name_es: string; // new
  price_cop: number; // was price
  price_usd: number; // new
  quantity: number;
  image_url?: string; // was image
  type: string;
  category?: string;
}
```

The `isValidCartItem` guard in `CartContext.tsx` updates to match.

---

## 4. Files to Delete

| File                                                       | Reason                           |
| ---------------------------------------------------------- | -------------------------------- |
| `apps/store/src/mocks/data/products.ts`                    | Replaced by Supabase             |
| `apps/store/src/features/products/domain/types.ts`         | Replaced by `Tables<"products">` |
| `apps/store/src/features/products/domain/buildSpecRows.ts` | Rebuilt to use `type_details`    |

---

## 5. Files to Keep (Unchanged or Minor Tweaks)

| File                     | Status                                          |
| ------------------------ | ----------------------------------------------- |
| `buildGridOrder.ts`      | Works — just needs `Product` type import change |
| `buildGridOrder.test.ts` | Stub type update                                |
| `useGridCols.ts`         | Unchanged                                       |
| `CategoryFilter.tsx`     | Unchanged (uses shared constants)               |
| `TypeFilter.tsx`         | Unchanged                                       |
| `SearchBar.tsx`          | Unchanged                                       |
| Category constants       | Unchanged (already in shared)                   |

---

## 6. Type Strategy

The store's `Product` type becomes:

```typescript
import type { Tables } from "api/types/database";
export type Product = Tables<"products">;
```

All components import `Product` from the same place. When the DB schema changes (new migration + `supabase gen types`), all apps see the update automatically.

---

## 7. Loading & Error States

Components that used synchronous mock data now use async React Query hooks. Each page needs:

- **Loading state**: skeleton or spinner while query resolves
- **Error state**: "Failed to load products" message
- **Empty state**: "No products yet" (already exists)

---

## 8. Implementation Order

1. **Shared utilities** — `i18nPrice`, `typeDetails` helpers + tests
2. **Store infrastructure** — Supabase queries + React Query hooks
3. **Type migration** — replace `Product` type, update `CartItem`
4. **Component updates** — all ~15 files, one by one
5. **Delete mocks** — remove mock data and old types
6. **Verify** — typecheck, lint, test, manual QA
