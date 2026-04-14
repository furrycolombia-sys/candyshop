# Product Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a template system where admins manage section scaffolding and sellers apply templates when creating products.

**Architecture:** New `product_templates` table stores section arrays (same shape as product sections). Admin app gets full CRUD feature. Studio app gets a toolbar popover to pick and apply templates + a form reset button.

**Tech Stack:** Supabase (Postgres + RLS), React Query, react-hook-form, nuqs, next-intl, Zod

**Spec:** `docs/superpowers/specs/2026-03-25-product-templates-design.md`

---

## File Map

### New Files

| File                                                                                         | Responsibility                        |
| -------------------------------------------------------------------------------------------- | ------------------------------------- |
| `supabase/migrations/20260325700000_product_templates.sql`                                   | Table, RLS, indexes, audit, seed data |
| `apps/admin/src/features/templates/domain/types.ts`                                          | `ProductTemplate` interface           |
| `apps/admin/src/features/templates/domain/constants.ts`                                      | Page size, query key                  |
| `apps/admin/src/features/templates/infrastructure/templateQueries.ts`                        | Supabase CRUD functions               |
| `apps/admin/src/features/templates/application/hooks/useTemplates.ts`                        | Fetch hook                            |
| `apps/admin/src/features/templates/application/hooks/useTemplateMutations.ts`                | Create/update/delete mutations        |
| `apps/admin/src/features/templates/presentation/pages/TemplatesPage.tsx`                     | Main page with table + editor         |
| `apps/admin/src/features/templates/presentation/components/TemplateTable.tsx`                | Template list table                   |
| `apps/admin/src/features/templates/presentation/components/TemplateEditor.tsx`               | Section builder editor                |
| `apps/admin/src/features/templates/index.ts`                                                 | Barrel exports                        |
| `apps/admin/src/app/[locale]/templates/page.tsx`                                             | Route                                 |
| `apps/studio/src/features/products/infrastructure/templateQueries.ts`                        | Fetch active templates                |
| `apps/studio/src/features/products/application/hooks/useProductTemplates.ts`                 | Read-only hook                        |
| `apps/studio/src/features/products/presentation/components/inline-editor/TemplatePicker.tsx` | Popover with template list            |

### Modified Files

| File                                                                                        | Change                             |
| ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `apps/admin/src/shared/presentation/components/AdminSidebar.tsx`                            | Add "Templates" nav item           |
| `apps/admin/src/shared/infrastructure/i18n/messages/en.json`                                | Template i18n keys                 |
| `apps/admin/src/shared/infrastructure/i18n/messages/es.json`                                | Template i18n keys                 |
| `apps/studio/src/features/products/domain/validationSchema.ts`                              | Import `SECTION_TYPES` from shared |
| `apps/studio/src/features/products/presentation/components/inline-editor/EditorToolbar.tsx` | Add template + reset buttons       |
| `apps/studio/src/features/products/presentation/components/inline-editor/InlineEditor.tsx`  | Pass template/reset handlers       |
| `apps/studio/src/shared/infrastructure/i18n/messages/en.json`                               | Template picker i18n               |
| `apps/studio/src/shared/infrastructure/i18n/messages/es.json`                               | Template picker i18n               |

---

## Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20260325700000_product_templates.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Product Templates: section scaffolding managed by admins, used by sellers
-- =============================================================================

create table public.product_templates (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  sections jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (reuse existing function)
create trigger set_product_templates_updated_at
  before update on public.product_templates
  for each row execute function trigger_set_updated_at();

-- Index for ordered listing
create index product_templates_sort_order_idx
  on public.product_templates(sort_order, id);

-- RLS
alter table public.product_templates enable row level security;

-- All authenticated users can read (studio needs this)
create policy "Templates: read all"
  on public.product_templates for select
  using (auth.role() = 'authenticated');

-- Authenticated users can write (admin-only enforcement comes with roles later)
create policy "Templates: insert"
  on public.product_templates for insert
  with check (auth.role() = 'authenticated');

create policy "Templates: update"
  on public.product_templates for update
  using (auth.role() = 'authenticated');

create policy "Templates: delete"
  on public.product_templates for delete
  using (auth.role() = 'authenticated');

-- Audit tracking
select audit.enable_tracking('public.product_templates'::regclass);

-- Seed starter templates
insert into public.product_templates (name_en, name_es, description_en, description_es, sort_order, sections) values
(
  'Commission',
  'Comision',
  'For custom work: what''s included, pricing tiers, FAQ',
  'Para trabajo personalizado: que incluye, niveles de precio, FAQ',
  0,
  '[
    {
      "name_en": "What''s Included",
      "name_es": "Que Incluye",
      "type": "cards",
      "sort_order": 0,
      "items": [
        { "title_en": "Base Package", "title_es": "Paquete Base", "description_en": "Describe what the buyer gets with the base price", "description_es": "Describe que obtiene el comprador con el precio base", "icon": "Package", "image_url": "", "sort_order": 0 },
        { "title_en": "Add-on Options", "title_es": "Opciones Adicionales", "description_en": "List any available upgrades or extras", "description_es": "Lista las mejoras o extras disponibles", "icon": "Plus", "image_url": "", "sort_order": 1 }
      ]
    },
    {
      "name_en": "FAQ",
      "name_es": "Preguntas Frecuentes",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        { "title_en": "How long does it take?", "title_es": "Cuanto tiempo toma?", "description_en": "Explain your typical turnaround time", "description_es": "Explica tu tiempo de entrega tipico", "icon": "", "image_url": "", "sort_order": 0 },
        { "title_en": "What do you need from me?", "title_es": "Que necesitas de mi?", "description_en": "List references or info the buyer should provide", "description_es": "Lista las referencias o informacion que el comprador debe proporcionar", "icon": "", "image_url": "", "sort_order": 1 }
      ]
    }
  ]'::jsonb
),
(
  'Merch Item',
  'Articulo de Merch',
  'For physical products: details, sizing, care instructions',
  'Para productos fisicos: detalles, tallas, instrucciones de cuidado',
  1,
  '[
    {
      "name_en": "Product Details",
      "name_es": "Detalles del Producto",
      "type": "two-column",
      "sort_order": 0,
      "items": [
        { "title_en": "Material", "title_es": "Material", "description_en": "What is it made of?", "description_es": "De que esta hecho?", "icon": "Shirt", "image_url": "", "sort_order": 0 },
        { "title_en": "Sizing", "title_es": "Tallas", "description_en": "Available sizes or dimensions", "description_es": "Tallas o dimensiones disponibles", "icon": "Ruler", "image_url": "", "sort_order": 1 }
      ]
    },
    {
      "name_en": "Care Instructions",
      "name_es": "Instrucciones de Cuidado",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        { "title_en": "Washing", "title_es": "Lavado", "description_en": "How to wash and dry", "description_es": "Como lavar y secar", "icon": "", "image_url": "", "sort_order": 0 }
      ]
    }
  ]'::jsonb
),
(
  'Event Ticket',
  'Boleto de Evento',
  'For events: schedule, location, what to bring',
  'Para eventos: horario, ubicacion, que traer',
  2,
  '[
    {
      "name_en": "Event Details",
      "name_es": "Detalles del Evento",
      "type": "cards",
      "sort_order": 0,
      "items": [
        { "title_en": "Date & Time", "title_es": "Fecha y Hora", "description_en": "When does the event take place?", "description_es": "Cuando es el evento?", "icon": "Calendar", "image_url": "", "sort_order": 0 },
        { "title_en": "Location", "title_es": "Ubicacion", "description_en": "Where is it? Include address or link", "description_es": "Donde es? Incluye direccion o enlace", "icon": "MapPin", "image_url": "", "sort_order": 1 }
      ]
    },
    {
      "name_en": "What to Bring",
      "name_es": "Que Traer",
      "type": "accordion",
      "sort_order": 1,
      "items": [
        { "title_en": "Required Items", "title_es": "Elementos Necesarios", "description_en": "What attendees must bring", "description_es": "Que deben traer los asistentes", "icon": "", "image_url": "", "sort_order": 0 }
      ]
    }
  ]'::jsonb
);
```

- [ ] **Step 2: Verify migration syntax**

Run: `supabase db reset` (if local Supabase is running) or review manually. The migration depends on `trigger_set_updated_at()` from `20260324000000_studio_schema.sql` and `audit.enable_tracking()` from `20260325400000_audit_system.sql`.

- [ ] **Step 3: Commit**

```
git add supabase/migrations/20260325700000_product_templates.sql
git commit -m "feat(db): add product_templates table with seed data [GH-14]"
```

---

## Task 2: Studio — Import Section Types from Shared

**Files:**

- Modify: `apps/studio/src/features/products/domain/validationSchema.ts`

The shared package already exports `SECTION_TYPES` from `packages/shared/src/types/sections.ts`. Studio has a local duplicate. Replace it.

- [ ] **Step 1: Replace local `SECTION_TYPES` with import from shared**

In `apps/studio/src/features/products/domain/validationSchema.ts`, change line 6:

```typescript
// BEFORE:
const SECTION_TYPES = ["cards", "accordion", "two-column", "gallery"] as const;

// AFTER:
import { SECTION_TYPES } from "shared/types";
```

Move this import to the top of the file (after the `zod` import).

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit -p apps/studio/tsconfig.json`
Expected: No errors. The types are identical shapes.

- [ ] **Step 3: Verify lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```
git add apps/studio/src/features/products/domain/validationSchema.ts
git commit -m "refactor(studio): import SECTION_TYPES from shared package [GH-14]"
```

---

## Task 3: Admin — Domain Layer

**Files:**

- Create: `apps/admin/src/features/templates/domain/types.ts`
- Create: `apps/admin/src/features/templates/domain/constants.ts`

- [ ] **Step 1: Create domain types**

```typescript
// apps/admin/src/features/templates/domain/types.ts
import type { ProductSection } from "shared/types";

/** A product template row from public.product_templates */
export interface ProductTemplate {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  sections: ProductSection[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields for creating/updating a template */
export interface TemplateFormValues {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  sections: ProductSection[];
  sort_order: number;
  is_active: boolean;
}
```

- [ ] **Step 2: Create domain constants**

```typescript
// apps/admin/src/features/templates/domain/constants.ts

/** React Query key for templates list */
export const TEMPLATES_QUERY_KEY = "product-templates";

/** Default values for a new template form */
export const TEMPLATE_FORM_DEFAULTS: import("./types").TemplateFormValues = {
  name_en: "",
  name_es: "",
  description_en: "",
  description_es: "",
  sections: [],
  sort_order: 0,
  is_active: true,
};
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`
Expected: No errors.

- [ ] **Step 4: Commit**

```
git add apps/admin/src/features/templates/domain/
git commit -m "feat(admin): add templates domain types and constants [GH-14]"
```

---

## Task 4: Admin — Infrastructure (Supabase Queries)

**Files:**

- Create: `apps/admin/src/features/templates/infrastructure/templateQueries.ts`

Uses the same pattern as studio's `productQueries.ts` — accepts a Supabase client, returns typed data.

- [ ] **Step 1: Create template CRUD queries**

```typescript
// apps/admin/src/features/templates/infrastructure/templateQueries.ts
import type { createBrowserSupabaseClient } from "api/supabase";

import type {
  ProductTemplate,
  TemplateFormValues,
} from "@/features/templates/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

/** Fetch all templates ordered by sort_order */
export async function fetchTemplates(
  supabase: SupabaseClient,
): Promise<ProductTemplate[]> {
  const { data, error } = await supabase
    .from("product_templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return data as ProductTemplate[];
}

/** Fetch only active templates (for studio picker) */
export async function fetchActiveTemplates(
  supabase: SupabaseClient,
): Promise<ProductTemplate[]> {
  const { data, error } = await supabase
    .from("product_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as ProductTemplate[];
}

/** Create a new template */
export async function insertTemplate(
  supabase: SupabaseClient,
  values: TemplateFormValues,
): Promise<ProductTemplate> {
  const { data, error } = await supabase
    .from("product_templates")
    .insert(values)
    .select()
    .single();

  if (error) throw error;
  return data as ProductTemplate;
}

/** Update an existing template */
export async function updateTemplate(
  supabase: SupabaseClient,
  id: string,
  values: Partial<TemplateFormValues>,
): Promise<ProductTemplate> {
  const { data, error } = await supabase
    .from("product_templates")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProductTemplate;
}

/** Delete a template */
export async function deleteTemplate(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("product_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Toggle is_active on a template */
export async function toggleTemplateActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("product_templates")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`

Note: The `product_templates` table won't be in the generated Database types (it's not in Orval/codegen). The `as ProductTemplate` casts handle this. If typecheck fails on `.from("product_templates")`, use `.from("product_templates" as any)`.

- [ ] **Step 3: Commit**

```
git add apps/admin/src/features/templates/infrastructure/
git commit -m "feat(admin): add template Supabase CRUD queries [GH-14]"
```

---

## Task 5: Admin — Application Hooks

**Files:**

- Create: `apps/admin/src/features/templates/application/hooks/useTemplates.ts`
- Create: `apps/admin/src/features/templates/application/hooks/useTemplateMutations.ts`

- [ ] **Step 1: Create fetch hook**

```typescript
// apps/admin/src/features/templates/application/hooks/useTemplates.ts
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { TEMPLATES_QUERY_KEY } from "@/features/templates/domain/constants";
import { fetchTemplates } from "@/features/templates/infrastructure/templateQueries";

export function useTemplates() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => fetchTemplates(supabase),
  });
}
```

- [ ] **Step 2: Create mutation hooks**

```typescript
// apps/admin/src/features/templates/application/hooks/useTemplateMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { TEMPLATES_QUERY_KEY } from "@/features/templates/domain/constants";
import type { TemplateFormValues } from "@/features/templates/domain/types";
import {
  deleteTemplate,
  insertTemplate,
  toggleTemplateActive,
  updateTemplate,
} from "@/features/templates/infrastructure/templateQueries";

function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
}

export function useInsertTemplate() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: (values: TemplateFormValues) =>
      insertTemplate(supabase, values),
    onSuccess: invalidate,
  });
}

export function useUpdateTemplate() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Partial<TemplateFormValues>;
    }) => updateTemplate(supabase, id, values),
    onSuccess: invalidate,
  });
}

export function useDeleteTemplate() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: (id: string) => deleteTemplate(supabase, id),
    onSuccess: invalidate,
  });
}

export function useToggleTemplateActive() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleTemplateActive(supabase, id, isActive),
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`

- [ ] **Step 4: Commit**

```
git add apps/admin/src/features/templates/application/
git commit -m "feat(admin): add template React Query hooks [GH-14]"
```

---

## Task 6: Admin — i18n + Sidebar + Route

**Files:**

- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/es.json`
- Modify: `apps/admin/src/shared/presentation/components/AdminSidebar.tsx`
- Create: `apps/admin/src/app/[locale]/templates/page.tsx`
- Create: `apps/admin/src/features/templates/index.ts`

- [ ] **Step 1: Add i18n keys to en.json**

Add to root level of `en.json`:

```json
"templates": {
  "title": "Product Templates",
  "subtitle": "Manage section templates for sellers",
  "addTemplate": "Add Template",
  "editTemplate": "Edit Template",
  "name": "Template Name",
  "description": "Description",
  "sections": "Sections",
  "sectionCount": "{count} {count, plural, one {section} other {sections}}",
  "active": "Active",
  "noTemplates": "No templates yet",
  "deleteConfirm": "Delete this template? This cannot be undone.",
  "save": "Save",
  "saving": "Saving...",
  "cancel": "Cancel",
  "newSection": "Add Section",
  "sectionName": "Section Name",
  "sectionType": "Type",
  "items": "Items",
  "addItem": "Add Item",
  "itemTitle": "Item Title",
  "itemDescription": "Item Description",
  "itemIcon": "Icon"
}
```

Add to `sidebar` object:

```json
"templates": "Templates",
"content": "Content"
```

- [ ] **Step 2: Add i18n keys to es.json**

Same structure with Spanish translations:

```json
"templates": {
  "title": "Plantillas de Producto",
  "subtitle": "Administra plantillas de secciones para vendedores",
  "addTemplate": "Agregar Plantilla",
  "editTemplate": "Editar Plantilla",
  "name": "Nombre de Plantilla",
  "description": "Descripcion",
  "sections": "Secciones",
  "sectionCount": "{count} {count, plural, one {seccion} other {secciones}}",
  "active": "Activa",
  "noTemplates": "Sin plantillas aun",
  "deleteConfirm": "Eliminar esta plantilla? No se puede deshacer.",
  "save": "Guardar",
  "saving": "Guardando...",
  "cancel": "Cancelar",
  "newSection": "Agregar Seccion",
  "sectionName": "Nombre de Seccion",
  "sectionType": "Tipo",
  "items": "Elementos",
  "addItem": "Agregar Elemento",
  "itemTitle": "Titulo del Elemento",
  "itemDescription": "Descripcion del Elemento",
  "itemIcon": "Icono"
}
```

Add to `sidebar`:

```json
"templates": "Plantillas",
"content": "Contenido"
```

- [ ] **Step 3: Add Templates to AdminSidebar**

In `apps/admin/src/shared/presentation/components/AdminSidebar.tsx`:

1. Add `Layers` import from lucide-react (template icon)
2. Add "Templates" item to operations section:

```typescript
const NAV_SECTIONS = [
  {
    labelKey: "operations" as const,
    items: [
      { key: "dashboard" as const, href: "/", icon: LayoutDashboard },
      { key: "templates" as const, href: "/templates", icon: Layers },
    ],
  },
  {
    labelKey: "monitoring" as const,
    items: [{ key: "auditLog" as const, href: "/audit", icon: FileText }],
  },
] as const;
```

- [ ] **Step 4: Create barrel export**

```typescript
// apps/admin/src/features/templates/index.ts
export { TemplatesPage } from "./presentation/pages/TemplatesPage";
```

- [ ] **Step 5: Create route page**

```typescript
// apps/admin/src/app/[locale]/templates/page.tsx
import { setRequestLocale } from "next-intl/server";

import { TemplatesPage } from "@/features/templates";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TemplatesPage />;
}
```

- [ ] **Step 6: Commit**

```
git add apps/admin/src/shared/infrastructure/i18n/ apps/admin/src/shared/presentation/components/AdminSidebar.tsx apps/admin/src/app/[locale]/templates/ apps/admin/src/features/templates/index.ts
git commit -m "feat(admin): add templates route, sidebar nav, and i18n [GH-14]"
```

---

## Task 7: Admin — TemplateTable Component

**Files:**

- Create: `apps/admin/src/features/templates/presentation/components/TemplateTable.tsx`

- [ ] **Step 1: Create TemplateTable**

This component shows a table of templates with name, description, section count, active toggle, and edit/delete actions. Follow the same neobrutalism grid pattern as `AuditTable.tsx`.

```typescript
// apps/admin/src/features/templates/presentation/components/TemplateTable.tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { Switch } from "ui";

import type { ProductTemplate } from "@/features/templates/domain/types";

const GRID_COLS = "grid-cols-[1fr_1fr_100px_80px_100px]";

interface TemplateTableProps {
  templates: ProductTemplate[];
  onEdit: (template: ProductTemplate) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function TemplateTable({
  templates,
  onEdit,
  onDelete,
  onToggleActive,
}: TemplateTableProps) {
  const t = useTranslations("templates");
  const locale = useLocale();

  if (templates.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-3 border-dashed border-border bg-muted/30 py-16"
        {...tid("templates-empty")}
      >
        <p className="font-display text-lg font-bold uppercase">
          {t("noTemplates")}
        </p>
      </div>
    );
  }

  const getName = (tpl: ProductTemplate) =>
    locale === "es" ? tpl.name_es || tpl.name_en : tpl.name_en;
  const getDesc = (tpl: ProductTemplate) =>
    locale === "es"
      ? tpl.description_es || tpl.description_en
      : tpl.description_en;

  return (
    <div
      className="overflow-x-auto border-3 border-foreground bg-background nb-shadow-md"
      {...tid("templates-table")}
    >
      {/* Header */}
      <div className={`grid ${GRID_COLS} border-b-3 border-foreground bg-muted/50`}>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("name")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("description")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("sections")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("active")}
        </span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-foreground/8">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className={`grid ${GRID_COLS} items-center`}
            {...tid(`template-row-${tpl.id}`)}
          >
            <span className="truncate px-4 py-3 font-mono text-sm font-bold">
              {getName(tpl)}
            </span>
            <span className="truncate px-4 py-3 text-xs text-muted-foreground">
              {getDesc(tpl) ?? "—"}
            </span>
            <span className="px-4 py-3 font-mono text-xs text-muted-foreground">
              {t("sectionCount", { count: tpl.sections.length })}
            </span>
            <span className="px-4 py-3">
              <Switch
                checked={tpl.is_active}
                onCheckedChange={(checked) => onToggleActive(tpl.id, checked)}
                {...tid(`template-active-${tpl.id}`)}
              />
            </span>
            <span className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => onEdit(tpl)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("editTemplate")}
                {...tid(`template-edit-${tpl.id}`)}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (globalThis.confirm(t("deleteConfirm"))) {
                    onDelete(tpl.id);
                  }
                }}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label="Delete"
                {...tid(`template-delete-${tpl.id}`)}
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`

- [ ] **Step 3: Commit**

```
git add apps/admin/src/features/templates/presentation/components/TemplateTable.tsx
git commit -m "feat(admin): add TemplateTable component [GH-14]"
```

---

## Task 8: Admin — TemplateEditor Component

**Files:**

- Create: `apps/admin/src/features/templates/presentation/components/TemplateEditor.tsx`

A form for creating/editing templates. Contains name fields (EN/ES), description fields, a section builder with add/remove/reorder, and a save button.

- [ ] **Step 1: Create TemplateEditor**

This is the most complex component. It manages an array of sections, each with an array of items. Uses local state (not react-hook-form) for simplicity since templates have no Zod validation (relaxed schema per spec).

```typescript
// apps/admin/src/features/templates/presentation/components/TemplateEditor.tsx
"use client";

import { GripVertical, Loader2, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SECTION_TYPES } from "shared/types";
import type { ProductSection, ProductSectionItem } from "shared/types";
import { tid } from "shared";
import { Input } from "ui";

import { TEMPLATE_FORM_DEFAULTS } from "@/features/templates/domain/constants";
import type {
  ProductTemplate,
  TemplateFormValues,
} from "@/features/templates/domain/types";

interface TemplateEditorProps {
  template?: ProductTemplate;
  onSave: (values: TemplateFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
}

const EMPTY_ITEM: ProductSectionItem = {
  title_en: "",
  title_es: "",
  description_en: "",
  description_es: "",
  icon: "",
  image_url: "",
  sort_order: 0,
};

const EMPTY_SECTION: ProductSection = {
  name_en: "",
  name_es: "",
  type: "cards",
  sort_order: 0,
  items: [{ ...EMPTY_ITEM }],
};

export function TemplateEditor({
  template,
  onSave,
  onCancel,
  isPending,
}: TemplateEditorProps) {
  const t = useTranslations("templates");

  const initial: TemplateFormValues = template
    ? {
        name_en: template.name_en,
        name_es: template.name_es,
        description_en: template.description_en ?? "",
        description_es: template.description_es ?? "",
        sections: template.sections,
        sort_order: template.sort_order,
        is_active: template.is_active,
      }
    : TEMPLATE_FORM_DEFAULTS;

  const [form, setForm] = useState<TemplateFormValues>(initial);

  const updateField = <K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const addSection = () =>
    updateField("sections", [
      ...form.sections,
      { ...EMPTY_SECTION, sort_order: form.sections.length },
    ]);

  const removeSection = (idx: number) =>
    updateField(
      "sections",
      form.sections.filter((_, i) => i !== idx),
    );

  const updateSection = (idx: number, patch: Partial<ProductSection>) =>
    updateField(
      "sections",
      form.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );

  const addItem = (sIdx: number) => {
    const section = form.sections[sIdx];
    updateSection(sIdx, {
      items: [
        ...section.items,
        { ...EMPTY_ITEM, sort_order: section.items.length },
      ],
    });
  };

  const removeItem = (sIdx: number, iIdx: number) => {
    const section = form.sections[sIdx];
    updateSection(sIdx, {
      items: section.items.filter((_, i) => i !== iIdx),
    });
  };

  const updateItem = (
    sIdx: number,
    iIdx: number,
    patch: Partial<ProductSectionItem>,
  ) => {
    const section = form.sections[sIdx];
    updateSection(sIdx, {
      items: section.items.map((item, i) =>
        i === iIdx ? { ...item, ...patch } : item,
      ),
    });
  };

  const labelClass =
    "font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground";
  const inputClass = "border-2 border-foreground/20";

  return (
    <div
      className="border-3 border-foreground bg-background nb-shadow-md"
      {...tid("template-editor")}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-3 border-foreground px-5 py-4">
        <h2 className="font-display text-lg font-extrabold uppercase tracking-wider">
          {template ? t("editTemplate") : t("addTemplate")}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("cancel")}
          {...tid("template-editor-close")}
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t("name")} (EN)</span>
            <Input
              value={form.name_en}
              onChange={(e) => updateField("name_en", e.target.value)}
              className={inputClass}
              {...tid("template-name-en")}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t("name")} (ES)</span>
            <Input
              value={form.name_es}
              onChange={(e) => updateField("name_es", e.target.value)}
              className={inputClass}
              {...tid("template-name-es")}
            />
          </label>
        </div>

        {/* Description fields */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t("description")} (EN)</span>
            <Input
              value={form.description_en}
              onChange={(e) => updateField("description_en", e.target.value)}
              className={inputClass}
              {...tid("template-desc-en")}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t("description")} (ES)</span>
            <Input
              value={form.description_es}
              onChange={(e) => updateField("description_es", e.target.value)}
              className={inputClass}
              {...tid("template-desc-es")}
            />
          </label>
        </div>

        {/* Sections */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className={labelClass}>{t("sections")}</span>
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-1 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              {...tid("template-add-section")}
            >
              <Plus className="size-3.5" />
              {t("newSection")}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {form.sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className="border-2 border-foreground/20 p-4"
                {...tid(`template-section-${String(sIdx)}`)}
              >
                {/* Section header */}
                <div className="mb-3 flex items-center gap-3">
                  <GripVertical className="size-4 text-muted-foreground/40" />
                  <Input
                    value={section.name_en}
                    onChange={(e) =>
                      updateSection(sIdx, { name_en: e.target.value })
                    }
                    placeholder="Section name (EN)"
                    className="flex-1 border-foreground/20 text-sm font-bold"
                    {...tid(`section-name-en-${String(sIdx)}`)}
                  />
                  <Input
                    value={section.name_es}
                    onChange={(e) =>
                      updateSection(sIdx, { name_es: e.target.value })
                    }
                    placeholder="Nombre (ES)"
                    className="flex-1 border-foreground/20 text-sm"
                    {...tid(`section-name-es-${String(sIdx)}`)}
                  />
                  <select
                    value={section.type}
                    onChange={(e) =>
                      updateSection(sIdx, {
                        type: e.target.value as ProductSection["type"],
                      })
                    }
                    className="rounded-md border-2 border-foreground/20 bg-background px-2 py-1 font-mono text-xs"
                    {...tid(`section-type-${String(sIdx)}`)}
                  >
                    {SECTION_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    {...tid(`section-remove-${String(sIdx)}`)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Items */}
                <div className="ml-6 flex flex-col gap-2">
                  {section.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-start gap-2 border-l-2 border-foreground/10 pl-3"
                    >
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex gap-2">
                          <Input
                            value={item.title_en}
                            onChange={(e) =>
                              updateItem(sIdx, iIdx, {
                                title_en: e.target.value,
                              })
                            }
                            placeholder="Item title (EN)"
                            className="flex-1 border-foreground/10 text-xs"
                          />
                          <Input
                            value={item.title_es}
                            onChange={(e) =>
                              updateItem(sIdx, iIdx, {
                                title_es: e.target.value,
                              })
                            }
                            placeholder="Titulo (ES)"
                            className="flex-1 border-foreground/10 text-xs"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={item.description_en}
                            onChange={(e) =>
                              updateItem(sIdx, iIdx, {
                                description_en: e.target.value,
                              })
                            }
                            placeholder="Guideline (EN)"
                            className="flex-1 border-foreground/10 text-xs text-muted-foreground"
                          />
                          <Input
                            value={item.description_es}
                            onChange={(e) =>
                              updateItem(sIdx, iIdx, {
                                description_es: e.target.value,
                              })
                            }
                            placeholder="Guia (ES)"
                            className="flex-1 border-foreground/10 text-xs text-muted-foreground"
                          />
                        </div>
                        <Input
                          value={item.icon ?? ""}
                          onChange={(e) =>
                            updateItem(sIdx, iIdx, { icon: e.target.value })
                          }
                          placeholder="Icon (e.g. Package)"
                          className="w-40 border-foreground/10 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(sIdx, iIdx)}
                        className="mt-1 text-muted-foreground/40 transition-colors hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addItem(sIdx)}
                    className="flex items-center gap-1 self-start font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-foreground"
                    {...tid(`section-add-item-${String(sIdx)}`)}
                  >
                    <Plus className="size-3" />
                    {t("addItem")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="nb-btn nb-btn-press-sm border-2 border-foreground px-5 py-2 font-display text-xs font-bold uppercase tracking-widest"
            {...tid("template-cancel")}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={isPending || !form.name_en.trim()}
            className="nb-btn nb-btn-press-sm border-3 border-foreground bg-foreground px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-background disabled:opacity-50"
            {...tid("template-save")}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`

- [ ] **Step 3: Commit**

```
git add apps/admin/src/features/templates/presentation/components/TemplateEditor.tsx
git commit -m "feat(admin): add TemplateEditor section builder [GH-14]"
```

---

## Task 9: Admin — TemplatesPage

**Files:**

- Create: `apps/admin/src/features/templates/presentation/pages/TemplatesPage.tsx`

Orchestrates the table and editor. Uses state to toggle between list view and editor.

- [ ] **Step 1: Create TemplatesPage**

```typescript
// apps/admin/src/features/templates/presentation/pages/TemplatesPage.tsx
"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { useTemplates } from "@/features/templates/application/hooks/useTemplates";
import {
  useDeleteTemplate,
  useInsertTemplate,
  useToggleTemplateActive,
  useUpdateTemplate,
} from "@/features/templates/application/hooks/useTemplateMutations";
import type { ProductTemplate } from "@/features/templates/domain/types";
import { TemplateEditor } from "@/features/templates/presentation/components/TemplateEditor";
import { TemplateTable } from "@/features/templates/presentation/components/TemplateTable";

export function TemplatesPage() {
  const t = useTranslations("templates");
  const { data: templates, isLoading } = useTemplates();
  const insertMutation = useInsertTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const toggleMutation = useToggleTemplateActive();

  const [editing, setEditing] = useState<ProductTemplate | "new" | null>(null);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-dots">
        <span className="font-mono text-sm text-muted-foreground">
          {t("saving")}
        </span>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("templates-page")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1
              className="font-display text-4xl font-extrabold uppercase tracking-tight"
              {...tid("templates-title")}
            >
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="nb-btn nb-btn-press-sm flex items-center gap-2 border-3 border-foreground bg-foreground px-5 py-2.5 font-display text-sm font-extrabold uppercase tracking-wider text-background"
              {...tid("add-template")}
            >
              <Plus className="size-4" />
              {t("addTemplate")}
            </button>
          )}
        </header>

        {/* Editor (when active) */}
        {editing && (
          <TemplateEditor
            template={editing === "new" ? undefined : editing}
            onSave={(values) => {
              if (editing === "new") {
                insertMutation.mutate(values, {
                  onSuccess: () => setEditing(null),
                });
              } else {
                updateMutation.mutate(
                  { id: editing.id, values },
                  { onSuccess: () => setEditing(null) },
                );
              }
            }}
            onCancel={() => setEditing(null)}
            isPending={insertMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Table */}
        {!editing && (
          <TemplateTable
            templates={templates ?? []}
            onEdit={(tpl) => setEditing(tpl)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleActive={(id, isActive) =>
              toggleMutation.mutate({ id, isActive })
            }
          />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json && pnpm lint`

- [ ] **Step 3: Commit**

```
git add apps/admin/src/features/templates/presentation/pages/TemplatesPage.tsx
git commit -m "feat(admin): add TemplatesPage with table + editor [GH-14]"
```

---

## Task 10: Studio — Template Queries + Hook

**Files:**

- Create: `apps/studio/src/features/products/infrastructure/templateQueries.ts`
- Create: `apps/studio/src/features/products/application/hooks/useProductTemplates.ts`

- [ ] **Step 1: Create studio template query**

```typescript
// apps/studio/src/features/products/infrastructure/templateQueries.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "api/types/database";
import type { ProductSection } from "shared/types";

type SupabaseDB = SupabaseClient<Database>;

/** A template as returned from the DB (read-only for studio) */
export interface ActiveTemplate {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  sections: ProductSection[];
}

/** Fetch active templates for the picker */
export async function fetchActiveTemplates(
  supabase: SupabaseDB,
): Promise<ActiveTemplate[]> {
  const { data, error } = await supabase
    .from("product_templates")
    .select("id, name_en, name_es, description_en, description_es, sections")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as ActiveTemplate[];
}
```

- [ ] **Step 2: Create studio hook**

```typescript
// apps/studio/src/features/products/application/hooks/useProductTemplates.ts
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { fetchActiveTemplates } from "@/features/products/infrastructure/templateQueries";

const TEMPLATES_QUERY_KEY = "product-templates";

export function useProductTemplates() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => fetchActiveTemplates(supabase),
  });
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit -p apps/studio/tsconfig.json`

- [ ] **Step 4: Commit**

```
git add apps/studio/src/features/products/infrastructure/templateQueries.ts apps/studio/src/features/products/application/hooks/useProductTemplates.ts
git commit -m "feat(studio): add template fetch query and hook [GH-14]"
```

---

## Task 11: Studio — TemplatePicker + Toolbar Integration

**Files:**

- Create: `apps/studio/src/features/products/presentation/components/inline-editor/TemplatePicker.tsx`
- Modify: `apps/studio/src/features/products/presentation/components/inline-editor/EditorToolbar.tsx`
- Modify: `apps/studio/src/features/products/presentation/components/inline-editor/InlineEditor.tsx`
- Modify: `apps/studio/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/studio/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add studio i18n keys**

In `apps/studio/src/shared/infrastructure/i18n/messages/en.json`, add inside `form.inlineEditor`:

```json
"useTemplate": "Use Template",
"resetForm": "Reset",
"templateConfirm": "This will replace all your current sections. Your product info (name, price, images) will be preserved. Continue?",
"resetConfirm": "Reset the form to its original state? Any unsaved changes will be lost.",
"noTemplates": "No templates available"
```

Same in `es.json`:

```json
"useTemplate": "Usar Plantilla",
"resetForm": "Reiniciar",
"templateConfirm": "Esto reemplazara todas tus secciones actuales. La informacion del producto se conservara. Continuar?",
"resetConfirm": "Reiniciar el formulario a su estado original? Los cambios no guardados se perderan.",
"noTemplates": "Sin plantillas disponibles"
```

- [ ] **Step 2: Create TemplatePicker popover**

```typescript
// apps/studio/src/features/products/presentation/components/inline-editor/TemplatePicker.tsx
"use client";

import { LayoutTemplate } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { ProductSection } from "shared/types";
import { tid } from "shared";

import { useProductTemplates } from "@/features/products/application/hooks/useProductTemplates";

interface TemplatePickerProps {
  onApply: (sections: ProductSection[]) => void;
  hasSections: boolean;
}

export function TemplatePicker({ onApply, hasSections }: TemplatePickerProps) {
  const t = useTranslations("form.inlineEditor");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { data: templates } = useProductTemplates();

  const handleSelect = (sections: ProductSection[]) => {
    if (hasSections) {
      if (!globalThis.confirm(t("templateConfirm"))) return;
    }
    onApply(structuredClone(sections));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border-2 border-background/30 px-2.5 py-1 font-display text-tiny font-bold uppercase tracking-wider text-background/70 transition-colors hover:border-background hover:text-background"
        {...tid("toolbar-use-template")}
      >
        <LayoutTemplate className="size-3.5" />
        {t("useTemplate")}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Popover */}
          <div
            className="absolute left-0 top-full z-50 mt-2 w-72 border-3 border-foreground bg-background nb-shadow-md"
            {...tid("template-popover")}
          >
            {(!templates || templates.length === 0) && (
              <div className="px-4 py-6 text-center font-mono text-xs text-muted-foreground">
                {t("noTemplates")}
              </div>
            )}
            {templates?.map((tpl) => {
              const name =
                locale === "es"
                  ? tpl.name_es || tpl.name_en
                  : tpl.name_en;
              const desc =
                locale === "es"
                  ? tpl.description_es || tpl.description_en
                  : tpl.description_en;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelect(tpl.sections)}
                  className="flex w-full flex-col gap-0.5 border-b border-foreground/10 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/30"
                  {...tid(`template-option-${tpl.id}`)}
                >
                  <span className="font-display text-xs font-bold uppercase tracking-wider">
                    {name}
                  </span>
                  {desc && (
                    <span className="text-[10px] text-muted-foreground">
                      {desc}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    {tpl.sections.length} sections
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update EditorToolbar**

In `apps/studio/src/features/products/presentation/components/inline-editor/EditorToolbar.tsx`:

Add new props and buttons between the refundable dropdown and the spacer.

1. Add imports:

```typescript
import { RotateCcw } from "lucide-react";
import type { ProductSection } from "shared/types";
import { TemplatePicker } from "./TemplatePicker";
```

2. Add props to interface:

```typescript
interface EditorToolbarProps {
  // ... existing props ...
  onApplyTemplate: (sections: ProductSection[]) => void;
  onReset: () => void;
  hasSections: boolean;
}
```

3. Between the refundable `</select>` (line 156) and the spacer `<div className="flex-1" />` (line 159), add:

```tsx
      {/* Template + Reset */}
      <div className="h-6 w-px bg-background/20" />
      <TemplatePicker
        onApply={onApplyTemplate}
        hasSections={hasSections}
      />
      <button
        type="button"
        onClick={() => {
          if (globalThis.confirm(tEditor("resetConfirm"))) {
            onReset();
          }
        }}
        className="flex items-center gap-1.5 rounded-lg border-2 border-background/30 px-2.5 py-1 font-display text-tiny font-bold uppercase tracking-wider text-background/70 transition-colors hover:border-background hover:text-background"
        {...tid("toolbar-reset")}
      >
        <RotateCcw className="size-3.5" />
        {tEditor("resetForm")}
      </button>
```

- [ ] **Step 4: Update InlineEditor**

In `apps/studio/src/features/products/presentation/components/inline-editor/InlineEditor.tsx`:

1. Add `useWatch` for sections to check if form has sections:

```typescript
const sections = useWatch({ control, name: "sections" });
```

2. Pass new props to `EditorToolbar`:

```tsx
<EditorToolbar
  control={control}
  register={register}
  setValue={setValue}
  onSave={handleSubmit(onSubmit)}
  isSaving={isSubmitting}
  isEdit={isEdit}
  onApplyTemplate={(sections) => setValue("sections", sections)}
  onReset={() => {
    const resetValues = { ...PRODUCT_FORM_DEFAULTS, ...defaultValues };
    Object.entries(resetValues).forEach(([key, value]) => {
      setValue(key as keyof ProductFormValues, value);
    });
  }}
  hasSections={(sections?.length ?? 0) > 0}
/>
```

3. Add import for `ProductSection`:

```typescript
import type { ProductSection } from "shared/types";
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `npx tsc --noEmit -p apps/studio/tsconfig.json && pnpm lint`

- [ ] **Step 6: Commit**

```
git add apps/studio/src/features/products/presentation/components/inline-editor/TemplatePicker.tsx apps/studio/src/features/products/presentation/components/inline-editor/EditorToolbar.tsx apps/studio/src/features/products/presentation/components/inline-editor/InlineEditor.tsx apps/studio/src/shared/infrastructure/i18n/
git commit -m "feat(studio): add template picker and reset button in toolbar [GH-14]"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run full quality checks**

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
```

All must pass.

- [ ] **Step 2: Manual smoke test**

If local Supabase is running:

1. Run `supabase db reset` to apply migration
2. Start admin: `pnpm dev:admin` — navigate to `/templates`, verify table loads with 3 seed templates
3. Create a new template, verify it appears in table
4. Start studio: `pnpm dev:studio` — open product editor, click "Use Template", verify sections populate
5. Click "Reset", verify form returns to initial state

- [ ] **Step 3: Submit PR**

```
/submit-pr
```

---

## Dependency Graph

```
Task 1 (migration) ─────────────────────┐
Task 2 (studio shared types) ───────────┤
Task 3 (admin domain) ──┐               │
Task 4 (admin infra) ───┤               │
Task 5 (admin hooks) ───┤               │
Task 6 (admin i18n+route+sidebar) ──┐   │
Task 7 (admin TemplateTable) ───────┤   │
Task 8 (admin TemplateEditor) ──────┤   │
Task 9 (admin TemplatesPage) ───────┘   │
Task 10 (studio queries+hook) ──────────┤
Task 11 (studio picker+toolbar) ────────┘
Task 12 (verification)
```

Tasks 1-2 are independent. Tasks 3-9 are sequential (admin feature). Tasks 10-11 are sequential (studio feature). Admin and studio tracks can run in parallel after Task 1.
