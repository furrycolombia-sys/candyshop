# Generic Product Sections Design

**Date:** 2026-03-25
**Status:** Approved
**Branch:** `feat/GH-11_Studio-App`

---

## Summary

Replace the hardcoded `highlights`, `faq`, `screenshots`, and `type_details` JSONB columns with a single generic `sections` column. Every product section below the hero is a section with a type that determines rendering. The data shape is always the same — title/description key-value pairs — only the presentation changes.

---

## Core Principle

> **The database is the single source of truth.** When a column changes, the generated types update, and ALL consumers (store, studio, cart, payments) see it automatically. No parallel type definitions.

---

## 1. DB Migration

### Drop columns

```sql
alter table public.products
  drop column if exists highlights,
  drop column if exists faq,
  drop column if exists screenshots,
  drop column if exists type_details;
```

### Add column

```sql
alter table public.products
  add column sections jsonb not null default '[]';
```

### JSONB Shape

```typescript
interface ProductSection {
  name_en: string;
  name_es: string;
  type: "cards" | "accordion" | "two-column" | "gallery";
  sort_order: number;
  items: ProductSectionItem[];
}

interface ProductSectionItem {
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  icon?: string; // lucide icon name (cards type)
  image_url?: string; // image URL (gallery type)
  sort_order: number;
}
```

### Section Types

| Type         | Renders as                    | Use case                             |
| ------------ | ----------------------------- | ------------------------------------ |
| `cards`      | Horizontal card row with icon | Highlights, features, included items |
| `accordion`  | Collapsible expand/collapse   | FAQ, terms, policies                 |
| `two-column` | Label → value grid            | Specs, shipping info, dimensions     |
| `gallery`    | Image grid with captions      | Screenshots, portfolio, process      |

New types can be added without DB changes — just add a renderer in the store and an option in the studio.

---

## 2. Seed Data Update

Rewrite `supabase/seed.sql` to use `sections` instead of the old columns. Example for Moonfest ticket:

```json
[
  {
    "name_en": "What's Included",
    "name_es": "Qué Incluye",
    "type": "cards",
    "sort_order": 0,
    "items": [
      { "title_en": "Round-trip transport", "title_es": "Transporte ida y vuelta", "description_en": "Comfortable bus from Bogotá to Paipa and back", "description_es": "Bus cómodo de Bogotá a Paipa y de regreso", "icon": "Bus", "sort_order": 0 },
      ...
    ]
  },
  {
    "name_en": "Event Details",
    "name_es": "Detalles del Evento",
    "type": "two-column",
    "sort_order": 1,
    "items": [
      { "title_en": "Venue", "title_es": "Lugar", "description_en": "Estelar Paipa Hotel", "description_es": "Hotel Estelar Paipa", "sort_order": 0 },
      { "title_en": "Capacity", "title_es": "Capacidad", "description_en": "200 attendees", "description_es": "200 asistentes", "sort_order": 1 },
      ...
    ]
  },
  {
    "name_en": "FAQ",
    "name_es": "Preguntas Frecuentes",
    "type": "accordion",
    "sort_order": 2,
    "items": [
      { "title_en": "Where does the bus depart?", "title_es": "¿De dónde sale el bus?", "description_en": "Northern Bogotá...", "description_es": "Norte de Bogotá...", "sort_order": 0 },
      ...
    ]
  }
]
```

---

## 3. Shared Types

Add to `packages/shared/src/types/`:

```typescript
export interface ProductSection {
  name_en: string;
  name_es: string;
  type: "cards" | "accordion" | "two-column" | "gallery";
  sort_order: number;
  items: ProductSectionItem[];
}

export interface ProductSectionItem {
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  icon?: string;
  image_url?: string;
  sort_order: number;
}

export const SECTION_TYPES = [
  "cards",
  "accordion",
  "two-column",
  "gallery",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
```

Export from `packages/shared` so store, studio, and payments all use the same types.

---

## 4. Store Changes

### Delete

- `HighlightsSection.tsx`
- `FaqSection.tsx` + `FaqItem.tsx`
- `SpecsSection.tsx`
- `ScreenshotsSection.tsx`

### Create section renderers

One component per section type, in `apps/store/src/features/products/presentation/components/product-detail/sections/`:

| Component              | Section type | Renders as                                         |
| ---------------------- | ------------ | -------------------------------------------------- |
| `CardsSection.tsx`     | `cards`      | Horizontal row of icon + title + description cards |
| `AccordionSection.tsx` | `accordion`  | Collapsible Q&A items                              |
| `TwoColumnSection.tsx` | `two-column` | Label/value grid                                   |
| `GallerySection.tsx`   | `gallery`    | Image grid with captions                           |

### Create `SectionRenderer.tsx`

Switches on `section.type` and renders the correct component. Receives `section`, `theme`, `locale`.

### Update `ProductSections.tsx`

Replace hardcoded section rendering with:

```tsx
const sections = (product.sections as ProductSection[]) ?? [];
const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);

{
  sorted.map((section, i) => (
    <SectionRenderer key={i} section={section} theme={theme} locale={locale} />
  ));
}
```

---

## 5. Studio Changes

### Delete

- `InlineHighlights.tsx` + `HighlightCard.tsx`
- `InlineFaq.tsx` + `FaqItem.tsx`
- `InlineTypeDetails.tsx` + `TypeDetailField.tsx`

### Create `InlineSections.tsx`

Single component that manages all sections. Uses `useFieldArray` on `sections`.

Each section card shows:

- Section name (i18n, editable inline)
- Type selector dropdown (cards/accordion/two-column/gallery)
- Items list with add/remove/reorder (DnD)
- Each item: title (i18n) + description (i18n) + optional icon + optional image_url
- ✕ remove section button
- Drag handle for section reorder

"+ Add Section" button at the bottom with type selector.

### Update `InlineEditor.tsx`

Replace `InlineHighlights` + `InlineFaq` + `InlineTypeDetails` with single `InlineSections`.

### Update validation schema

Replace `highlightSchema`, `faqItemSchema`, and their arrays with:

```typescript
const sectionItemSchema = z.object({
  title_en: z.string(),
  title_es: z.string().optional().default(""),
  description_en: z.string(),
  description_es: z.string().optional().default(""),
  icon: z.string().optional().default(""),
  image_url: z.string().optional().default(""),
  sort_order: z.number().default(0),
});

const sectionSchema = z.object({
  name_en: z.string().min(1),
  name_es: z.string().optional().default(""),
  type: z.enum(["cards", "accordion", "two-column", "gallery"]),
  sort_order: z.number().default(0),
  items: z.array(sectionItemSchema).default([]),
});
```

### Update `useProductForm.ts`

`productToFormValues` maps `product.sections` (JSONB) to form values.

---

## 6. Sync Checklist

All these must use the same `sections` shape:

- [ ] **DB**: `sections` JSONB column on `products`
- [ ] **Supabase types**: regenerated `Tables<"products">` includes `sections`
- [ ] **Shared types**: `ProductSection` + `ProductSectionItem` in `packages/shared`
- [ ] **Store**: `SectionRenderer` reads `product.sections`, renders per type
- [ ] **Studio**: `InlineSections` writes `sections` array via react-hook-form
- [ ] **Cart**: no change (cart only stores product row — sections come along for free)
- [ ] **Seed data**: uses `sections` JSONB

---

## 7. What's NOT in Scope

- Custom section type creation by users (predefined 4 types for now)
- Section templates / presets
- Rich text in descriptions (plain text only)
- Section visibility toggle (show/hide)

---

## 8. Implementation Order

1. **DB migration** — drop old columns, add `sections`
2. **Regenerate Supabase types**
3. **Shared types** — `ProductSection`, `ProductSectionItem`, `SECTION_TYPES`
4. **Seed data** — rewrite with `sections`
5. **Store section renderers** — Cards, Accordion, TwoColumn, Gallery + SectionRenderer
6. **Store ProductSections update** — use generic renderer
7. **Studio InlineSections** — replace 3 old section editors with 1 generic
8. **Studio InlineEditor update** — wire InlineSections
9. **Delete old files** — store and studio
10. **Verify** — typecheck, lint, test, build, manual QA
