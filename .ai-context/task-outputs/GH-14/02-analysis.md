# Analysis: GH-14

## Task Summary

Implement a product template system: admin CRUD for templates + studio toolbar picker/reset.

## Key Discovery

`ProductSection`, `ProductSectionItem`, `SectionType`, and `SECTION_TYPES` **already exist in `packages/shared/src/types/sections.ts`** — but studio still uses a local duplicate in `validationSchema.ts`. Step 1 is to wire studio to use the shared types.

## Relevant Files

### Database

| File                                                       | Purpose       | Action     |
| ---------------------------------------------------------- | ------------- | ---------- |
| `supabase/migrations/20260325700000_product_templates.sql` | New migration | **Create** |

### Shared Package

| File                                    | Purpose                                   | Action              |
| --------------------------------------- | ----------------------------------------- | ------------------- |
| `packages/shared/src/types/sections.ts` | Section types (already exists!)           | **Use as-is**       |
| `packages/shared/src/types/index.ts`    | Exports ProductSection, SectionType, etc. | **Already exports** |

### Admin App — New Feature

| File                                                                           | Purpose                   | Action     |
| ------------------------------------------------------------------------------ | ------------------------- | ---------- |
| `apps/admin/src/features/templates/domain/types.ts`                            | ProductTemplate interface | **Create** |
| `apps/admin/src/features/templates/domain/constants.ts`                        | Page size, query keys     | **Create** |
| `apps/admin/src/features/templates/domain/searchParams.ts`                     | nuqs URL params           | **Create** |
| `apps/admin/src/features/templates/infrastructure/templateQueries.ts`          | Supabase CRUD             | **Create** |
| `apps/admin/src/features/templates/application/hooks/useTemplates.ts`          | Fetch hook                | **Create** |
| `apps/admin/src/features/templates/application/hooks/useTemplateMutations.ts`  | CUD mutations             | **Create** |
| `apps/admin/src/features/templates/presentation/pages/TemplatesPage.tsx`       | Main page                 | **Create** |
| `apps/admin/src/features/templates/presentation/components/TemplateTable.tsx`  | List table                | **Create** |
| `apps/admin/src/features/templates/presentation/components/TemplateEditor.tsx` | Section editor            | **Create** |
| `apps/admin/src/features/templates/index.ts`                                   | Public exports            | **Create** |
| `apps/admin/src/app/[locale]/templates/page.tsx`                               | Route                     | **Create** |
| `apps/admin/src/shared/presentation/components/AdminSidebar.tsx`               | Add Templates nav item    | **Modify** |
| `apps/admin/src/shared/infrastructure/i18n/messages/en.json`                   | Template i18n keys        | **Modify** |
| `apps/admin/src/shared/infrastructure/i18n/messages/es.json`                   | Template i18n keys        | **Modify** |

### Studio App — Template Picker + Reset

| File                                                                                         | Purpose                                              | Action     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| `apps/studio/src/features/products/domain/validationSchema.ts`                               | Import Section types from shared (remove local dups) | **Modify** |
| `apps/studio/src/features/products/infrastructure/templateQueries.ts`                        | Fetch active templates                               | **Create** |
| `apps/studio/src/features/products/application/hooks/useProductTemplates.ts`                 | Read-only hook                                       | **Create** |
| `apps/studio/src/features/products/presentation/components/inline-editor/EditorToolbar.tsx`  | Add template + reset buttons                         | **Modify** |
| `apps/studio/src/features/products/presentation/components/inline-editor/TemplatePicker.tsx` | Popover with template list                           | **Create** |
| `apps/studio/src/features/products/presentation/components/inline-editor/InlineEditor.tsx`   | Pass reset/template handlers                         | **Modify** |
| `apps/studio/src/shared/infrastructure/i18n/messages/en.json`                                | Template picker i18n                                 | **Modify** |
| `apps/studio/src/shared/infrastructure/i18n/messages/es.json`                                | Template picker i18n                                 | **Modify** |

## Existing Patterns

### Admin Page Pattern (from Audit Log)

- Route: thin `page.tsx` importing feature page component
- Page: `useTranslations` + `useQueryStates(searchParams)` + filter/table components
- Infrastructure: Supabase client passed to query functions, authenticated via `supabase.auth.getSession()`
- Hooks: `useQuery`/`useMutation` with memoized Supabase client

### Studio Form Pattern

- `useForm<ProductFormValues>` with `zodResolver`
- `useFieldArray` for sections array
- `setValue("sections", ...)` to programmatically set sections
- `form.reset(initialValues)` to reset form
- `PRODUCT_FORM_DEFAULTS` for empty form state

### Admin Sidebar Pattern

```typescript
const NAV_SECTIONS = [
  {
    labelKey: "operations",
    items: [{ key: "dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    labelKey: "monitoring",
    items: [{ key: "auditLog", href: "/audit", icon: FileText }],
  },
];
```

Add "Templates" to the "operations" section between dashboard and monitoring.

## Technical Considerations

1. **No service role client yet** — admin writes need `SUPABASE_SERVICE_ROLE_KEY`. For now, use RLS policies that allow authenticated INSERT/UPDATE/DELETE (admin-only enforcement can come later with roles).
2. **Studio validation schema duplication** — `validationSchema.ts` defines its own `SECTION_TYPES`, `Section`, `SectionItem` locally. These should import from `shared/types` instead. The Zod schema stays in studio (it has validation rules).
3. **Template editor** — can reuse section UI patterns from studio's `SectionCard` but needs a simpler version (no product form context, just template sections).
4. **Template sections JSONB** — exact same shape as product sections. The `ProductSection` type from shared works directly.
5. **`structuredClone`** needed when applying template to form to avoid mutating query cache.

## Questions/Blockers

- None — spec is comprehensive and all dependencies exist.
