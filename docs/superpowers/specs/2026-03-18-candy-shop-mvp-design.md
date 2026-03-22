# Candy Shop MVP — Moonfest 2026 Ticketing

**Date:** 2026-03-18
**Status:** Draft
**Event:** Moonfest 2026 (July 10-13, Paipa, Boyaca, Colombia)

---

## Overview

Candy Shop is Furry Colombia's e-commerce platform. The MVP focuses on ticket sales for Moonfest 2026, a four-day furry convention. The platform replaces the originally planned Conspace integration with a custom-built ticketing system.

### Business Model

Hybrid — direct sales (Moonfest tickets) now, marketplace with commission for other creators later. No subscriptions.

### Audience

Furry community in Colombia and LATAM, with some international attendees. Bilingual (Spanish and English).

---

## Tech Stack

| Layer    | Technology                      | Purpose                                         |
| -------- | ------------------------------- | ----------------------------------------------- |
| Frontend | Next.js 16 (existing monorepo)  | Store + Admin apps                              |
| Auth     | Supabase Auth                   | Google, Facebook, Bluesky social login          |
| Database | Supabase (Postgres)             | Data persistence, RLS, realtime                 |
| Payments | Stripe Checkout (redirect mode) | Payment processing, multi-currency              |
| QR Codes | Generated per entitlement       | Check-in verification                           |
| Email    | Resend                          | Transactional emails (confirmations, transfers) |
| Hosting  | TBD                             | Existing infrastructure                         |

### Apps Involved

- **store** — ticket purchase flow, attendee-facing pages
- **admin** — staff check-in, permission management, dashboard
- **auth** — social login (Google, Facebook, Bluesky)

---

## User Flows

### Attendee: Purchase Ticket

1. Visits Candy Shop homepage (`/[locale]`) — Furry Colombia branded store
2. Finds Moonfest event card → clicks into event page (`/[locale]/events/moonfest`)
3. Sees event details, pricing ($300,000 COP), process explanation, marketing content
4. Clicks "Buy Ticket" → signs in with Google / Facebook / Bluesky
5. Fills attendee form:
   - Name (pre-filled from social profile)
   - Email (pre-filled from social profile)
   - Phone (optional)
   - Hotel reservation code (self-reported, verified manually later)
   - Room type (solo / duo / trio / quad)
6. Redirected to Stripe Checkout → pays $300,000 COP (international users see local currency equivalent)
7. Returns to confirmation page (`/[locale]/events/moonfest/confirmation`):
   - Master QR code displayed
   - Individual QR codes per entitlement
   - "Download QR" button
   - Confirmation email sent via Resend (all QR codes included)

### Attendee: Transfer Ticket

1. Goes to "My Tickets" page
2. Clicks "Transfer" on a ticket
3. System generates a unique transfer link (also available as QR for physical gifting)
4. Attendee shares link via WhatsApp / Telegram / in-person QR
5. Recipient clicks link → signs in → ticket transfers to them
6. All QR codes regenerate (old ones invalidated)
7. Audit log records the transfer
8. Original buyer remains in order history

### Staff: Check-in Attendee

1. Signs in to admin app with social login
2. If user has `check-in` permission for Moonfest → sees check-in page (`/[locale]/events/moonfest/check-in`)
3. Scans attendee's master QR → sees full entitlement list:
   - Bus departure: [ ] / [x]
   - Event entry Day 1: [ ] / [x]
   - Breakfast Day 1: [ ] / [x]
   - etc.
4. Taps to check in each entitlement
5. Each action logged to immutable audit trail

### Third Party: Verify Entitlement

1. Attendee shows individual entitlement QR (e.g. meal voucher)
2. Third party scans → simple valid/invalid page (no login required to view)
3. Marking as used requires appropriate permission

### Admin: Manage Permissions

1. Signs in to admin app
2. Searches for user by email
3. Grants or revokes permissions scoped to specific resources
4. Can set temporary bans with expiry dates

---

## Data Model

### users (Supabase Auth)

Managed by Supabase. Fields: id, email, display_name, avatar_url, provider.

### permissions

Defined permission types as first-class entities.

| Column         | Type      | Notes                                                                          |
| -------------- | --------- | ------------------------------------------------------------------------------ |
| id             | uuid      | PK                                                                             |
| key            | text      | Unique. e.g. "check-in", "uncheck", "purchase", "view", "manage", "audit-view" |
| name_en        | text      | Display name in English                                                        |
| name_es        | text      | Display name in Spanish                                                        |
| description_en | text      |                                                                                |
| description_es | text      |                                                                                |
| created_at     | timestamp |                                                                                |

### resource_permissions

Scopes a permission to a specific resource type and instance.

| Column        | Type      | Notes                         |
| ------------- | --------- | ----------------------------- |
| id            | uuid      | PK                            |
| permission_id | uuid      | FK → permissions              |
| resource_type | text      | "event", "store", "admin"     |
| resource_id   | uuid      | Nullable. null = global scope |
| created_at    | timestamp |                               |

### user_permissions

Links users to resource permissions with grant/deny mode.

| Column                 | Type      | Notes                         |
| ---------------------- | --------- | ----------------------------- |
| id                     | uuid      | PK                            |
| user_id                | uuid      | FK → users                    |
| resource_permission_id | uuid      | FK → resource_permissions     |
| mode                   | text      | "grant" or "deny"             |
| reason                 | text      | Nullable. Required for "deny" |
| granted_by             | uuid      | FK → users                    |
| expires_at             | timestamp | Nullable. For temporary bans  |
| created_at             | timestamp |                               |

**Resolution logic:** deny always wins over grant. Then check for explicit grant. Default: public pages visible, purchases require auth, admin requires explicit grant.

### events

| Column         | Type      | Notes                      |
| -------------- | --------- | -------------------------- |
| id             | uuid      | PK                         |
| slug           | text      | e.g. "moonfest-2026"       |
| name_en        | text      |                            |
| name_es        | text      |                            |
| description_en | text      |                            |
| description_es | text      |                            |
| location       | text      |                            |
| starts_at      | timestamp |                            |
| ends_at        | timestamp |                            |
| max_capacity   | integer   | Nullable. null = unlimited |
| is_active      | boolean   |                            |
| created_at     | timestamp |                            |

### products

| Column         | Type      | Notes                                             |
| -------------- | --------- | ------------------------------------------------- |
| id             | uuid      | PK                                                |
| event_id       | uuid      | Nullable FK → events. null for non-event products |
| slug           | text      |                                                   |
| name_en        | text      |                                                   |
| name_es        | text      |                                                   |
| description_en | text      |                                                   |
| description_es | text      |                                                   |
| type           | text      | "ticket", "merch", "digital", "service"           |
| price_cop      | integer   |                                                   |
| price_usd      | integer   | Display only                                      |
| max_quantity   | integer   | Nullable                                          |
| is_active      | boolean   |                                                   |
| created_at     | timestamp |                                                   |

### product_entitlements

Defines what a product includes (what check-in items are generated on purchase).

| Column     | Type      | Notes                                          |
| ---------- | --------- | ---------------------------------------------- |
| id         | uuid      | PK                                             |
| product_id | uuid      | FK → products                                  |
| name_en    | text      | e.g. "Bus departure Bogota → Paipa"            |
| name_es    | text      |                                                |
| type       | text      | "transport", "entry", "meal", "merch", "party" |
| sort_order | integer   | Display order                                  |
| created_at | timestamp |                                                |

### orders

| Column            | Type      | Notes             |
| ----------------- | --------- | ----------------- |
| id                | uuid      | PK                |
| user_id           | uuid      | FK → users        |
| stripe_session_id | text      |                   |
| payment_status    | text      | "pending", "paid" |
| total_cop         | integer   |                   |
| created_at        | timestamp |                   |

No refunds — payment_status never becomes "refunded".

### order_items

| Column         | Type      | Notes                                             |
| -------------- | --------- | ------------------------------------------------- |
| id             | uuid      | PK                                                |
| order_id       | uuid      | FK → orders                                       |
| product_id     | uuid      | FK → products                                     |
| quantity       | integer   |                                                   |
| unit_price_cop | integer   |                                                   |
| metadata       | jsonb     | Event-specific: reservation_code, room_type, etc. |
| created_at     | timestamp |                                                   |

### check_ins

One row per order_item per entitlement. Each has its own QR code.

| Column         | Type      | Notes                     |
| -------------- | --------- | ------------------------- |
| id             | uuid      | PK                        |
| order_item_id  | uuid      | FK → order_items          |
| entitlement_id | uuid      | FK → product_entitlements |
| qr_code        | text      | Unique token              |
| checked_in     | boolean   | Default false             |
| checked_in_at  | timestamp | Nullable                  |
| checked_in_by  | uuid      | Nullable FK → users       |
| created_at     | timestamp |                           |

A master QR per order_item resolves to all check_ins for that item.

### check_in_audit

Immutable append-only log. Never updated or deleted.

| Column       | Type      | Notes                             |
| ------------ | --------- | --------------------------------- |
| id           | uuid      | PK                                |
| check_in_id  | uuid      | FK → check_ins                    |
| action       | text      | "check-in", "uncheck", "transfer" |
| performed_by | uuid      | FK → users                        |
| reason       | text      | Nullable. Required for "uncheck"  |
| ip_address   | text      |                                   |
| user_agent   | text      |                                   |
| created_at   | timestamp |                                   |

### ticket_transfers

| Column         | Type      | Notes                                   |
| -------------- | --------- | --------------------------------------- |
| id             | uuid      | PK                                      |
| order_item_id  | uuid      | FK → order_items                        |
| transfer_token | text      | Unique. Used in the shareable link      |
| from_user_id   | uuid      | FK → users                              |
| to_user_id     | uuid      | Nullable FK → users. Null until claimed |
| status         | text      | "pending", "claimed", "expired"         |
| claimed_at     | timestamp | Nullable                                |
| expires_at     | timestamp |                                         |
| created_at     | timestamp |                                         |

---

## Permission System

### Permission Keys (seed data)

| Key        | Description                                      |
| ---------- | ------------------------------------------------ |
| view       | Can see the resource                             |
| purchase   | Can buy products from the resource               |
| check-in   | Can mark entitlements as used                    |
| uncheck    | Can reverse a check-in (requires reason)         |
| audit-view | Can view the audit log                           |
| manage     | Full access (dashboard, export, user management) |

### Example Configurations

| User          | Permission | Resource          | Mode  | Notes                           |
| ------------- | ---------- | ----------------- | ----- | ------------------------------- |
| volunteer@... | check-in   | event:moonfest    | grant | Can scan and check in           |
| teamlead@...  | check-in   | event:moonfest    | grant |                                 |
| teamlead@...  | uncheck    | event:moonfest    | grant | Can reverse mistakes            |
| heiner@...    | manage     | event:moonfest    | grant | Full access                     |
| banned@...    | purchase   | event:moonfest    | deny  | "Chargebacks on previous event" |
| tempban@...   | purchase   | store:\* (global) | deny  | Expires 2026-06-01              |

### UI Integration

```typescript
const { can } = usePermissions();

if (can("view", { type: "event", id: moonfestId }))      // show event page
if (can("purchase", { type: "event", id: moonfestId }))   // show buy button
if (can("check-in", { type: "event", id: moonfestId }))   // show check-in page
if (can("uncheck", { type: "event", id: moonfestId }))    // show uncheck button
if (can("audit-view", { type: "event", id: moonfestId })) // show audit log
```

---

## Check-in Safety

### Rules

- `check-in` and `uncheck` are separate permissions — never bundled
- Unchecking requires a mandatory reason (free text)
- All actions are logged to `check_in_audit` (immutable, append-only)
- If an entitlement was previously unchecked, staff sees a warning with who unchecked it, when, and why
- Audit log is viewable by users with `audit-view` permission

### Audit Trail Example

```
Bus Departure — checked in by @volunteer at 8:02 AM
Bus Departure — unchecked by @teamlead at 8:05 AM (reason: "Wrong person scanned")
Bus Departure — checked in by @volunteer at 8:06 AM
```

---

## QR Code System

- **Master QR** per order item — encodes URL: `candyshop.furrycolombia.com/verify/{order_item_qr}`
  - Resolves to full entitlement checklist for staff
- **Individual QR** per entitlement — encodes URL: `candyshop.furrycolombia.com/verify/{check_in_qr}`
  - Resolves to single entitlement for third-party verification
- **Transfer QR** — encodes the transfer link for physical gifting
- On ticket transfer, all QR codes regenerate (old ones return "invalid")

---

## Stripe Integration

- **Mode:** Stripe Checkout (redirect)
- **Currency:** Price set in COP, Stripe auto-converts for international buyers
- **Webhook:** `POST /api/stripe/webhook`
  - On `checkout.session.completed`: create order, order items, check-in rows, generate QR codes, send confirmation email
- **Test mode:** Full dev/test flow with Stripe test cards
- **No refunds** built into the platform

---

## Email (Resend)

### Transactional Emails

| Trigger                        | Email                                                            |
| ------------------------------ | ---------------------------------------------------------------- |
| Purchase confirmed             | Confirmation with master QR + all individual QRs + event details |
| Ticket transferred (sender)    | "Your ticket has been transferred to [recipient]"                |
| Ticket transferred (recipient) | "You received a ticket!" with new QR codes                       |
| Transfer link created          | Link/QR to share                                                 |

---

## Moonfest Event Page Content

**URL:** `/[locale]/events/moonfest`

- Event banner (Moonfest branding, dates: July 10-13 2026, Paipa)
- What's included (merch package, all-access entry, parties, panels, artist market, round-trip bus)
- Price: $300,000 COP (~$80 USD)
- Process explanation (Step 1: reserve hotel externally, Step 2: buy ticket here)
- Link to moonfest.furrycolombia.com for full event info
- "Buy Ticket" CTA

---

## Limitations (MVP)

- **No offline check-in** — requires internet connection
- **No refunds** — all sales final
- **Reservation code not auto-validated** — self-reported, manually verified
- **One ticket per purchase** — cannot buy for others (use transfer instead)
- **No marketplace** — creators/vendors come post-MVP

---

## Future (Post-MVP)

- Marketplace for creators (physical products, digital art, commissions, services)
- Commission system for creator sales
- Coupons and promo codes
- Multiple events
- Storybook design system showcase
