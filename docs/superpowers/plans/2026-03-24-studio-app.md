# Studio App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Studio seller dashboard app with Supabase backend, syncing DB schema with front-end needs.

**Architecture:** New Next.js app (`apps/studio`) using Supabase JS client + React Query for CRUD operations on the existing Postgres schema. DB migration adds missing columns/tables. Front-end types align to DB `snake_case`. Shared product types move to `packages/shared`.

**Tech Stack:** Next.js 16, Supabase (Postgres + Storage + Auth), React Query, Tailwind v4, shadcn/ui, next-intl

**Spec:** `docs/superpowers/specs/2026-03-24-studio-app-design.md`

---

## Phase 1: Foundation (DB + Types + Store Rename)

### Task 1: DB Migration — New Columns, Enums, Tables

**Files:**

- Create: `supabase/migrations/20260324000000_studio_schema.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260324000000_studio_schema.sql` with all changes from spec sections 1.2–1.7:

```sql
-- Category enum
create type public.product_category as enum (
  'fursuits', 'merch', 'art', 'events', 'digital', 'deals'
);

-- New columns on products
alter table public.products
  add column category public.product_category not null default 'merch',
  add column long_description_en text not null default '',
  add column long_description_es text not null default '',
  add column tagline_en text not null default '',
  add column tagline_es text not null default '',
  add column compare_at_price_cop integer,
  add column compare_at_price_usd integer,
  add column featured boolean not null default false,
  add column tags text[] not null default '{}',
  add column rating numeric(3,2),
  add column review_count integer not null default 0,
  add column images jsonb not null default '[]',
  add column screenshots jsonb not null default '[]',
  add column highlights jsonb not null default '[]',
  add column faq jsonb not null default '[]',
  add column type_details jsonb not null default '{}',
  add column updated_at timestamptz not null default now();

-- Constraints
alter table public.products
  add constraint products_rating_range check (rating between 1.00 and 5.00);

-- updated_at trigger
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

-- product_reviews table
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

alter table public.product_reviews enable row level security;

-- Indexes
create index idx_products_category on public.products(category);
create index idx_products_featured on public.products(featured) where featured = true;
create index idx_products_updated_at on public.products(updated_at);
create index idx_product_reviews_product_id on public.product_reviews(product_id);

-- RLS: products write policies
create policy "products_auth_insert" on public.products
  for insert with check (auth.role() = 'authenticated');
create policy "products_auth_update" on public.products
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "products_auth_delete" on public.products
  for delete using (auth.role() = 'authenticated');

-- RLS: reviews
create policy "reviews_public_read" on public.product_reviews
  for select using (true);
create policy "reviews_own_insert" on public.product_reviews
  for insert with check (auth.uid() = user_id);

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product_images_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "product_images_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply migration locally**

Run: `supabase db reset` (or `supabase migration up` if Supabase is already running)
Expected: Migration applies without errors.

- [ ] **Step 3: Generate TypeScript types from the updated schema**

Run: `supabase gen types typescript --local > packages/api/src/types/database.ts`
Expected: File created with `Database` type including new columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260324000000_studio_schema.sql packages/api/src/types/database.ts
git commit -m "feat(db): add studio schema — category enum, product columns, reviews, storage [GH-N]"
```

---

### Task 2: Store Type Rename — `physical` → `merch`, `commission` → `service`

**Files:**

- Modify: `apps/store/src/shared/domain/categoryTypes.ts`
- Modify: `apps/store/src/features/products/domain/types.ts`
- Modify: `apps/store/src/features/products/domain/constants.ts`
- Modify: `apps/store/src/mocks/data/products.ts`
- Modify: all files referencing `physical`, `commission`, `PhysicalDetails`, `CommissionDetails`

- [ ] **Step 1: Update `ProductType` enum**

In `apps/store/src/shared/domain/categoryTypes.ts`:

```typescript
export type ProductType = "merch" | "digital" | "service" | "ticket";
```

- [ ] **Step 2: Rename interfaces in `types.ts`**

In `apps/store/src/features/products/domain/types.ts`:

- `PhysicalDetails` → `MerchDetails`
- `CommissionDetails` → `ServiceDetails`
- `physical?` → `merch?`
- `commission?` → `service?`

- [ ] **Step 3: Update `PRODUCT_TYPES` constant**

In `apps/store/src/features/products/domain/constants.ts`:

```typescript
export const PRODUCT_TYPES: { value: ProductType }[] = [
  { value: "merch" },
  { value: "digital" },
  { value: "service" },
  { value: "ticket" },
];
```

- [ ] **Step 4: Update mock data**

In `apps/store/src/mocks/data/products.ts`:

- Replace all `type: "physical"` → `type: "merch"`
- Replace all `type: "commission"` → `type: "service"`
- Replace all `physical: {` → `merch: {`
- Replace all `commission: {` → `service: {`

- [ ] **Step 5: Update all component references**

Search and replace across `apps/store/src/`:

- `product.type === "physical"` → `product.type === "merch"`
- `product.type === "commission"` → `product.type === "service"`
- `product.physical` → `product.merch`
- `product.commission` → `product.service`
- Update `ProductCardMeta.tsx`, `buildSpecRows.ts`, detail page sections

- [ ] **Step 6: Update i18n translation keys**

In `apps/store/src/shared/infrastructure/i18n/messages/en.json` and `es.json`:

- Rename `productTypes.physical` → `productTypes.merch`
- Rename `productTypes.commission` → `productTypes.service`

- [ ] **Step 7: Update `buildGridOrder.test.ts` stubs**

The test stubs use `type: "physical"` — update to `type: "merch"`.

- [ ] **Step 8: Verify**

Run: `pnpm typecheck && pnpm lint --fix && pnpm test:store -- --run`
Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add apps/store/
git commit -m "refactor(store): rename physical→merch, commission→service to align with DB [GH-N]"
```

---

### Task 3: Move Shared Product Types to `packages/shared`

**Files:**

- Create: `packages/shared/src/types/product.ts`
- Modify: `packages/shared/src/types/index.ts` (create if missing)
- Create: `packages/shared/src/utils/i18nField.ts`
- Modify: `packages/shared/src/utils/index.ts`
- Modify: `apps/store/src/shared/domain/categoryTypes.ts` (re-export from shared)

- [ ] **Step 1: Create shared product types**

Create `packages/shared/src/types/product.ts`:

```typescript
export type ProductType = "merch" | "digital" | "service" | "ticket";

export type ProductCategory =
  | "fursuits"
  | "merch"
  | "art"
  | "events"
  | "digital"
  | "deals";
```

- [ ] **Step 2: Create types index**

Create `packages/shared/src/types/index.ts`:

```typescript
export type { ProductCategory, ProductType } from "./product";
```

- [ ] **Step 3: Create `i18nField` utility**

Create `packages/shared/src/utils/i18nField.ts`:

```typescript
/**
 * Resolves an i18n field from a DB row with _en/_es suffixes.
 * Falls back to English if the locale field is missing.
 */
export function i18nField(
  obj: Record<string, unknown>,
  field: string,
  locale: string,
): string {
  return String(obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "");
}
```

- [ ] **Step 4: Export from utils index**

Add to `packages/shared/src/utils/index.ts`:

```typescript
export { i18nField } from "./i18nField";
```

- [ ] **Step 5: Update store to import from shared**

In `apps/store/src/shared/domain/categoryTypes.ts`:

```typescript
export type { ProductCategory, ProductType } from "shared/types";
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: All pass. Store still works with re-exports.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/ apps/store/src/shared/domain/categoryTypes.ts
git commit -m "refactor: move ProductType/ProductCategory to packages/shared [GH-N]"
```

---

## Phase 2: Studio App

### Task 4: Scaffold Studio App

**Files:**

- Create: `apps/studio/` (copied from `apps/store/`, stripped down)
- Modify: `pnpm-workspace.yaml` (already includes `apps/*`)
- Modify: `.env.example` (add studio URL)
- Modify: `package.json` (add `dev:studio` script)
- Modify: `packages/app-components/` (add studio to app registry if needed)

- [ ] **Step 1: Copy store app as template**

```bash
cp -r apps/store apps/studio
```

- [ ] **Step 2: Strip store-specific code**

Remove from `apps/studio/`:

- `src/features/cart/` (no cart in studio)
- `src/features/products/` (will be rebuilt for studio)
- `src/mocks/data/products.ts`
- `src/app/[locale]/products/` (store detail pages)
- `e2e/` tests

Keep:

- `src/app/[locale]/layout.tsx` (update `currentApp="studio"`)
- `src/shared/infrastructure/` (i18n, config, providers — update messages)
- `src/features/auth/` (same auth setup)

- [ ] **Step 3: Update `package.json`**

In `apps/studio/package.json`:

- Name: `"studio"`
- Dev port: `5006`
- Remove cart/fly-to-cart deps if any (`usehooks-ts` may still be needed)

- [ ] **Step 4: Update `next.config.ts`**

- `basePath: "${basePathPrefix}/studio"`
- Dev port in `package.json` scripts: `"dev": "next dev -p 5006"`

- [ ] **Step 5: Update `.env.example`**

Add: `NEXT_PUBLIC_STUDIO_URL=http://localhost:5006`

- [ ] **Step 6: Add root scripts**

In root `package.json`:

```json
"dev:studio": "turbo dev --filter=studio"
```

- [ ] **Step 7: Update `AppNavigation` app registry**

Check `packages/app-components/` for the app list. Add `studio` with its URL.

- [ ] **Step 8: Create empty i18n messages**

Create `apps/studio/src/shared/infrastructure/i18n/messages/en.json` and `es.json` with basic structure:

```json
{
  "meta": {
    "title": "Candy Shop - Studio",
    "description": "Manage your products"
  },
  "nav": { "products": "Products", "newProduct": "New Product" },
  "products": {
    "title": "Products",
    "subtitle": "Manage your catalog",
    "name": "Name",
    "type": "Type",
    "category": "Category",
    "price": "Price",
    "status": "Status",
    "featured": "Featured",
    "active": "Active",
    "actions": "Actions",
    "edit": "Edit",
    "delete": "Delete",
    "confirmDelete": "Are you sure?",
    "noProducts": "No products yet",
    "createFirst": "Create your first product"
  }
}
```

- [ ] **Step 9: Verify scaffold builds**

Run: `pnpm dev:studio`
Expected: Studio app runs on port 5006, shows empty layout with AppNavigation.

- [ ] **Step 10: Commit**

```bash
git add apps/studio/ .env.example package.json packages/app-components/
git commit -m "feat(studio): scaffold studio app from store template [GH-N]"
```

---

### Task 5: Product List Page

**Files:**

- Create: `apps/studio/src/features/products/infrastructure/productQueries.ts`
- Create: `apps/studio/src/features/products/application/useProducts.ts`
- Create: `apps/studio/src/features/products/application/useProductMutations.ts`
- Create: `apps/studio/src/features/products/presentation/components/ProductTable.tsx`
- Create: `apps/studio/src/features/products/presentation/components/ProductFilters.tsx`
- Create: `apps/studio/src/features/products/presentation/pages/ProductListPage.tsx`
- Create: `apps/studio/src/features/products/index.ts`
- Modify: `apps/studio/src/app/[locale]/page.tsx`

- [ ] **Step 1: Create Supabase product queries (infrastructure)**

`apps/studio/src/features/products/infrastructure/productQueries.ts`:

- `fetchProducts(supabase, filters?)` — select all products, optional filters by type/category/search
- `updateProductField(supabase, id, field, value)` — update a single field (for toggles)
- `deleteProduct(supabase, id)` — delete by ID

Uses `createBrowserSupabaseClient` from `"api/supabase"`.

- [ ] **Step 2: Create React Query hooks (application)**

`useProducts.ts` — `useQuery` wrapping `fetchProducts`
`useProductMutations.ts` — `useMutation` for toggle active, toggle featured, delete. Invalidates `['products']` on success.

- [ ] **Step 3: Create ProductTable component**

Uses `Table` from `ui` package. Columns: thumbnail (first image), name, type badge, category badge, price (COP), active toggle (Switch), featured toggle (Switch), actions dropdown (edit link, delete button).

- [ ] **Step 4: Create ProductFilters component**

Type filter (tabs), category filter (pills), search input. Uses `nuqs` for URL state.

- [ ] **Step 5: Create ProductListPage**

Composes ProductFilters + ProductTable + "New Product" link button.

- [ ] **Step 6: Wire up the route**

`apps/studio/src/app/[locale]/page.tsx` renders `<ProductListPage />`.

- [ ] **Step 7: Verify**

Run: `pnpm dev:studio`, navigate to `http://localhost:5006/en`
Expected: Product table loads from Supabase (empty if no seed data), filters work, toggles update DB.

- [ ] **Step 8: Commit**

```bash
git add apps/studio/src/features/products/
git commit -m "feat(studio): product list page with Supabase queries [GH-N]"
```

---

### Task 6: Product Form (Create + Edit)

**Files:**

- Create: `apps/studio/src/features/products/domain/validationSchema.ts`
- Create: `apps/studio/src/features/products/infrastructure/productMutations.ts`
- Create: `apps/studio/src/features/products/presentation/components/ProductForm.tsx`
- Create: `apps/studio/src/features/products/presentation/components/TypeFieldsMerch.tsx`
- Create: `apps/studio/src/features/products/presentation/components/TypeFieldsDigital.tsx`
- Create: `apps/studio/src/features/products/presentation/components/TypeFieldsService.tsx`
- Create: `apps/studio/src/features/products/presentation/components/TypeFieldsTicket.tsx`
- Create: `apps/studio/src/features/products/presentation/pages/ProductFormPage.tsx`
- Create: `apps/studio/src/app/[locale]/products/new/page.tsx`
- Create: `apps/studio/src/app/[locale]/products/[id]/page.tsx`

- [ ] **Step 1: Create validation schema**

Using `zod`. Common fields + type-specific fields via discriminated union on `type`.

- [ ] **Step 2: Create insert/update mutations (infrastructure)**

`productMutations.ts`:

- `insertProduct(supabase, data)` — insert row, return created product
- `updateProduct(supabase, id, data)` — update row

- [ ] **Step 3: Create type-specific field components**

One component per type: `TypeFieldsMerch`, `TypeFieldsDigital`, `TypeFieldsService`, `TypeFieldsTicket`. Each renders the fields from the `type_details` JSONB shape defined in the spec (section 1.3.1).

- [ ] **Step 4: Create ProductForm**

Uses `react-hook-form` + `zod` resolver. Renders:

- Type selector (radio group or tabs) — switching type shows different TypeFields component
- Common fields: name_en, name_es, description_en, description_es, category select, price_cop, price_usd, tags input, featured checkbox
- Type-specific fields (dynamic based on selected type)
- Image upload section (Task 7)
- Submit button

- [ ] **Step 5: Create ProductFormPage**

Accepts optional `productId` prop. If provided, fetches product and pre-populates form (edit mode). Otherwise, empty form (create mode). On submit, calls insert or update mutation, navigates back to list.

- [ ] **Step 6: Create route files**

`apps/studio/src/app/[locale]/products/new/page.tsx` → `<ProductFormPage />`
`apps/studio/src/app/[locale]/products/[id]/page.tsx` → `<ProductFormPage productId={id} />`

- [ ] **Step 7: Verify**

Run: `pnpm dev:studio`, create a product, verify it appears in the list, edit it, verify changes persist.

- [ ] **Step 8: Commit**

```bash
git add apps/studio/src/
git commit -m "feat(studio): product form — create and edit with type-specific fields [GH-N]"
```

---

### Task 7: Image Upload

**Files:**

- Create: `apps/studio/src/features/products/infrastructure/imageUpload.ts`
- Create: `apps/studio/src/features/products/presentation/components/ImageUpload.tsx`

- [ ] **Step 1: Create upload infrastructure**

`imageUpload.ts`:

- `uploadProductImage(supabase, file: File)` — uploads to `product-images` bucket, returns public URL
- `deleteProductImage(supabase, path: string)` — deletes from bucket

- [ ] **Step 2: Create ImageUpload component**

Drop zone (drag and drop), file picker, preview grid with reorder (drag to reorder), delete button per image. On upload, calls `uploadProductImage`, adds URL to form's `images` JSONB array.

Uses `react-dropzone` or native `<input type="file">` with drag events.

- [ ] **Step 3: Integrate into ProductForm**

Add `<ImageUpload images={form.images} onChange={setImages} />` to the form. The `images` field is a JSONB array: `[{url, alt, sort_order}]`.

- [ ] **Step 4: Verify**

Upload an image, verify it appears in Supabase Storage, verify the URL is saved in the product's `images` JSONB.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/features/products/
git commit -m "feat(studio): image upload with Supabase Storage [GH-N]"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run all quality checks**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: All pass across all apps.

- [ ] **Step 2: Manual QA**

- Studio: create product with each type, upload images, edit, toggle active/featured, delete
- Store: verify existing functionality still works (mocks unchanged)

- [ ] **Step 3: Commit any fixes and submit PR**

```bash
/submit-pr
```
