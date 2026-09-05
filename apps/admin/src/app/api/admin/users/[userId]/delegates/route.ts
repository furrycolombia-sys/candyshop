/* eslint-disable i18next/no-literal-string */
import { NextResponse } from "next/server";

import {
  adminFetch,
  ClientError,
  errorResponse,
  FORBIDDEN_ERROR,
  getAuthorizedAdmin,
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
 *
 * A path id that is not a uuid answers 400. It used to reach a bare `catch`
 * and come back as 500 "Failed to load delegates", which the caller cannot
 * tell apart from an outage.
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
  } catch (error) {
    return errorResponse(error, "Failed to load delegates");
  }
}

/**
 * DELETE /api/admin/users/:userId/delegates
 * Body: { delegateRowId: string }
 *
 * Removes one seller_admins row, and only if it belongs to the user in the
 * path -- either as the seller who delegated or as the delegate.
 *
 * The row id alone used to be enough: `:userId` was awaited and thrown away,
 * so the endpoint deleted any row whose id you named regardless of whose
 * delegates the URL claimed to be addressing. That is not an escalation --
 * the caller already holds seller_admins.delete, which covers every row -- but
 * it means a stale row id deletes someone else's delegation while the request
 * URL records it against the wrong user. Scoping the filter makes the address
 * mean something.
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
    const { userId } = await context.params;
    const validUserId = validateUuid(userId);
    const body = (await request.json()) as Record<string, unknown>;
    const { delegateRowId } = body;

    if (typeof delegateRowId !== "string" || !delegateRowId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const validRowId = validateUuid(delegateRowId);

    // One `or=(a,b)` group, not one per side: PostgREST answers `or=(a),(b)`
    // with the first group alone and drops the rest without erroring.
    const deleted = await adminFetch(
      `seller_admins?id=eq.${validRowId}&or=(seller_id.eq.${validUserId},admin_user_id.eq.${validUserId})`,
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      },
    );

    const rows = (await deleted.json()) as unknown[];
    if (rows.length === 0) {
      throw new ClientError("Delegate row not found for this user");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to remove delegate");
  }
}
