---
name: create-hook
description: Create custom React hooks following project conventions for shared or feature use.
---

# Create Hook

## Description

Creates a custom React hook following project conventions. Determines the appropriate location based on hook purpose (feature-specific vs shared utility).

## Usage

```
/create-hook [hookName] [--feature=feature-name] [--shared]
```

or

```
Create a hook called [hookName] for [feature-name]
Create a shared hook called [hookName]
```

## Parameters

| Parameter   | Required | Description                                           |
| ----------- | -------- | ----------------------------------------------------- |
| `hookName`  | Yes      | Name with `use` prefix in camelCase (e.g., `useAuth`) |
| `--feature` | No       | Feature name to place hook in                         |
| `--shared`  | No       | Create in shared/application/hooks                    |

## Location Decision

| Hook Type                                      | Location                                 |
| ---------------------------------------------- | ---------------------------------------- |
| Business logic (useAuth, useOrders)            | `features/[feature]/application/hooks/`  |
| UI logic (useModal, useTooltip)                | `features/[feature]/presentation/hooks/` |
| Generic utility (useDebounce, useLocalStorage) | `shared/application/hooks/`              |

## Steps

1. **Validate hook name**
   - Must start with `use`
   - Must be camelCase

2. **Determine location**
   - Based on parameters or ask user
   - Application hooks: business logic
   - Presentation hooks: UI-specific logic
   - Shared hooks: generic utilities

3. **Create hook file**

   **Basic hook template:**

   ````typescript
   'use client';

   import { useState, useCallback } from 'react';

   interface Use[HookName]Options {
     // Hook options
   }

   interface Use[HookName]Return {
     // Return type
   }

   /**
    * [hookName] - Brief description
    *
    * @param options - Hook configuration options
    * @returns Hook state and actions
    *
    * @example
    * ```tsx
    * const { data, isLoading } = use[HookName]();
    * ```
    */
   export function use[HookName](options?: Use[HookName]Options): Use[HookName]Return {
     const [state, setState] = useState();

     const action = useCallback(() => {
       // Action implementation
     }, []);

     return {
       state,
       action,
     };
   }
   ````

4. **Update index.ts**
   Add export to the hooks folder's index.ts

5. **Create test file (optional)**

   ```typescript
   import { renderHook, act } from '@testing-library/react';
   import { use[HookName] } from './use[HookName]';

   describe('use[HookName]', () => {
     it('should initialize correctly', () => {
       const { result } = renderHook(() => use[HookName]());
       expect(result.current.state).toBeDefined();
     });
   });
   ```

## Hook Templates

### Data Fetching Hook

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { [feature]Api } from '../../infrastructure/api';
import type { [Entity] } from '../../domain/types';

export function use[Entity]s() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['[entity]s'],
    queryFn: [feature]Api.getAll,
  });

  const createMutation = useMutation({
    mutationFn: [feature]Api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['[entity]s'] });
    },
  });

  return {
    [entity]s: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

### Form Hook

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useFormik } from 'formik';
import { validationSchema } from './[hookName].schema';

interface Use[Form]FormOptions {
  initialValues?: Partial<[Form]Values>;
  onSubmit: (values: [Form]Values) => Promise<void>;
}

export function use[Form]Form({ initialValues, onSubmit }: Use[Form]FormOptions) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      ...defaultValues,
      ...initialValues,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitError(null);
        await onSubmit(values);
      } catch (error) {
        setSubmitError(error.message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const reset = useCallback(() => {
    formik.resetForm();
    setSubmitError(null);
  }, [formik]);

  return {
    ...formik,
    submitError,
    reset,
  };
}
```

### Toggle/State Hook

```typescript
"use client";

import { useState, useCallback } from "react";

export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue,
  };
}
```

### Debounce Hook

```typescript
"use client";

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Local Storage Hook

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setStoredValue(JSON.parse(item));
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(error);
    }
  }, [key, initialValue]);

  return { value: storedValue, setValue, removeValue };
}
```

## Examples

### Example 1: Feature business hook

```
/create-hook useOrders --feature=orders
```

Creates: `src/features/orders/application/hooks/useOrders.ts`

### Example 2: Shared utility hook

```
Create a shared hook called useDebounce
```

Creates: `src/shared/application/hooks/useDebounce.ts`

### Example 3: Feature UI hook

```
Create a hook called useOrderModal for orders feature UI
```

Creates: `src/features/orders/presentation/hooks/useOrderModal.ts`

## Notes

- Always start hook names with `use`
- Include JSDoc with @example
- Return an object (not array) for better DX
- Use `useCallback` for returned functions
- Use `useMemo` for expensive computations
- Mark with `'use client'` as hooks require client-side
