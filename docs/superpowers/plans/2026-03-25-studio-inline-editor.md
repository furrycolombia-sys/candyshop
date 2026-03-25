# Studio Inline Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the studio's traditional product form with an inline WYSIWYG editor that mirrors the store's product page layout.

**Architecture:** The editor IS the product page — every section (hero, highlights, FAQ, specs) is editable in-place. `react-hook-form` manages all state, `@hello-pangea/dnd` handles drag-and-drop reorder. A sticky toolbar at the top holds type/category/save controls.

**Tech Stack:** React 19, react-hook-form, @hello-pangea/dnd, Zod, Tailwind v4, shadcn/ui, next-intl

**Spec:** `docs/superpowers/specs/2026-03-25-studio-inline-editor-design.md`

---

## File Map

All files in `apps/studio/src/features/products/presentation/components/inline-editor/`:

| File                      | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `InlineEditor.tsx`        | Orchestrator — toolbar + all sections, react-hook-form provider |
| `EditorToolbar.tsx`       | Sticky bar: type selector, category, featured, active, save     |
| `InlineTextField.tsx`     | Reusable i18n text input with EN/ES toggle                      |
| `InlineHero.tsx`          | Hero layout: image carousel (left) + product info (right)       |
| `InlineImageCarousel.tsx` | Vertical draggable image list with add/remove                   |
| `InlinePriceFields.tsx`   | COP/USD dual price inputs                                       |
| `InlineTagEditor.tsx`     | Tag pills with add/remove                                       |
| `InlineHighlights.tsx`    | Highlight cards with add/remove/drag                            |
| `InlineFaq.tsx`           | FAQ items with add/remove/drag                                  |
| `InlineTypeDetails.tsx`   | Type-specific spec grid (adapts per product type)               |
| `InlineAddButton.tsx`     | Reusable "+" dashed-border button                               |
| `InlineRemoveButton.tsx`  | Reusable "✕" corner button                                      |

Files to modify:

- `apps/studio/src/features/products/presentation/pages/ProductFormPage.tsx` — render `InlineEditor` instead of `ProductForm`

Files to delete after completion:

- `ProductForm.tsx`, `TypeFieldsMerch.tsx`, `TypeFieldsDigital.tsx`, `TypeFieldsService.tsx`, `TypeFieldsTicket.tsx`, `ImageUrlManager.tsx`

---

## Task 1: Install DnD library + create reusable primitives

**Files:**

- Create: `inline-editor/InlineAddButton.tsx`
- Create: `inline-editor/InlineRemoveButton.tsx`

- [ ] **Step 1: Install @hello-pangea/dnd**

```bash
cd apps/studio && pnpm add @hello-pangea/dnd
```

- [ ] **Step 2: Create InlineAddButton**

Dashed-border "+" button. Props: `label`, `onClick`. Neobrutalist styling.

- [ ] **Step 3: Create InlineRemoveButton**

Absolute-positioned "✕" button. Props: `onClick`, `ariaLabel`. Dark bg, white icon.

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck --filter studio && pnpm lint --fix
git add apps/studio/ && git commit -m "feat(studio): install dnd lib, add InlineAddButton and InlineRemoveButton [GH-11]"
```

---

## Task 2: InlineTextField — reusable i18n text input

**Files:**

- Create: `inline-editor/InlineTextField.tsx`

- [ ] **Step 1: Create InlineTextField**

Props: `control` (react-hook-form), `fieldNameEn`, `fieldNameEs`, `placeholder`, `as` ("input" | "textarea"), `className` (for font size/weight).

Features:

- EN/ES toggle pill in top-left corner
- Input styled to look like final rendered text (transparent bg, no visible border until focus)
- Dashed border when empty, solid on focus
- Switches between `fieldNameEn` and `fieldNameEs` based on toggle state
- Both values always tracked in form state

- [ ] **Step 2: Verify and commit**

---

## Task 3: EditorToolbar — sticky top bar

**Files:**

- Create: `inline-editor/EditorToolbar.tsx`

- [ ] **Step 1: Create EditorToolbar**

Props: `control` (react-hook-form), `onSave`, `isSaving`, `isEdit`.

Contains:

- Type selector: pill buttons (merch/digital/service/ticket) — `register("type")`
- Category dropdown: native select — `register("category")`
- Featured toggle: checkbox/star — `register("featured")`
- Active toggle: switch — `register("is_active")`
- Save button: primary CTA with loading state
- Back link: to product list

Sticky at top with `position: sticky; top: 0; z-index: 40`.

- [ ] **Step 2: Verify and commit**

---

## Task 4: InlineHero — hero section layout

**Files:**

- Create: `inline-editor/InlineHero.tsx`
- Create: `inline-editor/InlineImageCarousel.tsx`
- Create: `inline-editor/InlinePriceFields.tsx`
- Create: `inline-editor/InlineTagEditor.tsx`

- [ ] **Step 1: Create InlineImageCarousel**

Uses `useFieldArray` on `images`. Shows vertical stack of image thumbnails.
Each image: preview (img tag with fallback), alt text, ✕ remove button.
"+ Add Image" button at bottom — expands inline form (URL + alt inputs).
Wrapped in `<DragDropContext>` + `<Droppable>` + `<Draggable>` from @hello-pangea/dnd.

- [ ] **Step 2: Create InlinePriceFields**

Two side-by-side price inputs (COP and USD) with bold display font styling.
Optional compare-at-price fields below (show when values exist or on toggle).
Uses `register("price_cop")` and `register("price_usd")`.

- [ ] **Step 3: Create InlineTagEditor**

Shows existing tags as pills with ✕ remove. "+ add tag" button at end.
Click "+" → shows inline text input. Enter/click adds tag to array.
Uses `useFieldArray` or a controlled tags array.

- [ ] **Step 4: Create InlineHero**

Composes: InlineImageCarousel (left) + InlineTextField (tagline, name, description) + InlinePriceFields + InlineTagEditor (right).
Hero background uses category color tint (from `watch("category")`).
Layout: `flex flex-col lg:flex-row` matching the store's hero section.

- [ ] **Step 5: Verify and commit**

---

## Task 5: InlineHighlights — highlight cards with DnD

**Files:**

- Create: `inline-editor/InlineHighlights.tsx`

- [ ] **Step 1: Create InlineHighlights**

Uses `useFieldArray` on `highlights`. Horizontal scrollable row of cards.
Each card: icon (text input for lucide name), title (i18n via InlineTextField pattern), description (i18n), ✕ remove.
"+ Add" card at end — expands inline form.
DnD for reorder.

- [ ] **Step 2: Verify and commit**

---

## Task 6: InlineFaq — FAQ accordion with DnD

**Files:**

- Create: `inline-editor/InlineFaq.tsx`

- [ ] **Step 1: Create InlineFaq**

Uses `useFieldArray` on `faq`. Vertical list of collapsible Q&A items.
Each item: question (i18n, bold), answer (i18n, expandable), ✕ remove, drag handle.
"+ Add FAQ" button at bottom — expands inline form.
DnD for reorder.

- [ ] **Step 2: Verify and commit**

---

## Task 7: InlineTypeDetails — type-specific spec grid

**Files:**

- Create: `inline-editor/InlineTypeDetails.tsx`

- [ ] **Step 1: Create InlineTypeDetails**

Props: `control`, `productType` (watched from form).
Renders a 2-column grid of dashed-border editable fields.
Adapts based on `productType`:

- merch: weight, dimensions, ships_from, material, care_instructions
- digital: file_size, format, resolution, license_type
- service: total_slots, slots_available, turnaround_days, revisions_included, commercial_use
- ticket: venue, location, doors_open, age_restriction, capacity, tickets_remaining

Each field: label above, click-to-edit input, "Click to add..." placeholder when empty.
Fields registered under `type_details.*` namespace.

- [ ] **Step 2: Verify and commit**

---

## Task 8: InlineEditor — orchestrator + wire up

**Files:**

- Create: `inline-editor/InlineEditor.tsx`
- Create: `inline-editor/index.ts` (barrel export)
- Modify: `ProductFormPage.tsx`

- [ ] **Step 1: Create InlineEditor**

Props: `defaultValues?`, `onSubmit`, `isSubmitting`, `isEdit`.

Orchestrates:

1. `useForm` with Zod resolver (reuse existing `validationSchema`)
2. `EditorToolbar` (sticky top)
3. `InlineHero` (hero section)
4. `InlineHighlights`
5. `InlineFaq`
6. `InlineTypeDetails` (watches `type` field to show correct fields)

Handles form submission: collects all data, maps to DB shape, calls `onSubmit`.

- [ ] **Step 2: Create barrel export**

`inline-editor/index.ts` exports `InlineEditor`.

- [ ] **Step 3: Update ProductFormPage**

Replace `<ProductForm>` with `<InlineEditor>`. Same props interface.

- [ ] **Step 4: Delete old form files**

Remove: `ProductForm.tsx`, `TypeFieldsMerch.tsx`, `TypeFieldsDigital.tsx`, `TypeFieldsService.tsx`, `TypeFieldsTicket.tsx`, `ImageUrlManager.tsx`.

- [ ] **Step 5: Verify full build**

```bash
pnpm typecheck && pnpm lint --fix && pnpm --filter studio build
```

- [ ] **Step 6: Commit**

```bash
git add apps/studio/
git commit -m "feat(studio): inline WYSIWYG product editor [GH-11]"
```

---

## Task 9: Final QA and push

- [ ] **Step 1: Manual QA**

- Create a new product via inline editor
- Edit an existing product — verify data loads into inline fields
- Test DnD reorder for images, highlights, FAQ
- Test EN/ES toggle on text fields
- Test type switching (changing type shows different spec fields)
- Test save (verify data persists in Supabase)

- [ ] **Step 2: Push and update PR**

```bash
git push
```
