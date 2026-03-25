# Studio Inline Product Editor Design

**Date:** 2026-03-25
**Status:** Approved
**Branch:** `feat/GH-11_Studio-App`

---

## Summary

Replace the studio's traditional form-based product editor with an **inline editor** that mirrors the store's product detail page. The editor IS the product page — every element (title, description, images, highlights, FAQ, specs) is editable in-place. No separate "form" and "preview."

---

## Core Concept

> **The editor looks like the store product page, but every element is clickable and editable.**

Sellers see exactly what customers will see, and they edit it directly. The page structure matches the store's hero section, highlights, FAQ, and specs sections.

---

## 1. Layout

### Top Toolbar (sticky)

Fixed bar at the top with:

- **Type selector**: merch | digital | service | ticket (pill buttons, switching type changes which spec fields appear)
- **Category dropdown**: fursuits | merch | art | events | digital | deals
- **Featured toggle**: star icon / checkbox
- **Active toggle**: published on/off
- **Save button**: primary CTA, only saves on click (no auto-save)
- **Back link**: returns to product list

### Hero Section (editable)

Mirrors the store's hero layout:

**Left — Vertical Image Carousel:**

- Shows existing images as thumbnails stacked vertically
- Each image has: ✕ remove button, drag handle for reorder
- **+ Add Image** button at the bottom opens an inline popup for URL + alt text
- Drag-and-drop to reorder (or up/down arrows as fallback)
- First image is the "main" image (shown larger in the store)

**Right — Product Info (inline editable fields):**

- **EN/ES toggle** on each text field — switches which language is being edited
- **Tagline**: dashed border placeholder, click to type
- **Name**: large bold input styled as the product title (looks like the actual title)
- **Description**: textarea styled as the product description paragraph
- **Price COP / Price USD**: side-by-side inputs in bold display font
- **Compare-at prices**: optional, show strikethrough preview
- **Tags**: pill badges with ✕ to remove, "+ add tag" button at the end
- **Max quantity**: optional input (null = unlimited)

### Highlights Section (editable cards)

- Horizontal row of cards (matches store's highlights section)
- Each card: icon (lucide name or emoji), title (i18n), description (i18n), ✕ remove, drag handle
- **+ Add** card at the end opens inline form for icon + title + description
- Drag-and-drop to reorder

### FAQ Section (editable accordion)

- List of collapsible Q&A items (matches store's FAQ section)
- Each item: question (i18n) + answer (i18n), ✕ remove, drag handle
- Click to expand and edit question/answer text
- **+ Add FAQ** button at the bottom

### Screenshots Section (editable)

- Horizontal image row (like highlights but for screenshots)
- Each: image preview + caption (i18n), ✕ remove, drag handle
- **+ Add Screenshot** button

### Type-Specific Details Section

- Grid of fields that adapts to the selected product type
- **merch**: weight, dimensions, ships_from, material, care_instructions
- **digital**: file_size, format, resolution, license_type
- **service**: total_slots, slots_available, turnaround_days, revisions_included, commercial_use
- **ticket**: venue, location, doors_open, age_restriction, capacity, tickets_remaining
- Each field: dashed border, label above, click to edit
- Empty fields show "Click to add..." placeholder

---

## 2. Interactions

### Editing Text Fields

- Click a text element → it becomes an editable input/textarea
- The input is styled to look like the final rendered text (same font, size, color)
- EN/ES toggle on each field switches the language being edited
- Changes are tracked in react-hook-form state (not saved until Save clicked)

### Adding Items (images, highlights, FAQ)

- Click **+** → inline form appears below the button (not a modal)
- Fill in fields → click "Add" → item appears in the list
- For images: URL input + alt text + "Add" button
- For highlights: icon selector + title (en/es) + description (en/es) + "Add"
- For FAQ: question (en/es) + answer (en/es) + "Add"

### Reordering

- Drag-and-drop for images, highlights, FAQ, screenshots
- Use a lightweight DnD library (dnd-kit or @hello-pangea/dnd)
- Fallback: up/down arrow buttons for accessibility

### Removing Items

- ✕ button on each item
- No confirmation for individual items (undo is just re-adding)
- Entire product deletion requires confirmation (already exists)

### Saving

- **Save button** in the toolbar — sends the full form state to Supabase
- Shows loading spinner while saving
- Success: toast/banner "Product saved"
- Error: shows error message inline
- No auto-save — explicit save only

---

## 3. Technical Approach

### State Management

- `react-hook-form` with `useFieldArray` for images, highlights, FAQ, screenshots
- The entire product is one form with nested arrays
- Type-specific fields live under `type_details` JSONB (same as current)

### Components (new or rewritten)

| Component                 | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `InlineEditor.tsx`        | Top-level orchestrator — toolbar + sections                   |
| `InlineHero.tsx`          | Hero section with image carousel + product info               |
| `InlineImageCarousel.tsx` | Vertical image list with add/remove/reorder                   |
| `InlineTextField.tsx`     | Reusable i18n text input (en/es toggle, styled as final text) |
| `InlinePriceFields.tsx`   | COP/USD price inputs                                          |
| `InlineTagEditor.tsx`     | Tag pills with add/remove                                     |
| `InlineHighlights.tsx`    | Highlight cards with add/remove/reorder                       |
| `InlineFaq.tsx`           | FAQ accordion with add/remove/reorder                         |
| `InlineScreenshots.tsx`   | Screenshot row with add/remove/reorder                        |
| `InlineTypeDetails.tsx`   | Type-specific spec grid                                       |
| `EditorToolbar.tsx`       | Sticky top bar with type/category/featured/save               |

### Reusable Patterns

- `InlineAddButton` — the "+" dashed-border button
- `InlineRemoveButton` — the "✕" corner button
- `DraggableList` — wraps any list with drag-and-drop reorder

### Drag and Drop

- Use `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd) or `dnd-kit`
- Applied to: images, highlights, FAQ, screenshots

### What Gets Replaced

- `ProductForm.tsx` (current traditional form) → `InlineEditor.tsx`
- `TypeFieldsMerch/Digital/Service/Ticket.tsx` → `InlineTypeDetails.tsx`
- `ImageUrlManager.tsx` → `InlineImageCarousel.tsx`
- `ProductFormPage.tsx` stays but renders `InlineEditor` instead of `ProductForm`

### What Stays

- `validationSchema.ts` — same Zod validation
- `useProductForm.ts` — same React Query hooks
- `productMutations.ts` — same Supabase mutations
- Route files — same `/products/new` and `/products/[id]`

---

## 4. Styling

- Neobrutalist: 3px borders, `nb-shadow-md`, `font-display` for headings
- Editable fields: dashed borders when empty, solid borders when focused
- Category color as the hero background tint (matches store)
- EN/ES toggle: small pill in the top-left of each text field
- Save button: prominent `nb-btn` in the toolbar

---

## 5. What's NOT in Scope

- Auto-save / draft system
- Undo/redo
- Rich text editing (markdown or WYSIWYG) — plain text for now
- Image upload to Supabase Storage (URL-based for now)
- Collaborative editing
- Version history

---

## 6. Implementation Order

1. **Install DnD library** (dnd-kit or @hello-pangea/dnd)
2. **EditorToolbar** — type/category/featured/save bar
3. **InlineTextField** — reusable i18n editable text component
4. **InlineHero** — hero layout with inline fields
5. **InlineImageCarousel** — vertical image list with DnD
6. **InlineHighlights** — highlight cards with DnD
7. **InlineFaq** — FAQ accordion with DnD
8. **InlineTypeDetails** — type-specific spec grid
9. **InlineEditor** — orchestrator connecting all sections
10. **Wire up** — replace ProductForm in ProductFormPage
11. **Verify** — typecheck, lint, test, manual QA
