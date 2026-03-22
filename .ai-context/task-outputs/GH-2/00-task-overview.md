# Task Overview: GH-2

## Issue Details

| Field         | Value                                           |
| ------------- | ----------------------------------------------- |
| **Issue**     | #2                                              |
| **Title**     | Setup Supabase project and core database schema |
| **Type**      | feat                                            |
| **Labels**    | story, backend, infrastructure                  |
| **Assignee**  | —                                               |
| **Milestone** | MVP — Moonfest 2026 Ticketing (due 2026-06-14)  |
| **Created**   | 2026-03-19                                      |

## Description

As a developer, I need the Supabase project configured with the core database schema so that all other features have a data layer to build on.

**Parent Epic:** #1

**Depends On:** Nothing — this is the foundation.

## Acceptance Criteria

- [ ] Supabase project created and connected
- [ ] Environment variables configured (`.env.example` updated)
- [ ] Database tables created:
  - `events` — event definitions (Moonfest 2026)
  - `products` — generic product catalog (tickets, merch, etc.)
  - `product_entitlements` — what a product includes (bus, meals, entry, etc.)
  - `orders` — user purchases
  - `order_items` — products in an order, with metadata (reservation_code, room_type)
  - `check_ins` — one per entitlement per order item, each with QR code
  - `check_in_audit` — immutable append-only action log
  - `ticket_transfers` — transfer links with status tracking
- [ ] Row-Level Security (RLS) enabled on all tables
- [ ] Basic RLS policies (users can read own orders/tickets)
- [ ] Seed data: Moonfest 2026 event + ticket product with entitlements
- [ ] Supabase client configured in `packages/api` or shared infrastructure

## Technical Notes

- See full schema in `docs/superpowers/specs/2026-03-18-candy-shop-mvp-design.md`
- `check_in_audit` must be INSERT-only (no UPDATE/DELETE even for admins)
- `metadata` on `order_items` is jsonb for event-specific fields
- All tables use uuid primary keys
- Permission tables (`permissions`, `resource_permissions`, `user_permissions`) also needed

## Dependencies

- None — this is the foundation

## Missing Information

- [ ] Supabase project URL and keys (user needs to create the project on supabase.com)
