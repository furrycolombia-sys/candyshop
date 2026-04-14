# Layer Documentation

Detailed documentation for each architectural layer.

---

## Domain Layer

### Purpose

Contains the core business logic and rules that are independent of any framework, UI, or external service.

### Location

```
features/[feature]/domain/
├── entities/       # Business objects
├── types/          # TypeScript definitions
├── errors/         # Custom errors
├── interfaces/     # Repository contracts
└── index.ts        # Public exports
```

### Entities

Business objects that encapsulate data and behavior:

```typescript
// features/orders/domain/entities/Order.ts
import { OrderStatus, OrderItem } from "../types";

export class Order {
  constructor(
    public readonly id: string,
    public readonly items: OrderItem[],
    public status: OrderStatus,
    public readonly createdAt: Date,
  ) {}

  get total(): number {
    return this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  canBeCancelled(): boolean {
    return this.status === "pending" || this.status === "processing";
  }

  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new OrderCannotBeCancelledError(this.id, this.status);
    }
    this.status = "cancelled";
  }
}
```

### Types

TypeScript interfaces and type definitions:

```typescript
// features/orders/domain/types/index.ts
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderDTO {
  items: Omit<OrderItem, "name">[];
  shippingAddressId: string;
}
```

### Errors

Custom domain-specific errors:

```typescript
// features/orders/domain/errors/OrderErrors.ts
export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order with ID ${orderId} not found`);
    this.name = "OrderNotFoundError";
  }
}

export class OrderCannotBeCancelledError extends Error {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} cannot be cancelled (status: ${status})`);
    this.name = "OrderCannotBeCancelledError";
  }
}
```

### Interfaces (Repository Contracts)

Define what operations are available without specifying how:

```typescript
// features/orders/domain/interfaces/IOrderRepository.ts
import { Order, CreateOrderDTO, OrderFilters } from "../types";

export interface IOrderRepository {
  findAll(filters?: OrderFilters): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  create(data: CreateOrderDTO): Promise<Order>;
  update(id: string, data: Partial<Order>): Promise<Order>;
  delete(id: string): Promise<void>;
}
```

---

## Application Layer

### Purpose

Contains application-specific business rules. Orchestrates the flow of data between domain and presentation.

### Location

```
features/[feature]/application/
├── hooks/          # React hooks
├── services/       # Business services
├── mappers/        # Data transformers
└── index.ts        # Public exports
```

### Services

Orchestrate complex business operations:

```typescript
// features/orders/application/services/OrderService.ts
import { IOrderRepository } from "../../domain/interfaces";
import { Order, CreateOrderDTO } from "../../domain/types";
import { OrderMapper } from "../mappers/OrderMapper";

export class OrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async createOrder(dto: CreateOrderDTO): Promise<Order> {
    // Validate business rules
    if (dto.items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    // Create order
    const order = await this.orderRepository.create(dto);

    // Side effects
    await this.notificationService.sendOrderConfirmation(order);

    return order;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    order.cancel(); // Domain logic
    return this.orderRepository.update(orderId, { status: order.status });
  }
}
```

### Hooks

React hooks that provide feature functionality:

```typescript
// features/orders/application/hooks/useOrders.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../../infrastructure/api";
import { OrderFilters } from "../../domain/types";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters?: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => orderApi.getAll(filters),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
```

### Mappers

Transform data between layers:

```typescript
// features/orders/application/mappers/OrderMapper.ts
import { Order } from "../../domain/entities/Order";
import { OrderApiResponse } from "../../infrastructure/api/types";

export class OrderMapper {
  static toDomain(response: OrderApiResponse): Order {
    return new Order(
      response.id,
      response.items.map((item) => ({
        productId: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.qty,
      })),
      response.status,
      new Date(response.created_at),
    );
  }

  static toApi(order: Order): Partial<OrderApiResponse> {
    return {
      status: order.status,
      items: order.items.map((item) => ({
        product_id: item.productId,
        qty: item.quantity,
      })),
    };
  }
}
```

---

## Infrastructure Layer

### Purpose

Implements technical details and external service integrations. This layer "implements" the interfaces defined in the domain.

### Location

```
features/[feature]/infrastructure/
├── api/            # API clients
├── repositories/   # Repository implementations
├── adapters/       # External adapters
└── index.ts        # Public exports
```

### API Clients

HTTP/GraphQL calls to backend:

```typescript
// features/orders/infrastructure/api/orderApi.ts
import { api } from "@/shared/infrastructure/api";
import { OrderApiResponse, CreateOrderRequest } from "./types";
import { OrderMapper } from "../../application/mappers";
import { Order, OrderFilters } from "../../domain/types";

const BASE_URL = "/orders";

export const orderApi = {
  async getAll(filters?: OrderFilters): Promise<Order[]> {
    const response = await api.get<OrderApiResponse[]>(BASE_URL, {
      params: filters,
    });
    return response.data.map(OrderMapper.toDomain);
  },

  async getById(id: string): Promise<Order> {
    const response = await api.get<OrderApiResponse>(`${BASE_URL}/${id}`);
    return OrderMapper.toDomain(response.data);
  },

  async create(data: CreateOrderRequest): Promise<Order> {
    const response = await api.post<OrderApiResponse>(BASE_URL, data);
    return OrderMapper.toDomain(response.data);
  },

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const response = await api.patch<OrderApiResponse>(
      `${BASE_URL}/${id}`,
      OrderMapper.toApi(data),
    );
    return OrderMapper.toDomain(response.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
  },
};
```

### Repository Implementations

Implement domain interfaces:

```typescript
// features/orders/infrastructure/repositories/OrderRepository.ts
import { IOrderRepository } from "../../domain/interfaces";
import { Order, CreateOrderDTO, OrderFilters } from "../../domain/types";
import { orderApi } from "../api";

export class OrderRepository implements IOrderRepository {
  async findAll(filters?: OrderFilters): Promise<Order[]> {
    return orderApi.getAll(filters);
  }

  async findById(id: string): Promise<Order | null> {
    try {
      return await orderApi.getById(id);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async create(data: CreateOrderDTO): Promise<Order> {
    return orderApi.create(data);
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    return orderApi.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return orderApi.delete(id);
  }
}
```

---

## Presentation Layer

### Purpose

Contains all UI-related code. React components, pages, and UI-specific hooks.

### Location

```
features/[feature]/presentation/
├── components/     # React components
├── pages/          # Page compositions
├── hooks/          # UI-specific hooks
└── index.ts        # Public exports
```

### Pages

Full page compositions:

```typescript
// features/orders/presentation/pages/OrdersPage.tsx
'use client';

import { useState } from 'react';
import { useOrders } from '../../application/hooks';
import { OrderList } from '../components/OrderList';
import { OrderFilters } from '../components/OrderFilters';
import { PageLayout } from '@/shared/presentation/layouts';

export function OrdersPage() {
  const [filters, setFilters] = useState({});
  const { data: orders, isLoading, error } = useOrders(filters);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <PageLayout title="Orders">
      <OrderFilters value={filters} onChange={setFilters} />
      <OrderList orders={orders ?? []} isLoading={isLoading} />
    </PageLayout>
  );
}
```

### Components

Feature-specific UI components:

```typescript
// features/orders/presentation/components/OrderCard.tsx
import { Order } from '../../domain/types';
import { Card, Badge } from '@/shared/presentation/components';
import { formatCurrency, formatDate } from '@/shared/application/utils';

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
}

export function OrderCard({ order, onSelect }: OrderCardProps) {
  return (
    <Card onClick={() => onSelect?.(order)}>
      <Card.Header>
        <span>Order #{order.id}</span>
        <Badge variant={getStatusVariant(order.status)}>
          {order.status}
        </Badge>
      </Card.Header>
      <Card.Body>
        <p>{order.items.length} items</p>
        <p>{formatCurrency(order.total)}</p>
      </Card.Body>
      <Card.Footer>
        <span>{formatDate(order.createdAt)}</span>
      </Card.Footer>
    </Card>
  );
}
```

### UI Hooks

Hooks specific to UI behavior:

```typescript
// features/orders/presentation/hooks/useOrderModal.ts
"use client";

import { useState, useCallback } from "react";
import { Order } from "../../domain/types";

export function useOrderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const open = useCallback((order: Order) => {
    setSelectedOrder(order);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedOrder(null);
  }, []);

  return {
    isOpen,
    selectedOrder,
    open,
    close,
  };
}
```

---

## Shared Layer

### Purpose

Contains truly generic code used across multiple features.

### Location

```
shared/
├── domain/
│   └── types/          # Global types
├── application/
│   ├── hooks/          # Generic hooks
│   └── utils/          # Utility functions
├── infrastructure/
│   ├── api/            # API client setup
│   └── config/         # Configuration
└── presentation/
    ├── components/     # Generic UI
    ├── layouts/        # Shell layouts
    └── theme/          # Theme config
```

### What Belongs in Shared

| Yes                           | No                    |
| ----------------------------- | --------------------- |
| Button, Input, Modal          | UserAvatar, OrderCard |
| useDebounce, useLocalStorage  | useOrders, useAuth    |
| formatDate, formatCurrency    | calculateOrderTotal   |
| Axios instance, Apollo client | orderApi, authApi     |
| PageLayout, Sidebar           | OrdersLayout          |
