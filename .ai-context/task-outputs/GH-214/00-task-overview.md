# Task Overview: GH-214

## Issue Details

| Field         | Value                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| **Issue**     | #214                                                                                   |
| **Title**     | feat(payments): show approver name and timestamp on Received Orders and Assigned Items |
| **Type**      | feat                                                                                   |
| **Labels**    | enhancement                                                                            |
| **Assignee**  | —                                                                                      |
| **Milestone** | —                                                                                      |
| **Created**   | 2026-04-25                                                                             |

## Description

When a seller (or delegate) views **Received Orders** or **Assigned Items** in the payments app, there is no way to know who approved an order or when. This makes it impossible to audit approvals or know which admin handled a payment.

Show **who** approved the order and **when** in both views. Only shown when status is `approved`.

### Example UI

```
✅ Approved by María García · Apr 24, 2026 at 3:47 PM
```

## Acceptance Criteria

- [ ] Approved orders show the approver's display name and timestamp in Received Orders
- [ ] Approved orders show the approver's display name and timestamp in Assigned Items
- [ ] Orders in other statuses (pending, rejected, expired) show nothing in that slot
- [ ] If `approved_by` is null on old rows, the field is gracefully absent (no crash)
- [ ] Unit tests updated for `ReceivedOrderCard` covering the approved/non-approved cases

## Implementation Plan

### 1. DB migration

- Add `approved_by uuid REFERENCES auth.users(id)` to `orders`
- Add `approved_at timestamptz` to `orders`
- Update `update_order_status()` RPC: capture `auth.uid()` and `now()` when new status = `approved`

### 2. Domain types

- Add `approved_by?: string | null` to `ReceivedOrder`
- Add `approved_at?: string | null` to `ReceivedOrder`
- Add `approver_name?: string | null` to `ReceivedOrder`

### 3. Query layer

- Extend `ORDER_SELECT` to include `approved_by`, `approved_at`
- Join `user_profiles(full_name)` on `approved_by` to resolve name
- Pass `approver_name` through `mapRowToOrder`

### 4. UI

- `ReceivedOrderCard`: render approver row when `payment_status === 'approved'` and approver info is present
- Add translation keys: `approvedBy` in `receivedOrders` namespace
- Covers both pages (single component shared by both)
