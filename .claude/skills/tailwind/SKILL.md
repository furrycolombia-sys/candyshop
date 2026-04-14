---
name: tailwind
description: Tailwind CSS configuration and best practices for this Next.js project.
---

# Tailwind CSS Skill

> Utility-first CSS framework configuration and best practices for Next.js projects with shadcn/ui.

---

## Overview

This project uses **Tailwind CSS v4** with the CSS-first configuration approach. Unlike Tailwind v3, all configuration lives in the CSS file using the `@theme` directive - no `tailwind.config.js` needed.

---

## Setup (Already Configured)

### Current Configuration

| File                  | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `postcss.config.mjs`  | PostCSS with `@tailwindcss/postcss` plugin         |
| `src/app/globals.css` | Theme configuration with `@theme inline` directive |
| `components.json`     | shadcn/ui configuration pointing to globals.css    |

### Dependencies

```json
{
  "devDependencies": {
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "tw-animate-css": "^1.4.0"
  },
  "dependencies": {
    "tailwind-merge": "^3.4.0",
    "clsx": "^2.1.1",
    "class-variance-authority": "^0.7.1"
  }
}
```

---

## CSS-First Configuration (Tailwind v4)

### Theme Structure

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Map CSS variables to Tailwind utilities */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... */
}

:root {
  /* Define actual values using OKLCH */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  /* ... */
}

.dark {
  /* Dark mode overrides */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

### Key Concepts

| Concept                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `@import "tailwindcss"` | Imports all Tailwind layers (v4 simplified import)    |
| `@theme inline`         | Defines theme variables that generate utility classes |
| `@custom-variant`       | Defines custom variants like dark mode                |
| OKLCH Colors            | Modern color format with better perceptual uniformity |

---

## Best Practices

### 1. Use Semantic Color Variables

```css
/* DO: Use semantic names */
--color-primary: var(--primary);
--color-destructive: var(--destructive);
--color-muted: var(--muted);

/* DON'T: Use arbitrary color values directly */
--color-my-blue: #3b82f6;
```

### 2. Leverage CSS Variables Directly

```css
/* v4 Best Practice: Use CSS variables instead of theme() */
.my-class {
  background-color: var(--color-primary);
  color: var(--color-foreground);
}

/* Avoid: theme() function (deprecated pattern) */
.my-class {
  background-color: theme("colors.primary");
}
```

### 3. Use Modern Utility Classes

```tsx
// DO: Use size-* for equal width/height
<div className="size-4" />

// DON'T: Use separate w-* h-*
<div className="w-4 h-4" />
```

### 4. Responsive Design Pattern

```tsx
// Mobile-first responsive design
<div
  className="
  flex flex-col          {/* Mobile: stack */}
  md:flex-row            {/* Tablet+: row */}
  lg:gap-8               {/* Desktop: larger gap */}
"
/>
```

### 5. Component Composition with cn()

```tsx
import { cn } from "@/shared/application/utils";

interface ButtonProps {
  variant?: "default" | "destructive";
  className?: string;
}

function Button({ variant = "default", className }: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        "rounded-md px-4 py-2 font-medium",
        // Variant styles
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "destructive" && "bg-destructive text-white",
        // Allow overrides
        className,
      )}
    />
  );
}
```

---

## Utility Reference

### Spacing Scale

| Class | Value         |
| ----- | ------------- |
| `p-0` | 0px           |
| `p-1` | 0.25rem (4px) |
| `p-2` | 0.5rem (8px)  |
| `p-4` | 1rem (16px)   |
| `p-6` | 1.5rem (24px) |
| `p-8` | 2rem (32px)   |

### Typography

| Class           | Description     |
| --------------- | --------------- |
| `text-xs`       | 0.75rem (12px)  |
| `text-sm`       | 0.875rem (14px) |
| `text-base`     | 1rem (16px)     |
| `text-lg`       | 1.125rem (18px) |
| `text-xl`       | 1.25rem (20px)  |
| `font-medium`   | 500 weight      |
| `font-semibold` | 600 weight      |
| `font-bold`     | 700 weight      |

### Layout

| Class             | Description         |
| ----------------- | ------------------- |
| `flex`            | Flexbox container   |
| `grid`            | Grid container      |
| `gap-*`           | Gap between items   |
| `items-center`    | Align items center  |
| `justify-between` | Space between items |

### Colors (shadcn/ui Theme)

| Class                   | Usage                       |
| ----------------------- | --------------------------- |
| `bg-background`         | Page background             |
| `bg-card`               | Card background             |
| `bg-muted`              | Muted/secondary background  |
| `bg-primary`            | Primary action color (blue) |
| `bg-secondary`          | Secondary background        |
| `text-foreground`       | Primary text                |
| `text-muted-foreground` | Secondary text              |
| `border-border`         | Default border color        |

### Semantic Status Colors

| Class                                 | Usage                           |
| ------------------------------------- | ------------------------------- |
| `bg-success` / `text-success`         | Positive states, healthy status |
| `bg-warning` / `text-warning`         | Attention needed, caution       |
| `bg-info` / `text-info`               | Informational states            |
| `bg-destructive` / `text-destructive` | Error, critical, danger         |

### Chart Colors

| Variable    | Color           | Usage             |
| ----------- | --------------- | ----------------- |
| `--chart-1` | Primary blue    | Main data series  |
| `--chart-2` | Success green   | Positive metrics  |
| `--chart-3` | Purple          | Secondary data    |
| `--chart-4` | Warning amber   | Attention metrics |
| `--chart-5` | Destructive red | Critical data     |

---

## Dark Mode

### Configuration

Dark mode uses the `.dark` class on a parent element:

```css
@custom-variant dark (&:is(.dark *));

.dark {
  --background: oklch(0.145 0 0);
  /* ... dark theme values */
}
```

### Usage with next-themes

```tsx
// providers.tsx
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
```

### Toggle Implementation

```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-accent"
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="h-5 w-5 hidden dark:block" />
    </button>
  );
}
```

---

## Animation (tw-animate-css)

### Available Animations

```tsx
// Fade animations
<div className="animate-in fade-in" />
<div className="animate-out fade-out" />

// Slide animations
<div className="animate-in slide-in-from-top-2" />
<div className="animate-in slide-in-from-bottom-4" />
<div className="animate-in slide-in-from-left-2" />
<div className="animate-in slide-in-from-right-2" />

// Zoom animations
<div className="animate-in zoom-in-95" />
<div className="animate-out zoom-out-95" />

// Spin (continuous)
<div className="animate-spin" />
```

### Animation Composition

```tsx
// Combine multiple animations
<div
  className="
  animate-in
  fade-in-0
  zoom-in-95
  slide-in-from-top-2
  duration-200
"
/>
```

---

## Performance Optimization

### 1. Avoid @apply in Components

```css
/* AVOID: @apply in component styles */
.card {
  @apply rounded-lg border bg-card;
}

/* PREFER: Use CSS variables directly */
.card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--card);
}
```

### 2. Use Arbitrary Values Sparingly

```tsx
// AVOID: Many arbitrary values
<div className="w-[347px] h-[183px] mt-[23px]" />

// PREFER: Use design system values
<div className="w-80 h-44 mt-6" />
```

### 3. Extract Repeated Patterns

```tsx
// Create reusable className constants
const cardStyles = "rounded-lg border bg-card p-6 shadow-sm";
const headingStyles = "text-lg font-semibold tracking-tight";

// Use in components
<div className={cardStyles}>
  <h2 className={headingStyles}>Title</h2>
</div>;
```

---

## shadcn/ui Integration

### Adding Components

```bash
# Add a single component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add card badge avatar

# List available components
npx shadcn@latest add
```

### Component Location

Per project architecture, shadcn/ui components are installed to:

```
src/shared/presentation/components/ui/
```

### Using MCP Tools

```typescript
// Search for components
mcp__shadcn__search_items_in_registries({
  registries: ["@shadcn"],
  query: "dialog",
});

// Get component examples
mcp__shadcn__get_item_examples_from_registries({
  registries: ["@shadcn"],
  query: "button-demo",
});
```

---

## Common Patterns

### Responsive Container

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">{/* Content */}</div>
```

### Card Layout

```tsx
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-sm text-muted-foreground">Description</p>
</div>
```

### Form Field

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Label</label>
  <input
    className="
    w-full rounded-md border border-input
    bg-background px-3 py-2 text-sm
    focus:outline-none focus:ring-2 focus:ring-ring
  "
  />
</div>
```

### Status Indicator

```tsx
<div className="flex items-center gap-2">
  <div className="size-2 rounded-full bg-green-500" />
  <span className="text-sm">Active</span>
</div>
```

---

## Debugging

### View Generated CSS

```bash
# Build and inspect output
npm run build
# Check .next/static/css/ for generated styles
```

### Common Issues

| Issue                 | Solution                            |
| --------------------- | ----------------------------------- |
| Classes not applying  | Check if class is in content paths  |
| Dark mode not working | Verify `.dark` class on parent      |
| Custom colors missing | Add to `@theme` directive           |
| Animation not working | Ensure `tw-animate-css` is imported |

---

## Resources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [tw-animate-css](https://github.com/ikcb/tw-animate-css)

---

## Related

- [Figma to Code Skill](../figma/SKILL.md) - Convert Figma designs to components
- [Component Patterns](../../rules/component-patterns.md) - Component structure
- [shadcn/ui MCP](../../rules/mcp-standards.md) - Using shadcn MCP tools
- [Frontend Design Skill](../frontend-design/SKILL.md) - Design implementation
