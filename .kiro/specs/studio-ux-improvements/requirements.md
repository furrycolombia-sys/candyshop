# Requirements: Studio UX Improvements

## Requirement 1: Per-Product Delegate UX Redesign

### 1.1 Remove Global Delegates Page and DelegateNav

- GIVEN the Studio app layout
- WHEN the app renders
- THEN the `DelegateNav` component is not rendered in the layout
- AND the `/delegates` route no longer exists
- AND the `DelegateNav` component file is deleted

### 1.2 Add "Manage Delegates" Button to Product Table Row

- GIVEN a product row in the ProductTable
- WHEN the seller has update permissions
- THEN a "Manage Delegates" button (with Users icon) is visible in the actions column
- AND clicking it navigates to `/products/{productId}/delegates`

### 1.3 Delegate Indicator Badge on Product Row

- GIVEN a product row in the ProductTable
- WHEN the product has at least 1 delegate assigned
- THEN a Users icon badge is displayed next to the product name
- AND the badge is not shown when the product has 0 delegates

### 1.4 Batch Delegate Count Query

- GIVEN the ProductTable is loading products
- WHEN delegate counts are fetched
- THEN a single batch query `SELECT product_id, COUNT(*) FROM seller_admins WHERE seller_id = ? GROUP BY product_id` is used
- AND no N+1 queries are made per product row

### 1.5 Per-Product Delegate Management Page

- GIVEN a seller navigates to `/products/{productId}/delegates`
- WHEN the page loads
- THEN the page displays the product name in the header
- AND the page renders the `AddDelegateForm` component scoped to that product
- AND the page renders the `DelegateList` component showing only delegates for that product
- AND the page is permission-gated behind `seller_admins.read`

### 1.6 Add product_id Column to seller_admins Table

- GIVEN the seller_admins database table
- WHEN the migration runs
- THEN a `product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE` column exists
- AND the UNIQUE constraint is `(seller_id, admin_user_id, product_id)`
- AND the self-delegation CHECK constraint `seller_id <> admin_user_id` is preserved
- AND an index on `product_id` is created

### 1.7 Update RLS Policies for product_id

- GIVEN the seller_admins RLS policies
- WHEN the migration runs
- THEN all SELECT, INSERT, UPDATE, DELETE policies include `product_id` in their conditions
- AND the orders delegate read/update policies join through `order_items` to verify the delegate has a matching `product_id`

### 1.8 Update fetchDelegates to Accept productId

- GIVEN the `fetchDelegates` infrastructure function
- WHEN called with `(sellerId, productId)`
- THEN it queries `seller_admins` filtered by both `seller_id` and `product_id`
- AND returns `DelegateWithProfile[]` scoped to that product

### 1.9 Update addDelegate to Accept productId

- GIVEN the `addDelegate` infrastructure function
- WHEN called with `(sellerId, adminUserId, permissions, productId)`
- THEN it inserts a row into `seller_admins` with the given `product_id`
- AND the UNIQUE constraint prevents duplicate `(sellerId, adminUserId, productId)` rows

### 1.10 Update removeDelegate to Accept productId

- GIVEN the `removeDelegate` infrastructure function
- WHEN called with `(sellerId, adminUserId, productId)`
- THEN it deletes the specific delegation row matching all three fields

### 1.11 Update Payments fetchDelegatedOrderRows to Filter by product_id

- GIVEN the `fetchDelegatedOrderRows` function in the Payments app
- WHEN fetching delegated orders for a delegate user
- THEN it fetches `seller_id` and `product_id` from `seller_admins`
- AND it filters orders to only those containing `order_items` with a `product_id` matching the delegate's assigned products

### 1.12 Update SellerAdmin Domain Types

- GIVEN the `SellerAdmin` and `DelegateWithProfile` types
- WHEN the types are updated
- THEN `SellerAdmin` includes a `product_id: string` field
- AND `DelegateWithProfile` inherits the `product_id` field

### 1.13 Update useDelegateMutations Hooks

- GIVEN the `useAddDelegate` and `useRemoveDelegate` hooks
- WHEN called
- THEN they accept and pass `productId` to the underlying mutation functions

## Requirement 2: Cover Image Selection

### 2.1 Add is_cover Field to ProductImage Schema

- GIVEN the `productImageSchema` Zod schema
- WHEN the schema is updated
- THEN it includes an optional `is_cover` boolean field (default `false`)
- AND the `ProductImage` type includes `is_cover?: boolean`

### 2.2 "Set as Cover" Button on Carousel Thumbnails

- GIVEN the InlineImageCarousel component
- WHEN a thumbnail is rendered
- THEN a "Set as cover" button (Star icon) is visible on each thumbnail
- AND clicking it sets `is_cover: true` on that image and `is_cover: false` on all others

### 2.3 Visual Indicator for Cover Image

- GIVEN the InlineImageCarousel component
- WHEN an image has `is_cover: true`
- THEN a filled star icon overlay is displayed on that thumbnail
- AND non-cover thumbnails show an unfilled star icon

### 2.4 getCoverImageUrl Utility Function

- GIVEN a product's images array
- WHEN `getCoverImageUrl(images)` is called
- THEN it returns the URL of the image with `is_cover: true`
- AND if no image has `is_cover: true`, it returns the URL of the first image
- AND if the images array is empty or invalid, it returns null

### 2.5 Store ProductCardImage Uses Cover Image

- GIVEN the store's `ProductCardImage` component
- WHEN rendering a product card
- THEN it uses `getCoverImageUrl(product.images)` instead of `getFirstImageUrl(product.images)`

### 2.6 Studio ProductTableRow Uses Cover Image

- GIVEN the Studio's `ProductTableRow` component
- WHEN rendering a product row thumbnail
- THEN it uses `getCoverImageUrl(product.images)` instead of `getFirstImage(product.images)`

### 2.7 Cover Image Preserved on Drag Reorder

- GIVEN the InlineImageCarousel with a cover image set
- WHEN the user drags and reorders thumbnails
- THEN the `is_cover` flag stays on the same image object
- AND no index recalculation is needed

### 2.8 Backwards Compatibility for Legacy Products

- GIVEN a product with images that have no `is_cover` field
- WHEN the product is displayed
- THEN the first image (index 0) is used as the cover image
- AND no errors are thrown

## Requirement 3: Carousel Image Reordering with GripVertical

### 3.1 Add GripVertical Drag Handle to Desktop Thumbnails

- GIVEN the InlineImageCarousel desktop layout (vertical thumbnails)
- WHEN a thumbnail is rendered as a Draggable
- THEN a `GripVertical` icon is rendered as the drag handle
- AND `dragHandleProps` are applied to the GripVertical element (not the entire thumbnail)
- AND the GripVertical icon matches the pattern used by SectionCard and SectionItems (lucide-react, `size-3`)

### 3.2 Drag Handle Visibility

- GIVEN a carousel thumbnail with a GripVertical handle
- WHEN the thumbnail is in its default state
- THEN the GripVertical handle is visible (consistent with other draggable elements in the app)
- AND the handle uses `cursor-grab text-muted-foreground hover:text-foreground` styling

### 3.3 Mobile Thumbnails Remain Non-Draggable

- GIVEN the InlineImageCarousel mobile layout (horizontal thumbnails)
- WHEN thumbnails are rendered
- THEN they do not have drag handles (mobile uses horizontal scroll, not drag-and-drop)
- AND the existing non-draggable mobile behavior is preserved
