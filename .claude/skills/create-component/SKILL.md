---
name: create-component
description: Create new React components with proper structure, types, and optional tests; use when asked to scaffold shared or feature components.
---

# Create Component

## Description

Creates a new React component with proper structure, types, and optional test file. Automatically determines if it should be a shared component or feature-specific based on context.

## Usage

```
/create-component [ComponentName] [--feature=feature-name] [--shared]
```

or

```
Create a component called [ComponentName] for [feature-name]
Create a shared component called [ComponentName]
```

## Parameters

| Parameter       | Required | Description                              |
| --------------- | -------- | ---------------------------------------- |
| `ComponentName` | Yes      | Name in PascalCase (e.g., `UserCard`)    |
| `--feature`     | No       | Feature name to place component in       |
| `--shared`      | No       | Create in shared/presentation/components |

## Steps

1. **Determine location**
   - If `--shared`: `src/shared/presentation/components/[ComponentName]/`
   - If `--feature`: `src/features/[feature]/presentation/components/[ComponentName]/`
   - If neither: Ask user for location

2. **Create component folder structure**

   ```
   [ComponentName]/
   ├── index.ts              # Re-export
   ├── [ComponentName].tsx   # Component
   └── [ComponentName].types.ts  # Props types
   ```

3. **Create files**

   **[ComponentName].types.ts**

   ```typescript
   import { ReactNode } from 'react';

   export interface [ComponentName]Props {
     children?: ReactNode;
     className?: string;
     // Add props
   }
   ```

   **[ComponentName].tsx**

   ```typescript
   'use client';

   import { [ComponentName]Props } from './[ComponentName].types';

   /**
    * [ComponentName] component
    *
    * @description Brief description
    */
   export function [ComponentName]({ children, className }: [ComponentName]Props) {
     return (
       <div className={className}>
         {children}
       </div>
     );
   }
   ```

   **index.ts**

   ```typescript
   export { [ComponentName] } from './[ComponentName]';
   export type { [ComponentName]Props } from './[ComponentName].types';
   ```

4. **Update parent index.ts**
   Add export to the components folder's index.ts

5. **Create test file (optional)**
   If user confirms, create `[ComponentName].test.tsx`:

   ```typescript
   import { render, screen } from '@testing-library/react';
   import { [ComponentName] } from './[ComponentName]';

   describe('[ComponentName]', () => {
     it('renders correctly', () => {
       render(<[ComponentName]>Test</[ComponentName]>);
       expect(screen.getByText('Test')).toBeInTheDocument();
     });
   });
   ```

## Examples

### Example 1: Create feature component

```
/create-component UserCard --feature=users
```

Creates:

```
src/features/users/presentation/components/UserCard/
├── index.ts
├── UserCard.tsx
└── UserCard.types.ts
```

### Example 2: Create shared component

```
Create a shared component called DataTable
```

Creates:

```
src/shared/presentation/components/DataTable/
├── index.ts
├── DataTable.tsx
└── DataTable.types.ts
```

### Example 3: Create component with test

```
Create a component called LoginForm for auth feature with tests
```

Creates:

```
src/features/auth/presentation/components/LoginForm/
├── index.ts
├── LoginForm.tsx
├── LoginForm.types.ts
└── LoginForm.test.tsx
```

## Component Templates

### Simple Component

```typescript
export function [ComponentName]({ children }: [ComponentName]Props) {
  return <div>{children}</div>;
}
```

### Interactive Component

```typescript
'use client';

import { useState, useCallback } from 'react';
import { [ComponentName]Props } from './[ComponentName].types';

export function [ComponentName]({ onAction, initialValue }: [ComponentName]Props) {
  const [value, setValue] = useState(initialValue);

  const handleAction = useCallback(() => {
    onAction?.(value);
  }, [onAction, value]);

  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleAction}>Submit</button>
    </div>
  );
}
```

### Form Component (with Formik)

```typescript
'use client';

import { useFormik } from 'formik';
import { validationSchema } from './[ComponentName].schema';
import { [ComponentName]Props, [ComponentName]Values } from './[ComponentName].types';

export function [ComponentName]({ onSubmit, initialValues }: [ComponentName]Props) {
  const formik = useFormik<[ComponentName]Values>({
    initialValues: initialValues ?? defaultValues,
    validationSchema,
    onSubmit,
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Notes

- Always create types in a separate file
- Use `'use client'` only when needed (interactivity, hooks)
- Keep components focused on a single responsibility
- Export both component and types from index.ts
