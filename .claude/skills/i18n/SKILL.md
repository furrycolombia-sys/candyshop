---
name: i18n
description: Internationalization setup guidance for Next.js using next-intl.
---

# i18n Skill

> Internationalization (i18n) setup for Next.js applications using `next-intl`.

---

## Overview

This skill provides guidelines for implementing internationalization in Next.js App Router applications using the `next-intl` library.

## Invocation

```
/i18n [action]
```

### Actions

| Action                | Description                                  |
| --------------------- | -------------------------------------------- |
| `setup`               | Initialize i18n in a new project             |
| `add-locale [locale]` | Add a new locale (e.g., `fr`, `de`)          |
| `add-key [key]`       | Add a new translation key across all locales |
| `verify`              | Verify i18n implementation is correct        |

---

## Architecture

### File Structure

```
src/
├── i18n/
│   ├── routing.ts          # Supported locales and default locale
│   ├── request.ts          # Request-level config for messages
│   └── navigation.ts       # Locale-aware navigation APIs
├── messages/
│   ├── en.json             # English translations
│   ├── es.json             # Spanish translations
│   └── [locale].json       # Additional locales
├── middleware.ts           # Root middleware for locale routing
└── app/
    └── [locale]/           # Locale-prefixed routes
        ├── layout.tsx      # Root layout with NextIntlClientProvider
        └── page.tsx        # Pages using useTranslations
```

### Core Concepts

| Concept        | Description                                      |
| -------------- | ------------------------------------------------ |
| **Locale**     | Language/region code (e.g., `en`, `es`, `en-US`) |
| **Messages**   | JSON files containing translated strings         |
| **Middleware** | Routes requests to appropriate locale            |
| **Provider**   | Makes translations available to components       |

---

## Setup Guide

### 1. Install Dependencies

```bash
npm install next-intl
```

### 2. Create Routing Configuration

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
});
```

### 3. Create Request Configuration

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### 4. Create Navigation APIs

```typescript
// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### 5. Create Middleware

```typescript
// src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (Next.js internals)
    // - Static files (images, fonts, etc.)
    "/((?!api|_next|.*\\..*).*)",
  ],
};
```

### 6. Update Next.js Config

```typescript
// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  // Your existing config
};

export default withNextIntl(nextConfig);
```

### 7. Create Messages

```json
// src/messages/en.json
{
  "common": {
    "appName": "My App",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "settings": "Settings"
  },
  "dashboard": {
    "title": "Dashboard",
    "realTimeMetrics": "Real-Time Metrics",
    "throughput": "Throughput",
    "cycleTime": "Cycle Time"
  }
}
```

```json
// src/messages/es.json
{
  "common": {
    "appName": "Mi App",
    "loading": "Cargando...",
    "error": "Ocurrio un error"
  },
  "navigation": {
    "dashboard": "Panel",
    "settings": "Configuracion"
  },
  "dashboard": {
    "title": "Panel de Control",
    "realTimeMetrics": "Metricas en Tiempo Real",
    "throughput": "Rendimiento",
    "cycleTime": "Tiempo de Ciclo"
  }
}
```

### 8. Update Layout

```typescript
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

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

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## Usage

### In Client Components

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function DashboardHeader() {
  const t = useTranslations('dashboard');

  return (
    <h1>{t('title')}</h1>
  );
}
```

### In Server Components

```typescript
import { getTranslations } from 'next-intl/server';

export async function DashboardPage() {
  const t = await getTranslations('dashboard');

  return (
    <h1>{t('title')}</h1>
  );
}
```

### With Variables

```json
// messages/en.json
{
  "dashboard": {
    "loansProcessed": "{count} loans processed"
  }
}
```

```typescript
const t = useTranslations("dashboard");
t("loansProcessed", { count: 247 });
// Output: "247 loans processed"
```

### With Pluralization

```json
{
  "dashboard": {
    "loans": "{count, plural, =0 {No loans} one {# loan} other {# loans}}"
  }
}
```

### Navigation

```typescript
import { Link, useRouter } from '@/i18n/navigation';

// Link component (preserves locale)
<Link href="/dashboard">Dashboard</Link>

// Programmatic navigation
const router = useRouter();
router.push('/settings');
```

### Language Switcher

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <select value={locale} onChange={(e) => switchLocale(e.target.value)}>
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

---

## Best Practices

### 1. Organize Messages by Feature

```json
{
  "common": {
    /* Shared strings */
  },
  "navigation": {
    /* Nav items */
  },
  "dashboard": {
    /* Dashboard-specific */
  },
  "auth": {
    /* Auth-related */
  }
}
```

### 2. Use Namespaces in Components

```typescript
// Feature-specific namespace
const t = useTranslations("dashboard");

// Common namespace for shared text
const tCommon = useTranslations("common");
```

### 3. Keep Keys Semantic

```json
// GOOD
{
  "dashboard": {
    "title": "Dashboard",
    "metrics.throughput": "Throughput",
    "actions.refresh": "Refresh Data"
  }
}

// BAD
{
  "text1": "Dashboard",
  "label_a": "Throughput"
}
```

### 4. Handle Missing Translations

```typescript
// In development, missing keys throw errors
// In production, they return the key itself

// Optionally provide a fallback
t("maybeUndefined", { default: "Fallback text" });
```

### 5. Type-Safe Messages

```typescript
// src/types/i18n.d.ts
import en from "@/messages/en.json";

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
```

---

## Verification Checklist

When implementing i18n, verify:

- [ ] `next-intl` package installed
- [ ] `routing.ts` defines locales and default locale
- [ ] `request.ts` loads messages based on locale
- [ ] `navigation.ts` exports locale-aware navigation
- [ ] `middleware.ts` handles locale routing
- [ ] `next.config.ts` uses `createNextIntlPlugin`
- [ ] Messages files exist for all locales
- [ ] Layout wraps app in `NextIntlClientProvider`
- [ ] Components use `useTranslations` hook
- [ ] Navigation uses locale-aware `Link` component
- [ ] Build passes without i18n errors
- [ ] Locale switching works correctly

---

## Troubleshooting

### "Unable to find messages" Error

Ensure `request.ts` path in `next.config.ts` is correct:

```typescript
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
```

### Middleware Not Working

Check `matcher` pattern excludes static files:

```typescript
matcher: ["/((?!api|_next|.*\\..*).*)"];
```

### Type Errors with Messages

Add type declaration file for message structure.

---

## Related

- [Architecture Rules](../../rules/architecture.md)
- [Component Patterns](../../rules/component-patterns.md)
- [next-intl Documentation](https://next-intl.dev/)
