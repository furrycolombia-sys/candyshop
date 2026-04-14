---
name: storybook
description: Initialize and work with Storybook for component-driven development.
---

# Storybook Skill

## Description

Initialize, configure, and work with Storybook for component-driven development. Supports creating stories, running Storybook, and integrating with the testing workflow.

**This skill uses a task list to show progress.**

## Usage

```
/storybook [action] [options]
```

### Actions

| Action  | Description                     | Example                   |
| ------- | ------------------------------- | ------------------------- |
| `init`  | Initialize Storybook in project | `/storybook init`         |
| `story` | Create a story for a component  | `/storybook story Button` |
| `run`   | Start Storybook dev server      | `/storybook run`          |
| `build` | Build static Storybook          | `/storybook build`        |
| `test`  | Run Storybook tests             | `/storybook test`         |

Or natural language:

```
Set up Storybook
Create a story for the Button component
Start Storybook
Build Storybook for deployment
Run Storybook interaction tests
```

---

## Action: init

### Initialize Storybook

Sets up Storybook with the recommended `@storybook/nextjs-vite` framework.

```
/storybook init
```

### Steps

```
TodoWrite([
  { content: "Check existing Storybook configuration", status: "in_progress", activeForm: "Checking config" },
  { content: "Install Storybook dependencies", status: "pending", activeForm: "Installing dependencies" },
  { content: "Create .storybook configuration", status: "pending", activeForm: "Creating config" },
  { content: "Add example stories", status: "pending", activeForm: "Adding examples" },
  { content: "Update package.json scripts", status: "pending", activeForm: "Updating scripts" },
  { content: "Verify setup", status: "pending", activeForm: "Verifying setup" }
])
```

### Installation

```bash
# Install core Storybook packages
pnpm add -D @storybook/nextjs-vite @storybook/addon-essentials @storybook/addon-a11y @storybook/addon-interactions @storybook/test storybook

# For portable story testing
pnpm add -D @storybook/react
```

### Configuration Files

#### .storybook/main.ts

```typescript
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  features: {
    experimentalRSC: true,
  },
  staticDirs: ["../public"],
};

export default config;
```

#### .storybook/preview.ts

```typescript
import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    options: {
      storySort: {
        order: [
          "Introduction",
          "Design Tokens",
          "Atoms",
          "Molecules",
          "Organisms",
          "Templates",
          "Features",
        ],
      },
    },
  },
};

export default preview;
```

### Package.json Scripts

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook"
  }
}
```

---

## Action: story

### Create a Story

Generate a story file for an existing component.

```
/storybook story [ComponentName] [--path feature/path]
```

### Parameters

| Parameter       | Required | Description                                    |
| --------------- | -------- | ---------------------------------------------- |
| `ComponentName` | Yes      | Name of the component                          |
| `--path`        | No       | Path to component (auto-detected if omitted)   |
| `--template`    | No       | Story template: `basic`, `full`, `interactive` |

### Steps

```
TodoWrite([
  { content: "Locate component file", status: "in_progress", activeForm: "Locating component" },
  { content: "Analyze component props", status: "pending", activeForm: "Analyzing props" },
  { content: "Determine story category", status: "pending", activeForm: "Determining category" },
  { content: "Generate story file", status: "pending", activeForm: "Generating story" },
  { content: "Add common variants", status: "pending", activeForm: "Adding variants" }
])
```

### Story Templates

#### Basic Template

```typescript
// [Component].stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ComponentName } from "./ComponentName";

const meta = {
  title: "[Category]/ComponentName",
  component: ComponentName,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};
```

#### Full Template (with variants)

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { ComponentName } from "./ComponentName";

const meta = {
  title: "[Category]/ComponentName",
  component: ComponentName,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Component description here.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    // Define control types
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Variants
export const Default: Story = {
  args: {},
};

export const WithCustomProps: Story = {
  args: {},
};

// States
export const Loading: Story = {
  args: { isLoading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Error: Story = {
  args: { error: "Error message" },
};
```

#### Interactive Template (with play functions)

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent, expect } from "@storybook/test";
import { ComponentName } from "./ComponentName";

const meta = {
  title: "[Category]/ComponentName",
  component: ComponentName,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InteractionTest: Story = {
  args: {
    onAction: () => {},
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Find element
    const element = canvas.getByRole("button");

    // Interact
    await userEvent.click(element);

    // Assert
    expect(args.onAction).toHaveBeenCalled();
  },
};
```

### Category Detection

| Component Location                          | Category           |
| ------------------------------------------- | ------------------ |
| `shared/presentation/components/atoms/`     | `Atoms/`           |
| `shared/presentation/components/molecules/` | `Molecules/`       |
| `shared/presentation/components/organisms/` | `Organisms/`       |
| `shared/presentation/layouts/`              | `Templates/`       |
| `features/[name]/presentation/components/`  | `Features/[Name]/` |

---

## Action: run

### Start Storybook

```
/storybook run
```

Runs:

```bash
pnpm storybook
```

Opens Storybook at http://localhost:6006

---

## Action: build

### Build Static Storybook

```
/storybook build [--output dir]
```

Runs:

```bash
pnpm build-storybook
```

Output: `storybook-static/`

---

## Action: test

### Run Storybook Tests

```
/storybook test [--ci]
```

Runs:

```bash
# Interactive mode
pnpm test-storybook

# CI mode
pnpm test-storybook --ci
```

---

## Workflow Integration

### Component Development Flow

```
1. Design component interface (props)
2. /storybook story ComponentName --template full
3. Implement component to satisfy stories
4. Add interaction tests
5. Run tests: /storybook test
6. Document with MDX if needed
```

### Testing Integration

Stories can be used as test cases:

```typescript
// ComponentName.test.tsx
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import * as stories from './ComponentName.stories';

const { Default, Loading, Error } = composeStories(stories);

describe('ComponentName', () => {
  it('renders default state', () => {
    render(<Default />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<Loading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

---

## Best Practices

### 1. Story Organization

- One story file per component
- Co-locate with component: `Component/Component.stories.tsx`
- Use consistent naming: `ComponentName.stories.tsx`

### 2. Comprehensive Coverage

Every component should have stories for:

- Default state
- All prop variants
- Loading state (if applicable)
- Error state (if applicable)
- Edge cases (empty, overflow, etc.)

### 3. Interaction Tests

Add `play` functions for:

- User interactions (click, type, hover)
- Form submissions
- State transitions
- Accessibility (keyboard navigation)

### 4. Documentation

Use `tags: ['autodocs']` for automatic documentation, and add MDX files for detailed component guides.

---

## Troubleshooting

### Common Issues

| Issue                        | Solution                                        |
| ---------------------------- | ----------------------------------------------- |
| Styles not loading           | Import global CSS in `.storybook/preview.ts`    |
| Next.js features not working | Ensure using `@storybook/nextjs-vite` framework |
| Path aliases not resolving   | Check `tsconfig.json` paths configuration       |
| RSC errors                   | Enable `experimentalRSC` in main.ts             |

### Reset Storybook

```bash
# Clear cache
rm -rf node_modules/.cache/storybook

# Reinstall
pnpm install
```

---

## Related

- [Storybook Rules](../../rules/storybook.md) - Full documentation
- [Component Patterns](../../rules/component-patterns.md) - Component structure
- [Testing Rules](../../rules/testing.md) - Test integration
