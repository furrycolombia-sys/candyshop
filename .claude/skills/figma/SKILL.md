---
name: figma
description: Convert Figma designs to production-ready code using shadcn/ui, Tailwind, and i18n.
---

# Figma to Code Skill

> Convert Figma designs to production-ready code using existing shadcn/ui components, Tailwind theme, and i18n setup.

---

## Command

```
/figma [url_or_image_path]
```

**Examples:**

```
/figma https://www.figma.com/design/abc123/MyProject?node-id=18-981
/figma C:\Users\...\screenshot.png
/figma (with image pasted in chat)
```

---

## Overview

This skill converts Figma designs into production code by:

1. **Prioritizing component reuse** over pixel-perfect recreation
2. **Using existing theme colors** before creating new ones
3. **Leveraging shadcn/ui components** with Tailwind styling
4. **Implementing i18n** for all user-facing text
5. **Following Clean Architecture** patterns

---

## Workflow

### Step 1: Analyze Design

When receiving a Figma URL or image:

1. **Try MCP tools first** (if URL provided):

   ```
   mcp__figma__get_design_context
   mcp__figma__get_screenshot
   mcp__figma__get_variable_defs
   ```

2. **If MCP fails** (access restricted), ask user for screenshot

3. **Analyze the design** identifying:
   - Layout structure (grid, flex, sections)
   - Color palette used
   - Typography styles
   - Interactive elements (buttons, inputs, etc.)
   - Icons and imagery
   - Text content (for i18n)

### Step 2: Map to Existing Components

**CRITICAL: Always check existing components first!**

#### Check shadcn/ui Registry

```typescript
// Search for matching components
mcp__shadcn__search_items_in_registries({
  registries: ["@shadcn"],
  query: "component-name",
});

// View component details
mcp__shadcn__view_items_in_registries({
  items: ["@shadcn/button", "@shadcn/card"],
});

// Get usage examples
mcp__shadcn__get_item_examples_from_registries({
  registries: ["@shadcn"],
  query: "button-demo",
});
```

#### Check Existing Project Components

Search in these locations:

- `src/shared/presentation/components/ui/` - shadcn/ui components
- `src/shared/presentation/components/` - Shared custom components
- `src/features/*/presentation/components/` - Feature components

#### Component Mapping Table

| Design Element | First Check                          | Then Consider           |
| -------------- | ------------------------------------ | ----------------------- |
| Buttons        | `Button` variants                    | New variant if needed   |
| Cards          | `Card`, `CardHeader`, `CardContent`  | Custom card styles      |
| Inputs         | `Input`, `Textarea`, `Select`        | Form components         |
| Modals/Dialogs | `Dialog`, `Sheet`, `Drawer`          | Compound patterns       |
| Dropdowns      | `DropdownMenu`, `Select`, `Combobox` | Custom if needed        |
| Tables         | `Table` components                   | `DataTable` for complex |
| Charts         | Existing chart components            | Recharts patterns       |
| Badges/Tags    | `Badge` variants                     | New variant             |
| Progress       | `Progress`, custom bars              | Theme-colored           |
| Tooltips       | `Tooltip`                            | Popover for complex     |
| Tabs           | `Tabs`                               | Custom tab patterns     |
| Navigation     | `NavigationMenu`, `Sidebar`          | Layout components       |

### Step 3: Map Colors to Theme

**CRITICAL: Use existing theme colors whenever possible!**

#### Current Theme Colors

```css
/* Primary - Teal/Cyan */
--primary: oklch(0.59 0.14 180);

/* Semantic Status Colors */
--success: oklch(0.58 0.14 145); /* Green - positive states */
--warning: oklch(0.72 0.15 65); /* Amber - attention needed */
--destructive: oklch(0.55 0.22 25); /* Red - errors, critical */
--info: oklch(0.59 0.14 180); /* Teal - informational */

/* Neutral Colors */
--background: oklch(0.97 0.005 250); /* Light gray page bg */
--card: oklch(1 0 0); /* White cards */
--muted: oklch(0.96 0.005 180); /* Subtle backgrounds */
--muted-foreground: oklch(0.45 0 0); /* Secondary text */
--foreground: oklch(0.15 0 0); /* Primary text */
--border: oklch(0.9 0 0); /* Borders */

/* Chart Colors */
--chart-1: oklch(0.59 0.14 180); /* Primary teal */
--chart-2: oklch(0.58 0.14 145); /* Success green */
--chart-3: oklch(0.65 0.15 280); /* Purple */
--chart-4: oklch(0.72 0.15 65); /* Warning amber */
--chart-5: oklch(0.55 0.22 25); /* Destructive red */
```

#### Color Matching Process

1. **Extract colors** from design
2. **Find closest match** in existing theme:

   ```
   Design Color → Theme Variable
   ─────────────────────────────
   Teal/Cyan    → primary, info
   Green        → success
   Red          → destructive
   Orange/Amber → warning
   Gray         → muted, muted-foreground
   Purple       → chart-3
   ```

3. **Only create new variable** if:
   - No existing color is close enough
   - The color has a specific semantic meaning
   - It will be reused across multiple components

4. **When creating new colors**:

   ```css
   /* In globals.css @theme inline */
   --color-[name]: var(--[name]);

   /* In :root */
   --[name]: oklch(L C H);
   --[name]-foreground: oklch(...);
   ```

### Step 4: Implement with i18n

**All user-facing text MUST use i18n!**

#### Adding Translations

1. **Identify all text** in the design
2. **Create translation keys** in appropriate namespace:

   ```
   src/i18n/messages/en.json
   src/i18n/messages/es.json
   ```

3. **Use appropriate namespace**:
   - `common` - Shared across app (buttons, labels)
   - `dashboard` - Dashboard-specific
   - `[feature]` - Feature-specific

#### Translation Pattern

```typescript
// Component
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('namespace');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <Button>{t('action')}</Button>
    </div>
  );
}
```

```json
// en.json
{
  "namespace": {
    "title": "My Title",
    "description": "Description text",
    "action": "Click Here"
  }
}
```

### Step 5: Create/Update Components

#### Decision Tree

```
Is there an existing shadcn/ui component?
├── YES → Can existing variants handle this?
│   ├── YES → Use existing component with props
│   └── NO → Add new variant to component
└── NO → Is this feature-specific?
    ├── YES → Create in features/[feature]/presentation/components/
    └── NO → Will it be reused?
        ├── YES → Create in shared/presentation/components/
        └── NO → Create locally in feature
```

#### Adding shadcn/ui Components

```bash
# Get add command
mcp__shadcn__get_add_command_for_items({
  items: ['@shadcn/component-name']
})

# Install via CLI
npx shadcn@latest add component-name
```

#### Component File Structure

```
ComponentName/
├── index.ts              # Re-export
├── ComponentName.tsx     # Main component
├── ComponentName.types.ts # Props interface (if complex)
└── ComponentName.test.tsx # Tests
```

### Step 6: Verify Implementation

After implementing:

1. **Run build** to check for errors:

   ```bash
   npm run build
   ```

2. **Check component usage**:
   - Props match design requirements
   - Responsive behavior correct
   - Theme colors applied properly
   - i18n keys working

3. **Use audit checklist**:
   ```
   mcp__shadcn__get_audit_checklist()
   ```

---

## Implementation Priorities

| Priority       | Approach                                             |
| -------------- | ---------------------------------------------------- |
| 1. **Highest** | Reuse existing shadcn/ui component as-is             |
| 2. **High**    | Use existing component with different props/variants |
| 3. **Medium**  | Add new variant to existing component                |
| 4. **Low**     | Create new component using shadcn patterns           |
| 5. **Lowest**  | Custom implementation (only if absolutely necessary) |

---

## Color Creation Guidelines

### When to Create New Color

| Scenario                                             | Action                       |
| ---------------------------------------------------- | ---------------------------- |
| Design uses exact teal                               | Use `primary`                |
| Design uses slightly different teal                  | Use `primary` (close enough) |
| Design uses unique purple for specific feature       | Consider new variable        |
| Design uses one-off color                            | Use closest theme color      |
| Design has semantic meaning (e.g., "pending" status) | Create `--pending` variable  |

### How to Create New Color

1. **Add to `@theme inline`** in globals.css:

   ```css
   --color-pending: var(--pending);
   --color-pending-foreground: var(--pending-foreground);
   ```

2. **Add to `:root`** (light mode):

   ```css
   --pending: oklch(0.65 0.12 280);
   --pending-foreground: oklch(0.99 0 0);
   ```

3. **Add to `.dark`** (dark mode):

   ```css
   --pending: oklch(0.72 0.12 280);
   --pending-foreground: oklch(0.12 0 0);
   ```

4. **Document** in skill/rules if semantic

---

## i18n Namespace Guidelines

| Content Type | Namespace   | Example Keys                         |
| ------------ | ----------- | ------------------------------------ |
| App-wide UI  | `common`    | `save`, `cancel`, `loading`          |
| Navigation   | `common`    | `nav.dashboard`, `nav.settings`      |
| Dashboard    | `dashboard` | `metrics.throughput`, `charts.title` |
| Auth         | `auth`      | `login.title`, `login.email`         |
| Feature X    | `featureX`  | `featureX.header`, `featureX.action` |

---

## Example Workflow

### Input: Figma screenshot of a metrics card

**Step 1: Analyze**

- Card container with header and content
- Title text, subtitle
- Large number display
- Trend indicator (green up arrow)
- Secondary text

**Step 2: Map Components**

- Container → `Card`, `CardHeader`, `CardContent`
- Trend → Custom or existing trend component
- Check existing: `MetricsSidebar` has similar patterns

**Step 3: Map Colors**

- Card bg → `card` (white)
- Title → `foreground`
- Subtitle → `muted-foreground`
- Number → `foreground`
- Trend up → `success`
- Trend down → `destructive`

**Step 4: i18n**

```json
{
  "dashboard": {
    "metrics": {
      "throughput": "Throughput",
      "loansProcessed": "loans processed",
      "vsYesterday": "vs yesterday"
    }
  }
}
```

**Step 5: Implement**

```tsx
import {
  Card,
  CardHeader,
  CardContent,
} from "@/shared/presentation/components/ui/card";
import { useTranslations } from "next-intl";

export function ThroughputCard({ value, trend }: ThroughputCardProps) {
  const t = useTranslations("dashboard.metrics");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("throughput")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm text-muted-foreground">{t("loansProcessed")}</p>
        <span
          className={cn(
            "text-sm",
            trend > 0 ? "text-success" : "text-destructive",
          )}
        >
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% {t("vsYesterday")}
        </span>
      </CardContent>
    </Card>
  );
}
```

---

## Anti-Patterns to Avoid

| Don't                                | Do Instead                            |
| ------------------------------------ | ------------------------------------- |
| Create custom button for each design | Use `Button` variants                 |
| Hardcode colors like `#0D9488`       | Use `text-primary`, `bg-success`      |
| Copy text directly in JSX            | Use i18n translations                 |
| Create duplicate components          | Search and reuse existing             |
| Add inline styles                    | Use Tailwind classes                  |
| Ignore dark mode                     | Use theme variables that support both |

---

## Quick Reference

### MCP Tools for Figma

```typescript
// Get design context (code + structure)
mcp__figma__get_design_context({ fileKey, nodeId });

// Get screenshot
mcp__figma__get_screenshot({ fileKey, nodeId });

// Get color variables
mcp__figma__get_variable_defs({ fileKey, nodeId });

// Get metadata/structure
mcp__figma__get_metadata({ fileKey, nodeId });
```

### MCP Tools for shadcn

```typescript
// Search components
mcp__shadcn__search_items_in_registries({ registries, query });

// View component details
mcp__shadcn__view_items_in_registries({ items });

// Get examples
mcp__shadcn__get_item_examples_from_registries({ registries, query });

// Get add command
mcp__shadcn__get_add_command_for_items({ items });

// Verify implementation
mcp__shadcn__get_audit_checklist();
```

---

## Related

- [Tailwind Rules](../../rules/tailwind.md) - Color and styling guidelines
- [Component Patterns](../../rules/component-patterns.md) - Component structure
- [i18n Skill](../i18n/SKILL.md) - Internationalization setup
- [Architecture](../../rules/architecture.md) - Where to place components
