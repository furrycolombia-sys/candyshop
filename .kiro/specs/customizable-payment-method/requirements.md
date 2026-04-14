# Requirements Document

## Introduction

The Customizable Payment Method feature replaces the current fixed-schema payment method system
(`payment_method_types` + `seller_payment_methods`) with a fully flexible, seller-owned system.

Sellers build each payment method from scratch: they give it a name, compose a **display section**
(rich content shown to the buyer before the form), and define a **form section** (the fields the
buyer must fill at checkout). Both sections are ordered lists that the seller can reorder freely.
Buyers see the rendered display content and fill the dynamic form at checkout; the backend validates
all required fields before accepting the submission.

No backwards compatibility with the old schema is required — this is a full replacement.

---

## Glossary

- **Seller**: An authenticated user who owns a store and configures payment methods.
- **Buyer**: An unauthenticated or authenticated user who completes a purchase at checkout.
- **Payment_Method**: A seller-owned record with a name, a display section, and a form section.
- **Display_Block**: A single piece of rich content inside the display section. Can be a text block, image, video embed, or external link.
- **Form_Field**: A single input descriptor inside the form section. Has a label, type, required flag, and optional placeholder.
- **Display_Section**: An ordered list of Display_Blocks attached to a Payment_Method.
- **Form_Section**: An ordered list of Form_Fields attached to a Payment_Method.
- **Buyer_Submission**: A JSON object stored on the order that maps each Form_Field key to the buyer-provided value.
- **Builder**: The seller-facing UI in the payments app used to create and edit Payment_Methods.
- **Checkout_Renderer**: The buyer-facing UI in the payments app that renders a Payment_Method at checkout.
- **Payment_Methods_API**: The server-side API route that serves Payment_Method data to the Checkout_Renderer.
- **Order**: A Supabase `orders` row created when a buyer submits a checkout form.

---

## Requirements

### Requirement 1: Payment Method Creation

**User Story:** As a seller, I want to create a new payment method with a custom name, so that I can
offer buyers a payment option that matches my actual payment process.

#### Acceptance Criteria

1. THE Builder SHALL provide a form field for the seller to enter the Payment_Method name.
2. WHEN the seller submits a new Payment_Method with a non-empty name, THE Builder SHALL persist the
   Payment_Method to the database with an empty Display_Section and an empty Form_Section.
3. IF the seller submits a new Payment_Method with an empty name, THEN THE Builder SHALL display a
   validation error and SHALL NOT persist the record.
4. THE Builder SHALL allow a seller to have multiple Payment_Methods.
5. WHEN a Payment_Method is created, THE Builder SHALL set its `is_active` flag to `true` by default.

---

### Requirement 2: Display Section — Block Management

**User Story:** As a seller, I want to add, edit, remove, and reorder rich content blocks in the
display section, so that buyers see clear payment instructions before filling the form.

#### Acceptance Criteria

1. THE Builder SHALL support four Display_Block types: `text`, `image`, `video`, and `link`.
2. WHEN the seller adds a `text` block, THE Builder SHALL provide a multi-line text input for the
   block content.
3. WHEN the seller adds an `image` block, THE Builder SHALL provide a URL input for the image source
   and an optional alt-text input.
4. WHEN the seller adds a `video` block, THE Builder SHALL provide a URL input that accepts YouTube
   and Vimeo embed URLs.
5. WHEN the seller adds a `link` block, THE Builder SHALL provide a URL input and a label input for
   the link text.
6. WHEN the seller saves a Display_Block, THE Builder SHALL persist the updated Display_Section as a
   JSONB array on the Payment_Method record.
7. THE Builder SHALL allow the seller to remove any Display_Block from the Display_Section.
8. THE Builder SHALL allow the seller to reorder Display_Blocks using up/down controls or drag-and-drop.
9. WHEN the seller reorders Display_Blocks, THE Builder SHALL persist the new order immediately.
10. IF the seller provides an empty URL for an `image`, `video`, or `link` block, THEN THE Builder
    SHALL display a validation error and SHALL NOT persist that block.

---

### Requirement 3: Form Section — Field Management

**User Story:** As a seller, I want to define a list of form fields that buyers must fill at
checkout, so that I collect exactly the information I need to process each payment.

#### Acceptance Criteria

1. THE Builder SHALL support five Form_Field types: `text`, `email`, `number`, `file`, and `textarea`.
2. WHEN the seller adds a Form_Field, THE Builder SHALL require a non-empty label.
3. WHEN the seller adds a Form_Field, THE Builder SHALL allow the seller to set the `required` flag
   (yes/no), defaulting to `true`.
4. WHEN the seller adds a Form_Field, THE Builder SHALL allow the seller to enter an optional
   placeholder/hint text.
5. WHEN the seller saves a Form_Field, THE Builder SHALL persist the updated Form_Section as a JSONB
   array on the Payment_Method record.
6. THE Builder SHALL allow the seller to remove any Form_Field from the Form_Section.
7. THE Builder SHALL allow the seller to reorder Form_Fields using up/down controls or drag-and-drop.
8. WHEN the seller reorders Form_Fields, THE Builder SHALL persist the new order immediately.
9. IF the seller attempts to save a Form_Field with an empty label, THEN THE Builder SHALL display a
   validation error and SHALL NOT persist that field.

---

### Requirement 4: Payment Method Listing and Management

**User Story:** As a seller, I want to view, activate/deactivate, and delete my payment methods, so
that I can control which options buyers see at checkout.

#### Acceptance Criteria

1. THE Builder SHALL display all Payment_Methods belonging to the authenticated seller.
2. THE Builder SHALL show the name and active status of each Payment_Method in the list.
3. THE Builder SHALL allow the seller to toggle the `is_active` flag on any Payment_Method.
4. WHEN the seller deactivates a Payment_Method, THE Checkout_Renderer SHALL NOT present that
   Payment_Method to buyers.
5. THE Builder SHALL allow the seller to delete a Payment_Method.
6. WHEN the seller deletes a Payment_Method, THE Builder SHALL remove the record from the database
   and SHALL remove it from the list.
7. THE Builder SHALL allow the seller to reorder Payment_Methods in the list using up/down controls
   or drag-and-drop, and SHALL persist the new `sort_order` values.

---

### Requirement 5: Database Schema Replacement

**User Story:** As a developer, I want the new flexible schema to fully replace the old fixed schema,
so that the codebase has a single, consistent data model for payment methods.

#### Acceptance Criteria

1. THE Payment_Methods_API SHALL store each Payment_Method in a new `seller_payment_methods` table
   with columns: `id`, `seller_id`, `name`, `display_blocks` (JSONB), `form_fields` (JSONB),
   `is_active`, `sort_order`, `created_at`, `updated_at`.
2. THE Payment_Methods_API SHALL drop or replace the old `payment_method_types` table and the old
   `seller_payment_methods` table as part of the migration.
3. THE Payment_Methods_API SHALL store each Buyer_Submission in the existing `orders.buyer_info`
   JSONB column, keyed by Form_Field label or a stable field key.
4. THE Payment_Methods_API SHALL enforce Row Level Security so that a seller can only read, insert,
   update, and delete their own Payment_Methods.
5. THE Payment_Methods_API SHALL allow buyers (unauthenticated or authenticated) to read active
   Payment_Methods for a given seller during checkout.

---

### Requirement 6: Checkout — Display Section Rendering

**User Story:** As a buyer, I want to see the seller's payment instructions before I fill the form,
so that I know exactly how to complete the payment.

#### Acceptance Criteria

1. WHEN the Checkout_Renderer loads a Payment_Method, THE Checkout_Renderer SHALL render each
   Display_Block in the order defined by the seller.
2. WHEN a Display_Block has type `text`, THE Checkout_Renderer SHALL render the content as formatted
   text.
3. WHEN a Display_Block has type `image`, THE Checkout_Renderer SHALL render an `<img>` element with
   the provided URL and alt text.
4. WHEN a Display_Block has type `video`, THE Checkout_Renderer SHALL render an embedded iframe for
   the YouTube or Vimeo URL.
5. WHEN a Display_Block has type `link`, THE Checkout_Renderer SHALL render a clickable anchor that
   opens the URL in a new tab with the provided label.
6. IF a Display_Block URL is malformed or the resource fails to load, THEN THE Checkout_Renderer
   SHALL display a fallback placeholder and SHALL NOT crash the checkout flow.

---

### Requirement 7: Checkout — Form Section Rendering and Submission

**User Story:** As a buyer, I want to fill the seller's custom form fields and submit my payment
details, so that the seller has everything needed to verify my payment.

#### Acceptance Criteria

1. WHEN the Checkout_Renderer loads a Payment_Method, THE Checkout_Renderer SHALL render each
   Form_Field in the order defined by the seller.
2. WHEN a Form_Field has type `text`, THE Checkout_Renderer SHALL render a single-line text input.
3. WHEN a Form_Field has type `email`, THE Checkout_Renderer SHALL render an email input with
   browser-native email format validation.
4. WHEN a Form_Field has type `number`, THE Checkout_Renderer SHALL render a number input.
5. WHEN a Form_Field has type `file`, THE Checkout_Renderer SHALL render a file input that accepts
   image files (JPEG, PNG, WebP, PDF).
6. WHEN a Form_Field has type `textarea`, THE Checkout_Renderer SHALL render a multi-line text input.
7. WHEN a Form_Field has `required: true`, THE Checkout_Renderer SHALL mark the field as required
   and SHALL display a visible required indicator.
8. WHEN a Form_Field has a non-empty placeholder, THE Checkout_Renderer SHALL display it as the
   input placeholder.
9. WHEN the buyer clicks the submit button, THE Payment_Methods_API SHALL validate that all
   Form_Fields with `required: true` have a non-empty value in the Buyer_Submission.
10. IF any required Form_Field is missing from the Buyer_Submission, THEN THE Payment_Methods_API
    SHALL return a 422 error with the list of missing field labels and SHALL NOT create an Order.
11. WHEN all required fields are present, THE Payment_Methods_API SHALL create an Order and SHALL
    store the Buyer_Submission in `orders.buyer_info`.

---

### Requirement 8: File Upload Handling

**User Story:** As a buyer, I want to upload a receipt or screenshot as part of the payment form,
so that the seller can verify my payment visually.

#### Acceptance Criteria

1. WHEN a Form_Field has type `file`, THE Checkout_Renderer SHALL upload the selected file to
   Supabase Storage in the `receipts` bucket before order creation.
2. WHEN the file upload succeeds, THE Payment_Methods_API SHALL store the resulting storage URL in
   the Buyer_Submission under the corresponding field key.
3. IF the file upload fails, THEN THE Checkout_Renderer SHALL display an error message and SHALL NOT
   proceed to order creation.
4. THE Payment_Methods_API SHALL accept files up to 10 MB in size.
5. IF the uploaded file exceeds 10 MB, THEN THE Checkout_Renderer SHALL display a size error before
   attempting the upload.

---

### Requirement 9: Seller Order Review

**User Story:** As a seller, I want to see the buyer's submitted form data alongside each order, so
that I can verify the payment details the buyer provided.

#### Acceptance Criteria

1. WHEN a seller views an order in the payments app, THE Builder SHALL display the Buyer_Submission
   fields and values stored in `orders.buyer_info`.
2. WHEN a Buyer_Submission field has type `file`, THE Builder SHALL render the stored URL as a
   clickable link or inline image preview.
3. THE Builder SHALL display Buyer_Submission fields in the same order as the Form_Section of the
   Payment_Method used for that order.

---

### Requirement 10: Data Integrity — Display_Block and Form_Field Schemas

**User Story:** As a developer, I want the JSONB payloads to follow a strict schema, so that the
application can safely parse and render them without runtime errors.

#### Acceptance Criteria

1. THE Payment_Methods_API SHALL validate that every Display_Block in `display_blocks` contains a
   `type` field with one of the values: `text`, `image`, `video`, `link`.
2. THE Payment_Methods_API SHALL validate that every Form_Field in `form_fields` contains a `type`
   field with one of the values: `text`, `email`, `number`, `file`, `textarea`.
3. THE Payment_Methods_API SHALL validate that every Form_Field contains a non-empty `label` string.
4. IF a Display_Block or Form_Field fails schema validation, THEN THE Payment_Methods_API SHALL
   return a 422 error and SHALL NOT persist the record.
5. THE Payment_Methods_API SHALL assign a stable `id` (UUID or nanoid) to each Display_Block and
   Form_Field at creation time, so that reordering operations reference items by id rather than
   array index.
6. FOR ALL valid Payment_Method records, serializing then deserializing the `display_blocks` and
   `form_fields` JSONB columns SHALL produce structurally equivalent arrays (round-trip property).
