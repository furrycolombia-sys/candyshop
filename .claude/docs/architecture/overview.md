# Architecture Overview

## Philosophy

This project implements **Clean Architecture** combined with **Feature-Based Organization**, specifically adapted for Next.js App Router.

### Why This Architecture?

| Problem           | Solution                     |
| ----------------- | ---------------------------- |
| Spaghetti code    | Clear layer separation       |
| Tight coupling    | Dependency inversion         |
| Hard to test      | Isolated business logic      |
| Hard to navigate  | Feature-based organization   |
| Framework lock-in | Framework-independent domain |

### Sources & Inspiration

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Production-Proven Clean Architecture in Next.js](https://dev.to/behnamrhp/stop-spaghetti-code-how-clean-architecture-saves-nextjs-projects-4l18)
- [React Folder Structure - Robin Wieruch](https://www.robinwieruch.de/react-folder-structure/)
- [Next.js Official Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)

---

## Core Concepts

### 1. The Dependency Rule

> "Source code dependencies must point only inward, toward higher-level policies."

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION                         │
│              (depends on Application)                   │
├─────────────────────────────────────────────────────────┤
│                    APPLICATION                          │
│               (depends on Domain)                       │
├─────────────────────────────────────────────────────────┤
│                      DOMAIN                             │
│              (depends on nothing)                       │
├─────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE                        │
│            (implements Domain interfaces)               │
└─────────────────────────────────────────────────────────┘
```

- **Domain** is the core - it knows nothing about the outside world
- **Application** orchestrates domain logic
- **Presentation** handles UI concerns
- **Infrastructure** implements technical details

### 2. Feature Isolation

Each feature is a vertical slice containing all layers:

```
features/
├── auth/           # Authentication feature
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── orders/         # Orders feature
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
```

Benefits:

- **Discoverability**: Everything about "orders" is in one place
- **Autonomy**: Teams can work on features independently
- **Testability**: Features can be tested in isolation
- **Deletability**: Remove a feature by deleting one folder

### 3. Thin App Router

Next.js `/app` directory is **only for routing**:

```typescript
// app/(protected)/orders/page.tsx
import { OrdersPage } from '@/features/orders';

export default function Page() {
  return <OrdersPage />;
}
```

The actual page implementation lives in the feature:

```typescript
// features/orders/presentation/pages/OrdersPage.tsx
export function OrdersPage() {
  const { orders } = useOrders();
  return <OrderList orders={orders} />;
}
```

---

## Layer Details

### Domain Layer

The innermost layer. Contains:

| Element    | Purpose                     |
| ---------- | --------------------------- |
| Entities   | Business objects with rules |
| Types      | TypeScript interfaces       |
| Errors     | Custom domain errors        |
| Interfaces | Repository contracts        |

**Rules:**

- No imports from other layers
- No framework dependencies
- Pure TypeScript

### Application Layer

Orchestrates use cases. Contains:

| Element  | Purpose                      |
| -------- | ---------------------------- |
| Services | Business logic orchestration |
| Hooks    | React hooks for features     |
| Mappers  | Data transformation          |
| DTOs     | Data transfer objects        |

**Rules:**

- Can import from Domain
- No UI components
- No direct API calls

### Infrastructure Layer

Implements technical details. Contains:

| Element      | Purpose                     |
| ------------ | --------------------------- |
| Repositories | Data access implementations |
| API clients  | HTTP/GraphQL calls          |
| Adapters     | External service adapters   |

**Rules:**

- Implements Domain interfaces
- Can import from Domain
- Handles external concerns

### Presentation Layer

UI concerns. Contains:

| Element    | Purpose           |
| ---------- | ----------------- |
| Components | React components  |
| Pages      | Page compositions |
| Hooks      | UI-specific hooks |

**Rules:**

- Can import from Application
- React/Next.js specific
- No business logic

---

## Cross-Feature Communication

Features should not import directly from each other. Use:

### 1. Shared Interfaces

```typescript
// shared/domain/types/index.ts
export interface Identifiable {
  id: string;
}

// Both features can implement this
```

### 2. Global Stores

```typescript
// stores/appStore.ts
export const useAppStore = create((set) => ({
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
}));
```

### 3. Event Emitters

```typescript
// shared/infrastructure/events.ts
export const eventBus = new EventEmitter();

// Feature A
eventBus.emit("user:selected", userId);

// Feature B
eventBus.on("user:selected", handleUserSelected);
```

---

## When to Use Each Layer

| Need                       | Layer          |
| -------------------------- | -------------- |
| Define entity shape        | Domain         |
| Business rule validation   | Domain         |
| Orchestrate multiple steps | Application    |
| React state management     | Application    |
| API call                   | Infrastructure |
| External service           | Infrastructure |
| UI component               | Presentation   |
| Form handling              | Presentation   |

---

## Anti-Patterns to Avoid

### 1. Cross-Feature Imports

```typescript
// BAD
import { useUser } from "@/features/users/application/hooks";

// GOOD
import { useAppStore } from "@/stores";
const { currentUser } = useAppStore();
```

### 2. Business Logic in Components

```typescript
// BAD
function OrderForm() {
  const calculateTotal = (items) => {
    // 50 lines of business logic
  };
}

// GOOD
function OrderForm() {
  const { calculateTotal } = useOrderCalculations();
}
```

### 3. Direct API Calls in Components

```typescript
// BAD
function UserList() {
  useEffect(() => {
    fetch('/api/users').then(...);
  }, []);
}

// GOOD
function UserList() {
  const { data: users } = useUsers();
}
```

### 4. Fat Route Files

```typescript
// BAD - app/orders/page.tsx
export default async function Page() {
  const orders = await db.query('SELECT * FROM orders');
  const formatted = orders.map(o => ({ ...o, total: calculate(o) }));
  return <OrderList orders={formatted} />;
}

// GOOD - app/orders/page.tsx
import { OrdersPage } from '@/features/orders';
export default function Page() {
  return <OrdersPage />;
}
```
