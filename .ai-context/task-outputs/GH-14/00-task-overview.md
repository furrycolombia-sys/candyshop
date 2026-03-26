# Task Overview: GH-14

## Issue Details

| Field       | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| **Issue**   | #14                                                           |
| **Title**   | feat: Product templates — admin CRUD & studio template picker |
| **Type**    | feat                                                          |
| **Labels**  | enhancement                                                   |
| **Created** | 2026-03-26                                                    |

## Description

Implement a product template system that provides structural scaffolding for sellers creating products in the studio.

- **Admin app** — template CRUD management (list, create, edit, delete)
- **Studio app** — template picker in toolbar + form reset button
- **Database** — `product_templates` table with RLS, audit tracking, seed data

Templates define section structure only (cards, accordion, two-column, gallery) with placeholder titles and guideline descriptions. They don't touch hero data (name, price, images).

## Acceptance Criteria

- [ ] `product_templates` table created with RLS, audit tracking, and seed templates
- [ ] `Section`/`SectionItem` types extracted from studio to `packages/shared`
- [ ] Admin: template list page with table (name, description, section count, active toggle)
- [ ] Admin: template editor (name, description, section builder, sort order, active)
- [ ] Admin: create, edit, delete templates via Supabase server-side client
- [ ] Studio: "Use Template" toolbar button opens popover with active templates
- [ ] Studio: applying template replaces sections (with confirmation if sections exist)
- [ ] Studio: "Reset" toolbar button restores form to initial state
- [ ] i18n: complete en/es translations for admin + studio template keys
- [ ] All code passes lint, typecheck, and build

## Design Spec

See `docs/superpowers/specs/2026-03-25-product-templates-design.md`

## Dependencies

- Audit system (already deployed via GH-11)
- Studio inline editor (already deployed via GH-11)
- `trigger_set_updated_at()` function (already exists)
