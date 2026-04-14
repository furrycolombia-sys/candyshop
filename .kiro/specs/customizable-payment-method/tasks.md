# Implementation Plan: Customizable Payment Method

## Overview

Replace the two-table payment method system with a single seller-owned `seller_payment_methods`
table. Rebuild the Builder UI around the new schema and update the Checkout Renderer to render
dynamic display blocks and form fields. Implement full validation, file upload, and order creation.

## Tasks

- [x] 1. Database migration
  - Write a Supabase migration that drops `payment_method_types` and the old `seller_payment_methods`
    table and creates the new `seller_payment_methods` table with columns: `id`, `seller_id`,
    `name_en`, `name_es`, `display_blocks` (JSONB), `form_fields` (JSONB), `is_active`,
    `sort_order`, `created_at`, `updated_at`
  - Add RLS policies: sellers can CRUD only their own rows; unauthenticated/authenticated buyers can
    SELECT active rows for a given seller
  - Add a migration smoke-test file that asserts the new table exists, old tables are gone, and RLS
    policies are present
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 2. Domain types and pure utility functions
  - [x] 2.1 Define TypeScript types in `features/payment-methods/domain/types.ts`
    - `DisplayBlockType`, `DisplayBlock` (union of `TextBlock | ImageBlock | VideoBlock | LinkBlock | UrlBlock`), `FormFieldType`, `FormField`, `SellerPaymentMethodWithType`, `BuyerSubmission`
    - _Requirements: 2.1, 3.1, 10.1, 10.2_

  - [x] 2.2 Implement pure domain utility functions in `features/payment-methods/domain/`
    - `assignBlockId(block)` / `assignFieldId(field)` — assign stable nanoid if id is absent
    - `removeById(array, id)` — remove element by id, return new array
    - `reorderById(array, newOrder)` — reorder array by id permutation, return new array
    - `validatePaymentMethodName(name)` — reject empty/whitespace
    - `validateDisplayBlock(block)` — reject invalid type or empty URL
    - `validateFormField(field)` — reject invalid type or empty label
    - `validateBuyerSubmission(fields, submission)` — return missing required field labels
    - `validateFileSize(bytes)` — accept iff ≤ 10 × 1024 × 1024
    - _Requirements: 1.3, 2.10, 3.2, 3.9, 7.9, 7.10, 8.4, 8.5, 10.1–10.5_

  - [ ]\* 2.3 Write property test: JSONB round-trip (Property 1)
    - Generate random arrays of valid `DisplayBlock` / `FormField` objects with `fc.array()`
    - Assert `JSON.parse(JSON.stringify(arr))` is structurally equivalent to the original
    - **Property 1: JSONB round-trip**
    - **Validates: Requirements 2.6, 3.5, 10.6**

  - [ ]\* 2.4 Write property test: Empty/whitespace input rejection (Property 2)
    - Generate whitespace-only strings via `fc.string()` filtered to `/^\s*$/`
    - Assert all three validators (`validatePaymentMethodName`, `validateDisplayBlock` URL field,
      `validateFormField` label) return a validation error
    - **Property 2: Empty/whitespace input rejection**
    - **Validates: Requirements 1.3, 2.10, 3.2, 3.9**

  - [ ]\* 2.5 Write property test: New payment method has empty sections (Property 3)
    - Generate arbitrary non-empty name strings
    - Assert a freshly created payment method record has `display_blocks = []` and `form_fields = []`
    - **Property 3: New payment method has empty sections**
    - **Validates: Requirements 1.2**

  - [ ]\* 2.6 Write property test: Block and field removal by id (Property 4)
    - Generate non-empty arrays of `DisplayBlock` / `FormField` and pick a random id from the array
    - Assert `removeById` produces an array without that id and all other elements unchanged
    - **Property 4: Block and field removal by id**
    - **Validates: Requirements 2.7, 3.6**

  - [ ]\* 2.7 Write property test: Reorder preserves all elements (Property 5)
    - Generate arrays and random permutations of their ids
    - Assert `reorderById` returns an array with the same elements in the new order, no additions or losses
    - **Property 5: Reorder preserves all elements**
    - **Validates: Requirements 2.8, 2.9, 3.7, 3.8, 4.7**

  - [ ]\* 2.8 Write property test: Schema type validation (Property 11)
    - Generate arbitrary strings not in the valid type sets
    - Assert `validateDisplayBlock` and `validateFormField` return a validation error for unknown types
    - **Property 11: Schema type validation**
    - **Validates: Requirements 10.1, 10.2**

  - [ ]\* 2.9 Write property test: Stable id assignment (Property 12)
    - Generate valid block/field inputs without an id field
    - Assert `assignBlockId` / `assignFieldId` returns a non-empty string id that survives
      `JSON.parse(JSON.stringify(...))`
    - **Property 12: Stable id assignment**
    - **Validates: Requirements 10.5**

  - [ ]\* 2.10 Write property test: File size threshold (Property 10)
    - Generate integers around the 10 MB boundary
    - Assert `validateFileSize` accepts iff size ≤ 10 × 1024 × 1024
    - **Property 10: File size threshold**
    - **Validates: Requirements 8.4, 8.5**

- [x] 3. YouTube URL utility
  - [x] 3.1 Implement `toYouTubeEmbedUrl(input: string): string | null` in
        `features/payment-methods/domain/youtubeEmbed.ts`
    - Handle `youtube.com/watch?v=ID`, `youtu.be/ID`, and already-embed URLs
    - Return `null` for unrecognised URLs
    - _Requirements: 2.4_

  - [ ]\* 3.2 Write property test: YouTube URL conversion round-trip (Property 13)
    - Generate valid YouTube watch/short URLs with random video ids via `fc.string()`
    - Assert `toYouTubeEmbedUrl` returns `https://www.youtube.com/embed/{ID}` with the same id
    - **Property 13: YouTube URL conversion round-trip**
    - **Validates: Requirements 2.4**

- [ ] 4. Checkpoint — Ensure all domain tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Infrastructure layer — Supabase queries
  - Implement `paymentMethodQueries.ts` in `features/payment-methods/infrastructure/`
    - `fetchPaymentMethods(sellerId)` — SELECT all rows for seller, ordered by `sort_order`
    - `createPaymentMethod(sellerId, nameEn, nameEs?)` — INSERT with empty JSONB arrays
    - `updatePaymentMethod(id, patch)` — UPDATE name, display_blocks, form_fields, is_active, sort_order
    - `deletePaymentMethod(id)` — DELETE by id
  - Use absolute imports (`@/features/payment-methods/domain/types`)
  - _Requirements: 1.2, 1.4, 1.5, 4.1, 4.3, 4.5, 4.6, 4.7, 5.1_

- [x] 6. Application layer — TanStack Query hooks
  - Implement hooks in `features/payment-methods/application/`
    - `usePaymentMethods()` — wraps `fetchPaymentMethods`
    - `useCreatePaymentMethod()` — mutation calling `createPaymentMethod`, invalidates list
    - `useUpdatePaymentMethod()` — mutation calling `updatePaymentMethod`, invalidates list
    - `useDeletePaymentMethod()` — mutation calling `deletePaymentMethod`, invalidates list
  - _Requirements: 1.1, 1.2, 4.1, 4.3, 4.5, 4.6, 4.7_

- [x] 7. Builder UI — Payment method list page
  - Implement `PaymentMethodsPageContent` in `features/payment-methods/presentation/`
    - List all seller payment methods with name and active status
    - Toggle `is_active` inline
    - Delete with confirmation
    - Reorder via up/down controls (updates `sort_order`)
    - Navigate to editor for create/edit
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 8. Builder UI — Payment method editor
  - [x] 8.1 Implement `PaymentMethodEditor` component
    - Bilingual name inputs (`name_en` required, `name_es` optional)
    - Inline validation error for empty/whitespace name
    - Renders `DisplaySectionEditor` and `FormSectionEditor`
    - Save button calls `useUpdatePaymentMethod`
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 8.2 Implement `DisplaySectionEditor` and `DisplayBlockEditor`
    - Add block by type (text / image / video / link)
    - Per-type sub-editors: multi-line text input, URL + alt-text, URL (YouTube conversion on save),
      URL + label
    - Remove block, reorder with up/down controls
    - Inline validation for empty URL; call `toYouTubeEmbedUrl` for video blocks and show error if
      result is null
    - _Requirements: 2.1–2.10_

  - [x] 8.3 Implement `FormSectionEditor` and `FormFieldEditor`
    - Add field by type (text / email / number / file / textarea)
    - Inputs for label (required), required toggle (default true), placeholder (optional)
    - Remove field, reorder with up/down controls
    - Inline validation for empty label
    - _Requirements: 3.1–3.9_

  - [ ]\* 8.4 Write unit tests for `DisplaySectionEditor`
    - Test add/remove/reorder interactions and validation error display
    - _Requirements: 2.1–2.10_

  - [ ]\* 8.5 Write unit tests for `FormSectionEditor`
    - Test add/remove/reorder interactions and validation error display
    - _Requirements: 3.1–3.9_

- [ ] 9. Checkpoint — Ensure all Builder UI tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Checkout infrastructure — updated queries and file upload
  - Update `features/checkout/infrastructure/checkoutQueries.ts`
    - Remove join to `payment_method_types`; query `seller_payment_methods` directly
    - Return `SellerPaymentMethodWithType` with the new flat shape
  - Implement file upload helper in `features/checkout/infrastructure/`
    - Upload file to `receipts` Supabase Storage bucket
    - Return the public URL on success
    - Enforce 10 MB client-side check before upload
  - _Requirements: 5.1, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Checkout application layer — updated hooks
  - Update `features/checkout/application/useSellerPaymentMethods` to use the new query shape
  - Add `useFileUpload()` hook wrapping the file upload helper
  - _Requirements: 6.1, 7.1_

- [x] 12. Checkout API routes
  - [x] 12.1 Update `apps/payments/src/app/api/checkout/payment-methods/route.ts`
    - Query `seller_payment_methods` with service role; filter `is_active = true`
    - Return the new flat shape
    - _Requirements: 4.4, 5.5, 6.1_

  - [x] 12.2 Create `apps/payments/src/app/api/checkout/orders/route.ts`
    - Accept `{ payment_method_id, buyer_submission }` in POST body
    - Validate all `required: true` form fields have non-empty values; return 422 with missing labels
      if not
    - On success, insert order row with `buyer_info = buyer_submission`
    - _Requirements: 7.9, 7.10, 7.11_

  - [ ]\* 12.3 Write property test: Inactive payment methods excluded from checkout (Property 6)
    - Generate mixed active/inactive method arrays; mock the DB query
    - Assert the route returns only `is_active = true` methods
    - **Property 6: Inactive payment methods excluded from checkout**
    - **Validates: Requirements 4.4**

  - [ ]\* 12.4 Write property test: Required field validation (Property 8)
    - Generate `form_fields` arrays and partial/complete `BuyerSubmission` maps
    - Assert the validator returns a non-empty missing-labels list iff at least one required field
      has no non-empty value
    - **Property 8: Required field validation**
    - **Validates: Requirements 7.9, 7.10**

  - [ ]\* 12.5 Write property test: Buyer submission round-trip (Property 9)
    - Generate complete valid submissions; mock DB insert/read
    - Assert `orders.buyer_info` contains every key-value pair from the original submission
    - **Property 9: Buyer submission round-trip**
    - **Validates: Requirements 7.11**

- [x] 13. Checkout Renderer components
  - [x] 13.1 Implement `DisplayBlockRenderer`
    - Render `text` as formatted text, `image` as `<img>`, `video` as `<iframe>`, `link` as `<a target="_blank">`
    - Show fallback placeholder `<div>` if URL is malformed or resource fails to load
    - _Requirements: 6.1–6.6_

  - [x] 13.2 Implement `DynamicFormField`
    - Render correct input per type: `text` → `<input type="text">`, `email` → `<input type="email">`,
      `number` → `<input type="number">`, `file` → `<input type="file" accept="image/*,.pdf">`,
      `textarea` → `<textarea>`
    - Show required indicator when `required: true`
    - Show placeholder when provided
    - _Requirements: 7.1–7.8_

  - [x] 13.3 Update `SellerCheckoutContent`
    - Replace old fixed fields with `DisplayBlockRenderer` (one per display block) and
      `DynamicFormField` (one per form field)
    - On submit: validate required fields client-side, upload any file fields via `useFileUpload`,
      then POST to `/api/checkout/orders`
    - Show 422 missing-field errors inline; show file upload errors inline
    - _Requirements: 7.9, 7.10, 7.11, 8.1–8.5_

  - [ ]\* 13.4 Write unit tests for `DisplayBlockRenderer`
    - Test each block type renders the correct element
    - Test fallback placeholder on load error
    - _Requirements: 6.2–6.6_

  - [ ]\* 13.5 Write unit tests for `DynamicFormField`
    - Test each field type renders the correct input
    - Test required indicator and placeholder display
    - _Requirements: 7.2–7.8_

  - [ ]\* 13.6 Write property test: Renderer preserves block and field order (Property 7)
    - Generate ordered arrays of `DisplayBlock` / `FormField`; render with the component
    - Assert the nth rendered element corresponds to the nth array element
    - **Property 7: Renderer preserves block and field order**
    - **Validates: Requirements 6.1, 7.1**

- [x] 14. Seller order review
  - Update the order detail view in the Builder to display `orders.buyer_info` fields and values
  - Render `file`-type fields as a clickable link or inline image preview
  - Display fields in the same order as the payment method's `form_fields` array
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per run
- Checkpoints ensure incremental validation before moving to the next surface
