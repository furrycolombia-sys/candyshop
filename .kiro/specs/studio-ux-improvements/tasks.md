# Tasks: Studio UX Improvements

## Task 1: Database Migration — seller_admins product_id Column

Update the seller_admins table to support per-product delegation.

- [x] 1.1 Create a new SQL migration file that adds `product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE` to `seller_admins`, drops the old UNIQUE constraint `(seller_id, admin_user_id)`, creates a new UNIQUE constraint `(seller_id, admin_user_id, product_id)`, and adds an index on `product_id`
- [x] 1.2 Update RLS policies: drop and recreate `seller_admins_select`, `seller_admins_insert`, `seller_admins_update`, `seller_admins_delete` to include `product_id` awareness
- [x] 1.3 Update `orders_delegate_read` and `orders_delegate_update` policies to join through `order_items` and verify the delegate has a `seller_admins` row matching the `product_id` of at least one item in the order
- [x] 1.4 Update the Supabase generated types in `packages/api/src/supabase/types.ts` to include `product_id` in the `seller_admins` Row, Insert, and Update types, and add the products FK relationship

## Task 2: Domain & Type Updates

Update domain types and schemas across Studio and Payments apps.

- [x] 2.1 Update `SellerAdmin` and `DelegateWithProfile` interfaces in `apps/studio/src/features/seller-admins/domain/types.ts` to include `product_id: string`
- [x] 2.2 Update `productImageSchema` in `apps/studio/src/features/products/domain/validationSchema.ts` to add optional `is_cover` boolean field (default `false`), and update the `ProductImage` type
- [x] 2.3 Create a shared `getCoverImageUrl(images: unknown): string | null` utility function that finds the image with `is_cover: true` or falls back to the first image
- [x] 2.4 Write unit tests for `getCoverImageUrl` covering: image with `is_cover: true`, no cover marked (fallback to first), empty array, non-array input, string images, object images

## Task 3: Infrastructure Layer — Delegate Queries & Mutations (Per-Product)

Update Supabase query and mutation functions to accept `productId`.

- [x] 3.1 Update `fetchDelegates(supabase, sellerId, productId)` in `delegateQueries.ts` to filter by both `seller_id` and `product_id`
- [x] 3.2 Update `addDelegate` in `delegateMutations.ts` to accept and insert `productId`
- [x] 3.3 Update `removeDelegate` in `delegateMutations.ts` to accept `productId` and delete by `(seller_id, admin_user_id, product_id)`
- [x] 3.4 Create `fetchDelegateCountsByProduct(supabase, sellerId)` query that returns `Record<string, number>` (productId → count) using a GROUP BY query
- [x] 3.5 Update unit tests for `delegateQueries.ts` and `delegateMutations.ts` to cover the new `productId` parameter

## Task 4: Application Layer — Hooks Update

Update React Query hooks to pass `productId` through.

- [x] 4.1 Update `useDelegates(sellerId, productId)` hook to pass `productId` to `fetchDelegates`
- [x] 4.2 Update `useAddDelegate` hook to accept and pass `productId` in the mutation
- [x] 4.3 Update `useRemoveDelegate` hook to accept and pass `productId` in the mutation
- [x] 4.4 Create `useDelegateCountsByProduct(sellerId)` hook that calls `fetchDelegateCountsByProduct` and returns the count map
- [x] 4.5 Update unit tests for delegate hooks to cover `productId` parameter

## Task 5: Remove Global Delegates Page and DelegateNav

Remove the old global delegation UI.

- [x] 5.1 Remove `DelegateNav` import and usage from `apps/studio/src/app/[locale]/layout.tsx`
- [x] 5.2 Delete the `apps/studio/src/app/[locale]/delegates/` route directory
- [x] 5.3 Delete the `DelegateNav.tsx` component file and its test file (if any)
- [x] 5.4 Verify no remaining imports reference `DelegateNav` or the `/delegates` route

## Task 6: Per-Product Delegate Management Page

Create the new per-product delegate management page.

- [x] 6.1 Create route file `apps/studio/src/app/[locale]/products/[id]/delegates/page.tsx` that renders the `ProductDelegatesPage` component
- [x] 6.2 Create `ProductDelegatesPage` component in `apps/studio/src/features/seller-admins/presentation/pages/ProductDelegatesPage.tsx` that accepts `productId`, fetches delegates scoped to that product, renders `AddDelegateForm` and `DelegateList`, shows product name in header, and is permission-gated behind `seller_admins.read`
- [x] 6.3 Update `AddDelegateForm` to accept an optional `productId` prop and pass it through `onAdd`
- [x] 6.4 Update `DelegateList` if needed to display product-scoped delegates (interface should remain the same since delegates are already filtered by the page)
- [x] 6.5 Write unit tests for `ProductDelegatesPage` with mocked hooks

## Task 7: ProductTableRow — Delegate Button & Badge, Cover Image

Update the product table row to show delegate controls and use cover image.

- [x] 7.1 Add `delegateCount` prop to `ProductTableRow` and render a `Users` icon badge next to the product name when `delegateCount > 0`
- [x] 7.2 Add a "Manage Delegates" button (Users icon) in the actions column that links to `/products/{productId}/delegates`
- [x] 7.3 Replace `getFirstImage(product.images)` with `getCoverImageUrl(product.images)` for the thumbnail
- [x] 7.4 Update `ProductTable` to fetch delegate counts via `useDelegateCountsByProduct` and pass `delegateCount` to each `ProductTableRow`
- [x] 7.5 Update unit tests for `ProductTableRow` and `ProductTable` to cover new props and behavior

## Task 8: Cover Image Selection in InlineImageCarousel

Add "Set as cover" functionality to the image carousel.

- [x] 8.1 Add a "Set as cover" button (Star icon) to each thumbnail in the desktop layout that sets `is_cover: true` on the clicked image and `is_cover: false` on all others via `setValue("images", updatedImages)`
- [x] 8.2 Add a visual indicator (filled Star icon with yellow color) on the thumbnail that has `is_cover: true`
- [x] 8.3 Add i18n keys for "Set as cover" (`setAsCover`) in the Studio translation files (en and es)
- [x] 8.4 Write unit tests for the cover image selection behavior in InlineImageCarousel

## Task 9: Store ProductCardImage — Use Cover Image

Update the store app to display the cover image.

- [x] 9.1 Replace `getFirstImageUrl(product.images)` with `getCoverImageUrl(product.images)` in `ProductCardImage.tsx`
- [x] 9.2 Import `getCoverImageUrl` from the shared location or duplicate the utility in the store app's domain layer
- [x] 9.3 Update any other store components that use `images[0]` to use `getCoverImageUrl` (e.g., `CartItemRow`, `CheckoutItemsSummary`)

## Task 10: Carousel GripVertical Drag Handle

Add GripVertical drag handles to carousel thumbnails.

- [x] 10.1 In the desktop Draggable thumbnails, separate `dragHandleProps` from the thumbnail: apply `dragHandleProps` to a new `GripVertical` icon element, not the entire thumbnail div
- [x] 10.2 Style the GripVertical handle with `cursor-grab text-muted-foreground hover:text-foreground` and `size-3`, matching the pattern in SectionItemsCards and SectionItemsTwoColumn
- [x] 10.3 Ensure mobile thumbnails remain non-draggable (no GripVertical handle in mobile layout)
- [x] 10.4 Add i18n key for drag handle aria-label (`dragToReorder`) if not already present in the carousel's translation namespace

## Task 11: Seed Script & Integration Verification

Update seed scripts and verify end-to-end behavior.

- [x] 11.1 Update `seed-moonfest.mjs` to include `is_cover: true` on the first image in the images array
- [x] 11.2 Verify the seed script works with the updated `seller_admins` schema (if it seeds delegates, add `product_id`)
- [x] 11.3 Run `pnpm typecheck` and `pnpm lint` across the monorepo to verify no type or lint errors
