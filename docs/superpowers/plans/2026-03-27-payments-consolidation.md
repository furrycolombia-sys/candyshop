# Payments Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move seller payment method configuration from studio to payments app and add sidebar navigation.

**Architecture:** Move the `payment-methods` feature folder from studio to payments as-is (Clean Architecture layers preserved). Create a `PaymentsSidebar` component following the admin sidebar pattern. Update the payments layout to use sidebar + content flex layout.

**Tech Stack:** Next.js 16, React 19, next-intl, Tailwind CSS v4, lucide-react, Supabase, Vitest

---

## File Structure

### New files

| File                                                                   | Responsibility                                |
| ---------------------------------------------------------------------- | --------------------------------------------- |
| `apps/payments/src/shared/presentation/components/PaymentsSidebar.tsx` | Sidebar navigation with buyer/seller sections |
| `apps/payments/src/app/[locale]/payment-methods/page.tsx`              | Route wrapper for payment methods page        |

### Moved files (studio → payments)

| From (studio)                                                                       | To (payments)         |
| ----------------------------------------------------------------------------------- | --------------------- |
| `src/features/payment-methods/domain/types.ts`                                      | Same path in payments |
| `src/features/payment-methods/domain/constants.ts`                                  | Same path in payments |
| `src/features/payment-methods/domain/constants.test.ts`                             | Same path in payments |
| `src/features/payment-methods/application/hooks/usePaymentMethods.ts`               | Same path in payments |
| `src/features/payment-methods/application/hooks/usePaymentMethods.test.tsx`         | Same path in payments |
| `src/features/payment-methods/application/hooks/usePaymentMethodMutations.ts`       | Same path in payments |
| `src/features/payment-methods/application/hooks/usePaymentMethodMutations.test.tsx` | Same path in payments |
| `src/features/payment-methods/infrastructure/paymentMethodQueries.ts`               | Same path in payments |
| `src/features/payment-methods/infrastructure/paymentMethodQueries.test.ts`          | Same path in payments |
| `src/features/payment-methods/presentation/components/PaymentMethodEditor.tsx`      | Same path in payments |
| `src/features/payment-methods/presentation/components/PaymentMethodEditor.test.tsx` | Same path in payments |
| `src/features/payment-methods/presentation/components/PaymentMethodTable.tsx`       | Same path in payments |
| `src/features/payment-methods/presentation/components/PaymentMethodTable.test.tsx`  | Same path in payments |
| `src/features/payment-methods/presentation/pages/PaymentMethodsPage.tsx`            | Same path in payments |
| `src/features/payment-methods/presentation/pages/PaymentMethodsPage.test.tsx`       | Same path in payments |
| `src/features/payment-methods/index.ts`                                             | Same path in payments |

### Modified files

| File                                                            | Change                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| `apps/payments/src/app/[locale]/layout.tsx`                     | Add sidebar to layout                  |
| `apps/payments/src/shared/infrastructure/i18n/messages/en.json` | Add sidebar + paymentMethods i18n keys |
| `apps/payments/src/shared/infrastructure/i18n/messages/es.json` | Add sidebar + paymentMethods i18n keys |

### Deleted files

| File                                                      | Reason                  |
| --------------------------------------------------------- | ----------------------- |
| `apps/studio/src/features/payment-methods/` (entire tree) | Moved to payments       |
| `apps/studio/src/app/[locale]/payment-methods/page.tsx`   | Route moved to payments |

### Cleanup modifications

| File                                                          | Change                       |
| ------------------------------------------------------------- | ---------------------------- |
| `apps/studio/src/shared/infrastructure/i18n/messages/en.json` | Remove `paymentMethods` keys |
| `apps/studio/src/shared/infrastructure/i18n/messages/es.json` | Remove `paymentMethods` keys |

---

### Task 1: Add i18n keys to payments app

**Files:**

- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add sidebar and paymentMethods keys to en.json**

Open `apps/payments/src/shared/infrastructure/i18n/messages/en.json`. Add a `"sidebar"` section after the `"nav"` block (after line 29), and a `"paymentMethods"` section after `"receivedOrders"` (after line 125):

```json
"sidebar": {
  "buyer": "Buyer",
  "seller": "Seller",
  "checkout": "Checkout",
  "myOrders": "My Orders",
  "paymentMethods": "Payment Methods",
  "receivedOrders": "Received Orders",
  "collapse": "Collapse sidebar",
  "expand": "Expand sidebar"
},
```

And after the `"receivedOrders"` block:

```json
"paymentMethods": {
  "title": "My Payment Methods",
  "subtitle": "Configure how buyers can pay you",
  "addMethod": "Add Method",
  "editMethod": "Edit Method",
  "selectType": "Payment Type",
  "selectTypePlaceholder": "Choose a payment method...",
  "accountDetails": "Account Details",
  "accountDetailsHint": "Bank account, phone number, or payment details",
  "sellerNote": "Note to Buyers",
  "sellerNoteHint": "Personal message shown to buyers (optional)",
  "active": "Active",
  "noMethods": "No payment methods configured yet",
  "noMethodsHint": "Add a payment method so buyers can pay you",
  "deleteConfirm": "Remove this payment method?",
  "save": "Save",
  "saving": "Saving...",
  "cancel": "Cancel",
  "removeMethod": "Remove method",
  "editPaymentMethod": "Edit payment method"
},
```

- [ ] **Step 2: Add sidebar and paymentMethods keys to es.json**

Same structure in `apps/payments/src/shared/infrastructure/i18n/messages/es.json`:

```json
"sidebar": {
  "buyer": "Comprador",
  "seller": "Vendedor",
  "checkout": "Pagar",
  "myOrders": "Mis Pedidos",
  "paymentMethods": "Metodos de Pago",
  "receivedOrders": "Pedidos Recibidos",
  "collapse": "Colapsar barra lateral",
  "expand": "Expandir barra lateral"
},
```

And:

```json
"paymentMethods": {
  "title": "Mis Metodos de Pago",
  "subtitle": "Configura como los compradores pueden pagarte",
  "addMethod": "Agregar Metodo",
  "editMethod": "Editar Metodo",
  "selectType": "Tipo de Pago",
  "selectTypePlaceholder": "Elige un metodo de pago...",
  "accountDetails": "Datos de la Cuenta",
  "accountDetailsHint": "Cuenta bancaria, numero de telefono o datos de pago",
  "sellerNote": "Nota para Compradores",
  "sellerNoteHint": "Mensaje personal mostrado a los compradores (opcional)",
  "active": "Activo",
  "noMethods": "Sin metodos de pago configurados aun",
  "noMethodsHint": "Agrega un metodo de pago para que los compradores puedan pagarte",
  "deleteConfirm": "Eliminar este metodo de pago?",
  "save": "Guardar",
  "saving": "Guardando...",
  "cancel": "Cancelar",
  "removeMethod": "Eliminar metodo",
  "editPaymentMethod": "Editar metodo de pago"
},
```

- [ ] **Step 3: Commit**

```bash
git add apps/payments/src/shared/infrastructure/i18n/messages/en.json apps/payments/src/shared/infrastructure/i18n/messages/es.json
git commit -m "feat(payments): add sidebar and paymentMethods i18n keys"
```

---

### Task 2: Create PaymentsSidebar component

**Files:**

- Create: `apps/payments/src/shared/presentation/components/PaymentsSidebar.tsx`
- Test: `apps/payments/src/shared/presentation/components/PaymentsSidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/payments/src/shared/presentation/components/PaymentsSidebar.test.tsx`:

```tsx
/* eslint-disable react/display-name */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/checkout",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { PaymentsSidebar } from "./PaymentsSidebar";

describe("PaymentsSidebar", () => {
  it("renders buyer section with checkout and orders links", () => {
    render(<PaymentsSidebar />);
    expect(screen.getByTestId("sidebar-checkout")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-myOrders")).toBeInTheDocument();
  });

  it("renders seller section with payment methods and received orders links", () => {
    render(<PaymentsSidebar />);
    expect(screen.getByTestId("sidebar-paymentMethods")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-receivedOrders")).toBeInTheDocument();
  });

  it("highlights the active route", () => {
    render(<PaymentsSidebar />);
    const checkoutLink = screen.getByTestId("sidebar-checkout");
    expect(checkoutLink).toHaveAttribute("aria-current", "page");
  });

  it("toggles collapsed state when collapse button is clicked", () => {
    render(<PaymentsSidebar />);
    const toggle = screen.getByTestId("sidebar-collapse-toggle");
    fireEvent.click(toggle);
    // After collapse, labels should be hidden — the sidebar element narrows
    expect(screen.getByTestId("payments-sidebar")).toBeInTheDocument();
  });

  it("renders section group labels", () => {
    render(<PaymentsSidebar />);
    expect(screen.getByText("buyer")).toBeInTheDocument();
    expect(screen.getByText("seller")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/payments && npx vitest run src/shared/presentation/components/PaymentsSidebar.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PaymentsSidebar**

Create `apps/payments/src/shared/presentation/components/PaymentsSidebar.tsx`:

```tsx
"use client";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Package,
  ShoppingCart,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { Link } from "@/shared/infrastructure/i18n";

const NAV_SECTIONS = [
  {
    labelKey: "buyer" as const,
    items: [
      { key: "checkout" as const, href: "/checkout", icon: ShoppingCart },
      { key: "myOrders" as const, href: "/orders", icon: Package },
    ],
  },
  {
    labelKey: "seller" as const,
    items: [
      {
        key: "paymentMethods" as const,
        href: "/payment-methods",
        icon: CreditCard,
      },
      {
        key: "receivedOrders" as const,
        href: "/orders/received",
        icon: ClipboardCheck,
      },
    ],
  },
] as const;

export function PaymentsSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const appPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r-3 border-foreground bg-background transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
      {...tid("payments-sidebar")}
    >
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -right-3.5 top-5 z-10 flex size-7 items-center justify-center border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
        aria-label={collapsed ? t("expand") : t("collapse")}
        {...tid("sidebar-collapse-toggle")}
      >
        {collapsed ? (
          <ChevronRight className="size-4" strokeWidth={3} />
        ) : (
          <ChevronLeft className="size-4" strokeWidth={3} />
        )}
      </button>

      {/* Navigation sections */}
      <nav className="flex flex-1 flex-col gap-1 px-2.5 pt-10">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className="mb-2">
            {/* Section label */}
            {!collapsed && (
              <span className="mb-1.5 block px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                {t(section.labelKey)}
              </span>
            )}

            {/* Section items */}
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ key, href, icon }) => {
                const NavIcon = icon;
                const isActive =
                  href === "/" ? appPath === "/" : appPath.startsWith(href);

                return (
                  <Link
                    key={key}
                    href={href}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-2 transition-all duration-150 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    {...tid(`sidebar-${key}`)}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 inset-y-1 w-[3px] rounded-r-full bg-pink" />
                    )}

                    <NavIcon
                      className={`shrink-0 ${collapsed ? "size-5" : "size-4"}`}
                    />

                    {!collapsed && (
                      <span className="font-display text-sm font-bold uppercase tracking-wider">
                        {t(key)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/payments && npx vitest run src/shared/presentation/components/PaymentsSidebar.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/payments/src/shared/presentation/components/PaymentsSidebar.tsx apps/payments/src/shared/presentation/components/PaymentsSidebar.test.tsx
git commit -m "feat(payments): add PaymentsSidebar component with buyer/seller sections"
```

---

### Task 3: Update payments layout to use sidebar

**Files:**

- Modify: `apps/payments/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Update the layout**

Replace the content of `apps/payments/src/app/[locale]/layout.tsx` with:

```tsx
import { AppNavigation } from "@monorepo/app-components";
import { getServerUserEmail } from "api/supabase/server";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import { Providers } from "@/app/[locale]/providers";
import { ProtectedRoute } from "@/features/auth";
import { appUrls } from "@/shared/infrastructure/config";
import { routing } from "@/shared/infrastructure/i18n";
import { ThemeProvider } from "@/shared/infrastructure/providers";
import { PaymentsSidebar } from "@/shared/presentation/components/PaymentsSidebar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  const userEmail = await getServerUserEmail();

  return (
    <ThemeProvider>
      <NextIntlClientProvider messages={messages}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <AppNavigation
              currentApp="payments"
              urls={appUrls}
              locales={routing.locales}
              userEmail={userEmail}
            />
            <ProtectedRoute>
              <div className="flex flex-1 overflow-hidden">
                <PaymentsSidebar />
                <div className="flex flex-1 flex-col overflow-y-auto">
                  {children}
                </div>
              </div>
            </ProtectedRoute>
          </div>
        </Providers>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
```

The only changes from the original are:

1. Import `PaymentsSidebar` (line 16)
2. Add `overflow-hidden` to the flex container (line 62)
3. Add `<PaymentsSidebar />` before children (line 63)
4. Wrap children in `overflow-y-auto` div (line 64)

- [ ] **Step 2: Verify the app still works**

Run: `cd apps/payments && npx vitest run 2>&1 | tail -5`
Expected: All existing tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/payments/src/app/[locale]/layout.tsx
git commit -m "feat(payments): add sidebar to layout"
```

---

### Task 4: Move payment-methods feature from studio to payments

**Files:**

- Move: `apps/studio/src/features/payment-methods/` → `apps/payments/src/features/payment-methods/`
- Create: `apps/payments/src/app/[locale]/payment-methods/page.tsx`
- Modify: `apps/payments/src/features/payment-methods/presentation/pages/PaymentMethodsPage.tsx` (remove back link)

- [ ] **Step 1: Copy the feature folder**

```bash
cp -r apps/studio/src/features/payment-methods apps/payments/src/features/payment-methods
```

- [ ] **Step 2: Remove the "Back to Products" link from PaymentMethodsPage**

Open `apps/payments/src/features/payment-methods/presentation/pages/PaymentMethodsPage.tsx`.

Remove the `ArrowLeft` import from lucide-react (line 3 — remove `ArrowLeft` from the import).

Remove the `Link` import from `next/link` (line 4 — delete the entire import line).

Remove the back link JSX block (lines 116-123 in the original):

```tsx
{
  /* Back link */
}
<Link
  href="/"
  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
  {...tid("payment-methods-back")}
>
  <ArrowLeft className="size-4" />
  {t("backToProducts")}
</Link>;
```

Delete that entire block. The page should start with the header directly.

- [ ] **Step 3: Create the route page**

Create `apps/payments/src/app/[locale]/payment-methods/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";

import { PaymentMethodsPage } from "@/features/payment-methods/presentation/pages/PaymentMethodsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PaymentMethodsPage />;
}
```

- [ ] **Step 4: Update the PaymentMethodsPage test**

Open `apps/payments/src/features/payment-methods/presentation/pages/PaymentMethodsPage.test.tsx`.

Remove the back link test and the "payment-methods-back" references. The test for `payment-methods-back` should be deleted since that element no longer exists.

- [ ] **Step 5: Run payments tests**

Run: `cd apps/payments && npx vitest run 2>&1 | tail -5`
Expected: All tests pass (existing + moved tests)

- [ ] **Step 6: Commit**

```bash
git add apps/payments/src/features/payment-methods/ apps/payments/src/app/[locale]/payment-methods/
git commit -m "feat(payments): move payment-methods feature from studio"
```

---

### Task 5: Clean up studio — remove payment-methods

**Files:**

- Delete: `apps/studio/src/features/payment-methods/` (entire folder)
- Delete: `apps/studio/src/app/[locale]/payment-methods/page.tsx`
- Modify: `apps/studio/src/shared/infrastructure/i18n/messages/en.json` — remove `paymentMethods` keys
- Modify: `apps/studio/src/shared/infrastructure/i18n/messages/es.json` — remove `paymentMethods` keys

- [ ] **Step 1: Delete the feature folder and route**

```bash
rm -rf apps/studio/src/features/payment-methods
rm -rf apps/studio/src/app/\[locale\]/payment-methods
```

- [ ] **Step 2: Remove paymentMethods i18n keys from studio en.json**

Open `apps/studio/src/shared/infrastructure/i18n/messages/en.json` and delete the entire `"paymentMethods": { ... }` block (including the trailing comma on the line before `"form"`).

- [ ] **Step 3: Remove paymentMethods i18n keys from studio es.json**

Same removal in `apps/studio/src/shared/infrastructure/i18n/messages/es.json`.

- [ ] **Step 4: Verify studio still builds and tests pass**

Run: `cd apps/studio && npx vitest run 2>&1 | tail -5`
Expected: All remaining tests pass (no payment-methods tests to run)

- [ ] **Step 5: Verify payments tests still pass**

Run: `cd apps/payments && npx vitest run 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add -A apps/studio/
git commit -m "chore(studio): remove payment-methods feature (moved to payments)"
```

---

### Task 6: Run full quality checks

**Files:** None — verification only

- [ ] **Step 1: Run linter**

```bash
pnpm lint
```

Expected: No new errors (some pre-existing warnings OK)

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: All workspaces pass

- [ ] **Step 4: Verify coverage thresholds**

```bash
cd apps/payments && npx vitest run --coverage 2>&1 | grep "All files"
cd ../studio && npx vitest run --coverage 2>&1 | grep "All files"
```

Expected: Both apps at 85%+ on all metrics

- [ ] **Step 5: Fix any issues found**

If lint/typecheck/test failures are found, fix them before proceeding.

- [ ] **Step 6: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix(payments): resolve quality check issues after consolidation"
```
