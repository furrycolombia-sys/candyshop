# Studio App + Schema Sync Design

**Date:** 2026-03-24
**Status:** Draft
**Branch:** TBD (feat/GH-{N}\_Studio-App)

---

## Summary

Create the **Studio** app (`apps/studio`, port 5006) — a seller dashboard for managing products, images, and catalog content. Sync the Supabase DB schema with front-end needs by adding missing columns and JSONB fields. All apps share the same DB-generated types with `snake_case` fields — no transformation layer.

---

## 1. DB Migration

### 1.1 Type Enum Update

The existing `product_type` enum (`ticket | merch | digital | service`) stays as-is. The front-end aligns to it:

| DB (source of truth) | Old front-end | Action                         |
| -------------------- | ------------- | ------------------------------ |
| `ticket`             | `ticket`      | No change                      |
| `merch`              | `physical`    | Front-end updates to `merch`   |
| `digital`            | `digital`     | No change                      |
| `service`            | `commission`  | Front-end updates to `service` |

**Rename scope:** This touches the store app — `ProductType`, `PRODUCT_TYPES`, mock data, filter components, product cards, and detail page type-specific rendering. It is a prerequisite for the studio app and is included as step 2 of the implementation order.

### 1.2 New Category Enum

```sql
create type public.product_category as enum (
  'fursuits', 'merch', 'art', 'events', 'digital', 'deals'
);

alter table public.products
  add column category public.product_category not null default 'merch';
```

### 1.3 New Columns on `products`

| Column                 | Type               | Default   | Purpose                                                        |
| ---------------------- | ------------------ | --------- | -------------------------------------------------------------- |
| `category`             | `product_category` | `'merch'` | Category theming                                               |
| `long_description_en`  | `text`             | `''`      | Detail page rich description                                   |
| `long_description_es`  | `text`             | `''`      | i18n                                                           |
| `tagline_en`           | `text`             | `''`      | Subtitle                                                       |
| `tagline_es`           | `text`             | `''`      | i18n                                                           |
| `compare_at_price_cop` | `integer`          | `null`    | Strike-through price                                           |
| `compare_at_price_usd` | `integer`          | `null`    | Strike-through price                                           |
| `featured`             | `boolean`          | `false`   | Featured card treatment                                        |
| `tags`                 | `text[]`           | `'{}'`    | Search tags                                                    |
| `rating`               | `numeric(3,2)`     | `null`    | Average rating (1.00–5.00)                                     |
| `review_count`         | `integer`          | `0`       | Total reviews (computed)                                       |
| `images`               | `jsonb`            | `'[]'`    | `[{url, alt, sort_order}]`                                     |
| `screenshots`          | `jsonb`            | `'[]'`    | `[{url, caption_en, caption_es}]`                              |
| `highlights`           | `jsonb`            | `'[]'`    | `[{icon, title_en, title_es, description_en, description_es}]` |
| `faq`                  | `jsonb`            | `'[]'`    | `[{question_en, question_es, answer_en, answer_es}]`           |
| `type_details`         | `jsonb`            | `'{}'`    | Type-specific fields (see 1.3.1)                               |
| `updated_at`           | `timestamptz`      | `now()`   | Last modified timestamp (auto-updated via trigger)             |

**Constraints:**

```sql
alter table public.products
  add constraint products_rating_range check (rating between 1.00 and 5.00);
```

**Auto-update trigger for `updated_at`:**

```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute function update_updated_at();
```

**Note:** `in_stock` is NOT added — derive from `max_quantity` and sold count at query time, or use `is_active` for manual toggle.

### 1.3.1 `type_details` JSONB Shapes

All fields are `snake_case`. Types noted in parentheses.

**merch:**

```json
{
  "weight": "500g",
  "dimensions": "10x20x5cm",
  "ships_from": "Portland, OR",
  "material": "Polyester",
  "care_instructions": "Machine wash cold"
}
```

**digital:**

```json
{
  "file_size": "45MB",
  "format": "PSD",
  "resolution": "4000x3000",
  "license_type": "Personal use"
}
```

**service:**

```json
{
  "total_slots": 5,
  "slots_available": 3,
  "turnaround_days": 14,
  "revisions_included": 3,
  "commercial_use": true
}
```

**ticket:**

```json
{
  "venue": "Convention Center",
  "location": "Bogota, Colombia",
  "doors_open": "9:00 AM",
  "age_restriction": "18+",
  "capacity": 500,
  "tickets_remaining": 340
}
```

### 1.4 New Table: `product_reviews`

```sql
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

alter table public.product_reviews enable row level security;
```

### 1.5 Indexes

```sql
create index idx_products_category on public.products(category);
create index idx_products_featured on public.products(featured) where featured = true;
create index idx_products_updated_at on public.products(updated_at);
create index idx_product_reviews_product_id on public.product_reviews(product_id);
```

### 1.6 RLS for Studio

Separate policies per operation (not `for all`) for clarity:

```sql
-- Products: authenticated users can insert, update, delete
-- (restrict to sellers via permissions table later)
create policy "products_auth_insert" on public.products
  for insert with check (auth.role() = 'authenticated');

create policy "products_auth_update" on public.products
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "products_auth_delete" on public.products
  for delete using (auth.role() = 'authenticated');

-- Reviews: public read, authenticated own-write
create policy "reviews_public_read" on public.product_reviews
  for select using (true);

create policy "reviews_own_insert" on public.product_reviews
  for insert with check (auth.uid() = user_id);
```

### 1.7 Storage Bucket

```sql
-- Created via Supabase dashboard or migration
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true);
```

**Storage policies:**

- **Upload:** authenticated users can upload to `product-images/`
- **Read:** public (images are public URLs)
- **File limits:** 5MB max, allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

---

## 2. Shared Types

### 2.1 Generated Types

Run `supabase gen types typescript` to produce DB types. Output to `packages/api/src/types/database.ts`.

All apps use `snake_case` field names — no camelCase transformation. This matches the existing Orval policy.

### 2.2 Front-End i18n Field Resolution

JSONB fields use `_en`/`_es` suffixes (e.g. `title_en`, `title_es`). Components resolve the correct field based on the current locale:

```typescript
// Shared utility — packages/shared/src/utils/i18nField.ts
export function i18nField(
  obj: Record<string, unknown>,
  field: string,
  locale: string,
): string {
  return String(obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "");
}
```

No mapping layer — components access the DB shape directly and pick the locale field at render time.

### 2.3 Category Constants

**Types and enums** (`ProductType`, `ProductCategory`) move to `packages/shared/src/types/`.

**Theme map** (`CategoryTheme`, `CATEGORY_THEMES`, `getCategoryColor`) stays in each app's `shared/domain/` or in `packages/app-components/` — it contains Tailwind class strings which are presentation concerns and should not be in a pure shared package.

Store, studio, and payments import types from `"shared/types"`. Each app owns its own theme styling.

---

## 3. Studio App

### 3.1 Setup

| Setting      | Value                             |
| ------------ | --------------------------------- |
| App name     | `studio`                          |
| Port         | `5006`                            |
| Path prefix  | `/studio`                         |
| Package name | `studio` in `pnpm-workspace.yaml` |

Scaffolded from the store app template (same Next.js 16, Tailwind v4, next-intl, same auth setup).

### 3.2 Pages (MVP — 3 pages)

**1. Product List (`/studio`):**

- Table view of all products (name, type, category, price, active, featured)
- Columns: image thumbnail, name, type badge, category badge, price, status toggles
- Filters: type, category, search
- Actions: toggle `is_active`, toggle `featured`, edit, delete
- "New Product" button

**2. Create Product (`/studio/products/new`):**

- Type selector (ticket, merch, digital, service) — changes which fields appear
- Common fields: name_en/es, description_en/es, category, price_cop/usd, tags, images
- Type-specific fields rendered based on selected type (from `type_details` shape in 1.3.1)
- Image upload: Supabase Storage bucket, returns public URL, stored in `images` JSONB
- Save → `supabase.from('products').insert()`

**3. Edit Product (`/studio/products/[id]`):**

- Same form as create, pre-populated
- Save → `supabase.from('products').update()`
- Delete button (soft delete via `is_active = false`, or hard delete with confirmation)

### 3.3 Data Flow

```
Studio UI → React Query mutation → Supabase JS client → Postgres
                                                          ↓
Store UI  → React Query query   → Supabase JS client → Postgres
```

No custom API server. Supabase JS client handles auth, RLS, and typed queries.

### 3.4 Image Upload

- Supabase Storage bucket: `product-images` (public, 5MB limit, jpeg/png/webp)
- Upload via `supabase.storage.from('product-images').upload()`
- Returns public URL
- URL stored in `images` JSONB array on the product row
- Studio shows upload widget with drag-and-drop, preview, reorder, delete

### 3.5 Feature Structure

```
apps/studio/src/
├── app/[locale]/
│   ├── layout.tsx              # AppNavigation, providers
│   ├── page.tsx                # → ProductListPage
│   └── products/
│       ├── new/page.tsx        # → ProductFormPage (create)
│       └── [id]/page.tsx       # → ProductFormPage (edit)
├── features/
│   └── products/
│       ├── domain/             # Validation schemas, constants
│       ├── application/        # useProducts, useProductMutations hooks
│       ├── infrastructure/     # Supabase queries (select, insert, update, delete, upload)
│       └── presentation/
│           ├── components/     # ProductTable, ProductForm, ImageUpload, TypeFields
│           └── pages/          # ProductListPage, ProductFormPage
├── shared/
│   ├── domain/                 # Category theme (Tailwind classes)
│   └── infrastructure/
│       ├── i18n/               # Studio translations (en.json, es.json)
│       ├── config/             # Supabase client, env, tid
│       └── providers/          # QueryProvider, MSW, Auth
└── mocks/                      # MSW handlers (optional)
```

### 3.6 Dependencies

Workspace packages: `ui`, `shared`, `auth`, `app-components`, `api`

No new external dependencies beyond what the monorepo already has.

---

## 4. Store Type Rename (Prerequisite)

Before the studio app can share types, the store must align to DB naming:

| Change                                 | Files affected                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `physical` → `merch`                   | categoryTypes.ts, mock data, ProductCard, ProductCardMeta, TypeFilter, detail pages |
| `commission` → `service`               | categoryTypes.ts, mock data, ProductCard, ProductCardMeta, TypeFilter, detail pages |
| `PhysicalDetails` → `MerchDetails`     | types.ts, mock data, buildSpecRows.ts                                               |
| `CommissionDetails` → `ServiceDetails` | types.ts, mock data, buildSpecRows.ts                                               |

This is step 2 in the implementation order and affects the store app only.

---

## 5. Store Migration to Real Data (Later — NOT in Scope)

When the studio is working and products exist in the DB, the store switches from mock data to Supabase queries. This is a separate task.

---

## 6. What's NOT in Scope

- Analytics / sales dashboard
- Role-based permissions (admin app handles this later)
- Seller profiles / multi-tenant
- Order management
- Bulk operations (import/export)
- Store consuming real data (separate migration)

---

## 7. Implementation Order

1. **DB migration** — new columns, enum, indexes, RLS, storage bucket, `updated_at` trigger
2. **Store type rename** — `physical` → `merch`, `commission` → `service` across store app
3. **Shared types** — generate Supabase types, move `ProductType`/`ProductCategory` to `packages/shared`
4. **Scaffold studio app** — copy from store template, strip store-specific code, configure port/routing
5. **Product list page** — table with Supabase query, filters, status toggles
6. **Product form** — create/edit with type-specific fields
7. **Image upload** — Supabase Storage integration
8. **Verify** — typecheck, lint, test, manual QA
