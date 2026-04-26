# Analysis: GH-214

## Branch Context

| Field         | Value                                          |
| ------------- | ---------------------------------------------- |
| **Branch**    | `feat/GH-214_Show-Approver-Name-And-Timestamp` |
| **Type**      | `feat`                                         |
| **Source**    | `develop`                                      |
| **PR Target** | `develop`                                      |

## Relevant Files

| File                                                                                            | Purpose                          | Action Needed                                |
| ----------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `supabase/migrations/20260425000000_orders_approved_by.sql`                                     | DB columns + RPC update          | **Create**                                   |
| `apps/payments/src/features/received-orders/domain/types.ts`                                    | `ReceivedOrder` interface        | **Modify** — add 3 fields                    |
| `apps/payments/src/features/received-orders/infrastructure/receivedOrderQueries.ts`             | `ORDER_SELECT` + `mapRowToOrder` | **Modify** — extend query + mapping          |
| `apps/payments/src/features/received-orders/presentation/components/ReceivedOrderCard.tsx`      | UI card (shared by both pages)   | **Modify** — add approver row                |
| `apps/payments/src/shared/infrastructure/i18n/messages/en.json`                                 | English translations             | **Modify** — add `approvedBy` key            |
| `apps/payments/src/shared/infrastructure/i18n/messages/es.json`                                 | Spanish translations             | **Modify** — add `approvedBy` key            |
| `apps/payments/src/features/received-orders/presentation/components/ReceivedOrderCard.test.tsx` | Component unit tests             | **Modify** — add approved/non-approved cases |

## Existing Patterns

### Pattern 1: Buyer display name resolution

- **Location**: `receivedOrderQueries.ts` → `fetchUserDisplayNames`
- **Description**: UUIDs are resolved to display names via a shared helper that queries `user_profiles(full_name)` and returns a `Record<string, string>` map.
- **Relevance**: `approved_by` is also a UUID; we follow the same pattern to resolve the approver's name. However, since there's only one approver per order (not a batch), we can join directly in the Supabase select instead of a separate call.

### Pattern 2: ORDER_SELECT constant

- **Location**: `receivedOrderQueries.ts:15-37`
- **Description**: A template literal string listing all columns fetched from `orders`. Used by both `fetchReceivedOrders` and `fetchAssignedOrders` (via `fetchDelegatedOrderRows`).
- **Relevance**: Adding `approved_by`, `approved_at` here covers both fetch paths automatically.

### Pattern 3: Nested select join in Supabase

- **Location**: `ORDER_SELECT` already uses `order_items (...)` nested select
- **Description**: Supabase PostgREST supports `related_table(col1, col2)` syntax inside select strings to join related tables in one query.
- **Relevance**: We can add `approver:user_profiles!approved_by(full_name)` to `ORDER_SELECT` to get the approver's display name in a single query, avoiding a separate `fetchUserDisplayNames` call.

### Pattern 4: mapRowToOrder

- **Location**: `receivedOrderQueries.ts:39-68`
- **Description**: Maps a raw DB row to the `ReceivedOrder` domain type. All field projections happen here.
- **Relevance**: `approver_name` will be extracted from the nested `approver` relation in the row.

### Pattern 5: Conditional UI sections in ReceivedOrderCard

- **Location**: `ReceivedOrderCard.tsx:182-188` (seller note section)
- **Description**: Sections are conditionally rendered using `{condition && (<div>...</div>)}`.
- **Relevance**: Same pattern for the approver row — render only when `payment_status === 'approved'` and `approver_name` is set.

### Pattern 6: update_order_status RPC

- **Location**: `supabase/migrations/20260422200000_fix_function_search_paths.sql`
- **Description**: Security-definer PL/pgSQL function. The `approved` branch currently only validates status — it doesn't set any extra columns. The final `UPDATE` at the bottom sets `payment_status` and `seller_note`.
- **Relevance**: Need to add `approved_by = auth.uid(), approved_at = now()` to the final UPDATE when `p_new_status = 'approved'`.

## Requirements Analysis

| Requirement            | Existing Support                            | Gap / Action                              |
| ---------------------- | ------------------------------------------- | ----------------------------------------- |
| Store who approved     | ❌ No `approved_by` column                  | Add column to `orders` + RPC update       |
| Store when approved    | ❌ No `approved_at` column                  | Add column to `orders` + RPC update       |
| Show approver name     | ❌ Not in query or UI                       | Supabase join + domain field + UI row     |
| Graceful null handling | ✅ Existing optional fields use `?? null`   | Use `?? null` on new fields in mapper     |
| Both pages covered     | ✅ Both use `ReceivedOrderCard`             | Single UI change                          |
| i18n                   | ✅ Uses `useTranslations("receivedOrders")` | Add `approvedBy` key to both locale files |

## Technical Considerations

### Supabase join syntax for approved_by

Use PostgREST foreign-table alias syntax:

```sql
-- In ORDER_SELECT:
approved_by,
approved_at,
approver:user_profiles!approved_by(full_name)
```

The `approver` alias will produce `row.approver?.full_name` in the TypeScript response.

### RPC update: approved_by captured via auth.uid()

The function is `SECURITY DEFINER`, so `auth.uid()` correctly returns the **calling user's** ID (the seller/delegate who clicked Approve), not the row owner.

### Old rows: approved_by IS NULL

Columns added as nullable, no default. Old rows will have `NULL` → the `approver_name` field will be absent from `ReceivedOrder` → the UI section won't render. Safe.

### user_profiles table name

Confirmed via existing `fetchUserDisplayNames` helper which queries `user_profiles`. The join `user_profiles!approved_by` is valid since `approved_by` references `auth.users(id)` and `user_profiles.id` is the FK to `auth.users`.

Wait — `user_profiles` PK is `id` which references `auth.users(id)`. The join in PostgREST for a column pointing to `auth.users` may need to go through `user_profiles` indirectly. Let me reconsider.

**PostgREST join path**: `orders.approved_by → auth.users.id` (FK). Then `user_profiles.id → auth.users.id`. PostgREST can follow multi-hop paths but the cleaner approach is:

- Keep `approved_by` as a `uuid` column with no FK constraint (avoids auth schema issues in migrations), OR
- Use a Supabase view/function to resolve name

**Actually simpler**: Follow the same pattern as `fetchUserDisplayNames` — after mapping rows, do a single `fetchUserDisplayNames(supabase, approverIds, '')` batch call for all unique approver IDs. This is exactly how buyer names are resolved today.

**Chosen approach**: In `mapRowToOrder`, accept an `approverMap: Record<string, string>` param and look up `row.approved_by`. Build the map in `fetchReceivedOrders` and `fetchAssignedOrders` alongside the existing buyer name map.

## Implementation Summary

### Files to Create

- `supabase/migrations/20260425000000_orders_approved_by.sql`

### Files to Modify

- `apps/payments/src/features/received-orders/domain/types.ts` — add `approved_by?`, `approved_at?`, `approver_name?`
- `apps/payments/src/features/received-orders/infrastructure/receivedOrderQueries.ts` — extend `ORDER_SELECT`, update `mapRowToOrder` signature, build `approverMap` in both fetch functions
- `apps/payments/src/features/received-orders/presentation/components/ReceivedOrderCard.tsx` — add approver row after seller note section
- `apps/payments/src/shared/infrastructure/i18n/messages/en.json` — add `approvedBy` key
- `apps/payments/src/shared/infrastructure/i18n/messages/es.json` — add `approvedBy` key
- `apps/payments/src/features/received-orders/presentation/components/ReceivedOrderCard.test.tsx` — add test cases

### Key Insights

- `ORDER_SELECT` is used by both received and delegated order queries — adding fields there covers both pages automatically.
- `fetchUserDisplayNames` accepts an array of UUIDs and returns a name map — reuse it for approvers.
- The UI change is contained to `ReceivedOrderCard`, which is shared — no changes needed in the page-level components.
- The RPC needs only a small addition: `approved_by = auth.uid(), approved_at = now()` inside the `when 'approved'` branch.
- Migration must use `ALTER TABLE` + `CREATE OR REPLACE FUNCTION` so it's additive (no destructive changes).
- Latest migration timestamp: `20260424110000` → use `20260425000000`.

## Questions / Blockers

- None. Implementation path is fully clear.
