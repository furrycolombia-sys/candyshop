---
name: create-api-integration
description: Create complete API integrations with types, API clients, repositories, and React Query hooks for REST or GraphQL; use when asked to build feature API layers.
---

# Create API Integration

## Description

Creates a complete API integration for a feature, including types, API client methods, repository implementation, and React Query hooks.

## Usage

```
/create-api [entity-name] --feature=[feature-name] [--graphql|--rest]
```

or

```
Create API integration for [entity-name] in [feature-name] feature
```

## Parameters

| Parameter     | Required | Description                                |
| ------------- | -------- | ------------------------------------------ |
| `entity-name` | Yes      | Name of the entity (e.g., `user`, `order`) |
| `--feature`   | Yes      | Feature name where integration belongs     |
| `--graphql`   | No       | Use GraphQL (Apollo)                       |
| `--rest`      | No       | Use REST (Axios) - default                 |

## Steps

1. **Create/update domain types**

   **domain/types/[entity].ts**

   ```typescript
   export interface [Entity] {
     id: string;
     createdAt: string;
     updatedAt: string;
     // Entity properties
   }

   export interface Create[Entity]DTO {
     // Create payload
   }

   export interface Update[Entity]DTO {
     // Update payload
   }

   export interface [Entity]Filters {
     search?: string;
     // Filter options
   }
   ```

2. **Create API client**

   **REST: infrastructure/api/[entity]Api.ts**

   ```typescript
   import { api } from '@/shared/infrastructure/api';
   import type {
     [Entity],
     Create[Entity]DTO,
     Update[Entity]DTO,
     [Entity]Filters,
   } from '../../domain/types';

   const BASE_URL = '/[entities]';

   export const [entity]Api = {
     getAll: async (filters?: [Entity]Filters): Promise<[Entity][]> => {
       const response = await api.get(BASE_URL, { params: filters });
       return response.data;
     },

     getById: async (id: string): Promise<[Entity]> => {
       const response = await api.get(`${BASE_URL}/${id}`);
       return response.data;
     },

     create: async (data: Create[Entity]DTO): Promise<[Entity]> => {
       const response = await api.post(BASE_URL, data);
       return response.data;
     },

     update: async (id: string, data: Update[Entity]DTO): Promise<[Entity]> => {
       const response = await api.patch(`${BASE_URL}/${id}`, data);
       return response.data;
     },

     delete: async (id: string): Promise<void> => {
       await api.delete(`${BASE_URL}/${id}`);
     },
   };
   ```

   **GraphQL: infrastructure/api/[entity]Api.ts**

   ```typescript
   import { gql } from '@apollo/client';
   import { client } from '@/shared/infrastructure/graphql';
   import type { [Entity], Create[Entity]DTO } from '../../domain/types';

   const GET_[ENTITIES] = gql`
     query Get[Entities]($filters: [Entity]FiltersInput) {
       [entities](filters: $filters) {
         id
         # fields
       }
     }
   `;

   const GET_[ENTITY] = gql`
     query Get[Entity]($id: ID!) {
       [entity](id: $id) {
         id
         # fields
       }
     }
   `;

   const CREATE_[ENTITY] = gql`
     mutation Create[Entity]($input: Create[Entity]Input!) {
       create[Entity](input: $input) {
         id
         # fields
       }
     }
   `;

   export const [entity]Api = {
     getAll: async (filters?: [Entity]Filters): Promise<[Entity][]> => {
       const { data } = await client.query({
         query: GET_[ENTITIES],
         variables: { filters },
       });
       return data.[entities];
     },

     getById: async (id: string): Promise<[Entity]> => {
       const { data } = await client.query({
         query: GET_[ENTITY],
         variables: { id },
       });
       return data.[entity];
     },

     create: async (input: Create[Entity]DTO): Promise<[Entity]> => {
       const { data } = await client.mutate({
         mutation: CREATE_[ENTITY],
         variables: { input },
       });
       return data.create[Entity];
     },
   };
   ```

3. **Create React Query hooks**

   **application/hooks/use[Entity]s.ts**

   ```typescript
   'use client';

   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { [entity]Api } from '../../infrastructure/api';
   import type {
     [Entity],
     Create[Entity]DTO,
     Update[Entity]DTO,
     [Entity]Filters,
   } from '../../domain/types';

   // Query keys factory
   export const [entity]Keys = {
     all: ['[entities]'] as const,
     lists: () => [...[entity]Keys.all, 'list'] as const,
     list: (filters?: [Entity]Filters) => [...[entity]Keys.lists(), filters] as const,
     details: () => [...[entity]Keys.all, 'detail'] as const,
     detail: (id: string) => [...[entity]Keys.details(), id] as const,
   };

   // List hook
   export function use[Entity]s(filters?: [Entity]Filters) {
     return useQuery({
       queryKey: [entity]Keys.list(filters),
       queryFn: () => [entity]Api.getAll(filters),
     });
   }

   // Detail hook
   export function use[Entity](id: string) {
     return useQuery({
       queryKey: [entity]Keys.detail(id),
       queryFn: () => [entity]Api.getById(id),
       enabled: !!id,
     });
   }

   // Create mutation
   export function useCreate[Entity]() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (data: Create[Entity]DTO) => [entity]Api.create(data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: [entity]Keys.lists() });
       },
     });
   }

   // Update mutation
   export function useUpdate[Entity]() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: ({ id, data }: { id: string; data: Update[Entity]DTO }) =>
         [entity]Api.update(id, data),
       onSuccess: (_, { id }) => {
         queryClient.invalidateQueries({ queryKey: [entity]Keys.detail(id) });
         queryClient.invalidateQueries({ queryKey: [entity]Keys.lists() });
       },
     });
   }

   // Delete mutation
   export function useDelete[Entity]() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (id: string) => [entity]Api.delete(id),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: [entity]Keys.lists() });
       },
     });
   }
   ```

4. **Update index exports**

   **domain/index.ts**

   ```typescript
   export * from "./types/[entity]";
   ```

   **infrastructure/index.ts**

   ```typescript
   export * from "./api/[entity]Api";
   ```

   **application/index.ts**

   ```typescript
   export * from "./hooks/use[Entity]s";
   ```

## Examples

### Example 1: REST API for orders

```
/create-api order --feature=orders --rest
```

Creates:

- `features/orders/domain/types/order.ts`
- `features/orders/infrastructure/api/orderApi.ts`
- `features/orders/application/hooks/useOrders.ts`

### Example 2: GraphQL API for products

```
Create GraphQL API integration for product in products feature
```

Creates GraphQL-based API client and hooks.

## Generated Hook Usage

```typescript
// In a component
import {
  useOrders,
  useOrder,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
} from "@/features/orders";

function OrdersPage() {
  // List
  const { data: orders, isLoading } = useOrders({ status: "pending" });

  // Single item
  const { data: order } = useOrder(orderId);

  // Mutations
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const handleCreate = () => {
    createOrder.mutate({
      /* data */
    });
  };

  const handleUpdate = (id: string) => {
    updateOrder.mutate({
      id,
      data: {
        /* updates */
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteOrder.mutate(id);
  };
}
```

## Notes

- Query keys are namespaced for proper cache invalidation
- All mutations invalidate relevant queries
- Use `enabled` option for conditional fetching
- Consider optimistic updates for better UX
- Add error handling in components using the hooks
