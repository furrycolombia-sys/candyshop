/* eslint-disable i18next/no-literal-string */
import { NextResponse } from "next/server";

import {
  adminFetch,
  FORBIDDEN_ERROR,
  getAuthorizedAdmin,
  INTERNAL_SERVER_ERROR_STATUS,
  validateUuid,
} from "@/app/api/admin/_shared/adminRest";
import { SELLER_ADMINS_READ_PERMISSION } from "@/features/users/domain/constants";

const SELLER_ADMINS_DELETE = "seller_admins.delete";

/** Delegate row shape returned by the API */
interface DelegateRow {
  id: string;
  seller_id: string;
  admin_user_id: string;
  product_id: string;
  permissions: string[];
  created_at: string;
}

interface ProfileShape {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ProductShape {
  id: string;
  name_en: string;
  name_es: string;
}

interface RawAsSeller extends DelegateRow {
  admin_profile: ProfileShape;
  product: ProductShape;
}

interface RawAsDelegate extends DelegateRow {
  seller_profile: ProfileShape;
  product: ProductShape;
}

/**
 * GET /api/admin/users/:userId/delegates
 *
 * Returns all delegate relationships for a user:
 * - asSeller: rows where the user is the seller (they delegated to someone)
 * - asDelegate: rows where the user is the delegate (someone delegated to them)
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([SELLER_ADMINS_READ_PERMISSION]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    const { userId } = await context.params;
    const validId = validateUuid(userId);

    const [asSellerRes, asDelegateRes] = await Promise.all([
      adminFetch(
        `seller_admins?seller_id=eq.${validId}&select=id,seller_id,admin_user_id,product_id,permissions,created_at,admin_profile:user_profiles!admin_user_id(id,email,display_name,avatar_url),product:products!product_id(id,name_en,name_es)`,
      ),
      adminFetch(
        `seller_admins?admin_user_id=eq.${validId}&select=id,seller_id,admin_user_id,product_id,permissions,created_at,seller_profile:user_profiles!seller_id(id,email,display_name,avatar_url),product:products!product_id(id,name_en,name_es)`,
      ),
    ]);

    const asSeller = (await asSellerRes.json()) as RawAsSeller[];
    const asDelegate = (await asDelegateRes.json()) as RawAsDelegate[];

    return NextResponse.json({ asSeller, asDelegate });
  } catch {
    return NextResponse.json(
      { error: "Failed to load delegates" },
      { status: INTERNAL_SERVER_ERROR_STATUS },
    );
  }
}

/**
 * DELETE /api/admin/users/:userId/delegates
 * Body: { delegateRowId: string }
 *
 * Removes a specific seller_admins row by ID.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([SELLER_ADMINS_DELETE]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const { delegateRowId } = body;

    if (typeof delegateRowId !== "string" || !delegateRowId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    validateUuid(delegateRowId);

    await adminFetch(`seller_admins?id=eq.${delegateRowId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove delegate" },
      { status: INTERNAL_SERVER_ERROR_STATUS },
    );
  }
}
