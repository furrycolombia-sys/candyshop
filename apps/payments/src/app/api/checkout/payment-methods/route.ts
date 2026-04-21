/* eslint-disable i18next/no-literal-string -- route uses internal table names and API keys */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

import type {
  CheckoutPaymentMethodsResponse,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";
import {
  adminFetchJson,
  createRestPath,
  UUID_REGEX,
  validateUuid,
} from "@/shared/infrastructure/adminRestClient";

const REQUIRED_PERMISSION_KEYS = ["orders.create", "receipts.create"] as const;

type PaymentMethodRow = {
  id: string;
  name_en: string;
  name_es: string | null;
  display_blocks: unknown;
  form_fields: unknown;
  is_active: boolean;
  requires_receipt: boolean;
  requires_transfer_number: boolean;
};

type ProductStockRow = {
  id: string;
  seller_id: string | null;
  is_active: boolean;
  max_quantity: number | null;
};

type PermissionRow = {
  expires_at: string | null;
  resource_permissions: {
    permissions: {
      key: string;
    };
  };
};

type CheckoutItemPayload = {
  id: string;
  quantity: number;
};

function sanitizeItems(items: unknown): CheckoutItemPayload[] | null {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const quantitiesById = new Map<string, number>();

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      return null;
    }

    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      !UUID_REGEX.test(record.id) ||
      typeof record.quantity !== "number" ||
      !Number.isInteger(record.quantity) ||
      record.quantity <= 0
    ) {
      return null;
    }

    quantitiesById.set(
      record.id,
      (quantitiesById.get(record.id) ?? 0) + record.quantity,
    );
  }

  return [...quantitiesById.entries()].map(([id, quantity]) => ({
    id,
    quantity,
  }));
}

function mapPaymentMethod(row: PaymentMethodRow): SellerPaymentMethodWithType {
  return {
    id: row.id,
    name_en: row.name_en,
    name_es: row.name_es ?? null,
    display_blocks: Array.isArray(row.display_blocks)
      ? (row.display_blocks as SellerPaymentMethodWithType["display_blocks"])
      : [],
    form_fields: Array.isArray(row.form_fields)
      ? (row.form_fields as SellerPaymentMethodWithType["form_fields"])
      : [],
    is_active: row.is_active,
    requires_receipt: row.requires_receipt,
    requires_transfer_number: row.requires_transfer_number,
  };
}

function hasRequiredPermissions(rows: PermissionRow[]) {
  const now = Date.now();
  const grantedKeys = new Set(
    rows
      .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
      .map((row) => row.resource_permissions?.permissions?.key)
      .filter((key): key is string => typeof key === "string"),
  );

  return REQUIRED_PERMISSION_KEYS.every((key) => grantedKeys.has(key));
}

async function fetchGrantedPermissions(userId: string) {
  return adminFetchJson<PermissionRow[]>(
    createRestPath("user_permissions", {
      user_id: `eq.${validateUuid(userId)}`,
      mode: "eq.grant",
      select: "expires_at,resource_permissions!inner(permissions!inner(key))",
    }),
  );
}

async function fetchProductsByIds(productIds: string[]) {
  return adminFetchJson<ProductStockRow[]>(
    createRestPath("products", {
      id: `in.(${productIds.join(",")})`,
      select: "id,seller_id,is_active,max_quantity",
    }),
  );
}

async function fetchPaymentMethodsBySeller(sellerId: string) {
  return adminFetchJson<PaymentMethodRow[]>(
    createRestPath("seller_payment_methods", {
      seller_id: `eq.${sellerId}`,
      is_active: "eq.true",
      order: "sort_order.asc",
      select:
        "id,name_en,name_es,display_blocks,form_fields,is_active,requires_receipt,requires_transfer_number",
    }),
  );
}

function buildStockIssueResponse(): CheckoutPaymentMethodsResponse {
  return {
    methods: [],
    hasStockIssues: true,
  };
}

async function validateStock(
  sellerId: string,
  items: CheckoutItemPayload[],
): Promise<boolean> {
  const products = await fetchProductsByIds(items.map((item) => item.id));
  const productMap = new Map(products.map((product) => [product.id, product]));

  return items.some((item) => {
    const product = productMap.get(item.id);

    if (!product) {
      return true;
    }

    if (product.seller_id !== sellerId || !product.is_active) {
      return true;
    }

    return (
      product.max_quantity !== null && item.quantity > product.max_quantity
    );
  });
}

export async function POST(request: Request) {
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sellerId, items } = (await request.json()) as {
      sellerId?: unknown;
      items?: unknown;
    };

    const sanitizedItems = sanitizeItems(items);
    if (
      typeof sellerId !== "string" ||
      sellerId.length === 0 ||
      !UUID_REGEX.test(sellerId) ||
      !sanitizedItems
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const permissions = await fetchGrantedPermissions(user.id);
    if (!hasRequiredPermissions(permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasStockIssues = await validateStock(sellerId, sanitizedItems);
    if (hasStockIssues) {
      return NextResponse.json(buildStockIssueResponse());
    }

    const methods = await fetchPaymentMethodsBySeller(sellerId);

    return NextResponse.json<CheckoutPaymentMethodsResponse>({
      methods: methods.map((method) => mapPaymentMethod(method)),
      hasStockIssues: false,
    });
  } catch (error) {
    console.error(
      "[checkout/payment-methods]",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "Failed to load payment methods" },
      { status: 500 },
    );
  }
}
