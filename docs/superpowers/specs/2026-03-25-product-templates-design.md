# Product Templates — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Related Issue:** GH-11

---

## Problem

Creating new products in the studio is tedious. Sellers start from a blank form and have to manually build out sections (What's Included, Pricing, FAQ, etc.) every time. Most products of the same type need similar section structures.

## Solution

A template system that provides structural scaffolding — pre-built section layouts with placeholder titles and guideline descriptions. Templates tell the seller _what to fill in_, not _what to say_.

- **Admin app** manages templates (CRUD)
- **Studio app** lets sellers apply templates when creating/editing products
- Templates only affect the `sections` field — hero data (name, price, images) is never touched

---

## Database Schema

### `public.product_templates`

| Column           | Type        | Nullable | Default             | Notes                                                          |
| ---------------- | ----------- | -------- | ------------------- | -------------------------------------------------------------- |
| `id`             | uuid        | NO       | `gen_random_uuid()` | PK                                                             |
| `name_en`        | text        | NO       | —                   | Template name for picker (e.g., "Commission")                  |
| `name_es`        | text        | NO       | —                   | Spanish name                                                   |
| `description_en` | text        | YES      | NULL                | What this template is for                                      |
| `description_es` | text        | YES      | NULL                | Spanish description                                            |
| `sections`       | jsonb       | NO       | `'[]'`              | Array of sections — same shape as `ProductFormValues.sections` |
| `sort_order`     | integer     | NO       | 0                   | Display order in picker                                        |
| `is_active`      | boolean     | NO       | true                | Admin can disable without deleting                             |
| `created_at`     | timestamptz | NO       | `now()`             |                                                                |
| `updated_at`     | timestamptz | NO       | `now()`             | Auto-updated via trigger                                       |

### Sections JSONB Shape

Uses the exact same structure as the product's `sections` field:

```json
[
  {
    "name_en": "What's Included",
    "name_es": "Qué Incluye",
    "type": "cards",
    "sort_order": 0,
    "items": [
      {
        "title_en": "Base Package",
        "title_es": "Paquete Base",
        "description_en": "Describe what the buyer gets with the base price",
        "description_es": "Describe qué obtiene el comprador con el precio base",
        "icon": "Package",
        "image_url": "",
        "sort_order": 0
      },
      {
        "title_en": "Add-on Options",
        "title_es": "Opciones Adicionales",
        "description_en": "List any available upgrades or extras",
        "description_es": "Lista las mejoras o extras disponibles",
        "icon": "Plus",
        "image_url": "",
        "sort_order": 1
      }
    ]
  },
  {
    "name_en": "FAQ",
    "name_es": "Preguntas Frecuentes",
    "type": "accordion",
    "sort_order": 1,
    "items": [
      {
        "title_en": "How long does it take?",
        "title_es": "¿Cuánto tiempo toma?",
        "description_en": "Explain your typical turnaround time",
        "description_es": "Explica tu tiempo de entrega típico",
        "icon": "",
        "image_url": "",
        "sort_order": 0
      }
    ]
  }
]
```

Item titles are **placeholder labels** (e.g., "Base Package") and descriptions are **guidelines** (e.g., "Describe what the buyer gets with the base price"). The seller replaces both with their actual content.

### RLS Policies

- **SELECT:** All authenticated users (studio needs to read)
- **INSERT:** No client-side policy — admin writes via service role (server-side Supabase client)
- **UPDATE:** No client-side policy — admin writes via service role
- **DELETE:** No client-side policy — admin writes via service role

Write operations are restricted to the admin app's server-side context, which uses the Supabase service role key. This avoids the need for a role-based permission system at this stage. When a roles/permissions system is added, RLS policies can be updated to check user roles directly.

### Audit Tracking

```sql
SELECT audit.enable_tracking('public.product_templates'::regclass);
```

Every template create/edit/delete is logged in the audit system.

### Indexes

- `product_templates_sort_order_idx` on `(sort_order, id)` — for ordered listing

---

### Shared Types Extraction

The `Section`, `SectionItem`, and `SECTION_TYPES` are currently defined in `apps/studio/src/features/products/domain/validationSchema.ts`. Since templates reuse the same shape and the admin app cannot import from the studio app (monorepo rule: apps don't depend on each other), these types must be extracted to `packages/shared/src/types/sections.ts`. Both the studio and admin apps then import from `shared/types`.

### Template Validation

Templates use a **relaxed schema** — not the product's `createSectionSchema` which enforces "at least one item per section" and "name required in at least one language". Admins may save work-in-progress templates with empty sections. A dedicated `templateSectionSchema` in the admin feature allows saving drafts while the product schema remains strict.

---

## Template Scope

Templates are **free-form** — they define section structure only, with no category or type association. A "Commission" template works for fursuits, art, or digital equally. The seller picks their own type/category in the toolbar independently.

**What templates define:**

- Section names (bilingual)
- Section types (cards, accordion, two-column, gallery)
- Item slots with placeholder titles and guideline descriptions
- Item icons (optional defaults)
- Sort order

**What templates DON'T touch:**

- Product name, tagline, description (hero text fields)
- Price (COP, USD, compare-at prices)
- Category and type
- Images
- Tags
- Stock, refundable, featured, active status

---

## Admin — Template Management

### Location

Admin app: `apps/admin/src/features/templates/`

### Sidebar

New item "Templates" under the "Operations" section, between Dashboard and the Monitoring section.

### Route

`/[locale]/templates`

### Architecture

```
features/templates/
├── domain/
│   └── types.ts                  # ProductTemplate interface
├── infrastructure/
│   └── templateQueries.ts        # Supabase CRUD (fetch, create, update, delete)
├── application/
│   └── hooks/
│       ├── useTemplates.ts       # Fetch all templates
│       └── useTemplateMutations.ts # Create, update, delete mutations
├── presentation/
│   ├── pages/
│   │   └── TemplatesPage.tsx     # Main page with list + actions
│   └── components/
│       ├── TemplateTable.tsx     # Table listing all templates
│       └── TemplateEditor.tsx    # Editor for template sections
└── index.ts
```

### Page Layout

Same pattern as the audit log:

1. **Header** — "Templates" title + "Add Template" button
2. **Table** — rows with: name, description, section count, active toggle, edit/delete actions
3. **Editor** — opens when creating or editing a template. Contains:
   - Name fields (EN/ES)
   - Description fields (EN/ES)
   - Section editor (reuses the same section patterns from studio — cards, accordion, two-column, gallery)
   - Sort order
   - Active toggle

### Editor Approach

The template editor lets admins build sections and items with the same UI patterns as the studio's `InlineSections` component — drag-and-drop sections, add items, pick section types, set titles and descriptions. The difference: descriptions contain guidelines instead of product content.

---

## Studio — Template Picker + Reset

### Toolbar Buttons

Two new buttons in `EditorToolbar`, positioned between the refundable dropdown and the spacer (before the Active switch + Save button):

1. **"Use Template"** — icon + text button
2. **"Reset"** — icon-only or icon + text button

### Template Picker

Clicking "Use Template" opens a **popover** showing:

- List of active templates, ordered by `sort_order`
- Each entry: name + description + section count badge
- Click to apply

### Apply Flow

1. User clicks a template in the popover
2. **If form has existing sections:** show `window.confirm()` — "This will replace all your current sections. Your product info (name, price, images) will be preserved. Continue?"
3. **If form has no sections:** apply immediately (no confirmation needed)
4. On confirm: `setValue("sections", structuredClone(template.sections))` via react-hook-form (deep clone prevents mutating TanStack Query cache)
5. Popover closes, sections update in the editor below

### Reset Flow

1. User clicks "Reset"
2. Show `window.confirm()` — "Reset the form to its original state? Any unsaved changes will be lost."
3. On confirm: `form.reset(initialValues)`
   - **Edit mode:** `initialValues` = product data fetched from DB (what it looked like on load)
   - **New product:** `initialValues` = `PRODUCT_FORM_DEFAULTS` (empty form)

### Data Fetching

Studio needs a read-only hook to fetch active templates:

```typescript
// In apps/studio/src/features/products/application/hooks/useProductTemplates.ts
function useProductTemplates() {
  return useQuery({
    queryKey: ["product-templates"],
    queryFn: () => fetchActiveTemplates(supabase),
  });
}
```

This fetches from `product_templates` where `is_active = true`, ordered by `sort_order`.

---

## i18n Keys

### Admin (`apps/admin/src/shared/infrastructure/i18n/messages/`)

```
sidebar.templates — "Templates" / "Plantillas"
templates.title — "Product Templates" / "Plantillas de Producto"
templates.subtitle — "Manage section templates for sellers" / "Administra plantillas de secciones para vendedores"
templates.addTemplate — "Add Template" / "Agregar Plantilla"
templates.editTemplate — "Edit Template" / "Editar Plantilla"
templates.name — "Template Name" / "Nombre de Plantilla"
templates.description — "Description" / "Descripción"
templates.sections — "Sections" / "Secciones"
templates.sectionCount — "{count} sections" / "{count} secciones"
templates.active — "Active" / "Activa"
templates.noTemplates — "No templates yet" / "Sin plantillas aún"
templates.deleteConfirm — "Delete this template?" / "¿Eliminar esta plantilla?"
templates.save — "Save" / "Guardar"
templates.saving — "Saving..." / "Guardando..."
```

### Studio (`apps/studio/src/shared/infrastructure/i18n/messages/`)

```
form.inlineEditor.useTemplate — "Use Template" / "Usar Plantilla"
form.inlineEditor.reset — "Reset" / "Reiniciar"
form.inlineEditor.templateConfirm — "This will replace all your current sections. Your product info (name, price, images) will be preserved. Continue?" / "Esto reemplazará todas tus secciones actuales. La información del producto (nombre, precio, imágenes) se conservará. ¿Continuar?"
form.inlineEditor.resetConfirm — "Reset the form to its original state? Any unsaved changes will be lost." / "¿Reiniciar el formulario a su estado original? Los cambios no guardados se perderán."
form.inlineEditor.noTemplates — "No templates available" / "Sin plantillas disponibles"
```

---

## Migration

Single migration file: `20260325700000_product_templates.sql`

1. Create `public.product_templates` table
2. Add `updated_at` trigger (reuse `trigger_set_updated_at()`)
3. Create RLS policies (SELECT/INSERT/UPDATE/DELETE for authenticated)
4. Create sort order index
5. Enable audit tracking
6. Seed 2-3 starter templates (Commission, Merch Item, Event Ticket)

---

## What Changes Where

| File/Area                                                                                   | Change                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `supabase/migrations/`                                                                      | New migration for product_templates table + seed templates         |
| `apps/admin/src/features/templates/`                                                        | New feature: template CRUD management                              |
| `apps/admin/src/app/[locale]/templates/page.tsx`                                            | New route                                                          |
| `apps/admin/src/shared/presentation/components/AdminSidebar.tsx`                            | Add "Templates" nav item                                           |
| `apps/admin/src/shared/infrastructure/i18n/`                                                | Add template management i18n keys                                  |
| `packages/shared/src/types/sections.ts`                                                     | Extract Section, SectionItem, SECTION_TYPES from studio            |
| `apps/studio/src/features/products/domain/validationSchema.ts`                              | Import Section/SectionItem from shared instead of defining locally |
| `apps/studio/src/features/products/application/hooks/useProductTemplates.ts`                | New hook: fetch active templates                                   |
| `apps/studio/src/features/products/infrastructure/templateQueries.ts`                       | New query: fetch active templates                                  |
| `apps/studio/src/features/products/presentation/components/inline-editor/EditorToolbar.tsx` | Add "Use Template" + "Reset" buttons                               |
| `apps/studio/src/features/products/presentation/components/inline-editor/InlineEditor.tsx`  | Pass reset handler + initial values ref                            |
| `apps/studio/src/shared/infrastructure/i18n/`                                               | Add template/reset i18n keys                                       |

### What stays untouched

- Product form schema — templates use the same sections shape (types extracted to shared, Zod schema stays in studio)
- InlineSections component — it already renders any sections array
- Store app — no changes
- Auth app — no changes
- Existing products — unaffected
